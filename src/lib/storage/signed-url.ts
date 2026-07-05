import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Genera un URL firmato per un file su Storage privato. Va sempre chiamato
 * al momento dell'uso (click/render) — un URL firmato scade, non va mai
 * salvato in DB.
 */
export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds: number
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
