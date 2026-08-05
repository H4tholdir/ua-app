// Guardia — la nostra lista di tipi ammessi e quella del BUCKET devono
// combaciare, in ENTRAMBE le direzioni.
//
// 🔴 IL FATTO CHE L'HA GENERATA (05/08/2026). `ALLOWED_MIME` dichiarava
//    `image/heic`; il bucket `documenti` no. Un HEIC superava il nostro
//    controllo e veniva rifiutato **dopo**, dal magazzino, con una frase
//    generica. Finché il file passava dalla funzione costava un viaggio da
//    ≤4MB; col **caricamento diretto** costa un viaggio da fino a **50MB su
//    rete mobile**, e finisce con un errore dello Storage che non è nemmeno
//    JSON. Cade per giunta sulla prescrizione, che per D237 **non si comprime**
//    — cioè esattamente sul file dell'iPhone, che è HEIC.
//
// 🔑 PERCHÉ IN ENTRAMBE LE DIREZIONI:
//    · un tipo che dichiariamo e il bucket rifiuta  → il rifiuto arriva TARDI,
//      dopo aver speso i byte (il difetto sopra);
//    · un tipo che il bucket accetta e noi no       → una funzione che c'è e
//      nessuno può usare, e nessuno se ne accorge.
//
// ⚠️ MANUALE: legge il DATABASE VIVO, quindi le servono le credenziali di
//    `.env.local` — le altre sei guardie girano sul solo codice ed è per questo
//    che sono agganciate al commit. Si lancia quando si tocca la lista dei
//    tipi, o il bucket:
//      node scripts/guardia-tipi-bucket.mjs
//    uscita 0 = liste allineate · 1 = disallineate (o credenziali assenti)

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'documenti'

function leggiEnv() {
  try {
    return Object.fromEntries(
      readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((r) => r.includes('=') && !r.trim().startsWith('#'))
        .map((r) => [
          r.slice(0, r.indexOf('=')).trim(),
          r.slice(r.indexOf('=') + 1).trim().replace(/^["']|["']$/g, ''),
        ]),
    )
  } catch {
    return {}
  }
}

/** La nostra lista, letta dal SORGENTE: importare un modulo TypeScript da uno
 *  script `.mjs` richiederebbe una catena di strumenti che qui non serve. */
function nostriTipi() {
  const src = readFileSync('src/lib/storage/tipi-immagine.ts', 'utf8')
  const blocco = src.slice(src.indexOf('export const ALLOWED_MIME'))
  const corpo = blocco.slice(blocco.indexOf('{'), blocco.indexOf('}') + 1)
  return [...corpo.matchAll(/'([^']+\/[^']+)'\s*:/g)].map((m) => m[1])
}

console.log('=== Guardia tipi ammessi — la nostra lista e quella del bucket ===')

const env = leggiEnv()
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ credenziali assenti in .env.local: la guardia NON ha potuto controllare.')
  console.error('   (un controllo che non gira non è verde, è assente)')
  process.exit(1)
}

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: buckets, error } = await svc.storage.listBuckets()
if (error) {
  console.error('❌ lettura dei bucket fallita:', error.message)
  process.exit(1)
}

const bucket = (buckets ?? []).find((b) => b.id === BUCKET)
if (!bucket) {
  console.error(`❌ bucket «${BUCKET}» non trovato`)
  process.exit(1)
}

const delBucket = bucket.allowed_mime_types ?? []
const nostri = nostriTipi()

const dichiaratiENonAccettati = nostri.filter((t) => !delBucket.includes(t))
const accettatiENonDichiarati = delBucket.filter((t) => !nostri.includes(t))

console.log(`   nostra lista : ${nostri.join(' · ')}`)
console.log(`   bucket       : ${delBucket.join(' · ')}`)

let rosso = 0
for (const t of dichiaratiENonAccettati) {
  console.error(
    `❌ DICHIARIAMO «${t}» e il bucket lo RIFIUTA — il no arriva dopo aver speso i byte (fino a 50MB)`,
  )
  rosso++
}
for (const t of accettatiENonDichiarati) {
  console.error(
    `❌ il bucket accetta «${t}» e noi no — una funzione che c'è e nessuno può usare`,
  )
  rosso++
}

if (rosso > 0) {
  console.error(`\n❌ GUARDIA ROSSA — ${rosso} tipi disallineati`)
  process.exit(1)
}

console.log(`✅ liste allineate (${nostri.length} tipi), in entrambe le direzioni`)
