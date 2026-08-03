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
// I SEI CONTROLLI (tutti locali, niente rete, niente app accesa):
//   1. il conteggio DICHIARATO delle decisioni = quello REALE, e i numeri non
//      hanno buchi;
//   2. ogni file citato nei documenti vivi ESISTE;
//   3. ogni «voce N» richiamata nella memoria esiste come voce;
//   4. il punto di ripresa citato in SESSION_ACTIVE esiste;
//   5. 🆕 una voce di roadmap dichiarata ✅/🚀 non può citare una spec che NON
//      si dichiara eseguita (03/08/2026);
//   6. 🆕 una decisione che RIMANDA lavoro deve nominare la sua DESTINAZIONE
//      (03/08/2026).
//
// ── PERCHÉ 5 E 6 SONO STATI AGGIUNTI (audit del 03/08/2026) ─────────────────
// 🔑 Il difetto che li ha generati era INVISIBILE ai primi quattro, e non per
//    una svista: i quattro controllano che i documenti siano d'accordo FRA LORO,
//    e quel giorno lo erano — handoff, roadmap e memoria dicevano tutti «ondata
//    (b) in produzione», mentre il perimetro dichiarato di quell'ondata (nove
//    cose: passo paziente rifatto, ricerca paziente, passi denti/colore/foto/
//    cassetta, briciole, bozza `v:2`, nome e cognome separati) NON era stato
//    costruito. A romperlo è stata una domanda di Francesco che confrontava il
//    progetto con il CODICE, non un documento con un altro.
// 🛑 Nessuno script può leggere un perimetro in prosa e cercarlo nel codice. Ma
//    può pretendere che il documento che dichiara l'esecuzione — la SPEC — lo
//    dica, invece di lasciarlo dedurre a un ✅ messo altrove: è il controllo 5.
// 🔑 E il secondo buco dello stesso audit: tre decisioni dicevano «voce propria»
//    e la voce non era MAI stata aperta (D5, D98), più una che rimandava a un
//    «T15» che non compare in nessun elenco (D36). Una decisione di SPOSTARE
//    lavoro, se la destinazione non esiste, ha lo stesso effetto di una che lo
//    CANCELLA — ed è il controllo 6.
// ⚠️ TARATI PRIMA DI SCRIVERLI, perché una guardia che grida al lupo viene
//    spenta (v. la nota alla riga ~45): il 5 accende su **1 voce su 10**, il 6 su
//    **6 decisioni su 121**. Ogni riscontro del primo giro era un difetto vero.
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
// ── I numeri a parole: COSTRUITI, non elencati a mano ──────────────────────
// 🛑 QUARTA volta che una tabella scritta a mano finisce prima del documento che
//    protegge. Le prime tre stanno nella storia di questo file: si fermava a
//    «trentatre» (le lettere accentate), poi a «quaranta», poi a «sessanta», e
//    ogni volta il conteggio ha smesso di essere controllato **senza dirlo** —
//    degradando in un avviso proprio mentre il verbale cresceva.
//    La quarta è stata vista PRIMA che mordesse: l'elenco arrivava a «cento» e
//    il verbale era arrivato **esattamente a cento**. La decisione dopo lo
//    avrebbe spento.
// 🔑 E il difetto non era che l'elenco fosse corto: era che la sua lunghezza
//    fosse una SCELTA, cioè qualcosa che qualcuno deve ricordarsi di rifare.
//    Adesso le parole si costruiscono da 0 a 999 con le regole della lingua —
//    l'elisione della vocale davanti a «uno» e «otto» (ventuno, ventotto,
//    centotto) e le due grafie ammesse di «…tre»/«…tré». Nessuno deve più
//    ricordarsi di niente.
const UNITA = [
  'zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove',
  'dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici',
  'diciassette', 'diciotto', 'diciannove',
]
const DECINE = { 2: 'venti', 3: 'trenta', 4: 'quaranta', 5: 'cinquanta', 6: 'sessanta', 7: 'settanta', 8: 'ottanta', 9: 'novanta' }

/** Tutte le grafie ammesse per `n` (0-999). Piu' di una quando la lingua ne
 *  ammette piu' di una: «ventitre»/«ventitré», «centouno»/«centuno». */
function paroleDi(n) {
  if (n < 20) return [UNITA[n]]
  if (n < 100) {
    const d = Math.floor(n / 10)
    const u = n % 10
    const decina = DECINE[d]
    if (u === 0) return [decina]
    // «venti» + «uno» = «ventuno», non «ventiuno»: la vocale cade davanti a
    // uno e otto. Vale per tutte le decine.
    const radice = u === 1 || u === 8 ? decina.slice(0, -1) : decina
    if (u === 3) return [radice + 'tre', radice + 'tré']
    return [radice + UNITA[u]]
  }
  const c = Math.floor(n / 100)
  const resto = n % 100
  const testa = c === 1 ? 'cento' : UNITA[c] + 'cento'
  if (resto === 0) return [testa]
  const varianti = paroleDi(resto).map((coda) => testa + coda)
  if (resto === 3) varianti.push(testa + 'tré')
  // «centouno» e «centuno» sono entrambe in uso; lo stesso per «centootto»/«centotto».
  if (resto === 1 || resto === 8) varianti.push(testa.slice(0, -1) + UNITA[resto])
  // 🛑 CORRETTA il 03/08/2026 — l'elisione non vale solo per «uno» e «otto».
  //    In italiano la `o` di «cento» cade davanti a QUALSIASI coda che comincia
  //    per vocale: cent+ottanta = «centottanta», ed è la forma CORRETTA (mentre
  //    «centoottanta» è quella che questa funzione sapeva leggere).
  //    🔑 Il difetto si è visto perché il conteggio è arrivato a 180 e la guardia
  //    ha detto di sé la cosa giusta: «non è un'intestazione mancante, è la rete
  //    che si è spenta». Una rete che non sa leggere una grafia corretta si
  //    disattiva da sola, in silenzio, il giorno in cui quel numero arriva.
  //    ⚠️ Le varianti si AGGIUNGONO, non si sostituiscono: «centoottanta» resta
  //    valida, perché documenti già scritti possono usarla.
  for (const coda of paroleDi(resto)) {
    if (/^[aeiou]/.test(coda)) {
      const elisa = testa.slice(0, -1) + coda
      if (!varianti.includes(elisa)) varianti.push(elisa)
    }
  }
  return varianti
}

const NUMERI_A_PAROLE = {}
for (let n = 0; n <= 999; n += 1) {
  for (const parola of paroleDi(n)) NUMERI_A_PAROLE[parola] = n
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
        // 🛑 Un ARCHIVIO non entra MAI nella catena, nemmeno se un documento vivo
        //    lo cita: ha già il suo trattamento dedicato (solo la testa, sotto).
        //    Senza questa riga la dichiarazione `ARCHIVI_SOLO_TESTA` si annullava
        //    da sola al primo collegamento — ed è successo il 30/07/2026: un piano
        //    che nominava `memory/MEMORY.md` fra i passi di BP-1 tirava dentro
        //    l'archivio INTERO, e la guardia bocciava quattro voci del 26/07 che
        //    RACCONTANO la rimozione di due file diagnostici (commit `732fcceb`).
        //    Un verbale storico che cita un file rimosso non è un riferimento
        //    pendente: è memoria che fa il suo mestiere. La guardia gridava al
        //    lupo su se stessa — ed è il modo in cui una guardia si fa spegnere.
        if (ARCHIVI_SOLO_TESTA.some((a) => a.percorso === p)) continue
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

  // 🛑 IL RAMO CHE MANCAVA, ed è il MODO in cui questo controllo si è spento tre
  //    volte. «Dichiarato ma illeggibile» e «non dichiarato» non sono lo stesso
  //    fatto, e finivano nello stesso ramo: la guardia diceva «NON dichiara un
  //    conteggio» a un documento che ne dichiarava uno benissimo — un messaggio
  //    FALSO, per giunta declassato ad avviso, cioè invisibile in mezzo agli
  //    altri. Chi lo leggeva concludeva «manca un'intestazione», non «la mia rete
  //    ha smesso di controllare».
  //    Adesso è un ERRORE, e dice la cosa vera. Il generatore qui sopra rende
  //    questo ramo quasi irraggiungibile — ma «quasi irraggiungibile» è
  //    esattamente ciò che si diceva della tabella a mano, tre volte.
  if (dichiarato === null && perParola) {
    errori.push(`${percorso}: dichiara un conteggio A PAROLE che non so leggere («${perParola[1]}»), quindi il controllo del conteggio NON è stato eseguito su questo documento. Non è un'intestazione mancante: è la rete che si è spenta. Il documento ne porta ${unici.length}.`)
  } else if (dichiarato === null) {
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
    // 🔑 E il caso SIMMETRICO, aggiunto il 30/07/2026: una spec cita legittimamente
    //    un file che non esiste PIU', quando e' quella stessa spec ad averlo fatto
    //    eliminare (caso vero: la spec B5 del 05/07 prescrive «Elimina
    //    `GET /api/portale/[token]/route.ts`» e poi lo nomina tre volte al passato).
    //    Vale la stessa regola, non una piu' larga: si dichiara sulla riga
    //    («eliminato», «rimosso», «non esiste piu'») o resta un errore. La guardia
    //    difende il suo scopo dichiarato — «non mandare una sessione nuova a cercare
    //    una cosa che non c'e'» — e un percorso dichiarato morto non manda nessuno.
    const dichiaratoNuovo = /\(nuovo|da creare|🆕/i.test(riga)
    const dichiaratoEliminato = /elimina|rimoss|rimuov|non esiste (più|piu')/i.test(riga)
    if (dichiaratoNuovo || dichiaratoEliminato) continue
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

// ═══ CONTROLLO 5 — una voce «fatta» non può poggiare su una spec che non lo dice ═══
// 🛑 ECCEZIONE MIRATA, e resta mirata: la ROADMAP è un ARCHIVIO e si legge solo
//    in testa (`ARCHIVI_SOLO_TESTA`). Qui si apre una finestra su UNA sezione
//    sola — «### 🔜 Le prossime voci» — perché è l'unico posto dove il progetto
//    dichiara «questo è fatto». **Non allargare la finestra dell'archivio**: il
//    primo giro di questa guardia leggeva tutto e produceva 99 segnalazioni,
//    quasi tutte legittime-ma-storiche (v. nota in testa al file).
const PAROLE_DI_ESECUZIONE = /ESEGUIT|IN PRODUZIONE|ATTUAT|PARZIALE/i
function controllaVociChiuse() {
  const percorso = 'docs/roadmap/ROADMAP-UFFICIALE.md'
  const file = join(RADICE, percorso)
  if (!existsSync(file)) return
  const righe = readFileSync(file, 'utf8').split('\n')
  const inizio = righe.findIndex((r) => r.startsWith('### 🔜 Le prossime voci'))
  if (inizio === -1) {
    avvisi.push(`${percorso}: non trovo la sezione «### 🔜 Le prossime voci», quindi il controllo 5 NON è stato eseguito. Se la sezione è stata rinominata, va aggiornata qui: una rete che non trova il suo bersaglio tace, e il silenzio si legge come «tutto a posto».`)
    return
  }
  for (let i = inizio + 1; i < righe.length; i++) {
    const riga = righe[i]
    if (!/^\|\s*\*\*\d+\*\*\s*\|/.test(riga)) continue
    // Il marchio di «chiusa» vale solo se sta all'INIZIO della cella: una voce
    // aperta può benissimo raccontare che un suo pezzo è ✅, e non per questo
    // è chiusa.
    const chiusa = /^\|\s*\*\*\d+\*\*\s*\|\s*[^|]{0,80}(✅|🚀)/.test(riga)
    if (!chiusa) continue
    const numero = riga.match(/^\|\s*\*\*(\d+)\*\*/)[1]
    for (const m of riga.matchAll(/`(docs\/superpowers\/specs\/[^`\n]+\.md)`/g)) {
      const spec = m[1]
      if (!existsSync(join(RADICE, spec))) continue // già coperto dal controllo 2
      const testaSpec = readFileSync(join(RADICE, spec), 'utf8').split('\n').slice(0, 14).join('\n')
      if (!PAROLE_DI_ESECUZIONE.test(testaSpec)) {
        errori.push(`${percorso}: la voce ${numero} si dichiara FATTA (✅/🚀) ma la spec che cita — \`${spec}\` — non dice di essere stata ESEGUITA (in testa non compare «eseguita», «in produzione», «attuata» né «parziale»). È il difetto del 03/08: due documenti nessuno dei quali è falso da solo, e insieme fanno credere costruito un perimetro che non c'è. Se l'esecuzione è parziale, si scrive PARZIALE e si elenca ciò che è rimasto fuori.`)
      }
    }
  }
}

// ═══ CONTROLLO 6 — una decisione che RIMANDA deve dire DOVE ═══
// 🔑 «Voce propria» senza una voce che esista è una cancellazione travestita da
//    rinvio: il lavoro non lo fa nessuno, e nessuno se ne accorge perché la
//    decisione È stata scritta. Regola §0A-bis: «una decisione che cancella o
//    rimanda del lavoro si scrive PER PRIMA».
// ⚠️ AMBITO DICHIARATO: solo i verbali che la CATENA raggiunge da
//    `SESSION_ACTIVE` (2 salti) — cioè quelli vivi. I verbali storici non
//    vengono guardati apposta: farebbero accendere di rosso il pre-commit su
//    righe vecchie e corrette per il loro tempo, ed è così che una guardia si fa
//    spegnere.
const FORMULE_DI_RINVIO = /voce propria|ondata propria|rimandat|rinviat|alla sua ondata|fuori dall'ondata/i
// Una DESTINAZIONE vera: un documento del repo, «voce N», o una sigla di voce
// («AUD-3», «TRGM-1»). 🛑 Deliberatamente NON basta un «D<numero>»: la riga
// comincia col numero della decisione stessa, quindi accettarlo renderebbe il
// controllo sempre verde — provato in taratura, 0 riscontri su 121 invece di 6.
const DESTINAZIONE = /`(docs|src|scripts|supabase|tests|memory)\/[^`\n]+`|\bvoce \d+|\b[A-Z]{2,4}-\d+/
function controllaRinviiDecisioni(percorso, testo) {
  if (!percorso.startsWith('docs/design/decisions/')) return
  for (const riga of testo.split('\n')) {
    const m = riga.match(/^\|\s*\*\*(D\d+)\*\*/)
    if (!m) continue
    if (!FORMULE_DI_RINVIO.test(riga)) continue
    if (DESTINAZIONE.test(riga)) continue
    errori.push(`${percorso}: ${m[1]} rimanda del lavoro ma NON nomina una destinazione che esista (un documento, una «voce N», una sigla di voce). Una decisione di SPOSTARE lavoro senza destinazione ha lo stesso effetto di una che lo CANCELLA — v. D5 e D98, trovate così dall'audit del 03/08.`)
  }
}

// ═══ CONTROLLO 7 (solo --staged) — BP-1: si tocca una decisione senza la memoria? ═══
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
  controllaRinviiDecisioni(percorso, testo)
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
controllaVociChiuse()
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
