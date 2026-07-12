import { describe, it, expect } from 'vitest'
import { derivaUrgenza, confrontaUrgenza } from '@/lib/lavori/urgenza'

const OGGI = new Date('2026-07-09T10:00:00') // giovedì 9 luglio (l'ancora del cast)
const base = { ora_consegna: null as string | null }

describe('derivaUrgenza — mappatura stati→pile (spec §4 + bucket B3)', () => {
  it('consegnato e annullato sono fuori dalla home', () => {
    for (const stato of ['consegnato', 'annullato'] as const) {
      expect(derivaUrgenza({ ...base, stato, data_consegna_prevista: '2026-07-09' }, OGGI).pila).toBeNull()
    }
  })

  it('ricevuto → blu, APPENA ARRIVATO', () => {
    const u = derivaUrgenza({ ...base, stato: 'ricevuto', data_consegna_prevista: '2026-07-14' }, OGGI)
    expect(u.pila).toBe('blu')
    expect(u.pillTempo).toEqual({ testo: 'APPENA ARRIVATO', famiglia: 'blue' })
    expect(u.consegnabile).toBe(false)
  })

  it('in_prova e in_prova_esterna → viola, IN PROVA (P5)', () => {
    for (const stato of ['in_prova', 'in_prova_esterna'] as const) {
      const u = derivaUrgenza({ ...base, stato, data_consegna_prevista: '2026-07-14' }, OGGI)
      expect(u.pila).toBe('viola')
      expect(u.pillTempo).toEqual({ testo: 'IN PROVA', famiglia: 'purple' })
    }
  })

  it('sospeso → ambra in fondo, FERMO', () => {
    const u = derivaUrgenza({ ...base, stato: 'sospeso', data_consegna_prevista: '2026-07-14' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.inFondo).toBe(true)
    expect(u.pillTempo).toEqual({ testo: 'FERMO', famiglia: 'amber' })
  })

  it('pronto con consegna oggi → rossa, OGGI · hh:mm, consegnabile', () => {
    const u = derivaUrgenza({ stato: 'pronto', data_consegna_prevista: '2026-07-09', ora_consegna: '16:00:00' }, OGGI)
    expect(u.pila).toBe('rossa')
    expect(u.inCima).toBe(false)
    expect(u.pillTempo).toEqual({ testo: 'OGGI · 16:00', famiglia: 'red' })
    expect(u.consegnabile).toBe(true)
  })

  it('pronto senza ora → OGGI secco', () => {
    const u = derivaUrgenza({ stato: 'pronto', data_consegna_prevista: '2026-07-09', ora_consegna: null }, OGGI)
    expect(u.pillTempo).toEqual({ testo: 'OGGI', famiglia: 'red' })
  })

  it('pronto in ritardo di 1 giorno → rossa in cima, DA IERI (il ritardo si legge dalle DATE, mai dallo stato)', () => {
    const u = derivaUrgenza({ ...base, stato: 'pronto', data_consegna_prevista: '2026-07-08' }, OGGI)
    expect(u.pila).toBe('rossa')
    expect(u.inCima).toBe(true)
    expect(u.giorniRitardo).toBe(1)
    expect(u.pillTempo).toEqual({ testo: 'DA IERI', famiglia: 'red' })
    expect(u.consegnabile).toBe(true)
  })

  it('pronto in ritardo di 2+ giorni → −N GIORNI', () => {
    const u = derivaUrgenza({ ...base, stato: 'pronto', data_consegna_prevista: '2026-07-07' }, OGGI)
    expect(u.pillTempo).toEqual({ testo: '−2 GIORNI', famiglia: 'red' })
  })

  it('pronto con consegna futura → ambra, PRONTA ✓ (sale in rossa la mattina della consegna)', () => {
    const u = derivaUrgenza({ ...base, stato: 'pronto', data_consegna_prevista: '2026-07-10' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.pillTempo).toEqual({ testo: 'PRONTA ✓', famiglia: 'green' })
  })

  it('in_lavorazione puntuale → ambra, pill delegata al chiamante (fase corrente, P6)', () => {
    const u = derivaUrgenza({ ...base, stato: 'in_lavorazione', data_consegna_prevista: '2026-07-10' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.pillTempo).toBeNull()
    expect(u.consegnabile).toBe(false)
  })

  it('in_lavorazione con data passata → ambra IN CIMA con pill rossa (segnale, non pila rossa)', () => {
    const u = derivaUrgenza({ ...base, stato: 'in_lavorazione', data_consegna_prevista: '2026-07-08' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.inCima).toBe(true)
    expect(u.pillTempo).toEqual({ testo: 'DA IERI', famiglia: 'red' })
  })

  it('lo stato in_ritardo (trigger, nasce solo da in_lavorazione) → ambra in cima anche se la data non è ancora passata', () => {
    const u = derivaUrgenza({ ...base, stato: 'in_ritardo', data_consegna_prevista: '2026-07-09' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.inCima).toBe(true)
    expect(u.giorniRitardo).toBeGreaterThanOrEqual(1)
    expect(u.consegnabile).toBe(true) // in_ritardo ∈ STATI_CONSEGNABILI
  })
})

describe('confrontaUrgenza — ordinamento dentro la pila (§4.1)', () => {
  const el = (stato: string, data: string, ora: string | null) => ({
    urgenza: derivaUrgenza({ stato: stato as never, data_consegna_prevista: data, ora_consegna: ora }, OGGI),
    data, ora,
  })

  it('ritardi in cima (più giorni di ritardo prima), poi data+ora asc, sospesi in fondo', () => {
    const fermo = el('sospeso', '2026-07-06', null)
    const moltoInRitardo = el('in_lavorazione', '2026-07-07', null)
    const daIeri = el('in_lavorazione', '2026-07-08', null)
    const perVenerdi = el('in_lavorazione', '2026-07-10', null)
    const perLunedi = el('in_lavorazione', '2026-07-13', null)
    const ordinati = [perLunedi, fermo, daIeri, perVenerdi, moltoInRitardo].sort(confrontaUrgenza)
    expect(ordinati).toEqual([moltoInRitardo, daIeri, perVenerdi, perLunedi, fermo])
  })

  it('a parità, ora presente prima di ora assente e ora più vicina prima', () => {
    const alle14 = el('pronto', '2026-07-09', '14:00:00')
    const alle16 = el('pronto', '2026-07-09', '16:00:00')
    const senzaOra = el('pronto', '2026-07-09', null)
    expect([senzaOra, alle16, alle14].sort(confrontaUrgenza)).toEqual([alle14, alle16, senzaOra])
  })
})
