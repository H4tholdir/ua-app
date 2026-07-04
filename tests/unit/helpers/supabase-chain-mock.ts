export interface ChainCall {
  method: string
  args: unknown[]
}

export interface MockChain {
  calls: ChainCall[]
  [method: string]: unknown
}

/**
 * Mock di una query-chain Supabase (`.select().eq().is().or()...`) che
 * registra ogni chiamata con i suoi argomenti in `chain.calls`, per poter
 * asserire nei test che lo scoping tenant (`.eq('laboratorio_id', labId)`)
 * o il filtro di ricerca (`.or(...)`) siano stati invocati con i valori
 * esatti attesi — non solo che la route risponda con lo status corretto.
 *
 * `single`/`maybeSingle` risolvono direttamente `result` (terminano la
 * chain, come nel client reale). `overrideTypes`/`not`/`gte`/`lt` sono
 * passthrough (nessun runtime da simulare, solo tipizzazione o filtri
 * aggiuntivi che il mock non deve validare).
 */
export function createChain(result: { data: unknown; error: unknown }): MockChain {
  const calls: ChainCall[] = []
  const passthroughMethods = [
    'select', 'eq', 'is', 'or', 'order', 'limit', 'not', 'gte', 'lt', 'overrideTypes',
  ] as const
  const resolvingMethods = ['single', 'maybeSingle'] as const
  const c: MockChain = { calls }
  for (const m of passthroughMethods) {
    c[m] = (...args: unknown[]) => {
      calls.push({ method: m, args })
      return c
    }
  }
  for (const m of resolvingMethods) {
    c[m] = async (...args: unknown[]) => {
      calls.push({ method: m, args })
      return result
    }
  }
  c.then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}
