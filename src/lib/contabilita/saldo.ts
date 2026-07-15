export type StatoSaldo = 'insoluto' | 'parziale' | 'saldato'

export interface RigaImporto {
  importo: number
}

export interface MovimentoCreditoRiga {
  tipo: 'eccedenza' | 'storno' | 'applicazione' | 'rimborso'
  importo: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Residuo = dovuto - pagamenti attivi - applicazioni di credito.
 * Le applicazioni di credito riducono il residuo esattamente come un
 * pagamento, ma NON generano una riga in `pagamenti` (evita il doppio
 * conteggio del contante — vedi spec B2 §"Punto critico").
 */
export function calcolaResiduo(
  importoDovuto: number,
  pagamentiAttivi: RigaImporto[],
  applicazioniCredito: RigaImporto[]
): number {
  const totalePagato = pagamentiAttivi.reduce((s, p) => s + p.importo, 0)
  const totaleApplicato = applicazioniCredito.reduce((s, a) => s + a.importo, 0)
  return round2(importoDovuto - totalePagato - totaleApplicato)
}

export function calcolaStatoSaldo(importoDovuto: number, residuo: number): StatoSaldo {
  if (residuo <= 0) return 'saldato'
  if (residuo < importoDovuto) return 'parziale'
  return 'insoluto'
}

/**
 * Quanto un pagamento supera il residuo che stava saldando — questa
 * eccedenza diventa credito cliente disponibile (spec B2 §4).
 */
export function calcolaEccedenza(importoPagamento: number, residuoPreEsistente: number): number {
  const eccedenza = importoPagamento - residuoPreEsistente
  return eccedenza > 0 ? round2(eccedenza) : 0
}

/**
 * Saldo credito cliente = eccedenze + storni - applicazioni - rimborsi.
 * 'storno' è il credito generato dalla nota di credito TD04 su una fattura
 * pagata (Task 4): movimento dedicato, MAI un'eccedenza (nessun pagamento
 * sorgente da gateare).
 */
export function calcolaCreditoDisponibile(movimenti: MovimentoCreditoRiga[]): number {
  const somma = (tipo: MovimentoCreditoRiga['tipo']) =>
    movimenti.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.importo, 0)
  return round2(somma('eccedenza') + somma('storno') - somma('applicazione') - somma('rimborso'))
}
