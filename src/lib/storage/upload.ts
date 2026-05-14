import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Carica un file su Supabase Storage e restituisce la public URL.
 *
 * @param supabase  - Client Supabase (service role o anon con policy)
 * @param bucket    - Nome del bucket (es. 'documenti')
 * @param path      - Path nel bucket (es. 'lavori/abc/1234567890.jpg')
 * @param data      - File, Buffer o ArrayBuffer da caricare
 * @param contentType - MIME type (es. 'image/jpeg')
 * @returns La public URL del file caricato
 */
export async function uploadToStorage(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  data: File | Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, data, {
      contentType,
      upsert: false,
    })

  if (error) {
    throw new Error(`Storage upload fallito: ${error.message}`)
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

  if (!urlData?.publicUrl) {
    throw new Error(`Impossibile ottenere la public URL per: ${path}`)
  }

  return urlData.publicUrl
}
