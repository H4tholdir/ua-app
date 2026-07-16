import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Task 15 (ondata 16/07, D-5 sp.3 §8 A3): la pagina intermedia
// /lavori/[id]/consegna muore (diventa un semplice redirect) e con lei i
// moduli orfani del vecchio rito v2.3: ConsegnaButton, MaterialiWarningSheet,
// src/lib/consegna/precheck-mdr.ts e la route api precheck-materiali. Il
// nuovo rito vive in FlussoConsegna (consegna-v3/), montato in-place dentro
// scheda e pile. Questo sweep scandisce ricorsivamente src/ e garantisce che
// nessun file — nemmeno un residuo dimenticato — importi più questi moduli.
const SRC_DIR = join(process.cwd(), 'src')

const MODULI_MORTI = [
  'ConsegnaButton',
  'MaterialiWarningSheet',
  'consegna/precheck-mdr',
  'precheck-materiali',
]

function elencaFileRicorsivo(dir: string): string[] {
  const risultato: string[] = []
  for (const voce of readdirSync(dir)) {
    const percorso = join(dir, voce)
    const info = statSync(percorso)
    if (info.isDirectory()) {
      risultato.push(...elencaFileRicorsivo(percorso))
    } else if (voce.endsWith('.ts') || voce.endsWith('.tsx')) {
      risultato.push(percorso)
    }
  }
  return risultato
}

describe('sweep moduli morti — via ConsegnaButton/MaterialiWarningSheet/precheck-mdr/precheck-materiali', () => {
  const files = elencaFileRicorsivo(SRC_DIR)

  it.each(MODULI_MORTI)('nessun file in src/ importa "%s"', (modulo) => {
    const colpevoli = files
      .filter((f) => readFileSync(f, 'utf8').includes(modulo))
      .map((f) => f.replace(SRC_DIR, 'src'))
    expect(colpevoli).toEqual([])
  })
})
