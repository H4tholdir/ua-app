import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// ═══════════════════════════════════════════════════════════════════════════
// SPIA — ⚖️ D323 E IL SUO EMENDAMENTO: il cuore della decisione vive in UN
// SOLO posto — il predicato di `public.lavori_set_updated_at()` — e fino al
// 08/08/2026 NESSUNA prova lo guardava.
//
// 🔴 IL FATTO CHE L'HA GENERATA, misurato dalla revisione del Task D-quater
//    (rilievo I1): TRE mutazioni di
//    `supabase/migrations/20260808195344_lavori_gettone_solo_se_cambia.sql`
//    uscivano VERDI da `verify:full` —
//      ① rimettere `- 'updated_at'` nel predicato,
//      ② cambiare la colonna esente,
//      ③ non riagganciare il trigger alla funzione nuova.
//    L'unica difesa era PROSA, in tre posti (verbale, `COMMENT` sulla
//    funzione, cappello della migration).
//
// 🛑 PERCHÉ LA PROSA NON BASTA, e non è un'opinione: la guardia dei documenti
//    di questo progetto (`scripts/guardia-coerenza-documenti.mjs`) controlla
//    la COERENZA, non la VERITÀ — non può vedere uno scarto fra un verbale e
//    una funzione in banca dati. L'emendamento a D323 lo mette per iscritto:
//    «*la prima «pulizia» che nota la differenza rimetterebbe `- 'updated_at'`
//    riaprendo l'aggiornamento perso, con la convinzione di star sistemando un
//    refuso*».
//
// 🔑 LA RAGIONE IN UNA RIGA, che è quella che va letta se questa prova diventa
//    rossa: sottrarre anche `updated_at` dal confronto rende un `UPDATE` che
//    assegna SOLTANTO quel campo indistinguibile da un no-op, quindi lo PINZA
//    — e `lavoro_denti_sostituisci_atomica` fa DELETE + INSERT dell'intera
//    collezione dei denti, quindi l'aggiornamento perso è TOTALE, non
//    per-chiave. Misurato: forma ratificata 4 casi su 6, forma spedita 6 su 6.
//    ➡️ Se sei qui per «sistemare un refuso», NON è un refuso: leggi la
//    centoquarantunesima tornata di
//    `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, blocco 🔄.
//
// ── DOVE QUESTA SPIA SI DISCOSTA DAL MODELLO, e va detto ────────────────────
//
// Le due spie gemelle (`prescrizione-costanti-spia-migration.test.ts`,
// `categorie-foto-spia-migration.test.ts`) confrontano una migration con una
// COSTANTE TypeScript, perché lì la stessa verità è scritta in due posti VIVI.
// 🔑 Qui no: il secondo posto è la DECISIONE, non del codice. Nessun modulo
// dell'app nomina la colonna esente, e inventarne uno creerebbe un consumatore
// finto — cioè una seconda fonte della stessa verità, la famiglia di difetto
// che questo progetto ha già pagato più volte. ➡️ L'insieme atteso è dichiarato
// QUI SOTTO, e questo file è il verbale meccanico di D323.
//
// 🔑 CONFRONTA INSIEMI, NON CONTEGGI (modello: `categorie-foto`): un conteggio
//    resterebbe verde se una chiave venisse scambiata con un'altra.
// ═══════════════════════════════════════════════════════════════════════════

// 🛑 PUNTA ALLA MIGRATION IN VIGORE, e si sposta A MANO quando la funzione
//    viene ricreata altrove — stessa regola delle spie gemelle: «ogni funzione
//    punta al file che l'ha definita l'ULTIMA volta».
// 🛑 SCARTATA la scansione automatica («prendi l'ultima migration che nomina
//    la funzione»): scambierebbe un rosso RUMOROSO con un verde SILENZIOSO.
//    ➡️ Al suo posto c'è la prova «nessun'ALTRA migration tocca questi due
//    oggetti», in fondo al file: quella si accende e dice di spostare il
//    puntatore, invece di seguirlo da sola.
const MIGRATION = 'supabase/migrations/20260808195344_lavori_gettone_solo_se_cambia.sql'
const CARTELLA_MIGRATIONS = 'supabase/migrations'

/** 🛑 L'INSIEME ESENTE — È IL CUORE DI D323, non un dettaglio di forma.
 *
 *  Criterio dell'esenzione, scritto nel `COMMENT` sulla funzione e qui perché
 *  non si deduce dal codice: si esenta SOLO una colonna che non compare su
 *  NESSUN documento e su NESSUNA schermata che l'operatrice conferma.
 *  `post_consegna_correzioni` è l'unica: contatore interno, ZERO consumatori
 *  misurati in tutta l'app.
 *
 *  🔴 `updated_at` NON È IN QUESTA LISTA DI PROPOSITO. Vedi la ragione in una
 *     riga, in testa al file. */
const COLONNE_ESENTI = ['post_consegna_correzioni'] as const

const PERCHE_ESENTI =
  "⚖️ D323 + EMENDAMENTO (141ª tornata) — il predicato di `lavori_set_updated_at` deve sottrarre `post_consegna_correzioni` E BASTA. " +
  "Sottrarre anche `updated_at` pinza un UPDATE che assegna SOLO quel campo: `lavoro_denti_sostituisci_atomica` fa DELETE+INSERT dell'intera collezione, l'aggiornamento perso è TOTALE. " +
  'NON è un refuso da sistemare: è la regressione che l\'emendamento nomina per intero.'

const PERCHE_TRIGGER =
  '⚖️ D323 — la migration fa `DROP TRIGGER` e DEVE riagganciarlo a `public.lavori_set_updated_at()`. ' +
  'Senza il riaggancio la migration è un NO-OP VERDE (o peggio: `lavori` resta senza trigger) e ogni prova misura il comportamento vecchio. ' +
  'È il difetto B1, già trovato una volta nel piano.'

const PERCHE_CONDIVISA =
  '⚖️ D323 — `trigger_set_updated_at()` è CONDIVISA da ~20 tabelle e NON si tocca: `lavori` ha la sua, con un nome proprio. ' +
  'Toccare la condivisa (o richiamare `apply_updated_at_trigger(\'lavori\')`) cambierebbe il significato di `updated_at` ovunque, o rimetterebbe la condivisa su `lavori` IN SILENZIO.'

/** Il file SENZA i commenti `--`.
 *
 *  🔴 SERVE, e l'hanno insegnato due rossi veri nelle spie gemelle: le
 *  migration di questo repo portano in testa blocchi di prosa lunghi quanto il
 *  codice, e questa in particolare CITA NEL CAPPELLO la forma sbagliata
 *  (`- 'post_consegna_correzioni' - 'updated_at'`, righe 59-61) per spiegare
 *  perché è stata corretta. Una ricerca sul file intero leggerebbe quel
 *  commento come se fosse un'istruzione e si accenderebbe sempre.
 *  ➡️ Da qui in poi si guarda ciò che il database esegue, non ciò che il file
 *  racconta.
 *
 *  ⚠️ Il corpo di `COMMENT ON … IS '…'` NON è un commento SQL: è una stringa,
 *  e sopravvive a questo filtro. È voluto — la prova del puntatore in fondo al
 *  file legge proprio quella. */
function soloIstruzioni(sql: string): string {
  return sql
    .split('\n')
    .filter((riga) => !riga.trimStart().startsWith('--'))
    .join('\n')
}

/** La definizione di UNA funzione, dal `CREATE` al prossimo oggetto di primo
 *  livello. Stessa forma delle spie gemelle, e per la stessa ragione: legare
 *  l'estrazione alla FUNZIONE invece che al file fa guastare la spia in modo
 *  RUMOROSO il giorno in cui la funzione si sposta. */
function corpoFunzione(sql: string, funzione: string): string {
  const apertura = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION public\\.${funzione}\\(`)
  const m = apertura.exec(sql)
  if (!m) {
    throw new Error(
      `la funzione ${funzione} non è definita in ${MIGRATION}: la spia non può provare nulla — ${PERCHE_TRIGGER}`
    )
  }
  const dopo = sql.slice(m.index + m[0].length)
  const fine = dopo.search(/\n(?:CREATE|COMMENT|REVOKE|GRANT|ALTER|DROP)\b/)
  return fine === -1 ? dopo : dopo.slice(0, fine)
}

function istruzioni(file = MIGRATION): string {
  return soloIstruzioni(readFileSync(file, 'utf-8'))
}

/** Il predicato dell'`IF`, cioè le due espressioni confrontate. */
function predicato(): string {
  const corpo = corpoFunzione(istruzioni(), 'lavori_set_updated_at')
  const m = /\bIF\b([\s\S]*?)\bTHEN\b/.exec(corpo)
  if (!m) {
    throw new Error(
      `nessun predicato \`IF … THEN\` dentro \`lavori_set_updated_at\`: la spia non può provare nulla — ${PERCHE_ESENTI}`
    )
  }
  return m[1]
}

/** Le chiavi sottratte a `to_jsonb(OLD)` / `to_jsonb(NEW)` nel predicato. */
function chiaviSottratte(lato: 'OLD' | 'NEW', dove = predicato()): string[] {
  const m = new RegExp(`to_jsonb\\(${lato}\\)((?:\\s*-\\s*'[^']*')*)`).exec(dove)
  if (!m) {
    throw new Error(
      `\`to_jsonb(${lato})\` non compare nel predicato di \`lavori_set_updated_at\`: la spia non può provare nulla — ${PERCHE_ESENTI}`
    )
  }
  return [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1])
}

/** I due insiemi coincidono, in ENTRAMBE le direzioni. */
function coincidono(daSql: string[], atteso: readonly string[], motivo: string) {
  const sql = new Set<string>(daSql)
  const ts = new Set<string>(atteso)
  // esentata in banca dati e NON prevista da D323 (è la mutazione ①/②)
  expect([...sql].filter((v) => !ts.has(v)), motivo).toEqual([])
  // prevista da D323 e NON esentata in banca dati
  expect([...ts].filter((v) => !sql.has(v)), motivo).toEqual([])
}

describe('spia — il cuore di D323 non può cambiare in silenzio', () => {
  it('① il predicato sottrae `post_consegna_correzioni` E BASTA — lato OLD', () => {
    coincidono(chiaviSottratte('OLD'), COLONNE_ESENTI, PERCHE_ESENTI)
  })

  it('① il predicato sottrae `post_consegna_correzioni` E BASTA — lato NEW', () => {
    coincidono(chiaviSottratte('NEW'), COLONNE_ESENTI, PERCHE_ESENTI)
  })

  it('①-bis i due lati sottraggono LE STESSE chiavi', () => {
    // 🔑 Un predicato asimmetrico (`… OLD - 'a' - 'b' … NEW - 'a'`) sarebbe già
    //    preso dalle due prove sopra, ma qui il messaggio dice COSA guardare.
    const p = predicato()
    expect(chiaviSottratte('OLD', p), PERCHE_ESENTI).toEqual(chiaviSottratte('NEW', p))
  })

  it('①-ter il confronto è `IS NOT DISTINCT FROM`, e i due rami non sono scambiati', () => {
    const corpo = corpoFunzione(istruzioni(), 'lavori_set_updated_at')
    expect(predicato(), PERCHE_ESENTI).toMatch(/IS\s+NOT\s+DISTINCT\s+FROM/)

    const rami = /\bTHEN\b([\s\S]*?)\bELSE\b([\s\S]*?)\bEND\s+IF\b/.exec(corpo)
    if (!rami) {
      throw new Error(
        `nessuna coppia \`THEN … ELSE … END IF\` dentro \`lavori_set_updated_at\`: la spia non può provare nulla — ${PERCHE_ESENTI}`
      )
    }
    // sostanza IDENTICA ⇒ si PINZA al valore vecchio
    expect(rami[1], PERCHE_ESENTI).toMatch(/NEW\.updated_at\s*=\s*OLD\.updated_at/)
    // sostanza DIVERSA ⇒ il gettone avanza
    expect(rami[2], PERCHE_ESENTI).toMatch(/NEW\.updated_at\s*=\s*now\(\)/)
  })

  it('③ il trigger è RIAGGANCIATO alla funzione nuova, dopo il DROP', () => {
    const sql = istruzioni()

    const drop = sql.search(/DROP TRIGGER\s+(?:IF EXISTS\s+)?trg_lavori_updated_at\b/)
    const creazione = /CREATE TRIGGER\s+trg_lavori_updated_at\b([\s\S]*?);/.exec(sql)
    if (!creazione) {
      throw new Error(
        `\`CREATE TRIGGER trg_lavori_updated_at\` non c'è in ${MIGRATION} — ${PERCHE_TRIGGER}`
      )
    }

    expect(drop, PERCHE_TRIGGER).toBeGreaterThan(-1)
    expect(creazione.index, PERCHE_TRIGGER).toBeGreaterThan(drop)
    expect(creazione[1], PERCHE_TRIGGER).toMatch(/BEFORE\s+UPDATE\s+ON\s+public\.lavori\b/)
    expect(creazione[1], PERCHE_TRIGGER).toMatch(/FOR\s+EACH\s+ROW/)
    expect(creazione[1], PERCHE_TRIGGER).toMatch(
      /EXECUTE\s+FUNCTION\s+public\.lavori_set_updated_at\(\)/
    )
  })

  it('la condivisa `trigger_set_updated_at` NON è toccata da questa migration', () => {
    const sql = istruzioni()
    expect(
      sql,
      PERCHE_CONDIVISA
    ).not.toMatch(
      /\b(?:CREATE|DROP|ALTER)\s+(?:OR REPLACE\s+)?FUNCTION\s+(?:IF EXISTS\s+)?(?:public\.)?trigger_set_updated_at\b/
    )
    expect(sql, PERCHE_CONDIVISA).not.toMatch(/apply_updated_at_trigger/)
  })
})

describe('spia — il puntatore di questa prova non può diventare stantio', () => {
  // 🔑 IL BUCO CHE QUESTA PROVA CHIUDE, ed è il modo in cui una spia legata a
  //    un file muore in silenzio: una migration FUTURA che ricreasse
  //    `lavori_set_updated_at` (magari «unificando i duplicati») lascerebbe le
  //    prove qui sopra a leggere un corpo MORTO — verdi su un testo che il
  //    database non esegue più.
  // ➡️ Non si segue il file più recente (sarebbe il verde silenzioso che il
  //    modello scarta): si PRETENDE che questa migration resti l'unica, e chi
  //    ne scrive un'altra sposta il puntatore in testa a questo file.
  const ALTRE = readdirSync(CARTELLA_MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => `${CARTELLA_MIGRATIONS}/${f}`)
    .filter((f) => f !== MIGRATION)

  it('nessun\'ALTRA migration ridefinisce `lavori_set_updated_at`', () => {
    const colpevoli = ALTRE.filter((f) =>
      /\b(?:CREATE|DROP|ALTER)\s+(?:OR REPLACE\s+)?FUNCTION\s+(?:IF EXISTS\s+)?public\.lavori_set_updated_at\b/.test(
        istruzioni(f)
      )
    )
    expect(
      colpevoli,
      `⚖️ D323 — il corpo VIVO della funzione non sta più in ${MIGRATION}: sposta il puntatore in testa a questa spia, o proverà un testo che il database non esegue più.`
    ).toEqual([])
  })

  it('nessun\'ALTRA migration riaggancia `trg_lavori_updated_at` (né richiama `apply_updated_at_trigger`)', () => {
    const colpevoli = ALTRE.filter((f) => {
      const sql = istruzioni(f)
      return (
        /CREATE TRIGGER\s+trg_lavori_updated_at\b/.test(sql) ||
        /apply_updated_at_trigger\s*\(\s*'lavori'\s*\)/.test(sql)
      )
    })
    expect(
      colpevoli,
      `⚖️ D323 — un'altra migration rimette un trigger su \`lavori.updated_at\`: se punta alla condivisa \`trigger_set_updated_at()\`, D323 è REVOCATA in silenzio. ${PERCHE_CONDIVISA}`
    ).toEqual([])
  })
})

describe('spia — l\'accoppiamento con `PATCH /api/lavori/[id]` (emendamento a D323)', () => {
  // 🔑 LA DECISIONE, e va letta prima di aggiungere qui una prova sulla rotta.
  //    L'emendamento dichiara ACCOPPIATI il predicato del trigger e la riga
  //    `payload.updated_at = new Date()…` della PATCH: il predicato tiene
  //    `updated_at` DENTRO il confronto di proposito, quindi finché la rotta lo
  //    manda, OGNI salvataggio da lì si sfila dalla pinzatura.
  //
  //    ➡️ La metà «rotta» dell'accoppiamento È GIÀ PROVATA, e per
  //    COMPORTAMENTO: `tests/unit/lavori-patch-senza-updated-at.test.ts`
  //    invoca l'handler vero e pretende che il carico dell'UPDATE non porti
  //    `updated_at` (`not.toHaveProperty`). Riscriverla qui come ricerca di
  //    testo nel sorgente sarebbe una prova STRETTAMENTE PIÙ DEBOLE della
  //    stessa cosa, in un secondo posto che può divergere. Non si fa.
  //
  //    ➡️ Quello che NON era coperto è che le due metà si perdano di vista: il
  //    `COMMENT` sulla funzione — cioè il testo che vive in banca dati — NOMINA
  //    quel file come propria sentinella, e nessuno controllava che il nome
  //    puntasse ancora a qualcosa. Questa prova è un controllo di PUNTATORE
  //    NON APPESO, non una prova dell'accoppiamento: quella sta di là.
  it('il file che il `COMMENT` della funzione indica come sentinella esiste davvero', () => {
    const sql = istruzioni() // solo il corpo del COMMENT ON sopravvive al filtro
    const citati = [...sql.matchAll(/(tests\/[A-Za-z0-9._/-]+\.test\.ts)/g)].map((m) => m[1])

    if (citati.length === 0) {
      throw new Error(
        `il \`COMMENT\` su \`lavori_set_updated_at\` non nomina più nessuna sentinella: l'accoppiamento dichiarato dall'emendamento a D323 (trigger ⇄ \`payload.updated_at\` della PATCH) è rimasto senza rimando. Reintroduci il puntatore o cambia questa prova con la decisione scritta.`
      )
    }

    const appesi = citati.filter((p) => !existsSync(p))
    expect(
      appesi,
      "⚖️ D323 + EMENDAMENTO — il `COMMENT` in banca dati rimanda a una sentinella che non esiste più. È l'accoppiamento fra il trigger e la riga `payload.updated_at` della PATCH: se quella prova è stata spostata, aggiorna il `COMMENT` nella migration; se è stata cancellata, D323 vale per metà."
    ).toEqual([])
  })
})
