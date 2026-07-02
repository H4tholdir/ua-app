export interface LottoDisponibile {
  id: string
  numero_lotto: string
  quantita_residua: number
  data_scadenza: string | null
  data_acquisto: string | null
}

export interface ConsumoLotto {
  lotto_id: string
  numero_lotto: string
  quantita: number
}

export interface RisultatoFefo {
  consumi: ConsumoLotto[]
  quantitaMancante: number
}

/**
 * FEFO (First-Expired-First-Out): consuma prima i lotti con scadenza più
 * vicina. Spareggio su data_acquisto più vecchia (FIFO). Lotti senza
 * data_scadenza sono trattati come "scadenza remota" — vanno consumati
 * per ultimi.
 */
export function selezionaLottiFefo(
  lottiDisponibili: LottoDisponibile[],
  quantitaNecessaria: number
): RisultatoFefo {
  const DATA_REMOTA = '9999-12-31'

  const ordinati = [...lottiDisponibili].sort((a, b) => {
    const scadenzaA = a.data_scadenza ?? DATA_REMOTA
    const scadenzaB = b.data_scadenza ?? DATA_REMOTA
    if (scadenzaA !== scadenzaB) return scadenzaA < scadenzaB ? -1 : 1

    const acquistoA = a.data_acquisto ?? DATA_REMOTA
    const acquistoB = b.data_acquisto ?? DATA_REMOTA
    if (acquistoA !== acquistoB) return acquistoA < acquistoB ? -1 : 1

    return 0
  })

  const consumi: ConsumoLotto[] = []
  let residuo = quantitaNecessaria

  for (const lotto of ordinati) {
    if (residuo <= 0) break
    if (lotto.quantita_residua <= 0) continue

    const quantita = Math.min(residuo, lotto.quantita_residua)
    consumi.push({ lotto_id: lotto.id, numero_lotto: lotto.numero_lotto, quantita })
    residuo -= quantita
  }

  return {
    consumi,
    quantitaMancante: Math.max(0, Math.round(residuo * 10000) / 10000),
  }
}
