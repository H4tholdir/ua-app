// Task 11 — ricerca «che accende» della Parete (§5.1, spec
// 2026-07-21-parete-cassette-design.md). Task 18 (ratifica Francesco 22/07): la ricerca
// diventa GLOBALE — entrano anche l'etichetta leggibile del tipo (via LABEL_MACRO) e il
// colore. Test in tests/unit/ (D-O1): vitest.config.ts scopre solo qui,
// src/components/features/cassette/__tests__/ sarebbe un RED finto.
import { describe, expect, it } from 'vitest'
import { filtraCassette } from '@/components/features/cassette/filtra-cassette'
import { LABEL_MACRO } from '@/lib/domain/tipi-lavoro'

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

  // Task 18 (ratifica 22/07) — «ogni possibile campo utile all'identificazione»: entrano
  // l'etichetta leggibile del tipo (via LABEL_MACRO, non lo slug) e il colore.
  it("l'etichetta leggibile del tipo (da LABEL_MACRO) accende la cassetta", () => {
    expect(filtraCassette(par, LABEL_MACRO.protesi_fissa)).toEqual(new Set(['a']))
  })
  it('lo slug macchina del tipo (es. "protesi_fissa") NON è richiesto matchare — al banco si digita l\'etichetta, non lo slug', () => {
    expect(filtraCassette(par, 'protesi_fissa').size).toBe(0)
  })
  it('il colore accende TUTTE le cassette di quel colore, incluse quelle libere', () => {
    const conLibera = [
      ...par,
      { id: 'd', nome: 'C9', colore: 'rossa', posizione: 3, lavoro: null },
    ]
    expect(filtraCassette(conLibera, 'rossa')).toEqual(new Set(['a', 'd']))
  })
  it('tipoDispositivo null o slug ignoto non rompono la ricerca né sporcano il pagliaio con "undefined"', () => {
    const bordo = [
      { id: 'e', nome: 'C1', colore: 'verde', posizione: 4,
        lavoro: { id: 'l3', numero: '200', dentista: 'Verdi', paziente: 'LUC-1',
                  tipoDispositivo: null, descrizione: 'Modello' } },
      { id: 'f', nome: 'C2', colore: 'blu', posizione: 5,
        lavoro: { id: 'l4', numero: '201', dentista: 'Neri', paziente: 'PAO-2',
                  tipoDispositivo: 'slug_ignoto_xyz', descrizione: 'Altro' } },
    ]
    expect(() => filtraCassette(bordo, 'qualsiasi')).not.toThrow()
    expect(filtraCassette(bordo, 'undefined').size).toBe(0)
    expect(filtraCassette(bordo, 'verde')).toEqual(new Set(['e']))
    expect(filtraCassette(bordo, 'blu')).toEqual(new Set(['f']))
  })
})
