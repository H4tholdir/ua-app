// Link d'accesso MONOUSO per il collaudo dal vivo (D103, Francesco 03/08/2026:
// «logga tranquillamente con i dati nel file env e ricordati di questa cosa»).
//
//   npx tsx scripts/link-accesso.ts <email> [percorso]
//   BASE=http://localhost:3020 npx tsx scripts/link-accesso.ts h4t@live.it /lavori
//
// 🔑 PERCHÉ ESISTE, e perché non è «accedere con la password»: nasce dalle
//    stesse credenziali già presenti in `.env.local`, ma NON richiede di
//    digitare una password in un campo — cosa che Claude non fa in nessun caso —
//    e aggira il limite sui tentativi ravvicinati.
//
// 🔑 PERCHÉ STA SOTTO GIT (05/08/2026): la versione precedente (31/07) viveva in
//    `scripts/tmp/`, che è **ignorato**, quindi non sopravvive a una pulizia né
//    a un cambio di macchina — stessa ragione di `scripts/psql.mjs`.
//    🛑 ONESTÀ SU COME È NATO QUESTO FILE: la prima stesura diceva che il 5
//    agosto lo script «non c'era più». **Falso, e l'errore era di metodo:** il
//    controllo era `ls scripts/tmp/link-accesso*.ts scripts/link-accesso*.ts`,
//    e in zsh **un glob che non trova nulla fa abortire l'INTERO comando** —
//    il secondo percorso non è mai stato valutato e «no matches found» è stato
//    letto come «non esiste». Lo script c'era. ➡️ Portarlo sotto git resta
//    giusto; la ragione che ne era stata data no. Quando un comando serve a
//    stabilire un'assenza, l'assenza si verifica **un percorso alla volta**.
//
// ⚠️ NON contiene credenziali: legge `NEXT_PUBLIC_SUPABASE_URL` e
//    `SUPABASE_SERVICE_ROLE_KEY` da `.env.local`, che è fuori da git.
//
// 🛑 IL LINK CHE STAMPA VALE UN ACCESSO: non si incolla in documenti, chat o
//    commit. Si usa e si butta.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function env(nome: string): string {
  if (process.env[nome]) return process.env[nome] as string
  const testo = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const riga = testo.split('\n').find((r) => r.startsWith(`${nome}=`))
  if (!riga) throw new Error(`${nome} non trovata in .env.local`)
  return riga.slice(nome.length + 1).trim().replace(/^["']|["']$/g, '')
}

// Il default su `TEST_EMAIL` viene dalla versione del 31/07 in `scripts/tmp/`:
// ripreso perché non si perda un uso che funzionava.
const email = process.argv[2] ?? (() => { try { return env('TEST_EMAIL') } catch { return undefined } })()
const percorso = process.argv[3] ?? '/dashboard'
if (!email) {
  console.error('uso: npx tsx scripts/link-accesso.ts <email> [percorso]  (o TEST_EMAIL in .env.local)')
  process.exit(2)
}

const base = process.env.BASE ?? 'https://uachelab.com'

// ⚠️ Avvolto in una funzione, NON `await` al primo livello: `tsx` compila
//    questi script come CommonJS, dove il top-level await non esiste
//    («Top-level await is currently not supported with the "cjs" output
//    format»). Pagato scrivendolo, il 05/08/2026.
async function main() {
  const svc = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data?.properties?.hashed_token) {
    console.error(`❌ ${error?.message ?? 'nessun hashed_token nella risposta'}`)
    process.exit(1)
  }

  // La rotta che consuma il gettone: `src/app/(auth)/auth/callback/route.ts`.
  const url = new URL('/auth/callback', base)
  url.searchParams.set('token_hash', data.properties.hashed_token)
  url.searchParams.set('type', 'magiclink')
  url.searchParams.set('next', percorso)
  console.log(url.toString())
}

main().catch((e) => {
  console.error(`❌ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
