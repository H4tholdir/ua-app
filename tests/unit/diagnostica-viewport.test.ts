import { describe, it, expect } from 'vitest'
import { decidiDiagViewport, formattaPx } from '@/lib/utils/diagnostica-viewport'

// Collaudo R3 (P-STATUSBAR, 22/07 notte) — l'overlay diagnostico del viewport si attiva da
// query param e PERSISTE in localStorage: la PWA installata parte sempre dallo start_url del
// manifest (niente query), quindi Francesco attiva il flag da una tab Chrome
// (`/dashboard?diag=viewport`) e lo ritrova acceso al prossimo avvio della PWA installata.
// `?diag=off` (o il tasto «Spegni» dell'overlay) lo spegne.
describe('decidiDiagViewport — attivazione overlay diagnostico (P-STATUSBAR R3)', () => {
  it('?diag=viewport attiva E persiste il flag', () => {
    expect(decidiDiagViewport('?diag=viewport', null)).toEqual({ attiva: true, flag: '1' })
  })

  it('?diag=viewport vince anche su flag già spento, con altri param presenti', () => {
    expect(decidiDiagViewport('?next=%2Fcassette&diag=viewport', null)).toEqual({ attiva: true, flag: '1' })
  })

  it('?diag=off spegne e cancella il flag anche se era salvato', () => {
    expect(decidiDiagViewport('?diag=off', '1')).toEqual({ attiva: false, flag: null })
  })

  it('senza query param: flag salvato "1" → attivo (è il percorso PWA installata)', () => {
    expect(decidiDiagViewport('', '1')).toEqual({ attiva: true, flag: '1' })
  })

  it('senza query param e senza flag → spento (default per tutti gli utenti)', () => {
    expect(decidiDiagViewport('', null)).toEqual({ attiva: false, flag: null })
    expect(decidiDiagViewport('?next=%2Flavori', null)).toEqual({ attiva: false, flag: null })
  })

  it('valori diag sconosciuti non attivano né toccano il flag', () => {
    expect(decidiDiagViewport('?diag=boh', null)).toEqual({ attiva: false, flag: null })
    expect(decidiDiagViewport('?diag=boh', '1')).toEqual({ attiva: true, flag: '1' })
  })
})

describe('formattaPx — numeri leggibili nell\'overlay', () => {
  it('arrotonda a 1 decimale e aggiunge px', () => {
    expect(formattaPx(884.79999)).toBe('884.8px')
    expect(formattaPx(0)).toBe('0px')
  })

  it('null/NaN → "n/d" (API assente sul device, mai una riga rotta)', () => {
    expect(formattaPx(null)).toBe('n/d')
    expect(formattaPx(Number.NaN)).toBe('n/d')
  })
})
