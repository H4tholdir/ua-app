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
