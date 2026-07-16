// tests/unit/tokens-v3-ondata1.test.ts
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { luce, notte, gradiente, verdeWhatsApp } from '@/design-system/v3/tokens'

describe('token Ondata 1 — revisioni di legge v3.1 (bucket B)', () => {
  it('espone la famiglia viola in entrambi i temi (§3 rev. 3.1)', () => {
    expect(luce.purple).toBe('#7C3F9C')
    expect(luce.purpleTint).toBe('#F3EAF7')
    expect(notte.purple).toBe('#B98BE8')
    expect(notte.purpleTint).toBe('rgba(185,139,232,.14)')
  })

  it('ha il --faint scurito AA (§3 rev. 3.1)', () => {
    expect(luce.faint).toBe('#7B6A59')
    expect(notte.faint).toBe('#928778')
  })

  it('pinna gli stop del gradiente PillFase (§5.4 rev. 3.1 — mai var(--green) come faccia)', () => {
    expect(gradiente.pillFase).toBe('linear-gradient(180deg, #1F8544, #166B39)')
    expect(gradiente.pillFase).not.toContain('var(')
    expect(gradiente.corsaPillFase).toBe('#14602C')
  })

  it('espone il verde WhatsApp scurito (§3.3.4 rev. 3.1)', () => {
    expect(gradiente.tastoWhatsApp).toBe('linear-gradient(180deg, #208650, #17663A)')
    expect(verdeWhatsApp.corsa).toBe('#0E4A28')
  })

  it('ds-v3.css porta gli stessi valori nei due blocchi scope', () => {
    const css = readFileSync('src/app/ds-v3.css', 'utf8')
    // light
    expect(css).toContain('--faint: #7B6A59')
    expect(css).toContain('--purple: #7C3F9C')
    expect(css).toContain('--purple-tint: #F3EAF7')
    // dark
    expect(css).toContain('--faint: #928778')
    expect(css).toContain('--purple: #B98BE8')
    expect(css).toContain('--purple-tint: rgba(185,139,232,.14)')
  })
})
