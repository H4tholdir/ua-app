// tests/unit/ds-v3/css-sync.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { luce, notte } from '@/design-system/v3/tokens'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')

describe('ds-v3.css — sincronia con tokens.ts e scoping', () => {
  it('contiene tutti i valori light', () => {
    for (const v of Object.values(luce)) expect(css.toUpperCase()).toContain(v.toUpperCase())
  })
  it('contiene tutti i valori dark', () => {
    for (const v of Object.values(notte)) expect(css.toUpperCase()).toContain(v.toUpperCase())
  })
  it('ogni blocco di regole è scoped [data-ds="v3"] (coesistenza con v2.3)', () => {
    // nessun selettore top-level che ridefinisca --bg fuori dallo scope
    const righeVar = css.split('\n').filter(r => r.trim().startsWith('--bg:'))
    expect(righeVar.length).toBeGreaterThan(0)
    expect(css).toMatch(/\[data-ds="v3"\]\s*\{/)
    expect(css).toMatch(/\[data-theme="dark"\]\s+\[data-ds="v3"\]|\[data-ds="v3"\]\[data-theme="dark"\]/)
    expect(css).not.toMatch(/^:root\s*\{/m) // mai :root qui — romperebbe v2.3
  })
  it('globals.css importa ds-v3.css', () => {
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    expect(globals).toContain("@import './ds-v3.css'")
  })
})
