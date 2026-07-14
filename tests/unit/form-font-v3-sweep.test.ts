import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const FORM_DIR = join(process.cwd(), 'src/components/features/lavori/form')

describe('form ponte — nessun DM Sans residuo (v3)', () => {
  it('nessun file del form contiene il letterale "DM Sans"', () => {
    const files = readdirSync(FORM_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
    const colpevoli = files.filter(f => readFileSync(join(FORM_DIR, f), 'utf8').includes('DM Sans'))
    expect(colpevoli).toEqual([])
  })
})
