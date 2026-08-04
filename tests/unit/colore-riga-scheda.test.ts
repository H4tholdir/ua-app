// tests/unit/colore-riga-scheda.test.ts
//
// T7 (ondata B ③) — gli STATI della riga «Colore» della scheda, vincolo 0B-5
// (riserva 5 del panel in `docs/design/decisions/2026-08-04-ondata-b3-schermate-vere.md`).
// La derivazione è pura e vive fuori dal componente proprio per essere provata
// qui senza montare la scheda.

import { describe, it, expect } from 'vitest'
import { derivaRigaColore, uguagliaColore } from '../../src/lib/lavori/colore-riga-scheda'
import type { Divergenza, LavoroPrescrizione } from '../../src/types/domain'

function presc(over: Partial<LavoroPrescrizione> = {}): LavoroPrescrizione {
  return {
    id: 'p1',
    laboratorio_id: 'lab',
    lavoro_id: 'lav',
    contenuto: {},
    divergenze: [],
    fonte_tipo: null,
    fonte_immagine_id: null,
    fonte_riferimento: null,
    numero_prescrizione: null,
    confermata_da: null,
    confermata_at: null,
    created_at: '2026-08-04T10:00:00Z',
    updated_at: '2026-08-04T10:00:00Z',
    ...over,
  }
}

function divergenza(over: Partial<Divergenza> = {}): Divergenza {
  return {
    campo: 'colore',
    motivo: 'esigenza_tecnica',
    nota: null,
    utente_id: 'u1',
    registrata_at: '2026-08-04T11:00:00Z',
    ...over,
  }
}

const NIENTE_CASO = { colore_scala: null, colore_codice: null }
const CASO_A3 = { colore_scala: 'vita_classical', colore_codice: 'A3' }

describe('derivaRigaColore — gli stati della riga (vincolo 0B-5)', () => {
  it('(d) nessun colore da nessuna parte: la riga NON compare', () => {
    expect(derivaRigaColore({ denti: [], caso: NIENTE_CASO, prescrizione: undefined, congelata: false })).toBeNull()
  })

  it('(a) trascritto e colore vivo coincidenti: pastiglia verde «✓ dalla prescrizione», nessun sottotitolo', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: CASO_A3,
      prescrizione: presc({ contenuto: { colore: 'A3' } }),
      congelata: false,
    })
    expect(r?.stato).toBe('trascritto')
    expect(r?.valore).toBe('A3')
    expect(r?.pastiglia).toEqual({ testo: '✓ dalla prescrizione', tono: 'green' })
    expect(r?.sub).toBeUndefined()
  })

  it('(a-bis) trascritto ma nessun colore vivo: si mostra il trascritto, pastiglia verde', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: NIENTE_CASO,
      prescrizione: presc({ contenuto: { colore: 'A3,5' } }),
      congelata: false,
    })
    expect(r?.stato).toBe('trascritto')
    expect(r?.valore).toBe('A3,5')
    expect(r?.pastiglia?.tono).toBe('green')
  })

  it('(a) il confronto tollera spazi e maiuscole: «a3 » trascritto e «A3» vivo NON sono uno scostamento', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: CASO_A3,
      prescrizione: presc({ contenuto: { colore: 'a3 ' } }),
      congelata: false,
    })
    expect(r?.stato).toBe('trascritto')
  })

  it('(b) colore vivo senza trascrizione: segnale POSITIVO quieto «scelto dal laboratorio», nessuna pastiglia', () => {
    const r = derivaRigaColore({ denti: [], caso: CASO_A3, prescrizione: undefined, congelata: false })
    expect(r?.stato).toBe('laboratorio')
    expect(r?.valore).toBe('A3')
    expect(r?.sub).toBe('scelto dal laboratorio')
    expect(r?.pastiglia).toBeUndefined()
  })

  it('(b) vale anche con una prescrizione SENZA la chiave colore (V2: l’assenza è un’informazione)', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: CASO_A3,
      prescrizione: presc({ contenuto: { elementi: [26] } }),
      congelata: false,
    })
    expect(r?.stato).toBe('laboratorio')
  })

  it('(c) post-divergenza: prescritto E realizzato visibili, MAI la pastiglia verde', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: { colore_scala: 'vita_classical', colore_codice: 'A3.5' },
      prescrizione: presc({ contenuto: { colore: 'A3' }, divergenze: [divergenza()] }),
      congelata: false,
    })
    expect(r?.stato).toBe('divergente')
    expect(r?.valore).toBe('A3.5')
    expect(r?.sub).toBe('prescritto: A3')
    expect(r?.pastiglia).toBeUndefined()
  })

  it('(c-bis) divergenza registrata ma nessun colore vivo: valore «—», il prescritto resta leggibile', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: NIENTE_CASO,
      prescrizione: presc({ contenuto: { colore: 'A3' }, divergenze: [divergenza()] }),
      congelata: false,
    })
    expect(r?.stato).toBe('divergente')
    expect(r?.valore).toBe('—')
    expect(r?.sub).toBe('prescritto: A3')
  })

  it('(e) vivo diverso dal trascritto SENZA divergenza registrata: si mostrano entrambi, senza pastiglia verde', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: { colore_scala: 'vita_classical', colore_codice: 'B2' },
      prescrizione: presc({ contenuto: { colore: 'A3' } }),
      congelata: false,
    })
    expect(r?.stato).toBe('scostato')
    expect(r?.valore).toBe('B2')
    expect(r?.sub).toBe('prescritto: A3')
    expect(r?.pastiglia).toBeUndefined()
  })

  it('una divergenza su un ALTRO campo non tocca la riga colore', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: CASO_A3,
      prescrizione: presc({ contenuto: { colore: 'A3' }, divergenze: [divergenza({ campo: 'elementi' })] }),
      congelata: false,
    })
    expect(r?.stato).toBe('trascritto')
  })

  it('una divergenza col campo FUORI DIZIONARIO non si spaccia per una divergenza sul colore', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: CASO_A3,
      prescrizione: presc({
        contenuto: { colore: 'A3' },
        divergenze: [divergenza({ campo: { noto: false, valore: 'colore' } })],
      }),
      congelata: false,
    })
    expect(r?.stato).toBe('trascritto')
  })
})

describe('derivaRigaColore — quando la riga si può correggere', () => {
  it('di norma la riga è modificabile', () => {
    const r = derivaRigaColore({ denti: [], caso: CASO_A3, prescrizione: undefined, congelata: false })
    expect(r?.modificabile).toBe(true)
  })

  it('con una Dichiarazione di Conformità attiva la riga è di sola lettura (le due rotte rispondono «congelata»)', () => {
    const r = derivaRigaColore({ denti: [], caso: CASO_A3, prescrizione: undefined, congelata: true })
    expect(r?.modificabile).toBe(false)
  })

  it('quando il colore lo porta una RIGA di dente la riga è di sola lettura: la PATCH scriverebbe solo il caso', () => {
    const r = derivaRigaColore({
      denti: [{ fdi: 26, scala: 'vita_classical', codice: 'B2' }],
      caso: CASO_A3,
      prescrizione: undefined,
      congelata: false,
    })
    expect(r?.daRiga).toBe(true)
    expect(r?.modificabile).toBe(false)
  })

  it('il colore della riga di dente VINCE sul default di caso (stessa precedenza di idrataColoreScheda)', () => {
    const r = derivaRigaColore({
      denti: [{ fdi: 26, scala: 'vita_classical', codice: 'B2' }],
      caso: CASO_A3,
      prescrizione: undefined,
      congelata: false,
    })
    expect(r?.valore).toBe('B2')
  })

  it('una riga di dente SENZA coppia completa non è il colore vivo: resta il caso', () => {
    const r = derivaRigaColore({
      denti: [{ fdi: 26, scala: null, codice: null }],
      caso: CASO_A3,
      prescrizione: undefined,
      congelata: false,
    })
    expect(r?.daRiga).toBe(false)
    expect(r?.valore).toBe('A3')
  })

  it('il trascritto viaggia con la riga: è il gettone del gesto D212', () => {
    const r = derivaRigaColore({
      denti: [],
      caso: CASO_A3,
      prescrizione: presc({ contenuto: { colore: 'A3' } }),
      congelata: false,
    })
    expect(r?.trascritto).toBe('A3')
  })
})

describe('uguagliaColore', () => {
  it('ignora spazi e maiuscole', () => {
    expect(uguagliaColore(' a3 ', 'A3')).toBe(true)
  })
  it('NON confonde la virgola col punto: sono due digitazioni diverse, la domanda si fa', () => {
    expect(uguagliaColore('A3,5', 'A3.5')).toBe(false)
  })
})
