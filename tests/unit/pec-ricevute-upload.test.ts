// tests/unit/pec-ricevute-upload.test.ts
// Task 10: POST /api/pec/ricevute — upload manuale ricevuta SdI con match +
// quarantena. Usa il parser REALE (Task 7, fixture ufficiali/derivate in
// tests/fixtures/ricevute-sdi/) ma mocka verificaFirmaRicevuta (Task 8): in
// fallback ritorna SEMPRE 'fallita', quindi il caso 'valida' va simulato qui
// per restare un test valido anche quando il motore reale sarà attivo.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const fx = (n: string) => readFileSync(`tests/fixtures/ricevute-sdi/${n}`)

const { mockGetUser, mockFrom, mockStorageFrom, mockUpload, mockVerificaFirma, state } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockVerificaFirma: vi.fn(),
  state: {
    utenteRuolo: 'titolare' as string,
    labId: 'lab-1' as string,
    dedupRow: null as { id: string } | null,
    countUpload24h: 0,
    fatturaRow: null as { id: string; laboratorio_id: string; nome_file_xml: string; numero: string; stato_sdi: string; identificativo_sdi: string | null } | null,
    insertResult: { data: { id: 'ev-1' }, error: null } as { data: { id: string } | null; error: { message: string } | null },
    insertCalls: [] as Array<Record<string, unknown>>,
    uploadCalls: [] as Array<[string, Buffer, unknown]>,
    uploadResult: { data: { path: 'ok' }, error: null } as { data: unknown; error: { message: string } | null },
  },
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, storage: { from: mockStorageFrom } }),
}))
vi.mock('@/lib/fattura/ricevute/verifica-firma', () => ({
  verificaFirmaRicevuta: mockVerificaFirma,
}))

import { POST } from '../../src/app/api/pec/ricevute/route'

// ─── Helpers mock chain (stesso stile di tests/unit/fatture-xml-gate-stato-sdi.test.ts) ──

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'neq', 'in']) c[m] = () => c
  c.single = async () => result
  return c
}

/** Tabella `fatture` — cattura i filtri .eq() applicati per verificare che il
 * match sia SEMPRE scoped a laboratorio_id (mai cross-tenant). */
function fatturaTable() {
  const filters: Record<string, unknown> = {}
  const c: Record<string, unknown> = {}
  c.select = () => c
  c.eq = (field: string, value: unknown) => {
    filters[field] = value
    return c
  }
  c.is = () => c
  c.maybeSingle = async () => {
    const row = state.fatturaRow
    if (!row) return { data: null, error: null }
    if (row.laboratorio_id !== filters.laboratorio_id) return { data: null, error: null }
    if (row.nome_file_xml !== filters.nome_file_xml) return { data: null, error: null }
    return { data: row, error: null }
  }
  return c
}

/** Tabella `fatture_sdi_eventi` — tre usi distinti (dedup select, count
 * head-only, insert+select). Ogni chiamata a `.from()` crea un'istanza
 * fresca, quindi nessuna ambiguità tra i tre flussi. */
function eventiTable() {
  const c: Record<string, unknown> & { then?: (resolve: (v: unknown) => void) => void } = {}
  c.select = () => c
  c.eq = () => c
  c.gte = () => c
  c.insert = (payload: Record<string, unknown>) => {
    state.insertCalls.push(payload)
    return c
  }
  c.maybeSingle = async () => ({ data: state.dedupRow, error: null })
  c.single = async () => state.insertResult
  // Conteggio cap: awaited direttamente senza .single()/.maybeSingle().
  c.then = (resolve: (v: unknown) => void) => resolve({ data: null, count: state.countUpload24h, error: null })
  return c
}

function req(body: Buffer | string, contentType: string) {
  return new Request('http://localhost/api/pec/ricevute', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost', 'content-type': contentType },
    body: body as BodyInit,
  })
}

/** Costruisce manualmente un body multipart/form-data — evitare `FormData`
 * globale: sotto ambiente vitest jsdom la classe File/FormData di jsdom non
 * è la stessa di quella usata da Node/undici per il parsing di `Request`
 * (`instanceof` e persino il filename si perdono nel round-trip). Un body
 * multipart costruito a mano bypassa il mismatch di realm. */
function multipartReq(opts: { field?: string; filename: string; content: Buffer; contentType?: string }) {
  const boundary = '----vitestBoundary' + Math.random().toString(16).slice(2)
  const field = opts.field ?? 'file'
  const ct = opts.contentType ?? 'application/xml'
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${opts.filename}"\r\nContent-Type: ${ct}\r\n\r\n`
    ),
    opts.content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  return req(body, `multipart/form-data; boundary=${boundary}`)
}

const RC_XML = fx('rc-valida.xml')
const RC_SHA = createHash('sha256').update(RC_XML).digest('hex')

beforeEach(() => {
  vi.clearAllMocks()
  state.utenteRuolo = 'titolare'
  state.labId = 'lab-1'
  state.dedupRow = null
  state.countUpload24h = 0
  state.fatturaRow = null
  state.insertResult = { data: { id: 'ev-1' }, error: null }
  state.insertCalls = []
  state.uploadCalls = []
  state.uploadResult = { data: { path: 'ok' }, error: null }

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockVerificaFirma.mockResolvedValue('fallita')
  mockStorageFrom.mockImplementation(() => ({
    upload: mockUpload,
  }))
  mockUpload.mockImplementation(async (path: string, buf: Buffer, opts: unknown) => {
    state.uploadCalls.push([path, buf, opts])
    return state.uploadResult
  })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti')
      return chain({
        data: {
          laboratorio_id: state.labId,
          ruolo: state.utenteRuolo,
          laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
        },
        error: null,
      })
    if (table === 'fatture_sdi_eventi') return eventiTable()
    if (table === 'fatture') return fatturaTable()
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/pec/ricevute — Task 10', () => {
  it('1. RC valida matchata → proposta con transizione accettata, esito firma valida', async () => {
    state.fatturaRow = {
      id: 'fat-1',
      laboratorio_id: 'lab-1',
      nome_file_xml: 'IT01234567890_11111.xml', // <NomeFile> in rc-valida.xml
      numero: '2026-0001',
      stato_sdi: 'smtp_inviata',
      identificativo_sdi: null,
    }
    mockVerificaFirma.mockResolvedValue('valida')

    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: RC_XML }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({
      esito: 'proposta',
      ricevutaId: 'ev-1',
      tipo: 'RC',
      fattura: { id: 'fat-1', numero: '2026-0001', stato_sdi: 'smtp_inviata' },
      transizioneProposta: 'accettata',
      esitoVerificaFirma: 'valida',
    })

    // Insert evento: content_sha256 valorizzato, origine corretta, fattura_id associato.
    expect(state.insertCalls).toHaveLength(1)
    const insertPayload = state.insertCalls[0]
    expect(insertPayload.origine).toBe('upload_verificato')
    expect(insertPayload.content_sha256).toBe(RC_SHA)
    expect(insertPayload.fattura_id).toBe('fat-1')
    expect(insertPayload.esito_verifica_firma).toBe('valida')

    // Storage: nome oggetto server-generated basato sullo sha256, MAI sul filename client.
    expect(state.uploadCalls).toHaveLength(1)
    const [storagePath, , uploadOpts] = state.uploadCalls[0]
    expect(storagePath).toBe(`lab-1/ricevute-sdi/${RC_SHA}.xml`)
    expect(uploadOpts).toEqual({ contentType: 'application/xml', upsert: true })
  })

  it('2. stesso file due volte → seconda risposta duplicata con ricevutaId esistente', async () => {
    state.dedupRow = { id: 'ev-esistente' }

    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: RC_XML }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ esito: 'duplicata', ricevutaId: 'ev-esistente' })

    // Nessun insert, nessun upload — idempotenza totale.
    expect(state.insertCalls).toHaveLength(0)
    expect(state.uploadCalls).toHaveLength(0)
  })

  it('3. firma fallita → proposta in quarantena: evento inserito, fattura_id valorizzato, proposta nulla', async () => {
    state.fatturaRow = {
      id: 'fat-1',
      laboratorio_id: 'lab-1',
      nome_file_xml: 'IT01234567890_11111.xml',
      numero: '2026-0001',
      stato_sdi: 'smtp_inviata',
      identificativo_sdi: null,
    }
    mockVerificaFirma.mockResolvedValue('fallita')

    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: RC_XML }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.esito).toBe('proposta')
    expect(json.esitoVerificaFirma).toBe('fallita')
    expect(json.transizioneProposta).toBeNull()

    expect(state.insertCalls).toHaveLength(1)
    expect(state.insertCalls[0].fattura_id).toBe('fat-1')
    expect(state.insertCalls[0].esito_verifica_firma).toBe('fallita')
  })

  it('4. nomeFileFattura che non matcha nessuna fattura del lab → parcheggiata (fattura_id NULL)', async () => {
    state.fatturaRow = null // nessuna fattura con quel nome_file_xml nel lab
    mockVerificaFirma.mockResolvedValue('valida')

    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: RC_XML }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.esito).toBe('proposta')
    expect(json.fattura).toBeUndefined()
    expect(json.transizioneProposta).toBeNull()

    expect(state.insertCalls[0].fattura_id).toBeNull()
  })

  it('5. nomeFileFattura che matcha una fattura di un ALTRO lab → parcheggiata (mai match cross-tenant)', async () => {
    state.fatturaRow = {
      id: 'fat-altro-lab',
      laboratorio_id: 'lab-ALTRO', // diverso da state.labId ('lab-1')
      nome_file_xml: 'IT01234567890_11111.xml',
      numero: '2026-0001',
      stato_sdi: 'smtp_inviata',
      identificativo_sdi: null,
    }
    mockVerificaFirma.mockResolvedValue('valida')

    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: RC_XML }))
    const json = await res.json()
    expect(json.esito).toBe('proposta')
    expect(json.fattura).toBeUndefined()
    expect(json.transizioneProposta).toBeNull()
    expect(state.insertCalls[0].fattura_id).toBeNull()
  })

  it('6. mismatch identificativo_sdi vs fattura → parcheggiata con proposta nulla (fail-closed)', async () => {
    state.fatturaRow = {
      id: 'fat-1',
      laboratorio_id: 'lab-1',
      nome_file_xml: 'IT01234567890_11111.xml',
      numero: '2026-0001',
      stato_sdi: 'smtp_inviata',
      identificativo_sdi: '999999', // rc-valida.xml ha IdentificativoSdI=111 → mismatch
    }
    mockVerificaFirma.mockResolvedValue('valida')

    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: RC_XML }))
    const json = await res.json()
    expect(json.esito).toBe('proposta')
    expect(json.fattura).toBeUndefined()
    expect(json.transizioneProposta).toBeNull()

    // fail-closed: la fattura sospetta NON viene associata all'evento.
    expect(state.insertCalls[0].fattura_id).toBeNull()
  })

  it('7. XML non valido → 422 {esito: non_valida}, nessun insert', async () => {
    const malformata = fx('malformata.xml')
    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: malformata }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.esito).toBe('non_valida')
    expect(state.insertCalls).toHaveLength(0)
    expect(state.uploadCalls).toHaveLength(0)
  })

  it('8. cap: oltre 20 upload nelle 24h per lab → 429 {esito: cap_superato}', async () => {
    state.countUpload24h = 20
    mockVerificaFirma.mockResolvedValue('valida')

    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: RC_XML }))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.esito).toBe('cap_superato')
    expect(state.insertCalls).toHaveLength(0)
    expect(state.uploadCalls).toHaveLength(0)
  })

  it('9. ruolo tecnico → 403, nessuna elaborazione del file', async () => {
    state.utenteRuolo = 'tecnico'
    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: RC_XML }))
    expect(res.status).toBe(403)
    expect(state.insertCalls).toHaveLength(0)
    expect(state.uploadCalls).toHaveLength(0)
    expect(mockVerificaFirma).not.toHaveBeenCalled()
  })

  it('10. errore DB sull\'INSERT evento → 500 fail-closed, mai un 200 con dati parziali', async () => {
    state.fatturaRow = {
      id: 'fat-1',
      laboratorio_id: 'lab-1',
      nome_file_xml: 'IT01234567890_11111.xml',
      numero: '2026-0001',
      stato_sdi: 'smtp_inviata',
      identificativo_sdi: null,
    }
    mockVerificaFirma.mockResolvedValue('valida')
    state.insertResult = { data: null, error: { message: 'boom' } }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(multipartReq({ filename: 'ricevuta.xml', content: RC_XML }))
    errSpy.mockRestore()

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('boom')
  })
})
