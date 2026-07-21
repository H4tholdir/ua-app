import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(), mockFrom: vi.fn(), mockRpc: vi.fn(),
}))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))

import { POST } from '../../src/app/api/lavori/[id]/annulla-consegna/route'
import { FINESTRA_ANNULLO_MS } from '@/lib/consegna/costanti'

function req() {
  return new Request('http://localhost/api/lavori/lav-1/annulla-consegna', {
    method: 'POST', headers: { origin: 'http://localhost', host: 'localhost' },
  }) as never
}
const ctx = { params: Promise.resolve({ id: 'lav-1' }) }

/**
 * Mock di `.rpc()` che riproduce la pigrizia di `PostgrestFilterBuilder`
 * (`dispatched` diventa `true` SOLO dentro `then()`) — stesso pattern di
 * `tests/unit/parco.test.ts` / `tests/unit/rpc-retry.test.ts` /
 * `tests/unit/lavori-id-cassetta-route.test.ts`. Instrada per NOME di
 * funzione perché, dopo il Task 8, questa route chiama DUE RPC diverse nello
 * stesso POST (`annulla_consegna_atomica` e, solo dopo un esito `ok`,
 * `cassetta_riassegna_post_annullo`).
 *
 * Una RPC chiamata ma non prevista dalla `sequenze` del test viene comunque
 * REGISTRATA in `chiamate` (prima di "fallire" dentro `then()`): un test che
 * vuole provare «questa RPC non viene mai chiamata» deve poter ispezionare
 * `chiamate`, non fidarsi del fatto che il fail-soft della route ingoierebbe
 * comunque l'eccezione (lezione Task 7/8: un'asserzione debole passerebbe per
 * il motivo sbagliato).
 */
function mockRpcLazy(sequenze: Record<string, Array<{ data: unknown; error: unknown }>>) {
  const indici: Record<string, number> = {}
  const chiamate: Array<{ fn: string; args: unknown; dispatched: boolean }> = []
  const rpc = (fn: string, args: unknown) => {
    const chiamata = { fn, args, dispatched: false }
    chiamate.push(chiamata)
    const seq = sequenze[fn]
    return {
      then(resolve: (v: { data: unknown; error: unknown }) => void) {
        chiamata.dispatched = true
        if (!seq) throw new Error(`RPC inattesa nel test: ${fn}`)
        const i = indici[fn] ?? 0
        indici[fn] = i + 1
        resolve(seq[i] ?? seq[seq.length - 1])
      },
    }
  }
  return { rpc, chiamate }
}

describe('POST /api/lavori/[id]/annulla-consegna', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', ruolo: 'titolare', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('chiama la RPC con la finestra condivisa (10 min)', async () => {
    const { rpc } = mockRpcLazy({
      annulla_consegna_atomica: [{ data: { esito: 'ok', ddc_assente: false }, error: null }],
      cassetta_riassegna_post_annullo: [{ data: { esito: 'niente_da_riassegnare' }, error: null }],
    })
    mockRpc.mockImplementation(rpc)
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('annulla_consegna_atomica', {
      p_lavoro_id: 'lav-1', p_laboratorio_id: 'lab-1', p_finestra_ms: FINESTRA_ANNULLO_MS,
    })
  })

  const casi: Array<[string, number]> = [
    ['non_trovato', 404], ['non_consegnato', 400], ['finestra_scaduta', 400],
    ['fattura_gia_emessa', 409],
  ]
  for (const [esito, status] of casi) {
    it(`esito ${esito} → ${status}, e la riassegnazione cassetta NON viene mai chiamata (e)`, async () => {
      const { rpc, chiamate } = mockRpcLazy({ annulla_consegna_atomica: [{ data: { esito }, error: null }] })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(), ctx)
      expect(res.status).toBe(status)
      expect(chiamate.some((c) => c.fn === 'cassetta_riassegna_post_annullo')).toBe(false)
    })
  }

  it('errore RPC → 500 senza leak del messaggio Postgres, e la riassegnazione cassetta NON viene mai chiamata (e)', async () => {
    const { rpc, chiamate } = mockRpcLazy({
      annulla_consegna_atomica: [{ data: null, error: { message: 'duplicate key value violates...' } }],
    })
    mockRpc.mockImplementation(rpc)
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('duplicate key')
    expect(chiamate.some((c) => c.fn === 'cassetta_riassegna_post_annullo')).toBe(false)
  })

  it('esito ignoto → 500, e la riassegnazione cassetta NON viene mai chiamata (e)', async () => {
    const { rpc, chiamate } = mockRpcLazy({
      annulla_consegna_atomica: [{ data: { esito: 'fattura_in_emissione' }, error: null }],
    })
    mockRpc.mockImplementation(rpc)
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    expect(chiamate.some((c) => c.fn === 'cassetta_riassegna_post_annullo')).toBe(false)
  })

  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(401)
  })

  describe('Task 8 — riassegnazione cassetta dopo esito ok (response additiva)', () => {
    it("(a) esito 'riassegnata' → response con cassetta:{riassegnata:true, nome}, chiamata con {p_lab, p_lavoro}", async () => {
      const { rpc, chiamate } = mockRpcLazy({
        annulla_consegna_atomica: [{ data: { esito: 'ok' }, error: null }],
        cassetta_riassegna_post_annullo: [{ data: { esito: 'riassegnata', nome: 'C12' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(), ctx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        ok: true,
        messaggio: 'Consegna annullata — lavoro riportato a Pronto',
        cassetta: { riassegnata: true, nome: 'C12' },
      })
      const chiamataRiassegna = chiamate.find((c) => c.fn === 'cassetta_riassegna_post_annullo')
      expect(chiamataRiassegna?.args).toEqual({ p_lab: 'lab-1', p_lavoro: 'lav-1' })
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it("(b) esito 'occupata_nel_frattempo' → response con cassetta:{riassegnata:false, nome}", async () => {
      const { rpc } = mockRpcLazy({
        annulla_consegna_atomica: [{ data: { esito: 'ok' }, error: null }],
        cassetta_riassegna_post_annullo: [{ data: { esito: 'occupata_nel_frattempo', nome: 'C12' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(), ctx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        ok: true,
        messaggio: 'Consegna annullata — lavoro riportato a Pronto',
        cassetta: { riassegnata: false, nome: 'C12' },
      })
    })

    it("(c) esito 'niente_da_riassegnare' → campo cassetta ASSENTE dalla response, e un console.warn (NON error, review Minor M1: la causa può essere benigna)", async () => {
      const { rpc } = mockRpcLazy({
        annulla_consegna_atomica: [{ data: { esito: 'ok' }, error: null }],
        cassetta_riassegna_post_annullo: [{ data: { esito: 'niente_da_riassegnare' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(), ctx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ ok: true, messaggio: 'Consegna annullata — lavoro riportato a Pronto' })
      expect('cassetta' in json).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalled()
      // M1: un laboratorio senza parete vedrebbe QUESTO esito ad ogni annullo —
      // non deve accendere il livello error, altrimenti smette di essere un segnale.
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('(d) la RPC di riassegnazione torna un OGGETTO errore (postgrest-js non lancia) → fail-soft: annullo resta ok, campo cassetta ASSENTE, loggato', async () => {
      const { rpc } = mockRpcLazy({
        annulla_consegna_atomica: [{ data: { esito: 'ok' }, error: null }],
        cassetta_riassegna_post_annullo: [{ data: null, error: { message: 'boom', code: '55555' } }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(), ctx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ ok: true, messaggio: 'Consegna annullata — lavoro riportato a Pronto' })
      expect('cassetta' in json).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('esito ignoto dalla RPC di riassegnazione → fail-soft: campo cassetta ASSENTE, loggato (mai un successo silenzioso su un esito futuro non mappato)', async () => {
      const { rpc } = mockRpcLazy({
        annulla_consegna_atomica: [{ data: { esito: 'ok' }, error: null }],
        cassetta_riassegna_post_annullo: [{ data: { esito: 'lavoro_non_valido' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(), ctx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect('cassetta' in json).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('eccezione di rete reale (throw, non oggetto errore) sulla riassegnazione → catch esterno, campo cassetta ASSENTE, loggato, annullo resta ok', async () => {
      mockRpc.mockImplementation((fn: string) => {
        if (fn === 'annulla_consegna_atomica') return Promise.resolve({ data: { esito: 'ok' }, error: null })
        if (fn === 'cassetta_riassegna_post_annullo') throw new Error('rete giù')
        throw new Error(`RPC inattesa: ${fn}`)
      })
      const res = await POST(req(), ctx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect('cassetta' in json).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('retry sul 40P01 (contratto migration — R-C): primo tentativo deadlock, secondo riassegnata → response con cassetta, RPC dispatched 2 volte', async () => {
      vi.useFakeTimers()
      const { rpc, chiamate } = mockRpcLazy({
        annulla_consegna_atomica: [{ data: { esito: 'ok' }, error: null }],
        cassetta_riassegna_post_annullo: [
          { data: null, error: { code: '40P01', message: 'deadlock detected' } },
          { data: { esito: 'riassegnata', nome: 'C9' }, error: null },
        ],
      })
      mockRpc.mockImplementation(rpc)
      const promessa = POST(req(), ctx)
      await vi.advanceTimersByTimeAsync(1000)
      const res = await promessa
      vi.useRealTimers()

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.cassetta).toEqual({ riassegnata: true, nome: 'C9' })
      const chiamateRiassegna = chiamate.filter((c) => c.fn === 'cassetta_riassegna_post_annullo')
      expect(chiamateRiassegna).toHaveLength(2)
      expect(chiamateRiassegna[0].dispatched).toBe(true)
      expect(chiamateRiassegna[1].dispatched).toBe(true)
    })
  })
})
