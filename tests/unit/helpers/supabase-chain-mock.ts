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
 */
export function createChain(result: { data: unknown; error: unknown }): MockChain {
  const calls: ChainCall[] = []
  const methods = ['select', 'eq', 'is', 'or', 'order', 'limit'] as const
  const c: MockChain = { calls }
  for (const m of methods) {
    c[m] = (...args: unknown[]) => {
      calls.push({ method: m, args })
      return c
    }
  }
  c.then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}
