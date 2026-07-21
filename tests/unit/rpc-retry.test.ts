import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callRpcWithRetry, type RpcEsito } from '@/lib/supabase/rpc-retry'

/**
 * Mock di una thunk RPC che riproduce la pigrizia di `PostgrestFilterBuilder`
 * (stesso pattern di `tests/unit/parco.test.ts`, Critical #1 del Task 3): un
 * `vi.fn().mockResolvedValue(...)` classico risolverebbe subito, mascherando
 * la differenza fra «la thunk è stata invocata» e «la richiesta è stata
 * davvero spedita» (cioè `.then()` invocato). Qui `dispatched` diventa `true`
 * SOLO dentro `then()`: se `callRpcWithRetry` passasse a un secondo tentativo
 * riusando l'oggetto già creato invece di richiamare la thunk, questi test lo
 * prenderebbero (una sola chiamata registrata invece di due).
 */
function mockThunkLazy(sequenza: Array<RpcEsito<unknown>>) {
  const chiamate: Array<{ dispatched: boolean }> = []
  const thunk = (): PromiseLike<RpcEsito<unknown>> => {
    const indice = chiamate.length
    const chiamata = { dispatched: false }
    chiamate.push(chiamata)
    const risultato = sequenza[indice] ?? sequenza[sequenza.length - 1]
    return {
      then(resolve: (v: RpcEsito<unknown>) => void) {
        chiamata.dispatched = true
        resolve(risultato)
      },
    } as unknown as PromiseLike<RpcEsito<unknown>>
  }
  return { thunk, chiamate }
}

describe('callRpcWithRetry — retry condiviso sul 40P01 (R-C, Task 4)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ritenta davvero su 40P01: ri-invoca la thunk (non riusa la promise) e torna l\'esito del secondo tentativo', async () => {
    const { thunk, chiamate } = mockThunkLazy([
      { data: null, error: { code: '40P01', message: 'deadlock detected', details: null, hint: null } as never },
      { data: { esito: 'ok' }, error: null },
    ])

    const promessa = callRpcWithRetry(thunk)
    await vi.advanceTimersByTimeAsync(1000) // consuma il backoff breve, qualunque sia il valore esatto
    const esito = await promessa

    expect(chiamate).toHaveLength(2)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[1].dispatched).toBe(true) // prova che il SECONDO then() è stato davvero invocato
    expect(esito).toEqual({ data: { esito: 'ok' }, error: null })
  })

  it('NON ritenta su un codice diverso da 40P01 (es. 23505): un solo tentativo, esito del primo', async () => {
    const { thunk, chiamate } = mockThunkLazy([
      { data: null, error: { code: '23505', message: 'duplicate key', details: null, hint: null } as never },
    ])

    const esito = await callRpcWithRetry(thunk)

    expect(chiamate).toHaveLength(1)
    expect(esito.error).toMatchObject({ code: '23505' })
  })

  it('nessun errore al primo tentativo: un solo tentativo, nessun backoff atteso', async () => {
    const { thunk, chiamate } = mockThunkLazy([{ data: { esito: 'ok' }, error: null }])

    const esito = await callRpcWithRetry(thunk)

    expect(chiamate).toHaveLength(1)
    expect(esito).toEqual({ data: { esito: 'ok' }, error: null })
  })

  it('anche se il secondo tentativo torna di nuovo 40P01, non c\'è un terzo tentativo: un solo ritentativo (R-C)', async () => {
    const { thunk, chiamate } = mockThunkLazy([
      { data: null, error: { code: '40P01', message: 'deadlock 1', details: null, hint: null } as never },
      { data: null, error: { code: '40P01', message: 'deadlock 2', details: null, hint: null } as never },
    ])

    const promessa = callRpcWithRetry(thunk)
    await vi.advanceTimersByTimeAsync(1000)
    const esito = await promessa

    expect(chiamate).toHaveLength(2)
    expect(esito.error).toMatchObject({ code: '40P01', message: 'deadlock 2' })
  })
})
