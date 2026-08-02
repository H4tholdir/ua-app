#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// GUARDIA — il salvataggio automatico è ALLINEATO, ed è vivo
//
// PERCHÉ ESISTE (D139, 04/08/2026). Il salvataggio del database gira ogni notte
// da una COPIA in ~/Library/Application Support/UA-salvataggio/, perché un
// lavoro automatico non può leggere dentro ~/Downloads dov'è il progetto
// (`provato:` con una sonda lanciata da launchd: «Operation not permitted» su
// ogni livello di quel percorso, mentre ~/Library si legge).
//
// 🔑 Da lì nasce il difetto che questa guardia esiste per impedire: lo stesso
//    script vive in DUE posti. Si corregge l'originale nel progetto, la copia
//    continua a fare la versione vecchia — e continua a dichiararsi RIUSCITA,
//    perché dal suo punto di vista lo è. È la stessa forma del guaio trovato il
//    04/08: un salvataggio che sembrava completo, e non lo era.
//
// I DUE CONTROLLI:
//   1. DERIVA (ferma il commit) — l'impronta di ogni file del salvataggio nel
//      progetto deve combaciare con quella registrata in ORIGINE.txt quando la
//      copia è stata installata. Se no: la copia è vecchia.
//   2. SALUTE (avvisa e basta) — c'è un allarme di fallimento? l'ultimo esito
//      dice FALLITO? l'ultima copia quanti giorni ha?
//      🔑 Questo secondo controllo copre l'unico caso che l'involucro NON può
//      raccontare da sé: il lavoro che non è MAI partito, perché il Mac era
//      spento. Chi non gira non scrive nulla, e il silenzio somiglia troppo
//      al successo.
//
// 🛑 COSA NON PUÒ FARE, dichiarato: non prova che il salvataggio si RIPRISTINI.
//    Quello si prova solo ricaricandolo davvero, contando le righe contro la
//    sorgente. La guardia vede file e impronte, non il ripristino.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..')
const CASA = join(homedir(), 'Library', 'Application Support', 'UA-salvataggio')
const ORIGINE = join(CASA, 'ORIGINE.txt')
const COPIE = join(homedir(), 'Backup-UA-database')
const GIORNI_TOLLERATI = 3

// l'elenco è lo stesso di installa-salvataggio-programmato.sh: se cambia là,
// cambia qui — e questa guardia se ne accorge, perché l'impronta non torna
const FILE = ['salvataggio-database.sh', 'salvataggio-archivio.mjs', 'salvataggio-programmato.sh']

const errori = []
const avvisi = []
const impronta = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')

// ── 1. DERIVA ───────────────────────────────────────────────────────────────
if (!existsSync(ORIGINE)) {
  // niente copia installata: su un'altra macchina è normale, non è un errore
  avvisi.push(
    'il salvataggio automatico NON è installato su questo Mac ' +
      '(manca ~/Library/Application Support/UA-salvataggio). ' +
      'Per installarlo: bash scripts/installa-salvataggio-programmato.sh',
  )
} else {
  const registrate = new Map()
  for (const r of readFileSync(ORIGINE, 'utf8').split('\n')) {
    const m = r.match(/^impronta (\S+) ([0-9a-f]{64})$/)
    if (m) registrate.set(m[1], m[2])
  }
  for (const f of FILE) {
    const sorgente = join(RADICE, 'scripts', f)
    if (!existsSync(sorgente)) {
      errori.push(`scripts/${f} non esiste più, ma la copia installata lo contiene: rilanciare l'installatore`)
      continue
    }
    const attesa = registrate.get(f)
    if (!attesa) {
      errori.push(`ORIGINE.txt non ha l'impronta di ${f}: la copia installata è di una versione precedente`)
    } else if (attesa !== impronta(sorgente)) {
      errori.push(
        `scripts/${f} è cambiato ma la copia che gira ogni notte è VECCHIA — ` +
          'rilanciare: bash scripts/installa-salvataggio-programmato.sh',
      )
    }
  }
}

// ── 2. SALUTE ───────────────────────────────────────────────────────────────
if (existsSync(join(COPIE, 'ALLARME.txt'))) {
  const q = readFileSync(join(COPIE, 'ALLARME.txt'), 'utf8').split('\n').slice(0, 6).join(' ').trim()
  avvisi.push(`l'ultimo salvataggio automatico è FALLITO — ${q.slice(0, 160)}`)
}
if (existsSync(COPIE)) {
  const cartelle = readdirSync(COPIE).filter((n) => /^20\d\d-\d\d-\d\d_\d{6}$/.test(n)).sort()
  if (cartelle.length === 0) {
    avvisi.push(`nessuna copia del database in ${COPIE}: la rete di sicurezza è vuota`)
  } else {
    const ultima = cartelle[cartelle.length - 1]
    const giorni = Math.floor((Date.now() - statSync(join(COPIE, ultima)).mtimeMs) / 86400000)
    if (giorni >= GIORNI_TOLLERATI) {
      avvisi.push(
        `l'ultima copia del database ha ${giorni} giorni (${ultima}) — ` +
          'il lavoro notturno può non essere mai partito (Mac spento)',
      )
    }
  }
} else {
  avvisi.push(`${COPIE} non esiste: nessuna copia del database su questo Mac`)
}

// ── Referto ─────────────────────────────────────────────────────────────────
console.log('=== Guardia salvataggio automatico ===')
for (const a of avvisi) console.log(`  ⚠️  ${a}`)
if (errori.length === 0) {
  if (avvisi.length === 0) console.log('✅ copia allineata al progetto, e la rete di sicurezza è recente')
  process.exit(0)
}
for (const e of errori) console.error(`  ❌ ${e}`)
console.error(
  `\n❌ ${errori.length} disallineamento/i: la copia che gira ogni notte non è quella che hai corretto — ` +
    'e continuerebbe a dichiararsi riuscita.',
)
process.exit(1)
