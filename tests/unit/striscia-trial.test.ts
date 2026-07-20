import { describe, it, expect } from 'vitest'
import { scegliSegnale, giorniCiviliRimasti, type IngressiStriscia } from '@/lib/dashboard/striscia'

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

describe('giorniCiviliRimasti — giorni CIVILI di Roma, non periodi di 24h (review finale 20/07)', () => {
  // `oggiRoma` è già wall-clock Rome (come restituito da adessoRoma()) — qui
  // costruito diretto: la macchina di test gira su Europe/Rome (v. tests/setup.ts
  // e data-roma.test.ts, stessa convenzione).
  const oggiRoma = new Date(2026, 6, 20, 15, 30) // 20/07 pomeriggio a Roma

  it('trial_ends_at nello stesso giorno civile di oggi → 0 ("finisce oggi")', () => {
    expect(giorniCiviliRimasti('2026-07-20T20:00:00Z', oggiRoma)).toBe(0) // 22:00 CEST, ancora 20/07 a Roma
  })
  it('trial_ends_at domani a qualsiasi ora → 1 ("finisce domani"), non conta le ore residue', () => {
    expect(giorniCiviliRimasti('2026-07-20T23:00:00Z', oggiRoma)).toBe(1) // 01:00 CEST del 21 — appena dopo mezzanotte
    expect(giorniCiviliRimasti('2026-07-21T21:00:00Z', oggiRoma)).toBe(1) // 23:00 CEST del 21 — quasi mezzanotte
  })
  it('trial_ends_at ieri → 0 per clamp (mai negativo)', () => {
    expect(giorniCiviliRimasti('2026-07-19T09:00:00Z', oggiRoma)).toBe(0) // 11:00 CEST del 19
  })
})
