### Task 2: Helper paginazione — `src/lib/utils/paginate.ts`

**Files:**
- Create: `src/lib/utils/paginate.ts`
- Test: `tests/unit/paginate.test.ts`

**Interfaces:**
- Produces: `type PageResult<T> = { data: T[] | null; error: { message: string } | null }` · `fetchAllPages<T>(getPage: (from: number, to: number) => PromiseLike<PageResult<T>>, pageSize?: number): Promise<{ data: T[]; error: string | null }>`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/paginate.test.ts --reporter=dot`
Expected: FAIL — modulo inesistente.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/utils/paginate.ts
// Bundle E: PostgREST (db-max-rows, default Supabase = 1000) tronca ogni
// risposta a 1000 righe in silenzio. Gli export leggono a pagine finché una
// torna corta. Fail-closed: al primo errore si ferma e lo propaga — un CSV
// parziale silenzioso è peggio di un errore.
export type PageResult<T> = { data: T[] | null; error: { message: string } | null }

export async function fetchAllPages<T>(
  getPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000
): Promise<{ data: T[]; error: string | null }> {
  const all: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getPage(from, from + pageSize - 1)
    if (error) return { data: [], error: error.message }
    const page = data ?? []
    all.push(...page)
    if (page.length < pageSize) break
  }
  return { data: all, error: null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/paginate.test.ts --reporter=dot`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/paginate.ts tests/unit/paginate.test.ts
git commit -m "feat(export): fetchAllPages — paginazione fail-closed oltre il cap PostgREST"
```

---

