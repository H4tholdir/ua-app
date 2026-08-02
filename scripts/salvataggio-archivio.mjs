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
 *  ⚠️ LA PROVA VALE FIN DOVE È STATA FATTA: 31 file, la cartella più piena ne
 *  aveva 20. Non dice nulla sopra i 1000.
 *
 *  ✅ P23 — CORRETTO IL 02/08/2026 (D172). `elenca()` chiedeva `limit: 1000,
 *  offset: 0` e non scorreva le pagine: in una cartella con più di 1000 oggetti
 *  gli altri NON venivano elencati, il conteggio finale restava > 0, e il
 *  salvataggio si dichiarava RIUSCITO. Ora scorre finché la pagina torna corta.
 *  🔑 E insieme è stato chiuso il difetto GEMELLO, che rendeva la correzione
 *  inverificabile: un file non scaricato veniva contato come «saltato» e il
 *  salvataggio si dichiarava riuscito lo stesso. Elencare 3000 file e scaricarne
 *  2000 avrebbe detto «riuscito» — cioè lo stesso difetto, un piano più sotto.
 *  Ora i due numeri devono combaciare, o si esce con un errore.
 *
 *  Uso:  node scripts/salvataggio-archivio.mjs <cartella di destinazione>
 *        Credenziali: dall'AMBIENTE se ci sono, altrimenti da .env.local nella
 *        cartella superiore. 🔑 L'ambiente ha la precedenza perché è ciò che
 *        rende lo script provabile contro un archivio finto, senza toccare quello
 *        vero — e in esercizio l'ambiente è vuoto, quindi il comportamento di
 *        tutti i giorni non cambia di una virgola.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))

// 🔑 Il file delle credenziali si cerca accanto al progetto, non nella cartella
//    da cui si è stati lanciati: un lavoro automatico parte da dove capita.
const env = {}
const FILE_ENV = resolve(QUI, '..', '.env.local')
if (existsSync(FILE_ENV)) {
  for (const r of readFileSync(FILE_ENV, 'utf8').split('\n')) {
    const m = r.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const DEST = process.argv[2]
if (!DEST) { console.error('🛑 manca la cartella di destinazione'); process.exit(1) }

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const CHIAVE = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
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

// Quanti oggetti chiedere per volta. È anche il limite MASSIMO che l'archivio
// restituisce: chiederne di più non ne dà di più — per questo serve scorrere.
const PER_PAGINA = 1000

/** L'elenco dei file non arriva in un colpo: si scende cartella per cartella,
 *  e dentro ogni cartella si SCORRE finché la pagina torna corta.
 *
 *  🛑 P23 — il difetto che questa funzione aveva, e perché era invisibile.
 *  Chiedeva `limit: 1000, offset: 0` una volta sola. Una cartella con più di
 *  1000 oggetti ne restituiva 1000, e gli altri semplicemente non esistevano per
 *  il salvataggio: nessun errore, nessun avviso, il conteggio finale > 0 e la
 *  scritta «riuscito». 🔑 La cartella più piena ne aveva 20 il 04/08/2026 —
 *  quindi il difetto NON mordeva ancora, e non avrebbe avvisato quando iniziava.
 *  Le foto cliniche i 1000 li raggiungono.
 *
 *  🔑 La condizione d'arresto è «la pagina è tornata CORTA», non «la pagina è
 *  vuota»: fermarsi solo sul vuoto costa una richiesta in più per ogni cartella,
 *  ma soprattutto un archivio che restituisse meno del richiesto senza essere
 *  finito ci farebbe girare a vuoto. Se la pagina è piena si chiede la prossima —
 *  e nel caso limite (totale multiplo esatto di 1000) l'ultima richiesta torna
 *  vuota e chiude il giro.
 */
async function elenca(secchio, prefisso = '') {
  const trovati = []
  for (let scarto = 0; ; scarto += PER_PAGINA) {
    const r = await chiedi(`/object/list/${encodeURIComponent(secchio)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: prefisso, limit: PER_PAGINA, offset: scarto }),
    })
    const pagina = await r.json()
    for (const v of pagina) {
      const percorso = prefisso ? `${prefisso}/${v.name}` : v.name
      // una "cartella" non ha metadati: si riconosce da lì, non dal nome
      if (v.id === null) trovati.push(...await elenca(secchio, percorso))
      else trovati.push(percorso)
    }
    if (pagina.length < PER_PAGINA) break
  }
  return trovati
}

async function main() {
  const secchi = await (await chiedi('/bucket')).json()
  mkdirSync(DEST, { recursive: true })

  let totale = 0
  let byte = 0
  let elencati = 0
  const mancanti = []
  const inventario = []

  for (const s of secchi ?? []) {
    const percorsi = await elenca(s.name)
    elencati += percorsi.length
    for (const p of percorsi) {
      let buf
      try {
        const r = await chiedi(`/object/${encodeURIComponent(s.name)}/${codifica(p)}`)
        buf = Buffer.from(await r.arrayBuffer())
      } catch (e) {
        console.error(`  🛑 non scaricato: ${s.name}/${p} — ${e.message}`)
        mancanti.push(`${s.name}/${p}`)
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
  console.log(`  ✅ archivio: ${totale} file su ${elencati} elencati, ${(byte / 1024 / 1024).toFixed(1)} MB`)
  if (totale === 0) { console.error('  🛑 ZERO file scaricati — non fidarsene'); process.exit(1) }

  // 🛑 P23, la seconda metà. Senza questo confronto la correzione della
  //    paginazione sarebbe INVERIFICABILE in esercizio: elencare 3000 file e
  //    scaricarne 2000 avrebbe stampato «riuscito» come prima. Un salvataggio che
  //    perde pezzi e lo tace è peggio di uno che fallisce, perché nessuno lo
  //    rifà. 🔑 Si esce con ERRORE, non con un avviso: chi legge un avviso in un
  //    lavoro notturno è nessuno.
  if (mancanti.length > 0) {
    console.error(`  🛑 ${mancanti.length} file elencati ma NON scaricati — la copia è INCOMPLETA:`)
    for (const m of mancanti.slice(0, 20)) console.error(`     · ${m}`)
    if (mancanti.length > 20) console.error(`     … e altri ${mancanti.length - 20}`)
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
