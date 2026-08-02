/** SALVATAGGIO DELL'ARCHIVIO DEI FILE — la metà che il database non contiene.
 *
 *  🔑 PERCHÉ ESISTE: il salvataggio del database copia righe, non file. I
 *  contratti in PDF che i dentisti firmano e le FOTO CLINICHE dei pazienti
 *  stanno nell'archivio di Supabase, e un ripristino del solo database li
 *  lascerebbe fuori. Misurato provando il ripristino il 04/08/2026.
 *
 *  🔑 PERCHÉ NON USA NESSUNA LIBRERIA (D139, 04/08/2026)
 *  Sostituisce `salvataggio-archivio.ts`, che importava `@supabase/supabase-js`
 *  e quindi girava SOLO dentro il progetto, con le sue `node_modules` accanto.
 *  Il salvataggio automatico deve girare da `~/Library`, dove quelle librerie
 *  non ci sono — e portarsele dietro avrebbe creato una seconda copia di una
 *  dipendenza che invecchia per conto suo. Qui c'è solo `fetch`, che Node ha
 *  in casa: lo stesso file gira identico nel progetto e nella copia installata.
 *
 *  ✅ PROVATO EQUIVALENTE all'originale il 04/08/2026 confrontando le IMPRONTE
 *  (`shasum`) di tutti i file scaricati, non solo il loro numero: contare i file
 *  non vede un PDF scaricato male, un'impronta sì.
 *
 *  Uso:  node scripts/salvataggio-archivio.mjs <cartella di destinazione>
 *        (le credenziali si leggono da .env.local nella cartella superiore)
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))

// 🔑 Il file delle credenziali si cerca accanto al progetto, non nella cartella
//    da cui si è stati lanciati: un lavoro automatico parte da dove capita.
const env = {}
for (const r of readFileSync(resolve(QUI, '..', '.env.local'), 'utf8').split('\n')) {
  const m = r.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const DEST = process.argv[2]
if (!DEST) { console.error('🛑 manca la cartella di destinazione'); process.exit(1) }

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const CHIAVE = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !CHIAVE) { console.error('🛑 mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const INTESTAZIONI = { apikey: CHIAVE, Authorization: `Bearer ${CHIAVE}` }

/** Un percorso di archivio va codificato pezzo per pezzo: le barre restano barre. */
const codifica = (p) => p.split('/').map(encodeURIComponent).join('/')

async function chiedi(percorso, opzioni = {}) {
  const r = await fetch(`${URL_BASE}/storage/v1${percorso}`, {
    ...opzioni,
    headers: { ...INTESTAZIONI, ...(opzioni.headers ?? {}) },
  })
  if (!r.ok) throw new Error(`${percorso}: ${r.status} ${await r.text()}`)
  return r
}

/** L'elenco dei file non arriva in un colpo: si scende cartella per cartella. */
async function elenca(secchio, prefisso = '') {
  const trovati = []
  const r = await chiedi(`/object/list/${encodeURIComponent(secchio)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: prefisso, limit: 1000, offset: 0 }),
  })
  for (const v of await r.json()) {
    const percorso = prefisso ? `${prefisso}/${v.name}` : v.name
    // una "cartella" non ha metadati: si riconosce da lì, non dal nome
    if (v.id === null) trovati.push(...await elenca(secchio, percorso))
    else trovati.push(percorso)
  }
  return trovati
}

async function main() {
  const secchi = await (await chiedi('/bucket')).json()
  mkdirSync(DEST, { recursive: true })

  let totale = 0
  let byte = 0
  const inventario = []

  for (const s of secchi ?? []) {
    const percorsi = await elenca(s.name)
    for (const p of percorsi) {
      let buf
      try {
        const r = await chiedi(`/object/${encodeURIComponent(s.name)}/${codifica(p)}`)
        buf = Buffer.from(await r.arrayBuffer())
      } catch (e) {
        console.error(`  🛑 non scaricato: ${s.name}/${p} — ${e.message}`)
        continue
      }
      const dove = join(DEST, s.name, p)
      mkdirSync(dirname(dove), { recursive: true })
      writeFileSync(dove, buf)
      inventario.push({ secchio: s.name, percorso: p, byte: buf.length })
      totale++; byte += buf.length
    }
    console.log(`     ${s.name}: ${percorsi.length} file`)
  }

  // 🔑 L'inventario serve al RIPRISTINO: dice dove ogni file deve tornare.
  //    ⚠️ I nomi dei campi sono quelli letti dalla procedura di ripristino
  //    (coda di salvataggio-database.sh, punto 6): cambiarli rompe il ripristino
  //    senza rompere il salvataggio — cioè in silenzio.
  writeFileSync(join(DEST, 'inventario.json'), JSON.stringify(inventario, null, 2))
  console.log(`  ✅ archivio: ${totale} file, ${(byte / 1024 / 1024).toFixed(1)} MB`)
  if (totale === 0) { console.error('  🛑 ZERO file scaricati — non fidarsene'); process.exit(1) }
}

main().catch((e) => { console.error(e); process.exit(1) })
