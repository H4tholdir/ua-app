import { describe, it, expect } from 'vitest'
import { trovaParoleVietate, PAROLE_VIETATE } from '@/design-system/v3/dizionario'

describe('dizionario v3 — parole del banco', () => {
  it('trova le parole del software in un testo UI', () => {
    expect(trovaParoleVietate('Compila il form e premi Submit')).toEqual(['form', 'submit'])
    expect(trovaParoleVietate('Vai alla dashboard')).toEqual(['dashboard'])
    expect(trovaParoleVietate('Errore 500: richiesta fallita')).toContain('errore 500')
  })
  it('non segnala testi in parole del banco', () => {
    expect(trovaParoleVietate('È arrivata un\'impronta? Tocca il tasto rosso')).toEqual([])
    expect(trovaParoleVietate('Corona n.147 · consegna oggi alle 16:00')).toEqual([])
  })
  it('non fa falsi positivi su sottostringhe', () => {
    // "informa" contiene "forma" non "form" come parola
    expect(trovaParoleVietate('UÀ ti informa quando ha finito')).toEqual([])
    expect(trovaParoleVietate('la piattaforma')).toEqual([])
  })
  it('ogni parola vietata ha il sostituto del banco', () => {
    for (const p of PAROLE_VIETATE) expect(p.usa.length).toBeGreaterThan(0)
  })
})
