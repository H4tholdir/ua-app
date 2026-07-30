// src/lib/domain/categorie-foto.ts
//
// UNICA FONTE dei sei valori di categoria foto (D72, elenco CHIUSO ratificato da
// Francesco il 30/07/2026) e del loro ordine di gruppo (D71, cronologico).
//
// 🛑 L'ordine NON è esprimibile come .order() di PostgREST: alfabeticamente
//    `altro` verrebbe PRIMA di tutto, cioè l'esatto contrario di D71. Si ordina
//    qui, dopo la lettura — con 4-20 foto per lavoro il costo è nullo.
// 🛑 Nessuna copia locale di questa lista. La copia che c'era
//    (`TabImmagini.tsx:13-22`) sparisce in T11.
// 🔴 La rete che tiene questo elenco allineato al `CHECK` della migration è
//    `tests/unit/categorie-foto-spia-migration.test.ts`, ed è l'UNICA: su questo
//    repo `tsc` non vede le query (i quattro fabbricanti del client non passano
//    il generico `<Database>` — rilievo R27, 30/07/2026). Chi tocca questa lista
//    tocca la migration nello stesso salvataggio, o la spia si accende.

export const CATEGORIE_FOTO = [
  { valore: 'impronta',   etichetta: 'Impronta' },
  { valore: 'pre_lavoro', etichetta: 'Pre-lavoro' },
  { valore: 'colore',     etichetta: 'Guida colore' },
  { valore: 'post_prova', etichetta: 'Post-prova' },
  { valore: 'rx',         etichetta: 'Radiografia' },
  { valore: 'altro',      etichetta: 'Altro' },
] as const

export type CategoriaFoto = (typeof CATEGORIE_FOTO)[number]['valore']

const POSIZIONE = new Map<string, number>(CATEGORIE_FOTO.map((c, i) => [c.valore, i]))

/** `true` se il valore è una delle sei. Usata dalla rotta per rispondere 422.
 *
 *  🛑 PER CHI SCRIVE LA VALIDAZIONE DELLA ROTTA (T3): si IMPORTA questa, non si
 *     riscrive l'elenco. La spia sorveglia DUE copie — il `CHECK` della migration
 *     e questa costante — e una terza copia scritta a mano dentro la rotta
 *     (`['impronta', …].includes(v)`) NON la vede nessuno: né la spia, né `tsc`,
 *     che su questo repo non guarda dentro le query (R27). Sarebbe l'unico posto
 *     dell'ondata in cui l'elenco può divergere in silenzio. */
export function isCategoriaFoto(v: unknown): v is CategoriaFoto {
  return typeof v === 'string' && POSIZIONE.has(v)
}

/** L'etichetta da mostrare. Ripiega sul valore grezzo: meglio una sigla che il vuoto. */
export function etichettaCategoria(valore: string): string {
  return CATEGORIE_FOTO.find((c) => c.valore === valore)?.etichetta ?? valore
}

type Ordinabile = { id: string; categoria: string; created_at: string }

/** Una categoria che non conosciamo finisce DOPO «altro», mai davanti: un dato
 *  inatteso non deve mai occupare la foto grande della carta. */
function rango(categoria: string): number {
  return POSIZIONE.get(categoria) ?? CATEGORIE_FOTO.length
}

export function ordinaFotoPerCategoria<T extends Ordinabile>(foto: T[]): T[] {
  return [...foto].sort(
    (a, b) =>
      rango(a.categoria) - rango(b.categoria) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  )
}

export function raggruppaPerCategoria<T extends Ordinabile>(
  foto: T[],
): Array<{ categoria: string; etichetta: string; foto: T[] }> {
  const ordinate = ordinaFotoPerCategoria(foto)
  const gruppi: Array<{ categoria: string; etichetta: string; foto: T[] }> = []
  for (const f of ordinate) {
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo && ultimo.categoria === f.categoria) ultimo.foto.push(f)
    else gruppi.push({ categoria: f.categoria, etichetta: etichettaCategoria(f.categoria), foto: [f] })
  }
  return gruppi
}
