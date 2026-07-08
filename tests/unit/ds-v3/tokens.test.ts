import { describe, it, expect } from 'vitest'
import { luce, notte, tipografia, raggio, varV3, gradiente, avatarPalette, testoSuFaccia, materia } from '@/design-system/v3/tokens'

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
  it('gradiente: valori-legge esatti (§5.1/§5.4/§5.11-12)', () => {
    expect(gradiente.tastoPrimario).toContain('#F2263A')
    expect(gradiente.tastoPrimario).toContain('#B00010')
    expect(gradiente.pillFase).toBe('linear-gradient(180deg, #269950, var(--green))')
    expect(gradiente.corsaPillFase).toBe('#14602C')
    expect(gradiente.dashedGuida).toBe('#CBC1B0')
  })
  it('gradiente.tastoPiu: valore-legge esatto (§5.2 — luce a 35%/30%)', () => {
    expect(gradiente.tastoPiu).toBe(
      'radial-gradient(circle at 35% 30%, #FF4C5C, var(--red) 55%, #B00010)'
    )
  })
  it('materia.anelloGuidaTastoPiu: valore-legge esatto (§5.2 — anello guida a -9px, 2px)', () => {
    expect(materia.anelloGuidaTastoPiu).toBe('rgba(50,40,25,.14)')
  })
  it('materia.scrim: valore-legge esatto (§5.16/§5.17 — scrim di Sheet e DialogConferma)', () => {
    expect(materia.scrim).toBe('rgba(29,25,19,.35)')
  })
  it('materia.cerchioMicPillVoce: valore-legge esatto (§5.15 — cerchio mic dentro PillVoce)', () => {
    expect(materia.cerchioMicPillVoce).toBe('rgba(255,255,255,.16)')
  })
  it('avatarPalette: 6 voci esatte (§5.14)', () => {
    expect(avatarPalette).toEqual(['#1D5FBF', '#7A4DB8', '#0E8A6B', '#9A5C00', '#C24E7A', '#8A8580'])
    expect(avatarPalette.length).toBe(6)
  })
  it('testoSuFaccia: valore-legge esatto (testo bianco su facce gradiente, §5.1/§5.4)', () => {
    expect(testoSuFaccia).toBe('#FFFFFF')
  })
})
