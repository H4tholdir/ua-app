// src/lib/pdf/dpa-modello.ts

/** Versione della FORMA del documento. Si alza a OGNI cambio del testo di
 *  `DpaTemplate.tsx`, insieme a IMPRONTA_TESTO_DPA: le due cose si muovono
 *  sempre insieme, e `tests/unit/dpa-modello.test.ts` è ciò che lo impone.
 *  v2 = riscrittura del 03/08/2026 (D126). */
export const VERSIONE_MODELLO_DPA = 'dpa-v2'

/** sha-256 del testo reso con la fixture fissa della prova. NON è una firma del
 *  documento: è l'ancora che lega il testo alla versione dichiarata. */
export const IMPRONTA_TESTO_DPA = '8d98dbeebfef2cf3c884f66149804f9654e030b9283c1f9d6a254a5b7ef64ef5'
