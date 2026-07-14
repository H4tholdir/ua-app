import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const FORM_DIR = join(process.cwd(), 'src/components/features/lavori/form')

// Componenti "fratelli" di form/ — vivono in src/components/features/lavori/
// (import relativo da LavoroFormClient.tsx) ma sono comunque montati dentro
// lo scope reskin `[data-ds="v3"].lavoro-form-v3` della pagina
// /lavori/[id]/modifica: LavoroFormClient stesso, il tab "Prove" (TabProve)
// e i due bottom sheet che monta direttamente nel proprio JSX
// (PacchettoConsegnaSheet, SegnalaProblemaSheet). Elencati esplicitamente
// (non tutto il sottoalbero lavori/) per non far fallire il test su
// componenti v2.3 legittimi fuori dallo scope form (es. LavoroCard, scheda).
const LAVORI_DIR = join(process.cwd(), 'src/components/features/lavori')
const SIBLING_FILES_IN_SCOPE = [
  'LavoroFormClient.tsx',
  'TabProve.tsx',
  'PacchettoConsegnaSheet.tsx',
  'SegnalaProblemaSheet.tsx',
]

describe('form ponte — nessun DM Sans residuo (v3)', () => {
  it('nessun file del form contiene il letterale "DM Sans"', () => {
    const files = readdirSync(FORM_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
    const colpevoli = files.filter(f => readFileSync(join(FORM_DIR, f), 'utf8').includes('DM Sans'))
    expect(colpevoli).toEqual([])
  })

  it('nessun componente "fratello" montato dentro lo scope form contiene il letterale "DM Sans"', () => {
    const colpevoli = SIBLING_FILES_IN_SCOPE.filter(f =>
      readFileSync(join(LAVORI_DIR, f), 'utf8').includes('DM Sans')
    )
    expect(colpevoli).toEqual([])
  })
})
