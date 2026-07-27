import { describe, expect, it } from 'vitest'
import { risolviColore } from '@/lib/domain/colore-dente'

const CASO_A3 = { colore_scala: 'vita_classical', colore_codice: 'A3' }
const CASO_VUOTO = { colore_scala: null, colore_codice: null }

describe('precedenza colore: la riga vince sul caso (spec §3.2)', () => {
  it('senza riga usa il default di caso — è la protesi totale', () => {
    expect(risolviColore(undefined, CASO_A3)).toEqual({ scala: 'vita_classical', codice: 'A3', da: 'caso' })
  })

  it('la riga con colore proprio vince — sono i denti di colore diverso', () => {
    const riga = { fdi: 11, scala: 'vita_classical', codice: 'B1' }
    expect(risolviColore(riga, CASO_A3)).toEqual({ scala: 'vita_classical', codice: 'B1', da: 'dente' })
  })

  it('la riga senza colore ricade sul caso — è l abutment in un lavoro colorato', () => {
    const riga = { fdi: 11, scala: null, codice: null }
    expect(risolviColore(riga, CASO_A3)).toEqual({ scala: 'vita_classical', codice: 'A3', da: 'caso' })
  })

  it('niente riga e niente caso: null, non una stringa vuota', () => {
    expect(risolviColore(undefined, CASO_VUOTO)).toBeNull()
    expect(risolviColore({ fdi: 11, scala: null, codice: null }, CASO_VUOTO)).toBeNull()
  })

  it('una scala senza codice non è un colore', () => {
    expect(risolviColore({ fdi: 11, scala: 'vita_classical', codice: null }, CASO_VUOTO)).toBeNull()
    expect(risolviColore(undefined, { colore_scala: 'vita_classical', colore_codice: null })).toBeNull()
  })

  it('un codice senza scala non è un colore: A3 esiste in una scala sola per convenzione, non per legge', () => {
    expect(risolviColore({ fdi: 11, scala: null, codice: 'A3' }, CASO_VUOTO)).toBeNull()
  })

  it('una scala sconosciuta non passa: il dominio è chiuso', () => {
    expect(risolviColore({ fdi: 11, scala: 'inventata', codice: 'A3' }, CASO_VUOTO)).toBeNull()
  })
})
