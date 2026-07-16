// tests/unit/pec-ricevute-applica.test.ts
// Task 11: POST /api/pec/ricevute/[id]/applica — conferma di un evento
// «proposta» (Task 10) via RPC applica_ricevuta_sdi (writer unico, Task 9 —
// spec §4.4). Su evento in quarantena (firma non valida, non ancora
// completato) la route ri-scarica l'XML dallo storage e ri-esegue
// verificaFirmaRicevuta (Task 8, qui mockata: il fallback reale ritorna
// sempre 'fallita', quindi il caso 'valida' va simulato per restare un test
// valido anche quando il motore reale sarà attivo).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockStorageFrom, mockDownload, mockVerificaFirma, mockRpc, state } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockDownload: vi.fn(),
  mockVerificaFirma: vi.fn(),
  mockRpc: vi.fn(),
  state: {
    utenteRuolo: 'titolare' as string,
    labId: 'lab-1' as string,
    eventoRow: null as {
      id: string
      laboratorio_id: string
      esito_verifica_firma: 'valida' | 'fallita' | null
      stato_a: string | null
      ricevuta_storage_path: string | null
    } | null,
    updateCalls: [] as Array<{ payload: Record<string, unknown>; filters: Record<string, unknown> }>,
    updateResult: { data: null, error: null } as { data: unknown; error: { message: string } | null },
    downloadCalls: [] as string[],
    downloadResult: { data: { arrayBuffer: async () => Buffer.from('<xml/>') }, error: null } as {
      data: { arrayBuffer(): Promise<Buffer | ArrayBuffer> } | null
      error: { message: string } | null
    },
    rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
    rpcResult: { data: null, error: null } as { data: unknown; error: { message: string } | null },
  },
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, storage: { from: mockStorageFrom }, rpc: mockRpc }),
}))
vi.mock('@/lib/fattura/ricevute/verifica-firma', () => ({
  verificaFirmaRicevuta: mockVerificaFirma,
}))

import { POST } from '../../src/app/api/pec/ricevute/[id]/applica/route'

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'neq', 'in']) c[m] = () => c
  c.single = async () => result
  return c
}

/** Tabella `fatture_sdi_eventi` — due usi distinti (fetch evento select+eq+eq
 * +maybeSingle, update esito_verifica_firma sulla riverifica). Ogni chiamata
 * a `.from()` crea un'istanza fresca. */
function eventiTable() {
  const filters: Record<string, unknown> = {}
  const c: Record<string, unknown> & { then?: (resolve: (v: unknown) => void) => void } = {}
  c.select = () => c
  c.eq = (field: string, value: unknown) => {
    filters[field] = value
    return c
  }
  c.maybeSingle = async () => {
    const row = state.eventoRow
    if (!row) return { data: null, error: null }
    if (row.id !== filters.id) return { data: null, error: null }
    if (row.laboratorio_id !== filters.laboratorio_id) return { data: null, error: null }
    return { data: row, error: null }
  }
  c.update = (payload: Record<string, unknown>) => {
    // filters accumulate on the SAME chain instance after .update() too.
    ;(c as unknown as { _pendingPayload: Record<string, unknown> })._pendingPayload = payload
    return c
  }
  // Update è awaited direttamente (nessun .single()/.select() incatenato).
  c.then = (resolve: (v: unknown) => void) => {
    const pending = (c as unknown as { _pendingPayload?: Record<string, unknown> })._pendingPayload
    if (pending) {
      state.updateCalls.push({ payload: pending, filters: { ...filters } })
    }
    resolve(state.updateResult)
  }
  return c
}

function req(id: string) {
  return new Request(`http://localhost/api/pec/ricevute/${id}/applica`, {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost' },
  })
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.utenteRuolo = 'titolare'
  state.labId = 'lab-1'
  state.eventoRow = null
  state.updateCalls = []
  state.updateResult = { data: null, error: null }
  state.downloadCalls = []
  state.downloadResult = { data: { arrayBuffer: async () => Buffer.from('<xml/>') }, error: null }
  state.rpcCalls = []
  state.rpcResult = { data: null, error: null }

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockVerificaFirma.mockResolvedValue('fallita')
  mockStorageFrom.mockImplementation(() => ({ download: mockDownload }))
  mockDownload.mockImplementation(async (path: string) => {
    state.downloadCalls.push(path)
    return state.downloadResult
  })
  mockRpc.mockImplementation(async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args })
    return state.rpcResult
  })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti')
      return chain({ data: { laboratorio_id: state.labId, ruolo: state.utenteRuolo }, error: null })
    if (table === 'fatture_sdi_eventi') return eventiTable()
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/pec/ricevute/[id]/applica — Task 11', () => {
  it('1. evento valido (firma già valida) → RPC applicata → 200 passthrough', async () => {
    state.eventoRow = {
      id: 'ev-1',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'valida',
      stato_a: null,
      ricevuta_storage_path: 'lab-1/ricevute-sdi/aaa.xml',
    }
    state.rpcResult = { data: { esito: 'applicata', stato_da: 'smtp_inviata', stato_a: 'accettata' }, error: null }

    const res = await POST(req('ev-1'), ctx('ev-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ esito: 'applicata', stato_da: 'smtp_inviata', stato_a: 'accettata' })

    expect(state.rpcCalls).toHaveLength(1)
    expect(state.rpcCalls[0]).toEqual({
      fn: 'applica_ricevuta_sdi',
      args: { p_evento_id: 'ev-1', p_laboratorio_id: 'lab-1' },
    })
    // Firma già valida: nessuna riverifica, nessun download, nessun update.
    expect(mockVerificaFirma).not.toHaveBeenCalled()
    expect(state.downloadCalls).toHaveLength(0)
    expect(state.updateCalls).toHaveLength(0)
  })

  it('2. evento in quarantena → riverifica ora valida → aggiorna esito e procede con la RPC', async () => {
    state.eventoRow = {
      id: 'ev-2',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'fallita',
      stato_a: null,
      ricevuta_storage_path: 'lab-1/ricevute-sdi/bbb.xml',
    }
    mockVerificaFirma.mockResolvedValue('valida')
    state.rpcResult = { data: { esito: 'applicata', stato_da: 'smtp_inviata', stato_a: 'accettata' }, error: null }

    const res = await POST(req('ev-2'), ctx('ev-2'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ esito: 'applicata', stato_da: 'smtp_inviata', stato_a: 'accettata' })

    expect(state.downloadCalls).toEqual(['lab-1/ricevute-sdi/bbb.xml'])
    expect(mockVerificaFirma).toHaveBeenCalledTimes(1)

    expect(state.updateCalls).toHaveLength(1)
    expect(state.updateCalls[0].payload).toEqual({ esito_verifica_firma: 'valida' })
    expect(state.updateCalls[0].filters).toEqual({ id: 'ev-2', laboratorio_id: 'lab-1' })

    expect(state.rpcCalls).toHaveLength(1)
  })

  it('3. evento in quarantena → riverifica ancora fallita → 409, RPC mai chiamata', async () => {
    state.eventoRow = {
      id: 'ev-3',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'fallita',
      stato_a: null,
      ricevuta_storage_path: 'lab-1/ricevute-sdi/ccc.xml',
    }
    mockVerificaFirma.mockResolvedValue('fallita')

    const res = await POST(req('ev-3'), ctx('ev-3'))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.esito).toBe('quarantena')

    expect(state.updateCalls).toHaveLength(0)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it('4. esito RPC duplicata (evento già applicato) → 200 passthrough', async () => {
    state.eventoRow = {
      id: 'ev-4',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'valida',
      stato_a: 'accettata',
      ricevuta_storage_path: 'lab-1/ricevute-sdi/ddd.xml',
    }
    state.rpcResult = { data: { esito: 'duplicata', stato_da: 'smtp_inviata', stato_a: 'accettata' }, error: null }

    const res = await POST(req('ev-4'), ctx('ev-4'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ esito: 'duplicata', stato_da: 'smtp_inviata', stato_a: 'accettata' })

    // stato_a già valorizzato → nessuna riverifica anche se firma non fosse valida.
    expect(mockVerificaFirma).not.toHaveBeenCalled()
  })

  it('5. esito RPC stato_incompatibile → 409', async () => {
    state.eventoRow = {
      id: 'ev-5',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'valida',
      stato_a: null,
      ricevuta_storage_path: 'lab-1/ricevute-sdi/eee.xml',
    }
    state.rpcResult = { data: { esito: 'stato_incompatibile', stato_da: 'accettata' }, error: null }

    const res = await POST(req('ev-5'), ctx('ev-5'))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json).toEqual({ esito: 'stato_incompatibile', stato_da: 'accettata' })
  })

  it('5b. esito RPC non_matchata → 409 (parcheggiato, fail-closed: non è nella mappa esplicita del task ma è un esito raggiungibile)', async () => {
    state.eventoRow = {
      id: 'ev-5b',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'valida',
      stato_a: null,
      ricevuta_storage_path: 'lab-1/ricevute-sdi/eee2.xml',
    }
    state.rpcResult = { data: { esito: 'non_matchata' }, error: null }

    const res = await POST(req('ev-5b'), ctx('ev-5b'))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json).toEqual({ esito: 'non_matchata' })
    expect(state.rpcCalls).toHaveLength(1)
  })

  it('6. evento esistente ma di un ALTRO lab → 404, RPC mai chiamata', async () => {
    state.eventoRow = {
      id: 'ev-6',
      laboratorio_id: 'lab-ALTRO',
      esito_verifica_firma: 'valida',
      stato_a: null,
      ricevuta_storage_path: 'lab-ALTRO/ricevute-sdi/fff.xml',
    }

    const res = await POST(req('ev-6'), ctx('ev-6'))
    expect(res.status).toBe(404)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it('7. ruolo tecnico → 403, nessuna elaborazione', async () => {
    state.utenteRuolo = 'tecnico'
    state.eventoRow = {
      id: 'ev-7',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'valida',
      stato_a: null,
      ricevuta_storage_path: 'lab-1/ricevute-sdi/ggg.xml',
    }

    const res = await POST(req('ev-7'), ctx('ev-7'))
    expect(res.status).toBe(403)
    expect(state.rpcCalls).toHaveLength(0)
    expect(mockVerificaFirma).not.toHaveBeenCalled()
  })

  it('8. RPC non_trovato → 404 (race improbabile, difesa in profondità)', async () => {
    state.eventoRow = {
      id: 'ev-8',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'valida',
      stato_a: null,
      ricevuta_storage_path: 'lab-1/ricevute-sdi/hhh.xml',
    }
    state.rpcResult = { data: { esito: 'non_trovato' }, error: null }

    const res = await POST(req('ev-8'), ctx('ev-8'))
    expect(res.status).toBe(404)
  })

  it('9. errore RPC (Postgres) → 500 fail-closed, nessun leak del messaggio', async () => {
    state.eventoRow = {
      id: 'ev-9',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'valida',
      stato_a: null,
      ricevuta_storage_path: 'lab-1/ricevute-sdi/iii.xml',
    }
    state.rpcResult = { data: null, error: { message: 'connessione DB persa (dettaglio sensibile)' } }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req('ev-9'), ctx('ev-9'))
    errSpy.mockRestore()

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('connessione DB persa')
  })

  it('10. errore storage sul download in riverifica → 500 fail-closed', async () => {
    state.eventoRow = {
      id: 'ev-10',
      laboratorio_id: 'lab-1',
      esito_verifica_firma: 'fallita',
      stato_a: null,
      ricevuta_storage_path: 'lab-1/ricevute-sdi/jjj.xml',
    }
    state.downloadResult = { data: null, error: { message: 'oggetto storage non trovato' } }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req('ev-10'), ctx('ev-10'))
    errSpy.mockRestore()

    expect(res.status).toBe(500)
    expect(state.rpcCalls).toHaveLength(0)
  })
})
