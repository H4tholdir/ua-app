import { describe, it, expect } from 'vitest'
import { luce, notte, tipografia, raggio, varV3, gradiente, avatarPalette, testoSuFaccia, materia, tastoPiu } from '@/design-system/v3/tokens'

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
  it('tastoPiu light: valori-legge VERBATIM dal mockup .tpB (§5.2 rev 2 — «il punto rosso»)', () => {
    expect(tastoPiu.ghiera).toBe('linear-gradient(170deg, #F9F5EC 0%, #EFE9DC 60%, #E2DACA 100%)')
    expect(tastoPiu.ghieraOmbra).toBe('0 16px 28px rgba(52, 42, 26, .20), 0 5px 10px rgba(52, 42, 26, .12), inset 0 1.5px 1px rgba(255, 255, 255, .9), inset 0 -2px 3px rgba(52, 42, 26, .08)')
    expect(tastoPiu.ghieraOmbraPressed).toBe('0 10px 20px rgba(52, 42, 26, .18), 0 4px 8px rgba(52, 42, 26, .11), inset 0 1.5px 1px rgba(255, 255, 255, .9), inset 0 -2px 3px rgba(52, 42, 26, .08)')
    expect(tastoPiu.solco).toBe('linear-gradient(180deg, #DAD2C2, #ECE6DA)')
    expect(tastoPiu.solcoOmbra).toBe('inset 0 1.5px 2.5px rgba(52, 42, 26, .24), inset 0 -1px 1px rgba(255, 255, 255, .5)')
    expect(tastoPiu.cappello).toBe('radial-gradient(circle at 50% 28%, #FFFFFF 0%, #FEFCF8 40%, #F5F0E6 75%, #EBE4D4 100%)')
    expect(tastoPiu.cappelloOmbra).toBe('0 3px 6px rgba(52, 42, 26, .18), inset 0 2px 2px rgba(255, 255, 255, 1), inset 0 -4px 8px rgba(52, 42, 26, .06)')
    expect(tastoPiu.cappelloPressed).toBe('radial-gradient(circle at 50% 34%, #FBF8F1 0%, #F5F0E5 50%, #ECE5D5 100%)')
    expect(tastoPiu.cappelloOmbraPressed).toBe('inset 0 3px 7px rgba(52, 42, 26, .15), inset 0 -1px 1px rgba(255, 255, 255, .5)')
    expect(tastoPiu.piuOmbra).toBe('0 1px 0 rgba(255,255,255,.7)')
  })
  it('tastoPiu dark: valori-legge VERBATIM dal mockup .notte .tpB (§5.2 rev 2)', () => {
    expect(tastoPiu.ghieraNotte).toBe('linear-gradient(170deg, #2B261E 0%, #241F17 60%, #1D1912 100%)')
    expect(tastoPiu.ghieraOmbraNotte).toBe('inset 0 1px 0 rgba(255, 255, 255, .06), 0 10px 22px rgba(0, 0, 0, .4)')
    expect(tastoPiu.solcoNotte).toBe('linear-gradient(180deg, #131009, #1B1710)')
    expect(tastoPiu.solcoOmbraNotte).toBe('inset 0 1.5px 3px rgba(0, 0, 0, .55), inset 0 -1px 1px rgba(255, 255, 255, .04)')
    expect(tastoPiu.cappelloNotte).toBe('radial-gradient(circle at 50% 28%, #37312A 0%, #2E2921 55%, #252017 100%)')
    expect(tastoPiu.cappelloOmbraNotte).toBe('0 2px 5px rgba(0, 0, 0, .4), inset 0 1.5px 1px rgba(255, 255, 255, .08), inset 0 -3px 6px rgba(0, 0, 0, .3)')
    expect(tastoPiu.cappelloOmbraPressedNotte).toBe('inset 0 3px 7px rgba(0, 0, 0, .5)')
    // #E8323B è il pressed dark del glifo nel mockup — NON var(--red-dark) dark (#8F0910)
    expect(tastoPiu.piuPressedNotte).toBe('#E8323B')
    expect(tastoPiu.piuPressedNotte).not.toBe(notte.redDark)
  })
  it('tastoPiu: le transizioni NON vivono in tokens.ts — i tempi stanno in motion.ts (constraint 6)', () => {
    expect('transizioneGhiera' in tastoPiu).toBe(false)
    expect('transizioneCappello' in tastoPiu).toBe(false)
  })
  it('tastoPiu: la rev 1 bocciata non esiste più (gradiente.tastoPiu / materia.*)', () => {
    expect('tastoPiu' in gradiente).toBe(false)
    expect('ombraGhiera' in materia).toBe(false)
    expect('solcoTastoPiu' in materia).toBe(false)
    expect('solcoTastoPiuNotte' in materia).toBe(false)
    expect('luceCappello' in materia).toBe(false)
    expect('ombraCappello' in materia).toBe(false)
    expect('affondoCappello' in materia).toBe(false)
    expect('bordoCappelloNotte' in materia).toBe(false)
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
