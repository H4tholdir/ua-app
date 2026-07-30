import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { CATEGORIE_FOTO } from '@/lib/domain/categorie-foto'

// ═══════════════════════════════════════════════════════════════════════════
// SPIA — la lista dei sei valori vive in TRE posti: il CHECK della migration,
// questa costante TypeScript, e la validazione della rotta (T3).
//
// 🛑 SERVE perché il database NON restringe il tipo generato: `gen types`
//    produce `categoria: string`, non l'unione dei sei (provato su
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

const MIGRATION = 'supabase/migrations/20260730150000_lavori_immagini_categoria.sql'

function valoriDalCheck(): string[] {
  const sql = readFileSync(MIGRATION, 'utf-8')
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

  it('la migration NON dà un valore di ripiego a `categoria` (D73)', () => {
    const sql = readFileSync(MIGRATION, 'utf-8')
    expect(sql).toMatch(/ALTER COLUMN categoria SET NOT NULL/)
    expect(sql).not.toMatch(/categoria[^;]*SET DEFAULT/)
  })

  it('il backfill NON filtra deleted_at — o SET NOT NULL aborterebbe', () => {
    const sql = readFileSync(MIGRATION, 'utf-8')
    const backfill = sql.slice(sql.indexOf('UPDATE lavori_immagini'), sql.indexOf('ADD CONSTRAINT'))
    expect(backfill).not.toMatch(/deleted_at/)
  })
})
