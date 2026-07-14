// Fonte di verità UNICA del prezzo di un lavoro (N4).
// Regola ibrida: le righe di lavorazione, se esistono, vincono (sono un rimpiazzo
// integrale scritto da PUT /lavorazioni); altrimenti il totale è prezzo_unitario.
// Rounding identico a generate-xml (somma di importo grezzi, nessun round per-riga).

type LavoroPrezzo = {
  prezzo_unitario: number | null
  lavorazioni?: Array<{ importo: number | null }> | null
}

// Fragment PostgREST per i consumer money-only che devono derivare il totale.
export const SELECT_FRAGMENT_PREZZO = 'prezzo_unitario, lavorazioni:lavori_lavorazioni(importo)'

export function prezzoEffettivoLavoro(l: LavoroPrezzo): number {
  const righe = l.lavorazioni ?? []
  if (righe.length > 0) {
    return righe.reduce((acc, r) => acc + (r.importo ?? 0), 0)
  }
  return l.prezzo_unitario ?? 0
}

export function divergenzaPrezzo(l: LavoroPrezzo): { divergente: boolean; deltaCents: number } {
  const righe = l.lavorazioni ?? []
  const pu = l.prezzo_unitario ?? 0
  // Nessuna seconda fonte con cui divergere se mancano righe o prezzo_unitario.
  if (righe.length === 0 || pu <= 0) return { divergente: false, deltaCents: 0 }
  const sommaRighe = righe.reduce((acc, r) => acc + (r.importo ?? 0), 0)
  const deltaCents = Math.abs(Math.round(sommaRighe * 100) - Math.round(pu * 100))
  return { divergente: deltaCents >= 1, deltaCents }
}
