#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// GUARDIA — coerenza dei documenti vivi (memoria · roadmap · verbali · spec)
//
// PERCHÉ ESISTE (28/07/2026). Il ripasso di fine sessione ha trovato TRE buchi,
// e sono lo stesso errore in tre punti: i documenti che dicono «cosa fare» si
// aggiornano alla fine, quando l'attenzione è al minimo. Uno di quei buchi era
// già capitato: la memoria rimandava a una «voce 60» che non era mai stata
// scritta. Questa guardia rende meccanico ciò che finora dipendeva dal
// ricordarsene.
//
// 🛑 COSA NON PUÒ FARE, dichiarato: non sa se una decisione è stata SCRITTA
//    BENE, e non sa cosa è stato detto e mai scritto. Controlla che i documenti
//    non si contraddicano e non puntino nel vuoto. La verità la garantisce solo
//    la regola «il numero si dà subito» (CLAUDE.md).
//
// I QUATTRO CONTROLLI (tutti locali, niente rete, niente app accesa):
//   1. il conteggio DICHIARATO delle decisioni = quello REALE, e i numeri non
//      hanno buchi;
//   2. ogni file citato nei documenti vivi ESISTE;
//   3. ogni «voce N» richiamata nella memoria esiste come voce;
//   4. il punto di ripresa citato in SESSION_ACTIVE esiste.
//
// Uso:  node scripts/guardia-coerenza-documenti.mjs            (tutto)
//       node scripts/guardia-coerenza-documenti.mjs --staged   (+ avviso BP-1)
//
// 🛑 `fileURLToPath`, mai `new URL(...).pathname`: il percorso di questo disco
//    contiene uno spazio («SOFTWARE FILIPPO») e `pathname` non lo decodifica.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname, resolve } from 'node:path'
import { execSync } from 'node:child_process'

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── I documenti «vivi» NON si elencano a mano: si SEGUONO, partendo dall'unica
//    porta d'ingresso vera (BP-0): `memory/SESSION_ACTIVE.md`. Da lì due salti
//    bastano ad arrivare all'handoff, al piano, alla spec e al verbale — cioè
//    tutto ciò che una sessione nuova legge PER AGIRE.
//    🛑 MEMORY e ROADMAP-UFFICIALE **non** si controllano per intero: sono
//    ARCHIVI (61 voci, mesi di aggiornamenti) e citano apposta file di piani
//    vecchi, rinominati da tempo. Di loro si controlla **la sola testa**, cioè
//    l'aggiornamento corrente: è lì che una sessione nuova va a cercare.
//    🔑 Il primo giro di questa guardia includeva tutte le spec e i piani: 99
//    segnalazioni, quasi tutte legittime-ma-storiche. **Una guardia che grida al
//    lupo viene spenta** — e questo progetto ha già una guardia rimasta per
//    settimane agganciata a nulla.
const ESTENSIONI = ['.md', '.ts', '.tsx', '.sql', '.mjs', '.js', '.css', '.html', '.json', '.sh']
const PREFISSI = ['src/', 'docs/', 'scripts/', 'supabase/', 'tests/', 'memory/', 'public/', '.husky/']
const NUMERI_A_PAROLE = {
  otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14,
  quindici: 15, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20,
  ventuno: 21, ventidue: 22, ventitre: 23, ventitré: 23, ventiquattro: 24, venticinque: 25,
  ventisei: 26, ventisette: 27, ventotto: 28, ventinove: 29, trenta: 30, trentuno: 31,
  trentadue: 32, trentatre: 33, trentatré: 33, trentaquattro: 34, trentacinque: 35,
  trentasei: 36, trentasette: 37, trentotto: 38, trentanove: 39, quaranta: 40,
}
const errori = []
const avvisi = []

const PORTA = 'memory/SESSION_ACTIVE.md'
const ARCHIVI_SOLO_TESTA = [
  { percorso: 'memory/MEMORY.md', righe: 4 },
  { percorso: 'docs/roadmap/ROADMAP-UFFICIALE.md', righe: 4 },
]
const SALTI = 2

/** I percorsi citati fra backtick, filtrati dai segnaposto. */
function percorsiCitati(testo, soloMd = false) {
  const out = []
  for (const m of testo.matchAll(/`([^`\n]+)`/g)) {
    let p = m[1].trim()
    if (/[…*<>{}\s]/.test(p) || p.includes('...')) continue
    p = p.replace(/:\d+(-\d+)?$/, '').replace(/^\.\//, '')
    if (!PREFISSI.some((pre) => p.startsWith(pre))) continue
    const est = soloMd ? ['.md'] : ESTENSIONI
    if (!est.some((e) => p.endsWith(e))) continue
    out.push(p)
  }
  return out
}

// La catena, seguita dalla porta.
const documentiVivi = []
if (existsSync(join(RADICE, PORTA))) {
  documentiVivi.push(PORTA)
  let fronte = [PORTA]
  for (let salto = 0; salto < SALTI; salto++) {
    const prossimi = []
    for (const doc of fronte) {
      const t = readFileSync(join(RADICE, doc), 'utf8')
      for (const p of percorsiCitati(t, true)) {
        if (existsSync(join(RADICE, p)) && !documentiVivi.includes(p)) {
          documentiVivi.push(p)
          prossimi.push(p)
        }
      }
    }
    fronte = prossimi
  }
}

// ═══ CONTROLLO 1 — il conteggio dichiarato regge, e i numeri non hanno buchi ═══
// Si applica solo ai documenti che PORTANO un conteggio in testa: chi non lo
// dichiara non viene inventato un obbligo che non ha.
function controllaConteggioDecisioni(percorso, testo) {
  const righeDecisione = [...testo.matchAll(/^\|\s*\*\*D(\d+)\*\*/gm)].map((m) => Number(m[1]))
  if (righeDecisione.length === 0) return

  const unici = [...new Set(righeDecisione)].sort((a, b) => a - b)

  // 🔑 Solo il REGISTRO si controlla per contiguita': e' quello che dichiara un
  //    conteggio in testa. Un handoff che CITA «D1, D3, D10/D16» non ha buchi:
  //    sta rimandando, non registrando. Confonderli fa gridare al lupo.
  const testaDoc = testo.split('\n').slice(0, 12).join('\n')
  const dichiaraConteggio = /\*\*(\d+|\p{L}+)\s+decisioni/iu.test(testaDoc)
  if (!dichiaraConteggio) return

  // buchi nella numerazione: D1..Dmax devono esserci tutti
  const mancanti = []
  for (let i = 1; i <= unici[unici.length - 1]; i++) if (!unici.includes(i)) mancanti.push('D' + i)
  if (mancanti.length) {
    errori.push(`${percorso}: numerazione con BUCHI — mancano ${mancanti.join(', ')}. Una decisione senza riga è una decisione che vive solo in chat.`)
  }

  // doppioni: due righe con lo stesso numero
  const doppi = righeDecisione.filter((n, i) => righeDecisione.indexOf(n) !== i)
  if (doppi.length) {
    errori.push(`${percorso}: numero di decisione DUPLICATO — D${[...new Set(doppi)].join(', D')}.`)
  }

  // conteggio dichiarato in testa (cifre o parola italiana)
  const testa = testaDoc
  // 🛑 `\w` in JavaScript NON contiene le lettere accentate: con «Trentatré» il
  //    riconoscimento falliva e il controllo del conteggio DEGRADAVA in un avviso,
  //    cioe' smetteva di proteggere senza dirlo. Serve `\p{L}` con il flag `u`.
  //    Trovato perche' la guardia ha declassato ad avviso il documento che stava
  //    proteggendo: un controllo che si spegne da solo e' peggio di uno assente.
  const perParola = testa.toLowerCase().match(/\*\*(\p{L}+)\s+decisioni/u)
  const perCifre = testa.match(/\*\*(\d+)\s+decisioni/i)
  let dichiarato = null
  if (perCifre) dichiarato = Number(perCifre[1])
  else if (perParola && NUMERI_A_PAROLE[perParola[1]] !== undefined) dichiarato = NUMERI_A_PAROLE[perParola[1]]

  if (dichiarato === null) {
    avvisi.push(`${percorso}: porta ${unici.length} decisioni ma NON dichiara un conteggio in testa. Dichiararlo è ciò che rende il buco visibile.`)
  } else if (dichiarato !== unici.length) {
    errori.push(`${percorso}: la testa dichiara ${dichiarato} decisioni, ma nel documento ce ne sono ${unici.length}. Un elenco che sembra completo e non lo è è il modo classico per dare per chiusa una cosa aperta.`)
  }
}

// ═══ CONTROLLO 2 — ogni file citato esiste ═══
// Si guardano SOLO i percorsi fra backtick: il testo in prosa nomina file in
// forma abbreviata («…-wizard-passo-paziente.html») e quelli non sono percorsi.
function controllaFileCitati(percorso, testo) {
  const citati = new Set()
  const righe = testo.split('\n')
  for (const riga of righe) {
    // 🔑 Un PIANO cita legittimamente file che non esistono ANCORA: sono il suo
    //    prodotto. Ma devono essere DICHIARATI tali sulla stessa riga — «(nuovo)»,
    //    «da creare», «🆕». Chi non lo dichiara e' indistinguibile da chi ha
    //    sbagliato un percorso: la guardia lo tratta come un errore, ed e' giusto.
    const dichiaratoNuovo = /\(nuovo|da creare|🆕/i.test(riga)
    if (dichiaratoNuovo) continue
    for (const m of riga.matchAll(/`([^`\n]+)`/g)) {
      let p = m[1].trim()
    // Segnaposto, non percorsi: `<timestamp>_x.sql`, `{a,b,c}.html`, glob.
      if (/[…*<>{}\s]/.test(p) || p.includes('...')) continue
      p = p.replace(/:\d+(-\d+)?$/, '').replace(/^\.\//, '')
      if (!PREFISSI.some((pre) => p.startsWith(pre))) continue
      if (!ESTENSIONI.some((e) => p.endsWith(e))) continue
      citati.add(p)
    }
  }
  for (const p of citati) {
    // I documenti di `ua-app` citano anche `../ANALISI/...`: fuori repo, non si controlla.
    if (!existsSync(join(RADICE, p))) {
      errori.push(`${percorso}: cita \`${p}\` — che NON esiste. Un riferimento pendente manda una sessione nuova a cercare una cosa che non c'è.`)
    }
  }
}

// ═══ CONTROLLO 3 — ogni «voce N» richiamata nella memoria esiste ═══
function controllaVociMemoria() {
  const percorso = 'memory/MEMORY.md'
  const file = join(RADICE, percorso)
  if (!existsSync(file)) return
  const testo = readFileSync(file, 'utf8')
  const esistenti = new Set([...testo.matchAll(/^\*\*Voce (\d+)/gm)].map((m) => m[1]))
  // 🔑 Solo la TESTA: MEMORY ruota, e le voci vecchie escono di proposito.
  //    Quello che conta e' che l'aggiornamento CORRENTE non rimandi nel vuoto —
  //    e' li' che una sessione nuova va a cercare il dettaglio (difetto del
  //    28/07: «Dettaglio: voce 60», e la voce 60 non era mai stata scritta).
  const testa = testo.split('\n').slice(0, 6).join('\n')
  const citate = new Set([...testa.matchAll(/\bvoce (\d+)\b/gi)].map((m) => m[1]))
  for (const v of citate) {
    if (!esistenti.has(v)) {
      errori.push(`${percorso}: l'aggiornamento in testa rimanda alla «voce ${v}», che NON esiste. È il difetto già capitato il 28/07 con la voce 60.`)
    }
  }
}

// ═══ CONTROLLO 4 — il punto di ripresa esiste ═══
function controllaPuntoDiRipresa() {
  const percorso = 'memory/SESSION_ACTIVE.md'
  const file = join(RADICE, percorso)
  if (!existsSync(file)) return
  const testo = readFileSync(file, 'utf8')
  const m = testo.match(/PUNTO DI RIPRESA[^`]*`([^`]+)`/)
  if (!m) {
    avvisi.push(`${percorso}: non dichiara un PUNTO DI RIPRESA. Una sessione nuova non sa da dove ricominciare.`)
    return
  }
  const p = m[1].trim()
  if (!existsSync(join(RADICE, p))) {
    errori.push(`${percorso}: il PUNTO DI RIPRESA è \`${p}\`, che NON esiste.`)
  }
}

// ═══ CONTROLLO 5 (solo --staged) — BP-1: si tocca una decisione senza la memoria? ═══
// AVVISO, non errore: a volte è legittimo (una correzione di battitura). Ma va
// detto, perché è esattamente il buco 3 del ripasso del 28/07.
function avvisoBp1() {
  let messi = []
  try {
    messi = execSync('git diff --cached --name-only', { cwd: RADICE, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  } catch {
    return
  }
  if (!messi.length) return
  const tocca = (pre) => messi.some((f) => f.startsWith(pre))
  const decisioni = tocca('docs/design/decisions/') || tocca('docs/superpowers/specs/')
  const memoria = tocca('memory/')
  if (decisioni && !memoria) {
    avvisi.push('BP-1: questo salvataggio tocca un VERBALE o una SPEC ma NON la memoria. Se hai deciso qualcosa, la memoria deve saperlo — è il buco che il ripasso del 28/07 ha trovato.')
  }
}

// ═══ esecuzione ═══
for (const percorso of documentiVivi) {
  const testo = readFileSync(join(RADICE, percorso), 'utf8')
  controllaConteggioDecisioni(percorso, testo)
  controllaFileCitati(percorso, testo)
}
// Gli archivi: SOLO la testa, cioè l'aggiornamento corrente.
for (const a of ARCHIVI_SOLO_TESTA) {
  const f = join(RADICE, a.percorso)
  if (!existsSync(f)) continue
  const testa = readFileSync(f, 'utf8').split('\n').slice(0, a.righe).join('\n')
  controllaFileCitati(a.percorso + ' (testa)', testa)
}
controllaVociMemoria()
controllaPuntoDiRipresa()
if (process.argv.includes('--staged')) avvisoBp1()

console.log(`=== Guardia coerenza documenti — ${documentiVivi.length} documenti vivi controllati ===`)
for (const a of avvisi) console.log(`  ⚠️  ${a}`)
if (errori.length === 0) {
  console.log('✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma')
  process.exit(0)
}
for (const e of errori) console.error(`  ❌ ${e}`)
console.error(`\n❌ ${errori.length} incoerenze: un documento che punta nel vuoto o che si contraddice manda fuori strada la sessione successiva.`)
process.exit(1)
