// Bundle T (review A18): i campi *_url dei laboratori sono URL che il server
// poi FETCHA (hash firma DdC, immagini react-pdf in DdcTemplate) — accettare
// valori arbitrari a scrittura sarebbe SSRF via PATCH /api/impostazioni
// (es. http://169.254.169.254/). Unico valore legittimo: un file nello
// storage PUBBLICO del progetto Supabase. Fail-closed se l'env manca.
export function isPublicStorageUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return false
  return value.startsWith(`${base.replace(/\/+$/, '')}/storage/v1/object/public/`)
}
