import { describe, it, expect } from 'vitest'
import {
  STATI_AVVISO,
  STATI_CHIUSI,
  isStatoAvviso,
  chiudeIlPromemoria,
  ammetteTestoInviato,
  type StatoAvviso,
} from '@/lib/avvisi/stati'

// Gemello STATICO di tests/integration/avvisi-dentista-schema.rpc.test.ts:
// gira sempre, anche senza credenziali del database, e copre i quattro simboli
// che `stati.ts` esporta OLTRE l'interfaccia dichiarata dal piano
// (`StatoAvviso` · `STATI_AVVISO` · la tabella).
//
// PERCHÉ ESISTE: quei quattro erano superficie esportata senza prova. Una
// funzione esportata e non provata è la forma in cui un difetto entra in
// silenzio — e qui dentro vivono due decisioni ratificate (D335 e D339), non
// solo dei predicati.
//
// 🛑 CIÒ CHE QUESTO FILE NON PUÒ PROVARE: che il vocabolario TypeScript
// coincida col CHECK vivo `avviso_stato_vocabolario`. Serve il database, e
// quella prova sta nel gemello d'integrazione. I due file non si coprono a
// vicenda.

describe('il vocabolario degli stati di un avviso', () => {
  it('sono tre, e sono questi', () => {
    expect(STATI_AVVISO).toEqual(['da_comunicare', 'comunicato_dall_app', 'comunicato_a_voce'])
  })

  it('non contiene duplicati', () => {
    expect(new Set(STATI_AVVISO).size).toBe(STATI_AVVISO.length)
  })

  it('STATI_CHIUSI è tutto tranne «da_comunicare» — e non è uno slice', () => {
    // Il commento in `stati.ts` dice «non è STATI_AVVISO.slice(1): due elenchi
    // che si somigliano si accorciano per sbaglio». Questa è la prova che
    // rende vera quella frase invece di lasciarla un'intenzione.
    expect([...STATI_CHIUSI].sort())
      .toEqual(STATI_AVVISO.filter((s) => s !== 'da_comunicare').sort())
    expect(STATI_CHIUSI).not.toContain('da_comunicare')
  })
})

describe('isStatoAvviso — il confine con l\'esterno', () => {
  it('riconosce i tre stati veri', () => {
    for (const s of STATI_AVVISO) expect(isStatoAvviso(s)).toBe(true)
  })

  // Le forme d'input che arrivano davvero da un corpo di richiesta (R-P4:
  // prima le forme, poi le asserzioni).
  it.each([
    ['stringa sconosciuta', 'pippo'],
    ['stringa vuota', ''],
    ['maiuscole', 'DA_COMUNICARE'],
    ['spazio in coda', 'da_comunicare '],
    ['null', null],
    ['undefined', undefined],
    ['numero', 1],
    ['booleano', true],
    ['oggetto', { stato: 'da_comunicare' }],
    ['array', ['da_comunicare']],
    ['chiave di Object.prototype', 'toString'],
  ])('rifiuta %s', (_nome, valore) => {
    expect(isStatoAvviso(valore)).toBe(false)
  })
})

describe('chiudeIlPromemoria — D335: i due modi valgono uguale', () => {
  it('«da_comunicare» NON chiude il promemoria', () => {
    expect(chiudeIlPromemoria('da_comunicare')).toBe(false)
  })

  it('l\'invio dall\'app lo chiude', () => {
    expect(chiudeIlPromemoria('comunicato_dall_app')).toBe(true)
  })

  it('e «l\'ho avvisato di persona» lo chiude ALLO STESSO MODO (D335)', () => {
    // ⚖️ D335 è esplicito: il promemoria si chiude anche a voce, registrando
    // chi e quando. Se questa asserzione cadesse, l'avviso dato di persona
    // resterebbe nel promemoria per sempre.
    expect(chiudeIlPromemoria('comunicato_a_voce')).toBe(true)
  })

  it('ogni stato è o aperto o chiuso: nessun terzo caso', () => {
    for (const s of STATI_AVVISO) expect(typeof chiudeIlPromemoria(s)).toBe('boolean')
    expect(STATI_AVVISO.filter((s) => chiudeIlPromemoria(s))).toHaveLength(STATI_CHIUSI.length)
  })
})

describe('ammetteTestoInviato — D339: si conserva solo il testo MANDATO', () => {
  it('solo l\'invio dall\'app ammette il testo', () => {
    expect(ammetteTestoInviato('comunicato_dall_app')).toBe(true)
  })

  it('l\'avviso dato a voce NON ammette testo: non c\'è un testo mandato', () => {
    expect(ammetteTestoInviato('comunicato_a_voce')).toBe(false)
  })

  it('e la BOZZA su «da_comunicare» non si conserva (D339)', () => {
    expect(ammetteTestoInviato('da_comunicare')).toBe(false)
  })

  it('specchio esatto del CHECK avviso_testo_solo_se_dall_app', () => {
    // Il CHECK vivo è, nelle due direzioni:
    //   (stato =  'comunicato_dall_app' AND testo IS NOT NULL)
    //   OR (stato <> 'comunicato_dall_app' AND testo IS NULL)
    // cioè: ammette il testo se e solo se lo stato è `comunicato_dall_app`.
    const ammessi = STATI_AVVISO.filter((s: StatoAvviso) => ammetteTestoInviato(s))
    expect(ammessi).toEqual(['comunicato_dall_app'])
  })
})
