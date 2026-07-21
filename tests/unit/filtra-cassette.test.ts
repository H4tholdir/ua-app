// Task 11 — ricerca «che accende» della Parete (§5.1, spec
// 2026-07-21-parete-cassette-design.md). Test in tests/unit/ (D-O1): vitest.config.ts
// scopre solo qui, src/components/features/cassette/__tests__/ sarebbe un RED finto.
import { describe, expect, it } from 'vitest'
import { filtraCassette } from '@/components/features/cassette/filtra-cassette'

const par = [
  { id: 'a', nome: 'C12', colore: 'rossa', posizione: 0,
    lavoro: { id: 'l1', numero: '144', dentista: 'Bianchi', paziente: 'MAR-42',
              tipoDispositivo: 'protesi_fissa', descrizione: 'Corona zirconia' } },
  { id: 'b', nome: 'C4', colore: 'grigia', posizione: 1, lavoro: null },
]

describe('filtraCassette', () => {
  it('query vuota → nessun filtro', () => expect(filtraCassette(par, '  ').size).toBe(0))
  it('matcha nome, numero, dentista, paziente, tipo (accenti-insensitive)', () => {
    expect(filtraCassette(par, 'zircònia')).toEqual(new Set(['a']))
    expect(filtraCassette(par, 'c4')).toEqual(new Set(['b']))
    expect(filtraCassette(par, '144')).toEqual(new Set(['a']))
    expect(filtraCassette(par, 'bianchi')).toEqual(new Set(['a']))
    expect(filtraCassette(par, 'mar-42')).toEqual(new Set(['a']))
  })
  it('zero match → Set vuoto MA query attiva (il client distingue con query.trim())', () => {
    expect(filtraCassette(par, 'xyz').size).toBe(0)
  })

  // Casi oltre il brief — l'invariante che regge la parete: nessuna cassetta sparisce mai,
  // il filtro dice solo QUALI si accendono (il chiamante spegne le altre).
  it('una query che matcha più cassette le accende tutte (mai solo la prima)', () => {
    const tre = [
      ...par,
      { id: 'c', nome: 'C7', colore: 'bianca', posizione: 2,
        lavoro: { id: 'l2', numero: '150', dentista: 'Bianchi', paziente: 'VER-9',
                  tipoDispositivo: 'protesi_mobile', descrizione: 'Scheletrato' } },
    ]
    expect(filtraCassette(tre, 'bianchi')).toEqual(new Set(['a', 'c']))
  })
  it('la ricerca ignora lo spazio ai bordi della query («  c4  » = «c4»)', () => {
    expect(filtraCassette(par, '  c4  ')).toEqual(new Set(['b']))
  })
})
