import { describe, it, expect } from 'vitest'
import { scegliSegnale, type IngressiStriscia } from '@/lib/dashboard/striscia'

const sereno: IngressiStriscia = {
  fatturaScartata: null, materialeRosso: null, pagamentoScaduto: null, ddcOggi: 0,
  pile: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null, arrivoVecchio: null, fermo: null, consegneOggiTotali: 0, prossimaOra: null },
}

describe('sTrial (O1i)', () => {
  it('ambra con CTA quando mancano più di 3 giorni', () => {
    const s = scegliSegnale('titolare', { ...sereno, trial: { giorniRimasti: 12 } })
    expect(s).toMatchObject({ forte: 'Prova:', testo: 'mancano 12 giorni', tono: 'ambra', attenzione: false })
    expect(s.azione).toEqual({ etichetta: 'Attiva ›', href: '/impostazioni/abbonamento' })
  })
  it('rosso negli ultimi 3 giorni', () => {
    expect(scegliSegnale('titolare', { ...sereno, trial: { giorniRimasti: 2 } })).toMatchObject({ testo: 'finisce dopodomani', attenzione: true })
  })
  it('gli allarmi operativi vincono sul trial', () => {
    const conRitardo = { ...sereno, trial: { giorniRimasti: 2 }, pile: { ...sereno.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } }
    expect(scegliSegnale('titolare', conRitardo).forte).toBe('n.144')
  })
  it('il trial vince sui sereni', () => {
    const s = scegliSegnale('titolare', { ...sereno, ddcOggi: 3, trial: { giorniRimasti: 12 } })
    expect(s.forte).toBe('Prova:')
  })
  it('tecnico non vede il segnale trial', () => {
    expect(scegliSegnale('tecnico', { ...sereno, trial: { giorniRimasti: 2 } }).forte).toBe('Tutto a posto:')
  })
})
