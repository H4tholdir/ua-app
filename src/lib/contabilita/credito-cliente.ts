export interface DovutoConfermato {
  residuo: number
}

export interface CreditoClienteInput {
  /** Bucket 1a: fatture emesse non saldate (residuo = totale - importo_pagato). */
  fattureNonSaldate: DovutoConfermato[]
  /** Bucket 1b: lavori decisione_fatturazione='non_fatturare' non saldati sul ledger diretto. */
  lavoriNonFatturareNonSaldati: DovutoConfermato[]
  /**
   * Bucket 1c: lavori decisione_fatturazione='fatturare' con incluso_in_fattura=false —
   * deciso ma non ancora formalizzato in fattura. Appena incluso_in_fattura diventa
   * true il lavoro esce da qui ed entra in fattureNonSaldate (mai contato due volte).
   */
  lavoriFatturareNonInclusi: DovutoConfermato[]
  /** Bucket 2 (potenziale): lavori in_attesa di decisione — NON entra nello Scadenzario. */
  lavoriInAttesa: DovutoConfermato[]
  /** Saldo a favore del cliente, già calcolato da calcolaCreditoDisponibile. */
  creditoDisponibile: number
}

export interface CreditoClienteResult {
  confermato: number
  potenziale: number
  disponibile: number
  totale: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function sommaResidui(rows: DovutoConfermato[]): number {
  return rows.reduce((s, r) => s + r.residuo, 0)
}

/**
 * Aggrega i 4 numeri distinti richiesti dalla spec B2 §5 — mai fusi, per
 * non ricreare l'ambiguità originale di B2 (Dashboard vs Scadenzario).
 */
export function calcolaCreditoCliente(input: CreditoClienteInput): CreditoClienteResult {
  const confermato = round2(
    sommaResidui(input.fattureNonSaldate) +
      sommaResidui(input.lavoriNonFatturareNonSaldati) +
      sommaResidui(input.lavoriFatturareNonInclusi)
  )
  const potenziale = round2(sommaResidui(input.lavoriInAttesa))

  return {
    confermato,
    potenziale,
    disponibile: round2(input.creditoDisponibile),
    totale: round2(confermato + potenziale),
  }
}
