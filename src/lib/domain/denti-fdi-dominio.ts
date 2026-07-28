// Dominio dei codici dente FDI (ISO 3950) — unica fonte di verità per «questo
// numero è un dente che esiste».
//
// 🔴 L'insieme NON è un intervallo (verbale §6-sexies ⑤): un
// `BETWEEN 11 AND 48` accetterebbe 19, 20, 29, 30, 39, 40 — denti che non
// esistono. La forma è strutturale: decina = quadrante, unità = posizione.
//   quadranti 1-4 → permanenti, 8 posizioni  → 32 denti
//   quadranti 5-8 → decidui,    5 posizioni  → 20 denti
// Totale: 52 codici validi.
//
// Lo stesso vincolo vive in SQL sulla tabella `lavori_denti`
// (20260727120100_lavori_denti_tabella.sql): qui e lì devono dire la stessa
// cosa, ed è il test `denti-fdi-dominio.test.ts` a tenerle allineate.

export type Quadrante = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type ArcataFdi = 'superiore' | 'inferiore'

function costruisciInsieme(): ReadonlySet<number> {
  const s = new Set<number>()
  for (let q = 1; q <= 4; q++) {
    for (let p = 1; p <= 8; p++) s.add(q * 10 + p)
  }
  for (let q = 5; q <= 8; q++) {
    for (let p = 1; p <= 5; p++) s.add(q * 10 + p)
  }
  return s
}

/** I 52 codici FDI che esistono davvero. */
export const DENTI_FDI_VALIDI: ReadonlySet<number> = costruisciInsieme()

/**
 * Vero solo per un intero appartenente ai 52. Rifiuta stringhe («'11'», «'2.6'»,
 * «'11 '»), decimali, NaN/Infinity e null/undefined: la porta d'ingresso della
 * route non deve mai lasciar arrivare al CHECK del database un valore che
 * produrrebbe un 500 invece di un 422 leggibile.
 */
export function isFdiValido(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && DENTI_FDI_VALIDI.has(v)
}

/** Il quadrante si DERIVA dalla decina. Mai letto da un campo scritto a mano (⑥). */
export function quadranteDa(fdi: number): Quadrante {
  return Math.floor(fdi / 10) as Quadrante
}

/** Quadranti 1, 2, 5, 6 stanno sopra; 3, 4, 7, 8 sotto. */
export function arcataDa(fdi: number): ArcataFdi {
  const q = quadranteDa(fdi)
  return q === 1 || q === 2 || q === 5 || q === 6 ? 'superiore' : 'inferiore'
}
