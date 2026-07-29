// Task 3 (Ondata (b), brief T3) — `src/lib/wizard/sequenza-passi.ts`: deriva
// dai flag di T2 (`tipi-lavoro.ts`) quali passi del contratto T4
// (`wizard/passi.ts`) compaiono per un dato tipo di lavoro, e calcola cosa si
// perde quando l'utente torna indietro e cambia una risposta a monte (D17).
//
// Le forme d'input enumerate PRIMA delle asserzioni (R-P4):
//
// sequenzaPassi(id):
//  A. id di un tipo che prevede ENTRAMBI i passi condizionali (denti+colore
//     catalogo) — 'overdenture', la prova obbligatoria del brief
//  B. id di un tipo che non ne prevede NESSUNO — 'anti_russamento' e
//     'duplicato_protesi', le due prove obbligatorie del brief
//  C. id di un tipo che prevede SOLO denti (colore 'nessuno') —
//     'barra_overdenture'
//  D. id di un tipo che prevede SOLO colore (denti false) — 'protesi_totale'
//  E. id di un tipo con prevedeColore === 'libero' — deve comportarsi come
//     'nessuno' ai fini del passo 'colore' (D42: la tavolozza libera non
//     apre il passo colore in quest'ondata) — 'placca_espansione'
//  F. id ASSENTE dal catalogo (stringa qualunque) — comportamento dichiarato
//     esplicitamente (§3 del rapporto), non lasciato emergere da un `find`
//     che torna `undefined`
//  G. id vuoto '' — stesso ramo di F (nessun tipo con id '' esiste)
//
// cosaSiPerde(precedente, successivo):
//  H. cambio TIPO che fa sparire denti E colore, ENTRAMBI presenti nel
//     precedente → persi entrambi (caso reale 1 di D17)
//  I. cambio TIPO che fa sparire i passi ma i CAMPI erano vuoti → nessuna
//     perdita (l'avviso a sproposito è metà del difetto — brief §5.3)
//  J. cambio TIPO fra due tipi che prevedono ENTRAMBI denti+colore → nessuna
//     perdita anche se il tipo (l'id) cambia
//  K. STESSO tipo, campi pieni → nessuna perdita (nessun ramo tocca la
//     sequenza se l'id non cambia)
//  L. cambio DENTISTA con paziente scelto dall'archivio nel precedente →
//     perso (caso reale 2 di D17 — la ragione per cui la firma vede il
//     dentista, non solo i due tipi)
//  M. cambio DENTISTA senza un paziente scelto → nessuna perdita
//  N. STESSO dentista, paziente scelto → nessuna perdita (nessun cambio,
//     nessun avviso)
//  O. cambio SIA tipo SIA dentista, tutto pieno → le tre perdite insieme
//  P. stato senza tipo (tipoId null) nel precedente, anche con campi
//     "impossibili" già pieni → nessuna perdita (non c'è sequenza da cui i
//     passi possano essere spariti)
//  Q. tipoId del precedente che non esiste nel catalogo, con denti/colori
//     pieni → nessuna perdita (la stessa regola F si applica anche qui:
//     un id sconosciuto non "aveva" i passi condizionali da perdere)
//  R. cliente null su entrambi i lati, pazienteIdScelto pieno → nessuna
//     perdita (nessun cambio di dentista rilevabile)
//  S. chiave ASSENTE (`undefined`, non `null`) su denti/colori/
//     pazienteIdScelto — una bozza JSON malformata (`persistenza.ts:62-66`,
//     `JSON.parse` senza validare la forma) può produrla: `undefined` deve
//     leggersi come "niente", esattamente come `null`, mai come "un valore
//     c'è" (trovato in revisione: `!== null` lascia passare `undefined`)

import { describe, it, expect } from 'vitest'
import type { NomePasso } from '@/lib/wizard/passi'
import {
  sequenzaPassi,
  cosaSiPerde,
  type StatoMinimoPerdita,
} from '@/lib/wizard/sequenza-passi'

// Stato minimo di comodo per i test di cosaSiPerde — un solo posto dove
// cambiano i pochi campi rilevanti per caso, il resto resta ai valori "vuoti".
function stato(overrides: Partial<StatoMinimoPerdita>): StatoMinimoPerdita {
  return {
    tipoId: null,
    cliente: null,
    pazienteIdScelto: null,
    denti: null,
    colori: null,
    ...overrides,
  }
}

describe('sequenza-passi.ts — sequenzaPassi (Task 3)', () => {
  it('forma A: "overdenture" (prevedeDenti true, prevedeColore catalogo) → sequenza COMPLETA, in ordine, valore atteso scritto a mano', () => {
    expect(sequenzaPassi('overdenture')).toEqual([
      'dentista',
      'tipo',
      'paziente',
      'denti',
      'colore',
      'foto',
      'cassetta',
    ])
  })

  it('forma B: "anti_russamento" (prevedeDenti false, prevedeColore nessuno) → NESSUN passo condizionale', () => {
    expect(sequenzaPassi('anti_russamento')).toEqual(['dentista', 'tipo', 'paziente', 'foto', 'cassetta'])
  })

  it('forma B: "duplicato_protesi" (prevedeDenti false, prevedeColore nessuno) → NESSUN passo condizionale', () => {
    expect(sequenzaPassi('duplicato_protesi')).toEqual(['dentista', 'tipo', 'paziente', 'foto', 'cassetta'])
  })

  it('forma C: "barra_overdenture" (prevedeDenti true, prevedeColore nessuno) → SOLO "denti", non "colore"', () => {
    const seq = sequenzaPassi('barra_overdenture')
    expect(seq).toEqual(['dentista', 'tipo', 'paziente', 'denti', 'foto', 'cassetta'])
    expect(seq).toContain('denti')
    expect(seq).not.toContain('colore')
  })

  it('forma D: "protesi_totale" (prevedeDenti false, prevedeColore catalogo) → SOLO "colore", non "denti"', () => {
    const seq = sequenzaPassi('protesi_totale')
    expect(seq).toEqual(['dentista', 'tipo', 'paziente', 'colore', 'foto', 'cassetta'])
    expect(seq).toContain('colore')
    expect(seq).not.toContain('denti')
  })

  it('forma E: "placca_espansione" (prevedeColore LIBERO) → il passo "colore" NON compare (D42: la tavolozza libera è un\'altra ondata)', () => {
    const seq = sequenzaPassi('placca_espansione')
    expect(seq).not.toContain('colore')
    expect(seq).toEqual(['dentista', 'tipo', 'paziente', 'foto', 'cassetta'])
  })

  it('forma F: id ASSENTE dal catalogo → sequenza MINIMA (i 5 passi fissi, nessun condizionale) — comportamento dichiarato, non un find(undefined) lasciato a cadere', () => {
    expect(sequenzaPassi('id-che-non-esiste-nel-catalogo')).toEqual([
      'dentista',
      'tipo',
      'paziente',
      'foto',
      'cassetta',
    ])
  })

  it('forma G: id vuoto \'\' → stesso ramo di F, stessa sequenza minima', () => {
    expect(sequenzaPassi('')).toEqual(['dentista', 'tipo', 'paziente', 'foto', 'cassetta'])
  })

  it('nessun throw su id ignoto/vuoto — E il risultato è la sequenza minima attesa (un not.toThrow nudo passerebbe anche contro l\'abbozzo inerte: qui il valore atteso è scritto a mano)', () => {
    expect(() => sequenzaPassi('boh')).not.toThrow()
    expect(sequenzaPassi('boh')).toEqual(['dentista', 'tipo', 'paziente', 'foto', 'cassetta'])
    expect(() => sequenzaPassi('')).not.toThrow()
    expect(sequenzaPassi('')).toEqual(['dentista', 'tipo', 'paziente', 'foto', 'cassetta'])
  })

  it('i 5 passi fissi (dentista, tipo, paziente, foto, cassetta) compaiono SEMPRE, per qualunque tipo — mai condizionali (brief §2.1)', () => {
    const fissi: NomePasso[] = ['dentista', 'tipo', 'paziente', 'foto', 'cassetta']
    for (const id of ['overdenture', 'anti_russamento', 'duplicato_protesi', 'barra_overdenture', 'protesi_totale', 'inesistente']) {
      const seq = sequenzaPassi(id)
      for (const passo of fissi) expect(seq).toContain(passo)
    }
  })
})

describe('sequenza-passi.ts — cosaSiPerde (Task 3, D17)', () => {
  it('forma H: cambio tipo che fa sparire denti E colore, entrambi presenti nel precedente → persi entrambi', () => {
    const precedente = stato({ tipoId: 'overdenture', denti: ['1.1', '1.2'], colori: ['A2'] })
    const successivo = stato({ tipoId: 'anti_russamento', denti: ['1.1', '1.2'], colori: ['A2'] })
    expect(cosaSiPerde(precedente, successivo)).toEqual(['denti', 'colori'])
  })

  it('forma I: cambio tipo che fa sparire i passi, ma i campi erano VUOTI nel precedente → nessuna perdita (l\'avviso a sproposito è il difetto scartato da D17)', () => {
    const precedente = stato({ tipoId: 'overdenture', denti: null, colori: null })
    const successivo = stato({ tipoId: 'anti_russamento' })
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('forma I-bis: stessa cosa con array VUOTI (non null) — "presente ma vuoto" non è un dato da perdere', () => {
    const precedente = stato({ tipoId: 'overdenture', denti: [], colori: [] })
    const successivo = stato({ tipoId: 'anti_russamento' })
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('forma J: cambio tipo fra due tipi che prevedono ENTRAMBI denti+colore → nessuna perdita anche se l\'id cambia', () => {
    const precedente = stato({ tipoId: 'overdenture', denti: ['1.1'], colori: ['A2'] })
    const successivo = stato({ tipoId: 'corona_zirconia', denti: ['1.1'], colori: ['A2'] })
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('forma K: STESSO tipo, campi pieni → nessuna perdita', () => {
    const precedente = stato({ tipoId: 'overdenture', denti: ['1.1'], colori: ['A2'] })
    const successivo = stato({ tipoId: 'overdenture', denti: ['1.1'], colori: ['A2'] })
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('forma L: cambio DENTISTA con un paziente scelto dall\'archivio nel precedente → paziente perso (la ragione della firma a due stati, D17)', () => {
    const precedente = stato({ cliente: { id: 'dott-rossi' }, pazienteIdScelto: 'pz-42' })
    const successivo = stato({ cliente: { id: 'dott-verdi' }, pazienteIdScelto: 'pz-42' })
    expect(cosaSiPerde(precedente, successivo)).toEqual(['paziente'])
  })

  it('forma M: cambio DENTISTA senza un paziente scelto → nessuna perdita', () => {
    const precedente = stato({ cliente: { id: 'dott-rossi' }, pazienteIdScelto: null })
    const successivo = stato({ cliente: { id: 'dott-verdi' }, pazienteIdScelto: null })
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('forma N: STESSO dentista, paziente scelto → nessuna perdita (nessun cambio, nessun avviso a sproposito)', () => {
    const precedente = stato({ cliente: { id: 'dott-rossi' }, pazienteIdScelto: 'pz-42' })
    const successivo = stato({ cliente: { id: 'dott-rossi' }, pazienteIdScelto: 'pz-42' })
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('forma O: cambio SIA tipo SIA dentista, tutto pieno → le tre perdite insieme, nello stesso ordine della tabella (denti, colori, paziente)', () => {
    const precedente = stato({
      tipoId: 'overdenture',
      denti: ['1.1'],
      colori: ['A2'],
      cliente: { id: 'dott-rossi' },
      pazienteIdScelto: 'pz-42',
    })
    const successivo = stato({
      tipoId: 'anti_russamento',
      denti: ['1.1'],
      colori: ['A2'],
      cliente: { id: 'dott-verdi' },
      pazienteIdScelto: 'pz-42',
    })
    expect(cosaSiPerde(precedente, successivo)).toEqual(['denti', 'colori', 'paziente'])
  })

  it('forma P: stato SENZA tipo (tipoId null) nel precedente, anche con campi "impossibili" già pieni → nessuna perdita (non c\'è una sequenza da cui i passi condizionali possano essere spariti)', () => {
    const precedente = stato({ tipoId: null, denti: ['1.1'], colori: ['A2'] })
    const successivo = stato({ tipoId: 'overdenture', denti: ['1.1'], colori: ['A2'] })
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('forma Q: tipoId del precedente ASSENTE dal catalogo, con denti/colori pieni → nessuna perdita (stessa regola F di sequenzaPassi, riusata: un id sconosciuto non "aveva" i passi condizionali)', () => {
    const precedente = stato({ tipoId: 'id-che-non-esiste', denti: ['1.1'], colori: ['A2'] })
    const successivo = stato({ tipoId: 'anti_russamento', denti: ['1.1'], colori: ['A2'] })
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('forma R: cliente null su entrambi i lati, pazienteIdScelto pieno → nessuna perdita (nessun cambio di dentista rilevabile: null === null)', () => {
    const precedente = stato({ cliente: null, pazienteIdScelto: 'pz-42' })
    const successivo = stato({ cliente: null, pazienteIdScelto: 'pz-42' })
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('nessun throw sul caso base — E il risultato è [] (un not.toThrow nudo passerebbe anche contro l\'abbozzo inerte: qui il valore atteso è scritto a mano)', () => {
    expect(() => cosaSiPerde(stato({}), stato({}))).not.toThrow()
    expect(cosaSiPerde(stato({}), stato({}))).toEqual([])
  })

  it('forma S: pazienteIdScelto ASSENTE (`undefined`, non `null`) su un cambio di dentista → nessuna perdita, non un throw e non un falso positivo (`!= null` copre anche `undefined`)', () => {
    const precedente = stato({ cliente: { id: 'dott-rossi' }, pazienteIdScelto: undefined as unknown as null })
    const successivo = stato({ cliente: { id: 'dott-verdi' }, pazienteIdScelto: undefined as unknown as null })
    expect(() => cosaSiPerde(precedente, successivo)).not.toThrow()
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('forma S: denti/colori ASSENTI (`undefined`, non `null`) su un cambio di tipo che li farebbe sparire → nessuna perdita, non un throw su `.length`', () => {
    const precedente = stato({
      tipoId: 'overdenture',
      denti: undefined as unknown as null,
      colori: undefined as unknown as null,
    })
    const successivo = stato({ tipoId: 'anti_russamento' })
    expect(() => cosaSiPerde(precedente, successivo)).not.toThrow()
    expect(cosaSiPerde(precedente, successivo)).toEqual([])
  })

  it('cosaSiPerde si appoggia su sequenzaPassi, non su un elenco a mano (D17, riga finale): un tipo con SOLO denti che sparisce perde SOLO denti, mai colori', () => {
    const precedente = stato({ tipoId: 'barra_overdenture', denti: ['1.1'], colori: null })
    const successivo = stato({ tipoId: 'anti_russamento', denti: ['1.1'], colori: null })
    expect(cosaSiPerde(precedente, successivo)).toEqual(['denti'])
  })
})
