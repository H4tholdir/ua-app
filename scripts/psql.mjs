// Ponte SQL verso il database del progetto — UNA connessione, e stampa l'esito
// di OGNI istruzione, errori compresi, senza fermarsi al primo.
//
//   node scripts/psql.mjs <file.sql>
//   node scripts/psql.mjs -c "SELECT 1"
//
// 🔑 PERCHÉ STA SOTTO GIT E NON IN scripts/tmp/ (05/08/2026): `scripts/tmp/` è
//    ignorato, quindi ogni sessione riscriveva questo attrezzo da capo e le
//    misure fatte con esso non erano riproducibili. Un attrezzo che sparisce
//    trasforma una misura in un'affermazione.
//
// ⚠️ NON contiene credenziali: legge `SUPABASE_DB_URL` da `.env.local`, che è
//    fuori da git. Senza quella variabile non fa niente e lo dice.
//
// 🛑 PARLA COL DATABASE VERO. Per provare vincoli si usa una TRANSAZIONE
//    ANNULLATA (`BEGIN; … ROLLBACK;`), e dentro una transazione servono i PUNTI
//    DI RIPRISTINO (`SAVEPOINT` + `ROLLBACK TO`): al primo errore Postgres
//    annulla tutto il resto e le istruzioni successive vengono **ignorate in
//    silenzio** — otto su undici, misurato il 05/08/2026. Un verde dopo un
//    errore non è un verde: è un'istruzione mai eseguita.
import { readFileSync } from 'node:fs'
import pg from 'pg'

function leggiUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const riga = env.split('\n').find((r) => r.startsWith('SUPABASE_DB_URL='))
  if (!riga) throw new Error('SUPABASE_DB_URL non trovata in .env.local')
  return riga.slice('SUPABASE_DB_URL='.length).trim().replace(/^["']|["']$/g, '')
}

const arg = process.argv[2]
if (!arg) {
  console.error('uso: node scripts/psql.mjs <file.sql>  |  node scripts/psql.mjs -c "SQL"')
  process.exit(2)
}
const sql = arg === '-c' ? process.argv[3] : readFileSync(arg, 'utf8')

const client = new pg.Client({ connectionString: leggiUrl(), ssl: { rejectUnauthorized: false } })
await client.connect()

let uscita = 0
try {
  // `simple query protocol`: un solo giro, più istruzioni, un risultato per ognuna.
  const risultati = await client.query(sql)
  const elenco = Array.isArray(risultati) ? risultati : [risultati]
  elenco.forEach((r, i) => {
    const etichetta = `[${i + 1}] ${r.command ?? '?'}`
    if (r.rows?.length) {
      console.log(`${etichetta} — ${r.rows.length} righe`)
      console.table(r.rows)
    } else {
      console.log(`${etichetta} — ${r.rowCount ?? 0} righe toccate`)
    }
  })
} catch (e) {
  // 🛑 L'errore si STAMPA e l'uscita è diversa da zero: un ponte che ingoia
  //    l'errore fa sembrare provata una cosa che non è avvenuta.
  console.error(`❌ ${e.code ?? ''} ${e.message}`)
  if (e.detail) console.error(`   dettaglio: ${e.detail}`)
  if (e.hint) console.error(`   suggerimento: ${e.hint}`)
  uscita = 1
} finally {
  await client.end()
}
process.exit(uscita)
