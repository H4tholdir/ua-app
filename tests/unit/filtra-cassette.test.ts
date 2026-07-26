// Task 11 — ricerca «che accende» della Parete (§5.1, spec
// 2026-07-21-parete-cassette-design.md). Task 18 (ratifica Francesco 22/07): la ricerca
// diventa GLOBALE — entrano anche l'etichetta leggibile del tipo (via LABEL_MACRO) e il
// colore. Test in tests/unit/ (D-O1): vitest.config.ts scopre solo qui,
// src/components/features/cassette/__tests__/ sarebbe un RED finto.
//
// FIX-K (G7, ratifica 25/07 — docs/design/decisions/2026-07-24-qa-device-meta-ondata.md,
// sezione «Ri-collaudo device #2»): «eliminiamo la ricerca per codice esadecimale del colore,
// inutile per un laboratorio, inseriamo invece la ricerca del campo note laboratorio». K1 sotto
// prova che l'hex non accende più nulla (LIBERA e OCCUPATA — il colore vive in `c.colore` su
// entrambe); K2 prova che `note_interne` (rinominato `noteInterne` sul tipo) accende le
// cassette OCCUPATE senza toccare le LIBERE (che un lavoro, e quindi delle note, non ce l'hanno).
import { describe, expect, it } from 'vitest'
import { filtraCassette } from '@/components/features/cassette/filtra-cassette'
import { LABEL_MACRO } from '@/lib/domain/tipi-lavoro'

const par = [
  { id: 'a', nome: 'C12', colore: 'rossa', posizione: 0,
    lavoro: { id: 'l1', numero: '144', dentista: 'Bianchi', paziente: 'MAR-42', pazienteAlias: null,
              tipoDispositivo: 'protesi_fissa', descrizione: 'Corona zirconia', noteInterne: null } },
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
        lavoro: { id: 'l2', numero: '150', dentista: 'Bianchi', paziente: 'VER-9', pazienteAlias: null,
                  tipoDispositivo: 'protesi_mobile', descrizione: 'Scheletrato', noteInterne: null } },
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
  it('il colore-PAROLA accende TUTTE le cassette di quel colore, incluse quelle libere (FIX-K: invariato)', () => {
    const conLibera = [
      ...par,
      { id: 'd', nome: 'C9', colore: 'rossa', posizione: 3, lavoro: null },
    ]
    expect(filtraCassette(conLibera, 'rossa')).toEqual(new Set(['a', 'd']))
  })
  it('tipoDispositivo null o slug ignoto non rompono la ricerca né sporcano il pagliaio con "undefined"', () => {
    const bordo = [
      { id: 'e', nome: 'C1', colore: 'verde', posizione: 4,
        lavoro: { id: 'l3', numero: '200', dentista: 'Verdi', paziente: 'LUC-1', pazienteAlias: null,
                  tipoDispositivo: null, descrizione: 'Modello', noteInterne: null } },
      { id: 'f', nome: 'C2', colore: 'blu', posizione: 5,
        lavoro: { id: 'l4', numero: '201', dentista: 'Neri', paziente: 'PAO-2', pazienteAlias: null,
                  tipoDispositivo: 'slug_ignoto_xyz', descrizione: 'Altro', noteInterne: null } },
    ]
    expect(() => filtraCassette(bordo, 'qualsiasi')).not.toThrow()
    expect(filtraCassette(bordo, 'undefined').size).toBe(0)
    expect(filtraCassette(bordo, 'verde')).toEqual(new Set(['e']))
    expect(filtraCassette(bordo, 'blu')).toEqual(new Set(['f']))
  })

  it("trova per alias paziente E per codice: l'alias si AGGIUNGE, non sostituisce", () => {
    const parete = [
      { id: 'a', nome: 'C12', colore: 'rossa', posizione: 0,
        lavoro: { id: 'l1', numero: '144', dentista: 'Bianchi', paziente: 'PZ-0012', pazienteAlias: 'Rossi Mario',
                  tipoDispositivo: 'protesi_fissa', descrizione: 'Corona zirconia', noteInterne: null } },
    ]
    expect(filtraCassette(parete, 'rossi').size).toBe(1)
    expect(filtraCassette(parete, 'pz-0012').size).toBe(1)
  })

  // FIX-K / K1 (G7, ratifica 25/07) — l'hex custom NON deve più accendere nulla, né sulla
  // LIBERA né sulla OCCUPATA (in entrambe `c.colore` può essere l'hex: il campo è della
  // cassetta, non del lavoro). Il colore-PAROLA delle 6 facce standard resta cercabile (v. test
  // sopra) — qui l'hex non matcha manco per sostringa parziale.
  describe('K1 — hex del colore fuori dal pagliaio', () => {
    it('un frammento di hex NON accende una cassetta LIBERA con colore custom', () => {
      const conCustomLibera = [{ id: 'g', nome: 'C8', colore: '#3A7BD5', posizione: 6, lavoro: null }]
      expect(filtraCassette(conCustomLibera, '3a7bd5').size).toBe(0)
      expect(filtraCassette(conCustomLibera, '#3a7bd5').size).toBe(0)
      expect(filtraCassette(conCustomLibera, '3a7b').size).toBe(0)
    })
    it('un frammento di hex NON accende una cassetta OCCUPATA con colore custom', () => {
      const conCustomOccupata = [
        { id: 'h', nome: 'C9', colore: '#3A7BD5', posizione: 7,
          lavoro: { id: 'l5', numero: '300', dentista: 'Colombo', paziente: 'COL-1', pazienteAlias: null,
                    tipoDispositivo: null, descrizione: null, noteInterne: null } },
      ]
      expect(filtraCassette(conCustomOccupata, '3a7bd5').size).toBe(0)
      expect(filtraCassette(conCustomOccupata, '#3a7bd5').size).toBe(0)
    })
    it('resta cercabile il nome/dentista di una cassetta a colore custom (l\'hex esce dal pagliaio, il resto no)', () => {
      const conCustomOccupata = [
        { id: 'h', nome: 'C9', colore: '#3A7BD5', posizione: 7,
          lavoro: { id: 'l5', numero: '300', dentista: 'Colombo', paziente: 'COL-1', pazienteAlias: null,
                    tipoDispositivo: null, descrizione: null, noteInterne: null } },
      ]
      expect(filtraCassette(conCustomOccupata, 'colombo')).toEqual(new Set(['h']))
    })
  })

  // FIX-K / K2 (G7, ratifica 25/07) — `note_interne` (le note di laboratorio, MAI
  // `note_dentista`) entra nel pagliaio SOLO per le cassette OCCUPATE (una libera non ha un
  // `lavoro`, quindi non ha note da cercare).
  describe('K2 — note laboratorio nel pagliaio (solo OCCUPATE)', () => {
    it('una nota di laboratorio accende la cassetta OCCUPATA che la porta', () => {
      const conNota = [
        { id: 'i', nome: 'C10', colore: 'blu', posizione: 8,
          lavoro: { id: 'l6', numero: '301', dentista: 'Russo', paziente: 'RUS-1', pazienteAlias: null,
                    tipoDispositivo: null, descrizione: null, noteInterne: 'prova colore A2' } },
      ]
      expect(filtraCassette(conNota, 'A2')).toEqual(new Set(['i']))
      expect(filtraCassette(conNota, 'a2')).toEqual(new Set(['i'])) // accenti/case-insensitive via `normalizza`
      expect(filtraCassette(conNota, 'prova colore')).toEqual(new Set(['i']))
    })
    it('le cassette LIBERE non sono toccate dal campo note: una query che matcha SOLO la nota di un\'altra cassetta non le accende', () => {
      const parete = [
        { id: 'i', nome: 'C10', colore: 'blu', posizione: 8,
          lavoro: { id: 'l6', numero: '301', dentista: 'Russo', paziente: 'RUS-1', pazienteAlias: null,
                    tipoDispositivo: null, descrizione: null, noteInterne: 'prova colore A2' } },
        { id: 'j', nome: 'C11', colore: 'verde', posizione: 9, lavoro: null },
      ]
      expect(filtraCassette(parete, 'a2')).toEqual(new Set(['i']))
    })
    it('note_interne assente (null) non rompe la ricerca né sporca il pagliaio con "null"', () => {
      const conNotaNulla = [
        { id: 'k', nome: 'C13', colore: 'bianca', posizione: 10,
          lavoro: { id: 'l7', numero: '302', dentista: 'Ferrari', paziente: 'FER-1', pazienteAlias: null,
                    tipoDispositivo: null, descrizione: null, noteInterne: null } },
      ]
      expect(() => filtraCassette(conNotaNulla, 'qualsiasi')).not.toThrow()
      expect(filtraCassette(conNotaNulla, 'null').size).toBe(0)
      expect(filtraCassette(conNotaNulla, 'ferrari')).toEqual(new Set(['k']))
    })
  })
})
