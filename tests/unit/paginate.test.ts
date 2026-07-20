// tests/unit/paginate.test.ts
// Bundle E: PostgREST (db-max-rows=1000 su Supabase) tronca a 1000 righe in
// silenzio — fetchAllPages legge a pagine finché una torna corta, fail-closed.
import { describe, it, expect, vi } from 'vitest'
import { fetchAllPages } from '@/lib/utils/paginate'

const righe = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: offset + i }))

describe('fetchAllPages', () => {
  it('una pagina corta: una sola chiamata, range 0-999', async () => {
    const getPage = vi.fn(async () => ({ data: righe(3), error: null }))
    const res = await fetchAllPages(getPage)
    expect(res).toEqual({ data: righe(3), error: null })
    expect(getPage).toHaveBeenCalledTimes(1)
    expect(getPage).toHaveBeenCalledWith(0, 999)
  })

  it('pagina piena da 1000 → continua: 1000+1000+2 = 2002 righe, 3 chiamate', async () => {
    const getPage = vi.fn(async (from: number) => {
      if (from === 0) return { data: righe(1000, 0), error: null }
      if (from === 1000) return { data: righe(1000, 1000), error: null }
      return { data: righe(2, 2000), error: null }
    })
    const res = await fetchAllPages(getPage)
    expect(res.error).toBeNull()
    expect(res.data).toHaveLength(2002)
    expect(res.data[2001]).toEqual({ id: 2001 })
    expect(getPage).toHaveBeenNthCalledWith(3, 2000, 2999)
  })

  it('pagina esattamente vuota dopo una piena: si ferma senza errore', async () => {
    const getPage = vi.fn(async (from: number) =>
      from === 0 ? { data: righe(1000), error: null } : { data: [], error: null }
    )
    const res = await fetchAllPages(getPage)
    expect(res.data).toHaveLength(1000)
    expect(getPage).toHaveBeenCalledTimes(2)
  })

  it('errore su una pagina: fail-closed, data vuota + messaggio', async () => {
    const getPage = vi.fn(async (from: number) =>
      from === 0
        ? { data: righe(1000), error: null }
        : { data: null, error: { message: 'boom' } }
    )
    const res = await fetchAllPages(getPage)
    expect(res).toEqual({ data: [], error: 'boom' })
  })

  it('pageSize custom rispettato', async () => {
    const getPage = vi.fn(async () => ({ data: righe(1), error: null }))
    await fetchAllPages(getPage, 50)
    expect(getPage).toHaveBeenCalledWith(0, 49)
  })
})
