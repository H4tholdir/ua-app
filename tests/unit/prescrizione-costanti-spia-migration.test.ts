import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  FONTE_TIPI,
  CAMPI_TYPO,
  MOTIVI_DIVERGENZA,
  isFonteTipo,
  isCampoTypo,
  isMotivoDivergenza,
} from '@/lib/domain/prescrizione-costanti'

// ═══════════════════════════════════════════════════════════════════════════
// SPIA — i TRE dizionari della prescrizione vivono in due mondi: il vincolo che
// il database esegue e la costante TypeScript che le route leggono. Questa
// prova è l'UNICA rete meccanica che impedisce ai due di divergere in silenzio.
//
// 🛑 SERVE perché il database NON restringe il tipo generato: `gen types`
//    produce `fonte_tipo: string`, non l'unione dei quattro valori. 🔴 E dal
//    30/07/2026 si sa che è PEGGIO: i quattro fabbricanti del client
//    (`src/lib/supabase/{server-service,server-user,browser-anon,
//    middleware-client}.ts`) creano il client SENZA il generico `<Database>`,
//    quindi NESSUN tipo generato incontra mai una query (rilievo R27). `tsc`
//    non vede nulla di tutto questo.
//
// 🔑 CONFRONTA INSIEMI, NON CONTEGGI — modello e ragione in
//    `categorie-foto-spia-migration.test.ts`: un conteggio resta verde se il
//    dizionario cresce da tutte e due le parti nello stesso momento sbagliato.
//
// 🔑 QUATTRO estrazioni, non tre: `fonte_tipo` è scritto DUE volte in banca
//    dati — il CHECK della tabella (che RIFIUTA) e la guardia dentro
//    `lavoro_prescrizione_allega_fonte` (che risponde `fonte_tipo_non_valido`
//    invece di far esplodere un 23514). Se i due divergessero, la RPC
//    accetterebbe un valore che la tabella respinge: un 500 al posto di un
//    esito parlante. La spia li tiene insieme tutti e tre (SQL×2 + TS).
// ═══════════════════════════════════════════════════════════════════════════

// 🛑 PUNTANO AL VINCOLO IN VIGORE, e si spostano A MANO quando il vincolo si
//    sposta (modello categorie-foto: la scansione automatica della cartella è
//    stata SCARTATA — scambierebbe un rosso rumoroso con un verde silenzioso).
//
// 🔴 AVVISO A CHI ESEGUE IL TASK 5 DI QUESTA SESSIONE: T5 fa `CREATE OR
//    REPLACE` di `lavoro_prescrizione_registra_divergenza` in una migration
//    NUOVA, per aggiungere il dizionario su `p_campo`. Da quel momento il corpo
//    vivo di quella funzione NON è più in 20260804152403 — ma il testo vecchio
//    resta nel file, e questa spia continuerebbe a leggerlo e a dichiararsi
//    verde. `MIGRATION_RPC` va spostata alla migration di T5 NELLO STESSO
//    salvataggio, e il nuovo `p_campo NOT IN (...)` di `registra_divergenza`
//    guadagna la sua estrazione qui sotto.
const MIGRATION_TABELLA = 'supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql'
const MIGRATION_RPC = 'supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql'

/** Il file SENZA i commenti.
 *
 *  🔴 SERVE, e l'ha insegnato un rosso vero nella spia gemella (02/08/2026): le
 *  migration di questo repo portano in testa blocchi di prosa lunghi quanto il
 *  codice, e i valori dei dizionari vi compaiono citati. `20260804152403` cita
 *  le quattro forme della fonte in un commento (riga 160-162) PRIMA di
 *  scriverle nell'IF. Da qui in poi si guarda ciò che il database esegue, non
 *  ciò che il file racconta. */
function soloIstruzioni(sql: string): string {
  return sql
    .split('\n')
    .filter((riga) => !riga.trimStart().startsWith('--'))
    .join('\n')
}

function valori(file: string, regex: RegExp, nome: string): string[] {
  const sql = soloIstruzioni(readFileSync(file, 'utf-8'))
  const m = sql.match(regex)
  if (!m) throw new Error(`${nome} non trovato in ${file}: la spia non può provare nulla`)
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

/** I due insiemi coincidono, in ENTRAMBE le direzioni. */
function coincidono(daSql: string[], daTs: readonly string[]) {
  const sql = new Set<string>(daSql)
  const ts = new Set<string>(daTs)
  expect([...ts].filter((v) => !sql.has(v))).toEqual([]) // nel codice, non in banca dati
  expect([...sql].filter((v) => !ts.has(v))).toEqual([]) // in banca dati, non nel codice
}

describe('spia — i dizionari della prescrizione non possono divergere dal database', () => {
  it('FONTE_TIPI = il CHECK della tabella `lavori_prescrizioni`', () => {
    coincidono(
      valori(MIGRATION_TABELLA, /CHECK \(fonte_tipo IN \(([^)]+)\)\)/, 'CHECK su fonte_tipo'),
      FONTE_TIPI
    )
  })

  it('FONTE_TIPI = la guardia dentro `lavoro_prescrizione_allega_fonte`', () => {
    coincidono(
      valori(MIGRATION_RPC, /p_fonte_tipo NOT IN \(([^)]+)\)/, 'guardia p_fonte_tipo'),
      FONTE_TIPI
    )
  })

  it('CAMPI_TYPO = la guardia dentro `lavoro_prescrizione_correggi_typo`', () => {
    coincidono(
      valori(MIGRATION_RPC, /p_campo NOT IN \(([^)]+)\)/, 'guardia p_campo'),
      CAMPI_TYPO
    )
  })

  it('MOTIVI_DIVERGENZA = la guardia dentro `lavoro_prescrizione_registra_divergenza`', () => {
    coincidono(
      valori(MIGRATION_RPC, /p_motivo NOT IN \(([^)]+)\)/, 'guardia p_motivo'),
      MOTIVI_DIVERGENZA
    )
  })
})

describe('le tre guardie di tipo riconoscono i valori e rifiutano tutto il resto', () => {
  // 🔑 Le forme che una route riceve davvero da un corpo JSON: non solo la
  //    stringa sbagliata, ma il numero, il null, l'array, l'oggetto. Una
  //    guardia scritta come `FONTE_TIPI.includes(v as never)` accetterebbe
  //    `undefined` senza accorgersene.
  const NON_VALORI = [undefined, null, 5, true, {}, [], ['foglio'], '', '  foglio  ', 'FOGLIO']

  // 🔴 SERVE, e l'ha trovata il conteggio R-P4 di questo stesso task: contro
  //    l'abbozzo inerte (dizionari VUOTI, guardie che rispondono sempre `false`)
  //    queste tre prove passavano — le uniche 3 su 61. Un `for` su una lista
  //    vuota non esegue nessuna asserzione: la prova diceva «la guardia
  //    riconosce i valori» senza guardarne mai uno. Il non-vuoto dichiarato è
  //    ciò che rende il ciclo capace di fallire.
  function nonVuoto(dizionario: readonly string[]) {
    expect(dizionario.length).toBeGreaterThan(0)
  }

  it('isFonteTipo', () => {
    nonVuoto(FONTE_TIPI)
    for (const v of FONTE_TIPI) expect(isFonteTipo(v)).toBe(true)
    for (const v of NON_VALORI) expect(isFonteTipo(v)).toBe(false)
    expect(isFonteTipo('fax')).toBe(false)
  })

  it('isCampoTypo', () => {
    nonVuoto(CAMPI_TYPO)
    for (const v of CAMPI_TYPO) expect(isCampoTypo(v)).toBe(true)
    for (const v of NON_VALORI) expect(isCampoTypo(v)).toBe(false)
    expect(isCampoTypo('pippo')).toBe(false) // il valore della sonda S4
  })

  it('isMotivoDivergenza', () => {
    nonVuoto(MOTIVI_DIVERGENZA)
    for (const v of MOTIVI_DIVERGENZA) expect(isMotivoDivergenza(v)).toBe(true)
    for (const v of NON_VALORI) expect(isMotivoDivergenza(v)).toBe(false)
    expect(isMotivoDivergenza('perche_si')).toBe(false)
  })
})
