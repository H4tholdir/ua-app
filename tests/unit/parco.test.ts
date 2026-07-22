import { describe, it, expect, vi, afterEach } from 'vitest'
import { getParete } from '@/lib/cassette/parco'
import { createChain } from './helpers/supabase-chain-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Mock di `.rpc()` che riproduce la pigrizia di `PostgrestFilterBuilder`
 * (review Task 3, Critical #1): un `vi.fn().mockResolvedValue(...)` classico
 * registra la chiamata nel momento stesso in cui `svc.rpc(...)` viene
 * invocato — anche se il chiamante la scartasse con `void` — quindi NON
 * distinguerebbe «chiamata registrata» da «richiesta spedita». Qui
 * `dispatched` diventa `true` SOLO dentro `then()`, esattamente come nel
 * client reale: se il codice tornasse a `void svc.rpc(...)`, `then()` non
 * verrebbe mai invocato e questi test lo prenderebbero (dispatched: false).
 */
function mockRpcLazy(risultato: { data: unknown; error: unknown }) {
  const chiamate: Array<{ args: unknown[]; dispatched: boolean }> = []
  const rpc = (...args: unknown[]) => {
    const chiamata = { args, dispatched: false }
    chiamate.push(chiamata)
    return {
      then(resolve: (v: unknown) => void) {
        chiamata.dispatched = true
        resolve(risultato)
      },
    }
  }
  return { rpc, chiamate }
}

const rawLavoro = (over: Partial<{ stato: string }>) => ({
  id: 'l1', numero_lavoro: '144', stato: 'in_lavorazione', deleted_at: null,
  descrizione: null, tipo_dispositivo: null, clienti: null, pazienti: null,
  ...over,
})

const cassetta = { id: 'c1', nome: 'C1', colore: 'bianca', posizione: 0, created_at: '2026-07-21T00:00:00Z' }
const rigaViva = { cassetta_id: 'c1', lavoro_id: 'l1' }

describe('getParete — auto-riparazione (Task 3, fix post-review: Critical #1, Critical #2, Important #3)', () => {
  // Minor #12 (review Task 3): senza questo restore, uno spy su console.error
  // lasciato attivo da un test silenzierebbe i log di un test successivo
  // aggiunto in seguito, senza che nessuno se ne accorga (vitest isola per
  // file, non per test — un solo file basta a far scattare la trappola).
  afterEach(() => vi.restoreAllMocks())

  it('la riparazione parte davvero: riga viva su lavoro consegnato → RPC dispatched con p_motivo "consegna"', async () => {
    const { rpc, chiamate } = mockRpcLazy({ data: { esito: 'ok', nome: 'C1' }, error: null })
    const svc = {
      from: (tabella: string) => {
        if (tabella === 'cassette') return createChain({ data: [cassetta], error: null })
        if (tabella === 'cassette_lavori') return createChain({ data: [rigaViva], error: null })
        if (tabella === 'lavori') return createChain({ data: [rawLavoro({ stato: 'consegnato' })], error: null })
        throw new Error(`tabella inattesa nel mock: ${tabella}`)
      },
      rpc,
    } as unknown as SupabaseClient

    const parete = await getParete(svc, 'lab-1')

    expect(parete[0].lavoro).toBeNull() // già resa libera in questa risposta (deriveParete, sincrono)
    expect(chiamate).toHaveLength(1)
    // La prova che Critical #1 non torni: then() è stato davvero invocato,
    // non solo la funzione rpc() chiamata.
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[0].args).toEqual(['cassetta_libera_atomica', { p_lab: 'lab-1', p_lavoro: 'l1', p_motivo: 'consegna' }])
  })

  it('il motivo viaggia per-id: riga viva su lavoro annullato → RPC dispatched con p_motivo "annullo_lavoro"', async () => {
    const { rpc, chiamate } = mockRpcLazy({ data: { esito: 'ok', nome: 'C1' }, error: null })
    const svc = {
      from: (tabella: string) => {
        if (tabella === 'cassette') return createChain({ data: [cassetta], error: null })
        if (tabella === 'cassette_lavori') return createChain({ data: [rigaViva], error: null })
        if (tabella === 'lavori') return createChain({ data: [rawLavoro({ stato: 'annullato' })], error: null })
        throw new Error(`tabella inattesa nel mock: ${tabella}`)
      },
      rpc,
    } as unknown as SupabaseClient

    await getParete(svc, 'lab-1')

    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].dispatched).toBe(true)
    // Guardia R-B al livello di IO (finora esisteva solo su deriveParete):
    // un lavoro annullato NON deve MAI chiudere con 'consegna'.
    expect(chiamate[0].args).toEqual(['cassetta_libera_atomica', { p_lab: 'lab-1', p_lavoro: 'l1', p_motivo: 'annullo_lavoro' }])
  })

  it('il guard regge: query "lavori" in errore → zero chiamate RPC, la parete torna comunque (degradazione di sola lettura)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rpc, chiamate } = mockRpcLazy({ data: { esito: 'ok', nome: null }, error: null })
    const svc = {
      from: (tabella: string) => {
        if (tabella === 'cassette') return createChain({ data: [cassetta], error: null })
        if (tabella === 'cassette_lavori') return createChain({ data: [rigaViva], error: null })
        if (tabella === 'lavori') return createChain({ data: null, error: { message: 'query lavori abortita' } })
        throw new Error(`tabella inattesa nel mock: ${tabella}`)
      },
      rpc,
    } as unknown as SupabaseClient

    const parete = await getParete(svc, 'lab-1')

    expect(parete).toHaveLength(1) // fail-soft: la lettura non si blocca
    expect(parete[0].lavoro).toBeNull() // degradazione visibile SOLO in lettura: mostrata libera
    expect(chiamate).toHaveLength(0) // ma NESSUNA scrittura — il guard di Critical #2 ha tenuto
  })

  // Minor #13 (review Task 3): dispatch, guard e motivo per-id erano coperti;
  // mancava l'unica asserzione sul ramo di logging di Important #3 — un
  // `esito` diverso da 'ok' (o un `error` dalla RPC) deve produrre davvero il
  // `console.error` di `parco.ts`, non restare ingoiato in silenzio.
  it('esito RPC diverso da "ok" → console.error, non ingoiato in silenzio (Important #3)', async () => {
    const erroreSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rpc } = mockRpcLazy({ data: { esito: 'motivo_non_valido' }, error: null })
    const svc = {
      from: (tabella: string) => {
        if (tabella === 'cassette') return createChain({ data: [cassetta], error: null })
        if (tabella === 'cassette_lavori') return createChain({ data: [rigaViva], error: null })
        if (tabella === 'lavori') return createChain({ data: [rawLavoro({ stato: 'consegnato' })], error: null })
        throw new Error(`tabella inattesa nel mock: ${tabella}`)
      },
      rpc,
    } as unknown as SupabaseClient

    await getParete(svc, 'lab-1')

    expect(erroreSpy).toHaveBeenCalledWith(
      expect.stringContaining('esito inatteso per il lavoro l1'),
      { esito: 'motivo_non_valido' },
    )
  })
})
