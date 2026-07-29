// Task 4 (Ondata (b), spec §8 righe 308-322) — il contratto della macchina
// dei passi del wizard «Nuovo lavoro» adattivo. `src/lib/wizard/passi.ts`.
//
// Le forme d'input enumerate PRIMA delle asserzioni (R-P4):
//  A. nome presente nella sequenza — posizione primo / medio / ultimo
//  B. nome NON presente nella sequenza data (letterale valido, ma fuori da
//     QUESTA sequenza — es. 'colore' quando la sequenza non lo prevede)
//  C. sequenza vuota
//  D. sequenza con un solo elemento (quell'elemento è primo E ultimo insieme)
//  E. tipo sbagliato a runtime (stringa fuori dall'union `NomePasso`, cast
//     esplicito) — coperta UNA VOLTA su `isPassoNellaSequenza` (la funzione
//     base): le altre quattro funzioni instradano sullo stesso `indexOf`/
//     `includes`, quindi non è ripetuta identica per ognuna — vedi rapporto
//     §3 per la dichiarazione esplicita di questa scelta.
//
// Ogni caso limite è dichiarato nel JSDoc del modulo, non lasciato emergere
// per caso da un `indexOf` che restituisce `-1` (brief T4 §2).

import { describe, it, expect } from 'vitest'
import {
  type NomePasso,
  SEQUENZA_CANONICA,
  isPassoNellaSequenza,
  isPrimoPasso,
  isUltimoPasso,
  passoPrecedente,
  passoSuccessivo,
  mostraUscita,
} from '@/lib/wizard/passi'

// Sequenze sintetiche usate nei test — NON sono "la" sequenza di un tipo di
// lavoro reale (quella la calcola T3, fuori mandato qui): servono solo a
// provare che le funzioni sono generiche su QUALSIASI sequenza passata come
// argomento, mai su una globale (brief T4 §2).
const SEQUENZA_COMPLETA: NomePasso[] = ['dentista', 'tipo', 'paziente', 'denti', 'colore', 'foto', 'cassetta']
const SEQUENZA_SENZA_DENTI_COLORE: NomePasso[] = ['dentista', 'tipo', 'paziente', 'foto'] // es. anti_russamento (spec §8)
const SEQUENZA_SINGOLO_ELEMENTO: NomePasso[] = ['foto']

describe('passi.ts — SEQUENZA_CANONICA (Task 4, spec §8)', () => {
  it('è l\'ordine canonico completo dei 7 nomi, in ordine — "Fatto" NON è incluso (è la conclusione, non un passo: vedi WizardNuovoLavoro.tsx righe 438-452 e 510-544)', () => {
    expect(SEQUENZA_CANONICA).toEqual(['dentista', 'tipo', 'paziente', 'denti', 'colore', 'foto', 'cassetta'])
    expect(SEQUENZA_CANONICA).toHaveLength(7)
    expect(SEQUENZA_CANONICA).not.toContain('fatto')
  })
})

describe('passi.ts — isPassoNellaSequenza (Task 4)', () => {
  it('forma A: nome presente → true', () => {
    expect(isPassoNellaSequenza('colore', SEQUENZA_COMPLETA)).toBe(true)
  })

  it('forma B: nome assente da QUESTA sequenza (letterale valido) → false', () => {
    expect(isPassoNellaSequenza('colore', SEQUENZA_SENZA_DENTI_COLORE)).toBe(false)
  })

  it('forma C: sequenza vuota → false per qualunque nome', () => {
    expect(isPassoNellaSequenza('dentista', [])).toBe(false)
  })

  it('forma E: nome fuori dall\'union NomePasso a runtime (tipo sbagliato) — nessun throw, stesso percorso di "assente" → false', () => {
    const nomeIgnoto = 'fattura' as NomePasso
    expect(() => isPassoNellaSequenza(nomeIgnoto, SEQUENZA_COMPLETA)).not.toThrow()
    expect(isPassoNellaSequenza(nomeIgnoto, SEQUENZA_COMPLETA)).toBe(false)
  })
})

describe('passi.ts — isPrimoPasso / isUltimoPasso (Task 4)', () => {
  it('forma A, posizione primo: "dentista" è il primo di SEQUENZA_COMPLETA, non l\'ultimo', () => {
    expect(isPrimoPasso('dentista', SEQUENZA_COMPLETA)).toBe(true)
    expect(isUltimoPasso('dentista', SEQUENZA_COMPLETA)).toBe(false)
  })

  it('forma A, posizione medio: "paziente" non è né primo né ultimo', () => {
    expect(isPrimoPasso('paziente', SEQUENZA_COMPLETA)).toBe(false)
    expect(isUltimoPasso('paziente', SEQUENZA_COMPLETA)).toBe(false)
  })

  it('forma A, posizione ultimo: "cassetta" è l\'ultimo, non il primo', () => {
    expect(isPrimoPasso('cassetta', SEQUENZA_COMPLETA)).toBe(false)
    expect(isUltimoPasso('cassetta', SEQUENZA_COMPLETA)).toBe(true)
  })

  it('la sequenza cambia chi è primo/ultimo: "foto" è ultimo in SEQUENZA_SENZA_DENTI_COLORE, medio in SEQUENZA_COMPLETA', () => {
    expect(isUltimoPasso('foto', SEQUENZA_SENZA_DENTI_COLORE)).toBe(true)
    expect(isUltimoPasso('foto', SEQUENZA_COMPLETA)).toBe(false)
  })

  it('forma B: nome assente dalla sequenza → isPrimoPasso e isUltimoPasso entrambi false (non può essere "il primo/ultimo" di una sequenza a cui non appartiene)', () => {
    expect(isPrimoPasso('colore', SEQUENZA_SENZA_DENTI_COLORE)).toBe(false)
    expect(isUltimoPasso('colore', SEQUENZA_SENZA_DENTI_COLORE)).toBe(false)
  })

  it('forma C: sequenza vuota → sempre false, per qualunque nome (nessun nome può appartenere a una sequenza vuota)', () => {
    expect(isPrimoPasso('dentista', [])).toBe(false)
    expect(isUltimoPasso('dentista', [])).toBe(false)
  })

  it('forma D: sequenza a un solo elemento → quell\'elemento è primo E ultimo insieme', () => {
    expect(isPrimoPasso('foto', SEQUENZA_SINGOLO_ELEMENTO)).toBe(true)
    expect(isUltimoPasso('foto', SEQUENZA_SINGOLO_ELEMENTO)).toBe(true)
  })
})

describe('passi.ts — passoPrecedente / passoSuccessivo (Task 4)', () => {
  it('forma A, posizione medio: precedente e successivo di "paziente" in SEQUENZA_COMPLETA', () => {
    expect(passoPrecedente('paziente', SEQUENZA_COMPLETA)).toBe('tipo')
    expect(passoSuccessivo('paziente', SEQUENZA_COMPLETA)).toBe('denti')
  })

  it('forma A, posizione primo: "dentista" non ha precedente, il successivo è "tipo"', () => {
    expect(passoPrecedente('dentista', SEQUENZA_COMPLETA)).toBeNull()
    expect(passoSuccessivo('dentista', SEQUENZA_COMPLETA)).toBe('tipo')
  })

  it('forma A, posizione ultimo: "cassetta" non ha successivo, il precedente è "foto"', () => {
    expect(passoPrecedente('cassetta', SEQUENZA_COMPLETA)).toBe('foto')
    expect(passoSuccessivo('cassetta', SEQUENZA_COMPLETA)).toBeNull()
  })

  it('la sequenza cambia il vicinato: successivo di "paziente" è "foto" quando denti/colore mancano, "denti" quando ci sono', () => {
    expect(passoSuccessivo('paziente', SEQUENZA_SENZA_DENTI_COLORE)).toBe('foto')
    expect(passoSuccessivo('paziente', SEQUENZA_COMPLETA)).toBe('denti')
  })

  it('forma B: nome assente dalla sequenza → precedente e successivo entrambi null', () => {
    expect(passoPrecedente('colore', SEQUENZA_SENZA_DENTI_COLORE)).toBeNull()
    expect(passoSuccessivo('colore', SEQUENZA_SENZA_DENTI_COLORE)).toBeNull()
  })

  it('forma C: sequenza vuota → precedente e successivo null per qualunque nome', () => {
    expect(passoPrecedente('dentista', [])).toBeNull()
    expect(passoSuccessivo('dentista', [])).toBeNull()
  })

  it('forma D: sequenza a un solo elemento → né precedente né successivo (è primo e ultimo insieme)', () => {
    expect(passoPrecedente('foto', SEQUENZA_SINGOLO_ELEMENTO)).toBeNull()
    expect(passoSuccessivo('foto', SEQUENZA_SINGOLO_ELEMENTO)).toBeNull()
  })
})

describe('passi.ts — mostraUscita (Task 4, D21 riformulata: "quando il passo NON è il primo DELLA SEQUENZA", non più "dal passo 2")', () => {
  it('il primo passo DELLA SEQUENZA → la ✕ NON compare, qualunque sia il nome del primo passo', () => {
    expect(mostraUscita('dentista', SEQUENZA_COMPLETA)).toBe(false)
    // in una sequenza sintetica dove "paziente" è messo per primo, è "paziente"
    // a non mostrare la ✕ — la legge è sulla POSIZIONE, non sul nome fissato.
    expect(mostraUscita('paziente', ['paziente', 'foto'])).toBe(false)
  })

  it('ogni passo che NON è il primo → la ✕ compare, incluso l\'ultimo', () => {
    expect(mostraUscita('tipo', SEQUENZA_COMPLETA)).toBe(true)
    expect(mostraUscita('cassetta', SEQUENZA_COMPLETA)).toBe(true)
    expect(mostraUscita('foto', SEQUENZA_SENZA_DENTI_COLORE)).toBe(true) // ultimo qui, ma non primo
  })

  it('forma D: sequenza a un solo elemento → quell\'unico passo È il primo → la ✕ NON compare', () => {
    expect(mostraUscita('foto', SEQUENZA_SINGOLO_ELEMENTO)).toBe(false)
  })

  it('forma B: nome fuori dalla sequenza data (bozza/tipo desincronizzati) → la ✕ COMPARE, per scelta dichiarata: fra "✕ assente quando serve" e "✕ presente quando non serve", la seconda non intrappola l\'odontotecnico', () => {
    expect(mostraUscita('colore', SEQUENZA_SENZA_DENTI_COLORE)).toBe(true)
  })

  it('è esattamente la negazione di isPrimoPasso, su più coppie (nome, sequenza)', () => {
    const casi: Array<[NomePasso, NomePasso[]]> = [
      ['dentista', SEQUENZA_COMPLETA],
      ['tipo', SEQUENZA_COMPLETA],
      ['cassetta', SEQUENZA_COMPLETA],
      ['foto', SEQUENZA_SENZA_DENTI_COLORE],
      ['foto', SEQUENZA_SINGOLO_ELEMENTO],
    ]
    for (const [nome, sequenza] of casi) {
      expect(mostraUscita(nome, sequenza)).toBe(!isPrimoPasso(nome, sequenza))
    }
  })
})

describe('passi.ts — purezza (Task 4, brief §2: "mai su una globale", nessuna mutazione)', () => {
  it('nessuna funzione muta la sequenza ricevuta — verificato con un array congelato', () => {
    const congelata = Object.freeze([...SEQUENZA_COMPLETA]) as readonly NomePasso[]
    expect(() => {
      isPassoNellaSequenza('colore', congelata)
      isPrimoPasso('colore', congelata)
      isUltimoPasso('colore', congelata)
      passoPrecedente('colore', congelata)
      passoSuccessivo('colore', congelata)
      mostraUscita('colore', congelata)
    }).not.toThrow()
    expect(congelata).toEqual(SEQUENZA_COMPLETA)
  })

  it('due sequenze diverse date alla stessa funzione, stesso nome → risultati indipendenti (nessuno stato condiviso fra chiamate)', () => {
    expect(isUltimoPasso('paziente', ['dentista', 'tipo', 'paziente'])).toBe(true)
    expect(isUltimoPasso('paziente', SEQUENZA_COMPLETA)).toBe(false)
  })
})
