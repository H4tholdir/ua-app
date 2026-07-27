import { describe, it, expect } from 'vitest'
import { risolviNomePaziente, cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'

const CODICE = 'PZ-0042'

describe('risolviNomePaziente — la tabella delle quattro combinazioni (spec §5)', () => {
  it('riga 1 — entrambe vuote: il CODICE finisce nel cognome, nome resta stringa vuota', () => {
    expect(risolviNomePaziente({ cognome: '', nome: '', codice: CODICE }))
      .toEqual({ cognome: 'PZ-0042', nome: '' })
  })

  it('riga 2 — solo cognome: il cognome resta dov`è, nome stringa vuota', () => {
    expect(risolviNomePaziente({ cognome: 'Bagheria', nome: '', codice: CODICE }))
      .toEqual({ cognome: 'Bagheria', nome: '' })
  })

  it('riga 3 — solo nome: va nel COGNOME (mai il codice accanto al nome)', () => {
    expect(risolviNomePaziente({ cognome: '', nome: 'Giuseppe', codice: CODICE }))
      .toEqual({ cognome: 'Giuseppe', nome: '' })
  })

  it('riga 4 — entrambe piene: coppia intatta', () => {
    expect(risolviNomePaziente({ cognome: 'Bagheria', nome: 'Giuseppe', codice: CODICE }))
      .toEqual({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })
})

describe('risolviNomePaziente — i tre invarianti (spec §5)', () => {
  it('invariante 1 — `nome` è SEMPRE una stringa, MAI null/undefined', () => {
    for (const caso of [
      { cognome: null, nome: null, codice: CODICE },
      { cognome: undefined, nome: undefined, codice: CODICE },
      { cognome: 'Bagheria', nome: null, codice: CODICE },
    ]) {
      const esito = risolviNomePaziente(caso)
      expect(esito).not.toBeNull()
      expect(typeof esito!.nome).toBe('string')
      expect(typeof esito!.cognome).toBe('string')
    }
  })

  it('invariante 2 — con entrambe vuote il codice NON sparisce (o la consegna si blocca)', () => {
    const esito = risolviNomePaziente({ cognome: '   ', nome: '   ', codice: CODICE })
    expect(esito).toEqual({ cognome: 'PZ-0042', nome: '' })
    // la catena a valle: nome_cognome sarebbe 'PZ-0042 ', mai ' '
    expect(esito!.cognome).not.toBe('')
  })

  it('invariante 3 — MAI il codice nel cognome quando il nome è pieno («Pz-0042 Giuseppe»)', () => {
    const esito = risolviNomePaziente({ cognome: '', nome: 'Giuseppe', codice: CODICE })
    expect(esito!.cognome).not.toBe(CODICE)
    expect(`${esito!.cognome} ${esito!.nome}`.trim()).toBe('Giuseppe')
  })
})

describe('risolviNomePaziente — robustezza', () => {
  it('taglia gli spazi ai bordi', () => {
    expect(risolviNomePaziente({ cognome: '  Del Grosso  ', nome: ' Maria ', codice: CODICE }))
      .toEqual({ cognome: 'Del Grosso', nome: 'Maria' })
  })

  it('è idempotente — riapplicarla non cambia il risultato', () => {
    const primo = risolviNomePaziente({ cognome: '', nome: 'Giuseppe', codice: CODICE })!
    const secondo = risolviNomePaziente({ ...primo, codice: CODICE })
    expect(secondo).toEqual(primo)
  })

  it('caso degenere — tutto vuoto, codice compreso: null (non scrivibile, il chiamante DEVE rifiutare)', () => {
    expect(risolviNomePaziente({ cognome: '', nome: '', codice: '' })).toBeNull()
    expect(risolviNomePaziente({ cognome: null, nome: null, codice: null })).toBeNull()
  })
})

describe('cognomeEffettivo — la guardia del «codice travestito»', () => {
  it('cognome che coincide col codice → stringa vuota (non è un cognome, è il codice)', () => {
    expect(cognomeEffettivo('PZ-0042', 'PZ-0042')).toBe('')
  })

  it('confronto case-insensitive e trim-insensitive (il trigger scrive UPPER)', () => {
    expect(cognomeEffettivo(' pz-0042 ', 'PZ-0042')).toBe('')
  })

  it('cognome vero → resta, ripulito', () => {
    expect(cognomeEffettivo('  Bagheria ', 'PZ-0042')).toBe('Bagheria')
  })

  it('null/undefined → stringa vuota', () => {
    expect(cognomeEffettivo(null, 'PZ-0042')).toBe('')
    expect(cognomeEffettivo(undefined, undefined)).toBe('')
  })
})
