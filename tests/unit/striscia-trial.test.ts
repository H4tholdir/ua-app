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
  // D3 (Task 16, spec §3.4): questo test verificava che un ritardo «vincesse» sul trial sotto
  // la vecchia gerarchia a eliminazione singola. Il trial ≤3gg ora ESCALA a livello 1 (riserva
  // UX 5b): con un allarme operativo acceso insieme, i due AGGREGANO invece di eliminarsi — mai
  // un allarme nascosto dietro l'altro (v. anche describe 'striscia D3' in striscia.test.ts).
  it('un ritardo + trial ≤3gg aggregano insieme (D3 §3.4) — non si eliminano più a vicenda', () => {
    const conRitardo = { ...sereno, trial: { giorniRimasti: 2 }, pile: { ...sereno.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } }
    const s = scegliSegnale('titolare', conRitardo)
    expect(s.forte).toBe('2 scadenze oggi') // s2 (ritardo) + trial escalato — 2 candidati accesi, aggregati
    expect(s.azione).toEqual({ etichetta: 'Vedi ›', href: '/lavori' })
  })
  it('il trial vince sui sereni', () => {
    const s = scegliSegnale('titolare', { ...sereno, ddcOggi: 3, trial: { giorniRimasti: 12 } })
    expect(s.forte).toBe('Prova:')
  })
  it('trial e racconto cassette valorizzati INSIEME → vince il trial (sTrial precede sPareteIntro nella gerarchia)', () => {
    const s = scegliSegnale('titolare', { ...sereno, trial: { giorniRimasti: 12 }, parete: { n: 12, introVista: false } })
    expect(s.forte).toBe('Prova:')
    expect(s.intro).toBeUndefined()
  })
  it('tecnico non vede il segnale trial', () => {
    // D3 (Task 16): il vecchio s9 «Tutto a posto:» è morto — se il tecnico non vede il trial e
    // non c'è altro, ora cade sul silenzio, non su una copy sostitutiva.
    expect(scegliSegnale('tecnico', { ...sereno, trial: { giorniRimasti: 2 } }).silenzio).toBe(true)
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
