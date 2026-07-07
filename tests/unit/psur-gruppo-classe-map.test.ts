import { describe, it, expect } from 'vitest'
import {
  CLASSE_RISCHIO_TO_GRUPPO,
  GRUPPO_TO_CLASSI_RISCHIO,
  type ClasseRischio,
} from '../../src/types/domain'

describe('CLASSE_RISCHIO_TO_GRUPPO / GRUPPO_TO_CLASSI_RISCHIO', () => {
  const TUTTE_LE_CLASSI: ClasseRischio[] = ['classe_i', 'classe_iia', 'classe_iib', 'classe_iii']

  it('ogni classe di rischio ha un gruppo mappato', () => {
    for (const classe of TUTTE_LE_CLASSI) {
      expect(CLASSE_RISCHIO_TO_GRUPPO[classe]).toBeDefined()
    }
  })

  it('round-trip: ogni classe, mappata al suo gruppo, torna inclusa nella lista classi del gruppo', () => {
    for (const classe of TUTTE_LE_CLASSI) {
      const gruppo = CLASSE_RISCHIO_TO_GRUPPO[classe]
      expect(GRUPPO_TO_CLASSI_RISCHIO[gruppo]).toContain(classe)
    }
  })

  it('classe_iib e classe_iii condividono lo stesso gruppo classe_iib_iii', () => {
    expect(CLASSE_RISCHIO_TO_GRUPPO.classe_iib).toBe('classe_iib_iii')
    expect(CLASSE_RISCHIO_TO_GRUPPO.classe_iii).toBe('classe_iib_iii')
  })

  it('classe_i e classe_iia hanno gruppi propri, non condivisi', () => {
    expect(CLASSE_RISCHIO_TO_GRUPPO.classe_i).toBe('classe_i')
    expect(CLASSE_RISCHIO_TO_GRUPPO.classe_iia).toBe('classe_iia')
  })
})
