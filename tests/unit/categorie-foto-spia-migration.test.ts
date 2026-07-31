import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { CATEGORIE_FOTO } from '@/lib/domain/categorie-foto'

// ═══════════════════════════════════════════════════════════════════════════
// SPIA — la lista dei valori (SETTE da D91) vive in TRE posti: il CHECK della migration,
// questa costante TypeScript, e la validazione della rotta (T3).
//
// 🛑 SERVE perché il database NON restringe il tipo generato: `gen types`
//    produce `categoria: string`, non l'unione dei valori (provato su
//    `lavori_immagini.tipo`, che aveva un CHECK identico ed usciva `string`).
//    🔴 E dal 30/07 si sa che è PEGGIO: i quattro fabbricanti del client
//    (`src/lib/supabase/{server-service,server-user,browser-anon,
//    middleware-client}.ts`) creano il client SENZA il generico `<Database>`,
//    quindi NESSUN tipo generato incontra mai una query — T1 ha messo una
//    colonna inventata in un `.insert()` e `tsc` è rimasto a uscita 0
//    (rilievo R27, P2 corretta nel piano).
//    ➡️ Questa prova è l'UNICA rete meccanica che impedisce a migration e
//    codice di divergere in silenzio.
//
// 🔑 CONFRONTA INSIEMI, NON CONTEGGI, e la ragione è un difetto vero già
//    pagato: `colore-dente-idratazione.test.ts:21-33` legge una migration e
//    pretende esattamente 48 — quindi resterebbe VERDE se il catalogo
//    crescesse (rilievo R3 del verbale). Un confronto di insiemi si accende
//    sia se la migration cresce, sia se cresce il codice.
// ═══════════════════════════════════════════════════════════════════════════

// 🛑 PUNTA AL VINCOLO IN VIGORE, e si sposta A MANO quando il vincolo si
//    sposta. Il 02/08/2026 la settima categoria (D91) ha sostituito il CHECK:
//    `DROP CONSTRAINT` + `ADD CONSTRAINT` in una migration NUOVA, quindi il
//    vincolo vivo non è più quello del 30/07.
// 🛑 SCARTATA la scansione automatica della cartella («prendi l'ultima
//    migration che nomina un CHECK su categoria»): scambierebbe un rosso
//    RUMOROSO con un verde SILENZIOSO — una migration che togliesse il vincolo
//    senza rimetterlo, o che lo riscrivesse in altra forma, lascerebbe la spia
//    a leggere un file vecchio e a dichiarare tutto a posto. Questa prova è
//    l'UNICA rete meccanica (v. testa del file): il suo modo di guastarsi deve
//    restare rumoroso.
// ➡️ Chi cambia di nuovo l'elenco cambia QUESTA riga, e la prova glielo dice
//    fallendo.
const MIGRATION = 'supabase/migrations/20260802090000_lavori_immagini_categoria_prescrizione.sql'
const MIGRATION_ORIGINE = 'supabase/migrations/20260730150000_lavori_immagini_categoria.sql'

/** Il file SENZA i commenti.
 *
 *  🔴 SERVE, e l'ha insegnato un rosso vero (02/08): la migration della settima
 *  categoria porta in testa il blocco `provato:` di R-P1, e lì dentro le parole
 *  «ADD CONSTRAINT» compaiono nel testo della prova — PRIMA del `DROP` vero.
 *  Le prove qui sotto, che cercavano le parole nel file intero, hanno letto il
 *  commento come se fosse un'istruzione e si sono accese.
 *  🔑 Un difetto della PROVA, non della migration — ma della specie giusta: si
 *  è accesa invece di tacere. Da qui in poi si guarda ciò che il database
 *  esegue, non ciò che il file racconta. */
function soloIstruzioni(sql: string): string {
  return sql
    .split('\n')
    .filter((riga) => !riga.trimStart().startsWith('--'))
    .join('\n')
}

function valoriDalCheck(file = MIGRATION): string[] {
  const sql = soloIstruzioni(readFileSync(file, 'utf-8'))
  const m = sql.match(/CHECK \(categoria IN \(([^)]+)\)\)/)
  if (!m) throw new Error('CHECK su `categoria` non trovato nella migration: la spia non può provare nulla')
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

describe('spia — il CHECK della migration e la costante TypeScript non possono divergere', () => {
  it('gli INSIEMI coincidono, in entrambe le direzioni', () => {
    const daSql = new Set(valoriDalCheck())
    // 🛑 `new Set<string>` ESPLICITO, non è pedanteria: senza l'annotazione
    //    l'insieme esce `Set<CategoriaFoto>` e `daTs.has(v)` con `v: string`
    //    NON COMPILA (TS2345). Il piano lo scriveva senza, e la direzione che
    //    saltava era proprio «nel database, non nel codice» — cioè metà spia.
    const daTs = new Set<string>(CATEGORIE_FOTO.map((c) => c.valore))
    expect([...daTs].filter((v) => !daSql.has(v))).toEqual([])  // nel codice, non nel database
    expect([...daSql].filter((v) => !daTs.has(v))).toEqual([])  // nel database, non nel codice
  })

  it('la migration di origine NON dà un valore di ripiego a `categoria` (D73)', () => {
    const sql = soloIstruzioni(readFileSync(MIGRATION_ORIGINE, 'utf-8'))
    expect(sql).toMatch(/ALTER COLUMN categoria SET NOT NULL/)
    expect(sql).not.toMatch(/categoria[^;]*SET DEFAULT/)
  })

  it('il backfill di origine NON filtra deleted_at — o SET NOT NULL aborterebbe', () => {
    const sql = soloIstruzioni(readFileSync(MIGRATION_ORIGINE, 'utf-8'))
    const backfill = sql.slice(sql.indexOf('UPDATE lavori_immagini'), sql.indexOf('ADD CONSTRAINT'))
    expect(backfill).not.toMatch(/deleted_at/)
  })

  // ── D91/D92 — il vincolo si SOSTITUISCE, non si affianca ────────────────
  describe('la sostituzione del vincolo (D91)', () => {
    it('la migration nuova TOGLIE il vincolo vecchio prima di metterne uno nuovo', () => {
      const sql = soloIstruzioni(readFileSync(MIGRATION, 'utf-8'))
      // 🛑 Senza il DROP, l'ADD fallisce per nome duplicato e la migration
      //    aborta: il ledger resta disallineato e il deploy si blocca (§8).
      const drop = sql.indexOf('DROP CONSTRAINT')
      const add = sql.indexOf('ADD CONSTRAINT')
      expect(drop).toBeGreaterThan(-1)
      expect(add).toBeGreaterThan(drop)
      expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS lavori_immagini_categoria_check/)
    })

    it('il vincolo nuovo ammette la prescrizione, e il vecchio no — cioè qualcosa è cambiato davvero', () => {
      expect(valoriDalCheck(MIGRATION)).toContain('prescrizione')
      expect(valoriDalCheck(MIGRATION_ORIGINE)).not.toContain('prescrizione')
    })

    it('nessun backfill: le righe vecchie portano già valori che restano validi', () => {
      const sql = soloIstruzioni(readFileSync(MIGRATION, 'utf-8'))
      // Le sei di prima sono tutte dentro le sette di adesso: un UPDATE qui
      // toccherebbe righe che non hanno niente da correggere.
      expect(sql).not.toMatch(/UPDATE lavori_immagini/)
      expect(valoriDalCheck(MIGRATION_ORIGINE).every((v) => valoriDalCheck(MIGRATION).includes(v))).toBe(true)
    })
  })
})
