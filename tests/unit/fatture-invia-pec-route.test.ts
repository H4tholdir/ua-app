// tests/unit/fatture-invia-pec-route.test.ts
// N10: POST /api/fatture/[id]/invia-pec — invio dell'XML congelato.
// Mock chain esteso rispetto a nota-credito-route.test.ts: la route fa fino a
// 4 chiamate sequenziate su from('fatture') (select, claim update, release
// update, re-fetch select) → coda di chain consumata in ordine.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockSendFatturaPEC } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockSendFatturaPEC: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/fattura/send-pec', () => ({ sendFatturaPEC: mockSendFatturaPEC }))

import { POST } from '../../src/app/api/fatture/[id]/invia-pec/route'

type MockResult = { data: unknown; error: unknown }
const updatePayloads: Array<Record<string, unknown>> = []

function selectChain(result: MockResult) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is']) c[m] = () => c
  c.single = async () => result
  return c
}
function updateChain(result: MockResult) {
  const c: Record<string, unknown> = {}
  c.update = (payload: Record<string, unknown>) => { updatePayloads.push(payload); return c }
  for (const m of ['eq', 'is']) c[m] = () => c
  c.select = async () => result
  ;(c as { then: unknown }).then = (resolve: (v: MockResult) => void) => resolve(result)
  return c
}

// Coda di chain per from('fatture'), consumata in ordine di chiamata.
let fattureQueue: Array<Record<string, unknown>> = []
let utenteRow: Record<string, unknown> | null = null

const FATTURA_OK = {
  id: 'fat-1', numero: '2026-0007', stato_sdi: 'generata',
  xml_storage_path: 'lab-1/2026/IT123_00007.xml', nome_file_xml: 'IT123_00007.xml',
  tipo_documento: 'TD01', laboratorio: { pec_smtp_configurata: true },
}
const AGGIORNATA = {
  id: 'fat-1', numero: '2026-0007', stato_sdi: 'smtp_inviata',
  inviata_at: '2026-07-15T10:00:00Z', pec_message_id: '<msg-1>',
}

function req() {
  return new Request('http://localhost/api/fatture/fat-1/invia-pec', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost' },
  }) as never
}
const ctx = { params: Promise.resolve({ id: 'fat-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  updatePayloads.length = 0
  utenteRow = { laboratorio_id: 'lab-1', ruolo: 'titolare', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }
  fattureQueue = []
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockSendFatturaPEC.mockResolvedValue(undefined)
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return selectChain({ data: utenteRow, error: null })
    if (table === 'fatture') {
      const next = fattureQueue.shift()
      if (!next) throw new Error('fattureQueue esaurita')
      return next
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

// Coda standard del percorso felice: select → claim ok → re-fetch.
function happyQueue() {
  fattureQueue = [
    selectChain({ data: FATTURA_OK, error: null }),
    updateChain({ data: [{ id: 'fat-1' }], error: null }),
    selectChain({ data: AGGIORNATA, error: null }),
  ]
}

describe('POST /api/fatture/[id]/invia-pec — guardie', () => {
  it('CSRF: origin diverso → 403, nessuna query fatture', async () => {
    const bad = new Request('http://localhost/api/fatture/fat-1/invia-pec', {
      method: 'POST', headers: { origin: 'http://evil.example', host: 'localhost' },
    }) as never
    const res = await POST(bad, ctx)
    expect(res.status).toBe(403)
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
  })
  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect((await POST(req(), ctx)).status).toBe(401)
  })
  it('utente senza laboratorio → 403', async () => {
    // DEVIAZIONE (Task 10, stesso pattern Task 9): riga utenti assente del
    // tutto collassa su context null (fail-closed getFreshLabContext) → 401,
    // non più 403. Qui testiamo lo scenario reale distinto: profilo trovato
    // ma SENZA laboratorio (laboratorio_id: null) → 403 preservato.
    utenteRow = { laboratorio_id: null, ruolo: 'titolare' }
    expect((await POST(req(), ctx)).status).toBe(403)
  })
  it('ruolo tecnico → 403, sendFatturaPEC MAI chiamato', async () => {
    utenteRow = { laboratorio_id: 'lab-1', ruolo: 'tecnico', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }
    const res = await POST(req(), ctx)
    expect(res.status).toBe(403)
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
  })
  it('ruolo front_desk → ammesso (200)', async () => {
    utenteRow = { laboratorio_id: 'lab-1', ruolo: 'front_desk', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }
    happyQueue()
    expect((await POST(req(), ctx)).status).toBe(200)
  })
  it('fattura non trovata / altro lab → 404', async () => {
    fattureQueue = [selectChain({ data: null, error: null })]
    expect((await POST(req(), ctx)).status).toBe(404)
  })
})

describe('POST /api/fatture/[id]/invia-pec — gate stato', () => {
  const casi: Array<[string, string, string]> = [
    ['draft', 'TD01', 'XML non ancora generato — genera prima la fattura'],
    ['draft', 'TD04', "Nota di credito incompleta — riapri l'emissione dalla fattura originale per completarla"],
    ['smtp_inviata', 'TD01', 'Fattura già inviata a SdI'],
    ['rifiutata', 'TD01', 'Stato non re-inviabile — richiede intervento dedicato'],
    ['scaduta', 'TD01', 'Stato non re-inviabile — richiede intervento dedicato'],
  ]
  for (const [stato, tipo, msg] of casi) {
    it(`stato ${stato} (${tipo}) → 409 «${msg}»`, async () => {
      fattureQueue = [selectChain({ data: { ...FATTURA_OK, stato_sdi: stato, tipo_documento: tipo }, error: null })]
      const res = await POST(req(), ctx)
      expect(res.status).toBe(409)
      expect((await res.json()).error).toBe(msg)
      expect(mockSendFatturaPEC).not.toHaveBeenCalled()
    })
  }
  it('xml_storage_path NULL → 422', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_OK, xml_storage_path: null }, error: null })]
    expect((await POST(req(), ctx)).status).toBe(422)
  })
  it('PEC non configurata → 422 pre-claim (nessun update)', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_OK, laboratorio: { pec_smtp_configurata: false } }, error: null })]
    const res = await POST(req(), ctx)
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('PEC non configurata — configurala nelle Impostazioni')
    expect(updatePayloads).toHaveLength(0)
  })
})

describe('POST /api/fatture/[id]/invia-pec — claim e invio', () => {
  it('claim conteso (0 righe) → 409, sendFatturaPEC MAI chiamato', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
      updateChain({ data: [], error: null }),
    ]
    const res = await POST(req(), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Invio già in corso o già effettuato')
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
  })
  it('claim con errore Postgres → 500 (non 409), senza leak', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
      updateChain({ data: null, error: { message: 'deadlock detected' } }),
    ]
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('deadlock')
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
  })
  it('successo → sendFatturaPEC UNA volta, 200 con stato dal re-fetch', async () => {
    happyQueue()
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockSendFatturaPEC).toHaveBeenCalledTimes(1)
    expect(mockSendFatturaPEC).toHaveBeenCalledWith('fat-1')
    expect((await res.json()).fattura).toEqual(AGGIORNATA)
  })
  it('ramo degradato: re-fetch ancora generata → comunque 200 con stato reale', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
      updateChain({ data: [{ id: 'fat-1' }], error: null }),
      selectChain({ data: { ...AGGIORNATA, stato_sdi: 'generata', pec_message_id: null }, error: null }),
    ]
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).fattura.stato_sdi).toBe('generata')
  })
  it('errore invio → 502, claim rilasciato (update a NULL), dettaglio non nel body', async () => {
    mockSendFatturaPEC.mockRejectedValue(new Error('connect ECONNREFUSED smtp.host.interno:465'))
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
      updateChain({ data: [{ id: 'fat-1' }], error: null }),
      updateChain({ data: null, error: null }),
    ]
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(), ctx)
    errSpy.mockRestore()
    expect(res.status).toBe(502)
    const body = JSON.stringify(await res.json())
    expect(body).not.toContain('smtp.host.interno')
    expect(body).toContain('Invio PEC fallito')
    expect(updatePayloads).toEqual([
      expect.objectContaining({ smtp_inviata_at: expect.any(String) }),
      { smtp_inviata_at: null },
    ])
  })
})
