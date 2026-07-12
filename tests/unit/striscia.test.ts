import { describe, it, expect } from 'vitest'
import { scegliSegnale, type IngressiStriscia } from '@/lib/dashboard/striscia'

const VUOTO: IngressiStriscia = {
  fatturaScartata: null, materialeRosso: null, pagamentoScaduto: null, ddcOggi: 0,
  pile: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null,
          arrivoVecchio: null, fermo: null, consegneOggiTotali: 0, prossimaOra: null },
}

describe('scegliSegnale — gerarchia §6, una riga alla volta', () => {
  it('titolare: la fattura scartata vince su tutto (segnale 1)', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' },
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s).toEqual({ attenzione: true, forte: 'Fattura n.2026-0139', testo: 'scartata',
      azione: { etichetta: 'Sistemala ›', href: '/fatture/f1' } })
  })

  it('front_desk: parte dagli operativi — il ritardo vince sulla fattura scartata (P7, §3.2)', () => {
    const s = scegliSegnale('front_desk', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' },
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s.forte).toBe('n.144')
    expect(s.testo).toBe('doveva uscire ieri')
    expect(s.azione).toEqual({ etichetta: 'Apri ›', href: '/lavori?pila=rossa' })
  })

  it('tecnico: mai segnali fiscali/pagamenti/materiali (P7)', () => {
    const s = scegliSegnale('tecnico', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' }, materialeRosso: 'Zirconia', pagamentoScaduto: 'Studio Verdi' })
    expect(s.attenzione).toBe(false) // cade sul segnale 9
  })

  it('segnale 2b: consegna di oggi non pronta', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      pile: { ...VUOTO.pile, consegnaOggiNonPronta: { numero: '147', ora: '16:00' }, consegneOggiTotali: 1, prossimaOra: '16:00' } })
    expect(s).toEqual({ attenzione: true, forte: 'n.147',
      testo: 'non è ancora pronto per le 16:00', azione: { etichetta: 'Apri ›', href: '/lavori?pila=ambra' } })
  })

  it('segnali 3→8 in cascata quando i precedenti sono risolti', () => {
    const base = { ...VUOTO }
    expect(scegliSegnale('titolare', { ...base, pile: { ...base.pile, provaRientroOggi: '145' } }).testo).toBe('torna oggi dalla prova')
    expect(scegliSegnale('titolare', { ...base, pile: { ...base.pile, arrivoVecchio: '151' } }).testo).toBe('aspetta conferma da ieri')
    expect(scegliSegnale('titolare', { ...base, materialeRosso: 'Zirconia' })).toEqual({
      attenzione: true, forte: 'Zirconia', testo: 'sta per finire', azione: { etichetta: 'Riordina ›', href: '/magazzino' } })
    expect(scegliSegnale('titolare', { ...base, pile: { ...base.pile, fermo: { id: 'l150', numero: '150', giorni: 6 } } })).toEqual({
      attenzione: true, forte: 'n.150', testo: 'è fermo da 6 giorni', azione: { etichetta: 'Apri ›', href: '/lavori/l150' } })
    expect(scegliSegnale('titolare', { ...base, pagamentoScaduto: 'Studio Verdi' })).toEqual({
      attenzione: true, forte: 'Studio Verdi', testo: 'ha un pagamento scaduto', azione: { etichetta: 'Guarda ›', href: '/scadenzario' } })
    expect(scegliSegnale('titolare', { ...base, ddcOggi: 2 })).toEqual({
      attenzione: false, forte: null, testo: 'Oggi ho preparato 2 DdC ✓', azione: null })
  })

  it('segnale 6 sotto soglia (<5 giorni) NON scatta', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, pile: { ...VUOTO.pile, fermo: { id: 'x', numero: '150', giorni: 4 } } })
    expect(s.attenzione).toBe(false)
  })

  it('segnale 9 — sereno, coi numeri del giorno', () => {
    expect(scegliSegnale('titolare', { ...VUOTO, pile: { ...VUOTO.pile, consegneOggiTotali: 2, prossimaOra: '16:00' } }))
      .toEqual({ attenzione: false, forte: 'Tutto a posto:', testo: '2 consegne oggi, la prossima alle 16:00', azione: null })
    expect(scegliSegnale('titolare', VUOTO).testo).toBe('nessuna consegna oggi')
  })
})
