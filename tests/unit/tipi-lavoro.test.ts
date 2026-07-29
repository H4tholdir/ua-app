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

// T2 — adattività (verbale 2026-07-27 §6-quater + D41/D42 del verbale
// 2026-07-28 nona tornata): quali domande fa il wizard lo decide il tipo.
// Le tre prove obbligatorie del brief T2 vengono prima delle altre.
describe('tipi-lavoro — adattività (T2): prevedeDenti / prevedeColore / prevedeArcata', () => {
  it("caso obbligatorio 1: 'anti_russamento' non chiede nulla (verbale: «l'unico tipo che non chiede nulla»)", () => {
    const t = trovaTipo('anti_russamento')!
    expect(t.prevedeDenti).toBe(false)
    expect(t.prevedeColore).toBe('nessuno')
    expect(t.prevedeArcata).toBe(false)
  })

  it("caso obbligatorio 2: 'duplicato_protesi' non chiede nulla («basta dire uguale»)", () => {
    const t = trovaTipo('duplicato_protesi')!
    expect(t.prevedeDenti).toBe(false)
    expect(t.prevedeColore).toBe('nessuno')
    expect(t.prevedeArcata).toBe(false)
  })

  it("caso obbligatorio 3: 'overdenture' chiede tutte e tre («tutte e tre»)", () => {
    const t = trovaTipo('overdenture')!
    expect(t.prevedeDenti).toBe(true)
    expect(t.prevedeColore).toBe('catalogo')
    expect(t.prevedeArcata).toBe(true)
  })

  it('esaustività: tutti e 38 i tipi hanno i tre campi valorizzati (booleani veri/falsi, colore fra i tre valori ammessi)', () => {
    expect(TIPI_LAVORO).toHaveLength(38)
    for (const t of TIPI_LAVORO) {
      expect(typeof t.prevedeDenti, `${t.id}.prevedeDenti deve essere boolean`).toBe('boolean')
      expect(['catalogo', 'libero', 'nessuno'], `${t.id}.prevedeColore fuori dai tre valori ammessi`).toContain(t.prevedeColore)
      expect(typeof t.prevedeArcata, `${t.id}.prevedeArcata deve essere boolean`).toBe('boolean')
    }
  })

  it('D42: i tre tipi con colore non dentale prendono "libero", non un quarto valore', () => {
    for (const id of ['placca_espansione', 'apparecchio_funzionale', 'paradenti']) {
      expect(trovaTipo(id)!.prevedeColore, `${id} deve essere 'libero' (D42)`).toBe('libero')
    }
  })

  it("D41: 'dima_chirurgica' non chiede il colore (il colore è del provvisorio, un altro lavoro)", () => {
    const t = trovaTipo('dima_chirurgica')!
    expect(t.prevedeDenti, 'dima_chirurgica: siti implantari → denti sì').toBe(true)
    expect(t.prevedeColore, "dima_chirurgica: D41 → 'nessuno'").toBe('nessuno')
    expect(t.prevedeArcata, 'dima_chirurgica: arcata sì').toBe(true)
  })

  it("'barra_overdenture': vale la decisione di Francesco (denti sì, colore no, arcata sì), non il modulo USA", () => {
    const t = trovaTipo('barra_overdenture')!
    expect(t.prevedeDenti).toBe(true)
    expect(t.prevedeColore).toBe('nessuno')
    expect(t.prevedeArcata).toBe(true)
  })

  it("riparazione/ribasatura: 'saltabile' non è modellata in T2 — restano prevedeDenti/prevedeColore true", () => {
    for (const id of ['riparazione', 'ribasatura']) {
      const t = trovaTipo(id)!
      expect(t.prevedeDenti, `${id}.prevedeDenti`).toBe(true)
      expect(t.prevedeColore, `${id}.prevedeColore`).toBe('catalogo')
      expect(t.prevedeArcata, `${id}.prevedeArcata (dedotta → false)`).toBe(false)
    }
  })

  it('copre tutte e 8 le combinazioni distinte che compaiono nella tabella ratificata (§6-quater)', () => {
    const combinazioni = new Map<string, string>([
      ['corona_zirconia', 'T-catalogo-F'],
      ['toronto', 'F-catalogo-T'],
      ['overdenture', 'T-catalogo-T'],
      ['duplicato_protesi', 'F-nessuno-F'],
      ['barra_overdenture', 'T-nessuno-T'],
      ['abutment', 'T-nessuno-F'],
      ['placca_espansione', 'F-libero-T'],
      ['bite_michigan', 'F-nessuno-T'],
    ])
    for (const [id, atteso] of combinazioni) {
      const t = trovaTipo(id)!
      const trovato = `${t.prevedeDenti ? 'T' : 'F'}-${t.prevedeColore}-${t.prevedeArcata ? 'T' : 'F'}`
      expect(trovato, `${id}: atteso ${atteso}`).toBe(atteso)
    }
  })

  it('tabella completa (id → i tre campi), tradotta letteralmente dalla fonte ratificata §6-quater', () => {
    const attesa: Record<string, { d: boolean; c: 'catalogo' | 'libero' | 'nessuno'; a: boolean }> = {
      corona_zirconia: { d: true, c: 'catalogo', a: false },
      corona_disilicato: { d: true, c: 'catalogo', a: false },
      corona_metallo_ceramica: { d: true, c: 'catalogo', a: false },
      ponte_zirconia: { d: true, c: 'catalogo', a: false },
      faccetta: { d: true, c: 'catalogo', a: false },
      intarsio: { d: true, c: 'catalogo', a: false },
      perno_moncone: { d: true, c: 'catalogo', a: false },
      protesi_totale: { d: false, c: 'catalogo', a: true },
      totale_digitale: { d: false, c: 'catalogo', a: true },
      parziale_resina: { d: true, c: 'catalogo', a: true },
      protesi_flessibile: { d: true, c: 'catalogo', a: true },
      duplicato_protesi: { d: false, c: 'nessuno', a: false },
      scheletrato: { d: true, c: 'catalogo', a: true },
      scheletrato_attacchi: { d: true, c: 'catalogo', a: true },
      scheletrato_slm: { d: true, c: 'catalogo', a: true },
      scheletrato_peek: { d: true, c: 'catalogo', a: true },
      corona_impianto: { d: true, c: 'catalogo', a: false },
      ponte_impianti: { d: true, c: 'catalogo', a: false },
      toronto: { d: false, c: 'catalogo', a: true },
      barra_overdenture: { d: true, c: 'nessuno', a: true },
      overdenture: { d: true, c: 'catalogo', a: true },
      abutment: { d: true, c: 'nessuno', a: false },
      provvisorio_impianto: { d: true, c: 'catalogo', a: false },
      placca_espansione: { d: false, c: 'libero', a: true },
      apparecchio_funzionale: { d: false, c: 'libero', a: true },
      contenzione: { d: true, c: 'nessuno', a: true },
      allineatori: { d: true, c: 'nessuno', a: true },
      bite_michigan: { d: false, c: 'nessuno', a: true },
      bite_morbido: { d: false, c: 'nessuno', a: true },
      paradenti: { d: false, c: 'libero', a: true },
      anti_russamento: { d: false, c: 'nessuno', a: false },
      provvisorio_resina: { d: true, c: 'catalogo', a: false },
      provvisorio_cad: { d: true, c: 'catalogo', a: false },
      mockup: { d: true, c: 'catalogo', a: false },
      dima_chirurgica: { d: true, c: 'nessuno', a: true },
      modello_3d: { d: false, c: 'nessuno', a: true },
      riparazione: { d: true, c: 'catalogo', a: false },
      ribasatura: { d: true, c: 'catalogo', a: false },
    }
    expect(Object.keys(attesa), 'la fixture di prova deve coprire tutti e 38 gli id, né più né meno').toHaveLength(38)
    for (const t of TIPI_LAVORO) {
      const att = attesa[t.id]
      expect(att, `${t.id} non è nella tabella attesa — id fuori dal censimento §6-quater`).toBeDefined()
      expect(t.prevedeDenti, `${t.id}.prevedeDenti`).toBe(att.d)
      expect(t.prevedeColore, `${t.id}.prevedeColore`).toBe(att.c)
      expect(t.prevedeArcata, `${t.id}.prevedeArcata`).toBe(att.a)
    }
  })
})
