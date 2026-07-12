import { describe, it, expect } from 'vitest'
import {
  TIPI_LAVORO, LABEL_MACRO, MACRO_SLUGS, CANONICI_DAY1,
  labelTipo, cercaTipiLavoro, trovaTipo, normalizza,
} from '@/lib/domain/tipi-lavoro'

describe('tipi-lavoro — tassonomia ratificata (spec §3.2)', () => {
  it('ha esattamente 38 tipi con id unici', () => {
    expect(TIPI_LAVORO).toHaveLength(38)
    expect(new Set(TIPI_LAVORO.map(t => t.id)).size).toBe(38)
  })

  it('ogni macro usato esiste in LABEL_MACRO e in MACRO_SLUGS (10 valori)', () => {
    expect(MACRO_SLUGS).toHaveLength(10)
    expect(MACRO_SLUGS).toContain('bite_splint')
    for (const t of TIPI_LAVORO) {
      expect(MACRO_SLUGS).toContain(t.macro)
      expect(LABEL_MACRO[t.macro]).toBeTruthy()
    }
  })

  it('i 4 tipi bite_splint sono Classe I, la protesi fissa è IIa (verbale A1/A2)', () => {
    const bite = TIPI_LAVORO.filter(t => t.macro === 'bite_splint')
    expect(bite).toHaveLength(4)
    for (const t of bite) expect(t.classeRischio).toBe('classe_i')
    expect(trovaTipo('corona_zirconia')?.classeRischio).toBe('classe_iia')
    expect(trovaTipo('provvisorio_impianto')?.classeRischio).toBe('classe_i') // eccezione ratificata
  })

  it('CANONICI_DAY1 sono i 4 ratificati (A4) e sono id validi', () => {
    expect(CANONICI_DAY1).toEqual(['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina'])
    for (const id of CANONICI_DAY1) expect(trovaTipo(id)).toBeDefined()
  })

  it('labelTipo compone le due righe del tile', () => {
    expect(labelTipo(trovaTipo('corona_zirconia')!)).toBe('Corona zirconia')
    expect(labelTipo(trovaTipo('riparazione')!)).toBe('Riparazione')
  })

  it('cerca per alias di gergo, tollerante ad accenti e maiuscole', () => {
    expect(cercaTipiLavoro('cappetta').map(t => t.id)).toContain('corona_zirconia')
    expect(cercaTipiLavoro('EMAX').map(t => t.id)).toContain('corona_disilicato')
    expect(cercaTipiLavoro('pa.pa.').map(t => t.id)).toContain('parziale_resina')
    expect(cercaTipiLavoro('michigan').map(t => t.id)).toContain('bite_michigan')
    expect(normalizza('Zirconià')).toBe('zirconia')
  })

  it('cerca anche per label macro («scheletrato» trova tutta la famiglia)', () => {
    const ids = cercaTipiLavoro('scheletrato').map(t => t.id)
    expect(ids).toEqual(expect.arrayContaining(['scheletrato', 'scheletrato_attacchi', 'scheletrato_slm', 'scheletrato_peek']))
  })

  it('query vuota restituisce tutto in ordine canonico', () => {
    expect(cercaTipiLavoro('')).toEqual(TIPI_LAVORO)
  })
})
