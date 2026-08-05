import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Carica un file su Supabase Storage.
 *
 * 🛑 NON restituisce più una URL, e la ragione non è di stile — è **R20**, il
 *    rischio già censito: questa funzione costruiva la «public URL» del file e
 *    la rotta la salvava in `lavori_immagini.url`. Ma il bucket `documenti` è
 *    **privato**, quindi quell'indirizzo non ha mai funzionato — misurato prima
 *    di toglierlo: **5 righe su 5** portavano una URL `/object/public/…` su un
 *    bucket `public = false`. Nessuna di quelle URL era raggiungibile, e
 *    nessuna avrebbe potuto esserlo.
 *
 * 🔑 Il danno non era il valore inutile: era **la riga stessa**. Una colonna
 *    che si chiama `url` e contiene un indirizzo pubblico è l'invito scritto
 *    alla correzione che distrugge tutto — «*le foto non si vedono? rendiamo
 *    pubblico il bucket*» — e questo progetto un bucket pubblico ce l'ha
 *    davvero (`brand`), con cui confonderla. Tolta la colonna (D236,
 *    05/08/2026), quella tentazione non ha più dove nascere.
 *
 * ➡️ Per MOSTRARE un file si firma una URL al momento, con la sua scadenza:
 *    `getSignedUrl` (`src/lib/storage/signed-url.ts`). Una URL si firma, non si
 *    conserva: quella conservata o scade, o è pubblica su un bucket che non lo è.
 *
 * @param supabase    - Client Supabase (service role o anon con policy)
 * @param bucket      - Nome del bucket (es. 'documenti')
 * @param path        - Path nel bucket (es. 'lavori/abc/1234567890.jpg')
 * @param data        - File, Buffer o ArrayBuffer da caricare
 * @param contentType - MIME type (es. 'image/jpeg')
 */
export async function uploadToStorage(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  data: File | Buffer | ArrayBuffer,
  contentType: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, data, {
      contentType,
      upsert: false,
    })

  if (error) {
    throw new Error(`Storage upload fallito: ${error.message}`)
  }
}
