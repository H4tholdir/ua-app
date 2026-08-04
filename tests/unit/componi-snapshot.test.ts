import { describe, it, expect } from 'vitest'
import { componiSnapshot } from '@/lib/prescrizione/componi-snapshot'

// Task 5 (ondata B ②) — `componiSnapshot` compone il jsonb `p_prescrizione`
// per `lavoro_crea_atomico`. La semantica è quella dello snapshot V2/V3
// (D210, W20, D213): chiave presente in `contenuto` = caratteristica
// TRASCRITTA dalla prescrizione; l'assenza è un'informazione, mai un `null`.
//
// ═══ ENUMERAZIONE DELLE FORME D'INPUT (R-P4) ═══════════════════════════════
// Ogni forma col suo caso, o col suo «non coperta, perché».
//
//  ① denti [] + p assente                → null (NIENTE di prescritto, V2)
//  ② denti [{fdi:11},{fdi:12}] senza
//    provenienza (default 'prescritto')  → contenuto {elementi:[11,12]}
//  ③ provenienza 'prescritto' esplicita  → incluso negli elementi
//  ④ provenienza 'eseguito'              → ESCLUSO dagli elementi (W20)
//  ⑤ TUTTI i denti 'eseguito' + p assente→ null (nessuna trascrizione)
//  ⑥ colore " a3 "                       → PRESERVATO ESATTO, spazi compresi
//                                          (fedeltà D210: il testo del medico)
//  ⑦ colore assente                      → chiave `colore` ASSENTE (mai null)
//  ⑧ colore "" (stringa vuota)           → chiave ASSENTE: un testo vuoto non
//                                          è una trascrizione (V2)
//  ⑨ colore " " (solo spazi)             → PRESERVATO: decidere che « » è
//                                          vuoto richiederebbe un trim, cioè
//                                          la normalizzazione che D210 vieta
//  ⑩ solo numero_prescrizione            → riga LEGITTIMA: contenuto {} +
//                                          numero (M-T3-3: {} ≠ null)
//  ⑪ numero ""                           → come assente; da solo → null
//  ⑫ numero " 123 "                      → preservato come digitato
//  ⑬ `tipo`                              → MAI presente (entra SOLO alla
//                                          conferma di consegna, D213)
//  ⑭ denti 'eseguito' + colore           → contenuto {colore} SENZA la chiave
//                                          `elementi` (niente di prescritto
//                                          fra i denti, ma il colore sì)
//  ⑮ ordine degli elementi               → quello d'ingresso (fedeltà: non è
//                                          compito dello snapshot riordinare)
//  ⑯ fdi duplicati                       → NON coperta: l'unico chiamante
//     (POST /api/lavori) passa la lista già validata da `validaDenti`, che
//     rifiuta i duplicati con 422 (denti-validazione.ts:139-141) prima di
//     arrivare qui.
//  ⑰ fdi non-numero / dente non-oggetto  → NON coperta: stessa ragione della
//     ⑯ — funzione pura tipata, riceve `DenteNormalizzato[]` già validati.
//  ⑱ p non-oggetto (stringa/array/null)  → NON coperta QUI (firma tipata
//     `PrescrizioneInput | undefined`); coperta ALLA PORTA: la route valida
//     `body.prescrizione` con un 422 — tests/unit/lavori-post-prescrizione.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

describe('componiSnapshot — quando NON c\'è niente di prescritto', () => {
  it('① denti vuoti e nessuna prescrizione → null (nessuna riga, non una riga vuota)', () => {
    expect(componiSnapshot([], undefined)).toBeNull()
  })

  it('⑤ soli denti "eseguito" e nessuna prescrizione → null', () => {
    expect(componiSnapshot([{ fdi: 11, provenienza: 'eseguito' }])).toBeNull()
  })

  it('⑪ numero_prescrizione stringa vuota, e nient\'altro → null', () => {
    expect(componiSnapshot([], { numero_prescrizione: '' })).toBeNull()
  })
})

describe('componiSnapshot — gli elementi (W20: solo i prescritti)', () => {
  it('② denti senza provenienza → elementi [11,12] (il default è "prescritto")', () => {
    expect(componiSnapshot([{ fdi: 11 }, { fdi: 12 }])).toEqual({
      contenuto: { elementi: [11, 12] },
      numero_prescrizione: null,
    })
  })

  it('③④ "prescritto" entra, "eseguito" resta fuori', () => {
    const esito = componiSnapshot([
      { fdi: 11, provenienza: 'prescritto' },
      { fdi: 21, provenienza: 'eseguito' },
      { fdi: 12 },
    ])
    expect(esito).toEqual({
      contenuto: { elementi: [11, 12] },
      numero_prescrizione: null,
    })
  })

  it('⑮ l\'ordine degli elementi è quello d\'ingresso, non si riordina', () => {
    const esito = componiSnapshot([{ fdi: 12 }, { fdi: 11 }])
    expect(esito?.contenuto.elementi).toEqual([12, 11])
  })

  it('⑭ soli denti "eseguito" ma colore presente → {colore}, SENZA la chiave elementi', () => {
    const esito = componiSnapshot([{ fdi: 11, provenienza: 'eseguito' }], { colore: 'A3' })
    expect(esito).toEqual({
      contenuto: { colore: 'A3' },
      numero_prescrizione: null,
    })
    expect(esito?.contenuto).not.toHaveProperty('elementi')
  })
})

describe('componiSnapshot — il colore, COME DIGITATO (D210)', () => {
  it('⑥ " a3 " resta " a3 ": mai trim, mai uppercase — la fedeltà è il punto', () => {
    const esito = componiSnapshot([{ fdi: 11 }], { colore: ' a3 ' })
    expect(esito?.contenuto.colore).toBe(' a3 ')
  })

  it('⑦ colore assente → chiave ASSENTE nel contenuto, MAI colore:null (V2)', () => {
    const esito = componiSnapshot([{ fdi: 11 }], {})
    expect(esito?.contenuto).not.toHaveProperty('colore')
  })

  it('⑧ colore "" → chiave assente: un testo vuoto non è una trascrizione', () => {
    const esito = componiSnapshot([{ fdi: 11 }], { colore: '' })
    expect(esito?.contenuto).not.toHaveProperty('colore')
  })

  it('⑨ colore " " (solo spazi) → preservato: giudicarlo vuoto sarebbe un trim', () => {
    const esito = componiSnapshot([{ fdi: 11 }], { colore: ' ' })
    expect(esito?.contenuto.colore).toBe(' ')
  })
})

describe('componiSnapshot — il numero di prescrizione', () => {
  it('⑩ SOLO il numero → riga legittima: contenuto {} con numero (M-T3-3)', () => {
    expect(componiSnapshot([], { numero_prescrizione: 'RX-2026-042' })).toEqual({
      contenuto: {},
      numero_prescrizione: 'RX-2026-042',
    })
  })

  it('⑫ " 123 " resta " 123 ": la fedeltà vale anche per il numero', () => {
    const esito = componiSnapshot([], { numero_prescrizione: ' 123 ' })
    expect(esito?.numero_prescrizione).toBe(' 123 ')
  })
})

describe('componiSnapshot — ⑬ `tipo` non entra MAI alla creazione (D213)', () => {
  it('nessuna combinazione d\'ingresso produce la chiave `tipo`', () => {
    const esiti = [
      componiSnapshot([{ fdi: 11 }, { fdi: 12 }], { colore: 'A2', numero_prescrizione: '7' }),
      componiSnapshot([{ fdi: 11 }]),
      componiSnapshot([], { numero_prescrizione: 'X' }),
    ]
    for (const esito of esiti) {
      expect(esito).not.toBeNull()
      expect(esito?.contenuto).not.toHaveProperty('tipo')
    }
  })
})
