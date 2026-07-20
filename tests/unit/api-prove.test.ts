import { describe, it, expect, vi, beforeEach } from 'vitest'

// N12 (spec R2 §D-5): la route POST /api/lavori/[id]/prove è stata resa
// atomica sostituendo transizioneLavoro + query separate con 2 RPC
// (manda_in_prova_atomico / registra_rientro_atomico, migration
// 20260717120000_n12_prove_atomiche.sql). Questi test mockano `svc.rpc` e
// verificano il mapping errori (mapRpcError) e il comportamento invariato
// visto dal client.

const { mockGetFreshLabContext, mockFrom, mockRpc, mockTriggerPushToUser } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockTriggerPushToUser: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
  getLabContextWithTimings: vi.fn(),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))
vi.mock('@/lib/notifications/trigger', () => ({
  triggerPushToUser: mockTriggerPushToUser,
  triggerPushByRole: vi.fn(),
}))

import { POST } from '../../src/app/api/lavori/[id]/prove/route'

const LAB_ID = 'lab-1'
const LAVORO_ID = 'lavoro-1'
const USER_ID = 'user-1'
const params = Promise.resolve({ id: LAVORO_ID })

const CONTEXT = {
  userId: USER_ID, email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

// Chain generica per il guard cross-tenant su `lavori`
// (.select('id').eq(...).eq(...).is(...).single()).
function lavoriChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'order']) c[m] = () => c
  c.single = async () => result
  return c
}

function req(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}/prove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/lavori/[id]/prove — atomico su RPC (N12)', () => {
  const lavoroProveUpdate = vi.fn()
  // Risultato di default per la select su `tecnici` (risoluzione tecnico_id→utente_id
  // nell'helper notificaProvaRientrata). Mutabile dai singoli test PRIMA della POST:
  // mockFrom legge questa variabile al momento della chiamata, non alla registrazione.
  let tecniciResult: { data: unknown; error: unknown } = { data: { utente_id: 'user-9' }, error: null }

  beforeEach(() => {
    vi.clearAllMocks()
    tecniciResult = { data: { utente_id: 'user-9' }, error: null }
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return lavoriChain({ data: { id: LAVORO_ID }, error: null })
      if (table === 'tecnici') return lavoriChain(tecniciResult)
      if (table === 'lavoro_prove') {
        return {
          update: (payload: unknown) => {
            lavoroProveUpdate(payload)
            return { eq: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }) }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  describe('action: manda_in_prova', () => {
    it('felice → 200, RPC chiamata con i parametri attesi, shape { prova, stato } invariato', async () => {
      const prova = { id: 'prova-1', lavoro_id: LAVORO_ID, numero_prova: 1 }
      mockRpc.mockResolvedValue({ data: { prova, stato: 'in_prova_esterna' }, error: null })

      const res = await POST(req({
        action: 'manda_in_prova',
        data_rientro_prevista: '2026-08-01',
        istruzioni: 'Verificare colore',
      }) as never, { params })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ prova, stato: 'in_prova_esterna' })
      expect(mockRpc).toHaveBeenCalledWith('manda_in_prova_atomico', {
        p_lavoro_id: LAVORO_ID,
        p_laboratorio_id: LAB_ID,
        p_data_rientro: '2026-08-01',
        p_istruzioni: 'Verificare colore',
        p_user_id: USER_ID,
      })
    })

    it('RPC UA404 → 404 stesso messaggio odierno', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'UA404', message: 'lavoro non trovato' } })

      const res = await POST(req({
        action: 'manda_in_prova', data_rientro_prevista: '2026-08-01',
      }) as never, { params })

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body).toEqual({ error: 'Lavoro non trovato o accesso negato' })
    })

    it('RPC UA409 → 409', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: 'UA409', message: 'transizione non consentita da pronto' },
      })

      const res = await POST(req({
        action: 'manda_in_prova', data_rientro_prevista: '2026-08-01',
      }) as never, { params })

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toBe('transizione non consentita da pronto')
    })

    it('RPC 23505 (unique numero_prova, backstop) → 409 con messaggio amichevole, non Postgres grezzo', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "lavoro_prove_numero_prova_key"' } })

      const res = await POST(req({
        action: 'manda_in_prova', data_rientro_prevista: '2026-08-01',
      }) as never, { params })

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toBe('Prova già in corso — ricarica e riprova')
      expect(body.error).not.toMatch(/duplicate key/)
    })

    it('RPC errore generico (non UA404/UA409/23505/23514) → 500 sanitizzato', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'connection refused' } })

      const res = await POST(req({
        action: 'manda_in_prova', data_rientro_prevista: '2026-08-01',
      }) as never, { params })

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).not.toMatch(/connection refused/)
    })

    it('senza data_rientro_prevista → 400, RPC MAI chiamata', async () => {
      const res = await POST(req({ action: 'manda_in_prova' }) as never, { params })

      expect(res.status).toBe(400)
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('action: registra_rientro', () => {
    const basePayload = { action: 'registra_rientro', prova_id: 'prova-1', esito: 'ok', note_dentista: 'ok' }

    it.each([
      ['ok', 'in_lavorazione'],
      ['modifiche', 'in_lavorazione'],
      ['sospeso', 'sospeso'],
      ['rifare', 'annullato'],
    ])('esito=%s → stato destinazione %s, RPC chiamata con p_stato_destinazione corretto, 200 + push', async (esito, statoAtteso) => {
      mockRpc.mockResolvedValue({
        data: { stato: statoAtteso, tecnico_id: 'tecnico-1', numero_lavoro: 'LAV-042' },
        error: null,
      })
      tecniciResult = { data: { utente_id: 'user-tecnico-1' }, error: null }

      const res = await POST(req({ ...basePayload, esito }) as never, { params })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ esito, stato: statoAtteso })
      expect(mockRpc).toHaveBeenCalledWith('registra_rientro_atomico', {
        p_lavoro_id: LAVORO_ID,
        p_laboratorio_id: LAB_ID,
        p_prova_id: 'prova-1',
        p_esito: esito,
        p_note: 'ok',
        p_stato_destinazione: statoAtteso,
        p_user_id: USER_ID,
        p_nuova_data_consegna: null,
      })
      // push chiamata con l'utente_id risolto da tecnici.utente_id (NON tecnico_id
      // grezzo) — numero_lavoro preso dal payload della RPC
      expect(mockTriggerPushToUser).toHaveBeenCalledWith(
        'user-tecnico-1',
        LAB_ID,
        expect.objectContaining({ body: expect.stringContaining('LAV-042') }),
      )
    })

    it('legacy in_ritardo→in_lavorazione: RPC ok → 200 + push con utente_id risolto/numero_lavoro dal payload RPC', async () => {
      mockRpc.mockResolvedValue({
        data: { stato: 'in_lavorazione', tecnico_id: 'tecnico-9', numero_lavoro: 'LAV-099' },
        error: null,
      })
      tecniciResult = { data: { utente_id: 'user-tecnico-9' }, error: null }

      const res = await POST(req({ ...basePayload, esito: 'ok' }) as never, { params })

      expect(res.status).toBe(200)
      expect(mockTriggerPushToUser).toHaveBeenCalledWith(
        'user-tecnico-9', LAB_ID, expect.objectContaining({ body: expect.stringContaining('LAV-099') }),
      )
    })

    it('tecnico_id risolto via tecnici.utente_id: triggerPushToUser chiamato con utente_id, NON tecnico_id grezzo (fix N-push-prove)', async () => {
      mockRpc.mockResolvedValue({
        data: { stato: 'in_lavorazione', tecnico_id: 'tec-1', numero_lavoro: 'LAV-1' },
        error: null,
      })
      tecniciResult = { data: { utente_id: 'user-9' }, error: null }

      const res = await POST(req(basePayload) as never, { params })

      expect(res.status).toBe(200)
      expect(mockTriggerPushToUser).toHaveBeenCalledWith(
        'user-9',
        LAB_ID,
        expect.objectContaining({ title: expect.stringContaining('Prova rientrata'), url: `/lavori/${LAVORO_ID}` }),
      )
      expect(mockTriggerPushToUser).not.toHaveBeenCalledWith('tec-1', expect.anything(), expect.anything())
    })

    it('tecnico senza account utente collegato (utente_id null) → triggerPushToUser MAI chiamato, risposta comunque 200', async () => {
      mockRpc.mockResolvedValue({
        data: { stato: 'in_lavorazione', tecnico_id: 'tec-2', numero_lavoro: 'LAV-2' },
        error: null,
      })
      tecniciResult = { data: { utente_id: null }, error: null }

      const res = await POST(req(basePayload) as never, { params })

      expect(res.status).toBe(200)
      expect(mockTriggerPushToUser).not.toHaveBeenCalled()
    })

    it('errore nella select tecnici (es. eccezione di rete) → catturato, risposta comunque 200, nessuna push', async () => {
      mockRpc.mockResolvedValue({
        data: { stato: 'in_lavorazione', tecnico_id: 'tec-3', numero_lavoro: 'LAV-3' },
        error: null,
      })
      mockFrom.mockImplementation((table: string) => {
        if (table === 'lavori') return lavoriChain({ data: { id: LAVORO_ID }, error: null })
        if (table === 'tecnici') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    single: async () => { throw new Error('connessione rifiutata') },
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      })

      const res = await POST(req(basePayload) as never, { params })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ esito: 'ok', stato: 'in_lavorazione' })
      expect(mockTriggerPushToUser).not.toHaveBeenCalled()
    })

    it('nuova_data_consegna passata dal client → inoltrata come p_nuova_data_consegna alla RPC', async () => {
      mockRpc.mockResolvedValue({
        data: { stato: 'in_lavorazione', tecnico_id: null, numero_lavoro: 'LAV-1' },
        error: null,
      })

      await POST(req({ ...basePayload, esito: 'ok', nuova_data_consegna: '2026-09-01' }) as never, { params })

      expect(mockRpc).toHaveBeenCalledWith('registra_rientro_atomico', expect.objectContaining({
        p_nuova_data_consegna: '2026-09-01',
      }))
    })

    it('nuova_data_consegna stringa vuota → p_nuova_data_consegna: null (parità col comportamento odierno, no-op)', async () => {
      mockRpc.mockResolvedValue({
        data: { stato: 'in_lavorazione', tecnico_id: null, numero_lavoro: 'LAV-1' },
        error: null,
      })

      await POST(req({ ...basePayload, esito: 'ok', nuova_data_consegna: '' }) as never, { params })

      expect(mockRpc).toHaveBeenCalledWith('registra_rientro_atomico', expect.objectContaining({
        p_nuova_data_consegna: null,
      }))
    })

    it('senza tecnico_id nel payload RPC → nessuna push', async () => {
      mockRpc.mockResolvedValue({
        data: { stato: 'in_lavorazione', tecnico_id: null, numero_lavoro: 'LAV-1' },
        error: null,
      })

      const res = await POST(req(basePayload) as never, { params })

      expect(res.status).toBe(200)
      expect(mockTriggerPushToUser).not.toHaveBeenCalled()
    })

    it('RPC UA409 (transizione non consentita, es. prova orfana) → 409 E nessun update parziale su lavoro_prove', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: 'UA409', message: 'transizione non consentita da pronto a in_lavorazione' },
      })

      const res = await POST(req(basePayload) as never, { params })

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toBe('transizione non consentita da pronto a in_lavorazione')
      // Comportamento NUOVO (deviazione dichiarata, brief Step 1 caso 6): il mock
      // di from('lavoro_prove').update NON deve essere chiamato — la route non
      // tocca più lavoro_prove direttamente, tutto passa dalla RPC atomica.
      expect(lavoroProveUpdate).not.toHaveBeenCalled()
      expect(mockTriggerPushToUser).not.toHaveBeenCalled()
    })

    it('RPC UA404 (lavoro non trovato/fuori tenant) → 404 stesso messaggio odierno, nessun update parziale', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'UA404', message: 'lavoro non trovato' } })

      const res = await POST(req(basePayload) as never, { params })

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body).toEqual({ error: 'Lavoro non trovato o accesso negato' })
      expect(lavoroProveUpdate).not.toHaveBeenCalled()
    })

    it('RPC 23514 (CHECK esito backstop) → 400/422 coerente, mai 500', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'check violation' } })

      const res = await POST(req(basePayload) as never, { params })

      expect([400, 422]).toContain(res.status)
    })

    it('RPC errore generico → 500 sanitizzato, mai il messaggio Postgres grezzo', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'connection refused' } })

      const res = await POST(req(basePayload) as never, { params })

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).not.toMatch(/connection refused/)
      expect(lavoroProveUpdate).not.toHaveBeenCalled()
    })

    it('esito non valido → 400, RPC MAI chiamata', async () => {
      const res = await POST(req({ ...basePayload, esito: 'forse' }) as never, { params })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('esito non valido: forse')
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  it('action non valida → 400', async () => {
    const res = await POST(req({ action: 'boh' }) as never, { params })
    expect(res.status).toBe(400)
  })

  it('guard cross-tenant: lavoro non trovato → 404 prima di qualunque RPC', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return lavoriChain({ data: null, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await POST(req({ action: 'manda_in_prova', data_rientro_prevista: '2026-08-01' }) as never, { params })

    expect(res.status).toBe(404)
    expect(mockRpc).not.toHaveBeenCalled()
  })
})
