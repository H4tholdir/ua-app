import { describe, it, expect } from 'vitest'
import { molla, cssEase, coreografie, useReducedMotion } from '@/design-system/v3/motion'

describe('motion v3 — molle Apple (spec §8.1)', () => {
  it('le 5 molle hanno i valori di legge', () => {
    expect(molla.snappy).toEqual({ type: 'spring', visualDuration: 0.5, bounce: 0.15 })
    expect(molla.smooth).toEqual({ type: 'spring', visualDuration: 0.5, bounce: 0 })
    expect(molla.bouncy).toEqual({ type: 'spring', visualDuration: 0.5, bounce: 0.3 })
    expect(molla.press).toEqual({ type: 'spring', stiffness: 1754, damping: 72, mass: 1 })
    expect(molla.wizard).toEqual({ type: 'spring', visualDuration: 0.35, bounce: 0.1 })
  })
  it('fallback CSS di legge', () => {
    expect(cssEase.sheet).toBe('500ms cubic-bezier(0.32, 0.72, 0, 1)')
    expect(cssEase.generico).toBe('200ms cubic-bezier(0.25, 0.1, 0.25, 1)')
  })
  it('coreografia consegnato: check ~450ms poi cascata stagger 80ms', () => {
    expect(coreografie.consegnatoCheck.transition.duration).toBeCloseTo(0.45)
    expect(coreografie.consegnatoCascata.animate.transition.staggerChildren).toBeCloseTo(0.08)
  })
  it('riesporta useReducedMotion (un solo hook nel progetto)', () => {
    expect(typeof useReducedMotion).toBe('function')
  })
})
