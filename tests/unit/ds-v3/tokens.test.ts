import { describe, it, expect } from 'vitest'
import { luce, notte, tipografia, raggio, varV3 } from '@/design-system/v3/tokens'

function lum(hex: string): number {
  const c = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrasto(a: string, b: string): number {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

describe('tokens v3 — valori di legge (spec §3-4)', () => {
  it('light: valori esatti', () => {
    expect(luce.bg).toBe('#F4F0E7')
    expect(luce.card).toBe('#FFFEFA')
    expect(luce.ink).toBe('#1D1913')
    expect(luce.red).toBe('#D90012')
    expect(luce.amber).toBe('#9A5C00')
  })
  it('dark: valori esatti', () => {
    expect(notte.bg).toBe('#171411')
    expect(notte.sfc).toBe('#211D18')
    expect(notte.red).toBe('#FF3B44')
  })
  it('WCAG AA: testo secondario ≥ 4.5:1 in entrambi i temi', () => {
    expect(contrasto(luce.muted, luce.card)).toBeGreaterThanOrEqual(4.5)
    expect(contrasto(luce.muted, luce.bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrasto(luce.ink, luce.card)).toBeGreaterThanOrEqual(7)
    expect(contrasto(notte.muted, notte.sfc)).toBeGreaterThanOrEqual(4.5)
    expect(contrasto(notte.ink, notte.bg)).toBeGreaterThanOrEqual(7)
  })
  it('stati leggibili su carta in light', () => {
    for (const c of [luce.amber, luce.green, luce.blue, luce.red])
      expect(contrasto(c, luce.card)).toBeGreaterThanOrEqual(4.5)
  })
  it('tipografia: scala chiusa e lettura ≥17', () => {
    expect(tipografia.size.body).toBe(17)
    expect(tipografia.size.display).toBe(52)
    expect(tipografia.size.question).toBe(35)
    expect(Math.min(...Object.values(tipografia.size))).toBeGreaterThanOrEqual(12.5)
    expect(tipografia.famiglia).toContain('Plus Jakarta Sans')
  })
  it('raggi chiusi e helper var', () => {
    expect(raggio.card).toBe(24)
    expect(varV3('red')).toBe('var(--red)')
  })
})
