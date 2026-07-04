import { Client } from 'pg'

/**
 * true se SUPABASE_DB_URL non è configurata — i test di integrazione si
 * saltano invece di fallire, così `npm test`/CI restano invariati senza
 * questa variabile (che espone una credenziale diretta al DB, non solo
 * l'anon/service-role key REST già usate altrove nel progetto).
 */
export const skipIntegrationTests = !process.env.SUPABASE_DB_URL

/**
 * Esegue `run` dentro una transazione sempre annullata: `BEGIN` prima,
 * `ROLLBACK` sempre in un `finally` — anche se `run` (o un'asserzione al
 * suo interno) lancia un errore. Nessuna scrittura del test sopravvive,
 * indipendentemente dall'esito. Stesso principio delle verifiche manuali
 * usate per scoprire e verificare il fix del bug critico in
 * salva_fasi_ciclo_atomico() durante B18 — qui reso ripetibile.
 */
export async function withRollback<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL })
  await client.connect()
  try {
    await client.query('BEGIN')
    return await run(client)
  } finally {
    await client.query('ROLLBACK').catch(() => {})
    await client.end()
  }
}
