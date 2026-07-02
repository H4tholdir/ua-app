import { describe, it, expect } from 'vitest'
import { selezionaLottiFefo, type LottoDisponibile } from '@/lib/consegna/materiali-fefo'

describe('selezionaLottiFefo', () => {
  it('un solo lotto sufficiente copre l\'intera quantità richiesta', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'l1', numero_lotto: 'LOT-001', quantita_residua: 100, data_scadenza: '2027-01-01', data_acquisto: '2026-01-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 40)
    expect(risultato.consumi).toEqual([{ lotto_id: 'l1', numero_lotto: 'LOT-001', quantita: 40 }])
    expect(risultato.quantitaMancante).toBe(0)
  })

  it('sceglie il lotto con scadenza più vicina prima (FEFO)', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'lontano', numero_lotto: 'LOT-FAR', quantita_residua: 100, data_scadenza: '2028-06-01', data_acquisto: '2026-01-01' },
      { id: 'vicino', numero_lotto: 'LOT-NEAR', quantita_residua: 100, data_scadenza: '2026-08-01', data_acquisto: '2026-02-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 10)
    expect(risultato.consumi).toEqual([{ lotto_id: 'vicino', numero_lotto: 'LOT-NEAR', quantita: 10 }])
  })

  it('divide il consumo su più lotti quando il primo non basta', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'l1', numero_lotto: 'LOT-001', quantita_residua: 5, data_scadenza: '2026-08-01', data_acquisto: '2026-01-01' },
      { id: 'l2', numero_lotto: 'LOT-002', quantita_residua: 20, data_scadenza: '2027-01-01', data_acquisto: '2026-01-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 12)
    expect(risultato.consumi).toEqual([
      { lotto_id: 'l1', numero_lotto: 'LOT-001', quantita: 5 },
      { lotto_id: 'l2', numero_lotto: 'LOT-002', quantita: 7 },
    ])
    expect(risultato.quantitaMancante).toBe(0)
  })

  it('nessun lotto disponibile → quantitaMancante uguale al fabbisogno, nessun consumo', () => {
    const risultato = selezionaLottiFefo([], 15)
    expect(risultato.consumi).toEqual([])
    expect(risultato.quantitaMancante).toBe(15)
  })

  it('lotti insufficienti in totale → consuma tutto il disponibile, segnala il residuo mancante', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'l1', numero_lotto: 'LOT-001', quantita_residua: 3, data_scadenza: '2026-08-01', data_acquisto: '2026-01-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 10)
    expect(risultato.consumi).toEqual([{ lotto_id: 'l1', numero_lotto: 'LOT-001', quantita: 3 }])
    expect(risultato.quantitaMancante).toBe(7)
  })

  it('lotti senza data_scadenza vanno dopo quelli con scadenza nota, spareggio su data_acquisto', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'senza-scadenza', numero_lotto: 'LOT-NS', quantita_residua: 100, data_scadenza: null, data_acquisto: '2025-01-01' },
      { id: 'con-scadenza', numero_lotto: 'LOT-CS', quantita_residua: 100, data_scadenza: '2026-12-01', data_acquisto: '2026-06-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 5)
    expect(risultato.consumi).toEqual([{ lotto_id: 'con-scadenza', numero_lotto: 'LOT-CS', quantita: 5 }])
  })
})
