import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseRicevutaSdI, RicevutaNonValidaError } from '@/lib/fattura/ricevute/parse-ricevuta-sdi'

const fx = (n: string) => readFileSync(`tests/fixtures/ricevute-sdi/${n}`)

describe('parseRicevutaSdI', () => {
  it('RC: tipo, NomeFile, IdentificativoSdI', () => {
    const r = parseRicevutaSdI(fx('rc-valida.xml'))
    expect(r.tipo).toBe('RC')
    expect(r.nomeFileFattura).toMatch(/^IT.*\.xml$/)
    expect(r.identificativoSdI.length).toBeGreaterThan(0)
    expect(r.dataOraRicezione).toBe('2026-07-10T09:30:00Z')
    expect(r.esitoCommittente).toBeNull()
    expect(r.listaErrori).toEqual([])
  })

  it('NS: ListaErrori integrale', () => {
    const r = parseRicevutaSdI(fx('ns-valida.xml'))
    expect(r.tipo).toBe('NS')
    expect(r.listaErrori).toHaveLength(2)
    expect(r.listaErrori[0]).toHaveProperty('codice')
    expect(r.listaErrori[0]).toEqual({ codice: '00100', descrizione: 'Certificato di firma scaduto' })
    expect(r.listaErrori[1]).toEqual({ codice: '00405', descrizione: 'Fattura duplicata' })
  })

  it('MC: tipo e campi chiave', () => {
    const r = parseRicevutaSdI(fx('mc-valida.xml'))
    expect(r.tipo).toBe('MC')
    expect(r.nomeFileFattura).toBe('IT01234567890_11111.xml')
    expect(r.identificativoSdI).toBe('111')
  })

  it('NE EC01: esitoCommittente', () => {
    const r = parseRicevutaSdI(fx('ne-ec01.xml'))
    expect(r.tipo).toBe('NE')
    expect(r.esitoCommittente).toBe('EC01')
  })

  it('NE EC02: esitoCommittente', () => {
    expect(parseRicevutaSdI(fx('ne-ec02.xml')).esitoCommittente).toBe('EC02')
  })

  it('DT: tipo riconosciuto (fixture ufficiale fatturapa.gov.it, derivata)', () => {
    const r = parseRicevutaSdI(fx('dt-valida.xml'))
    expect(r.tipo).toBe('DT')
    expect(r.nomeFileFattura).toBe('IT01234567890_11111.xml')
    expect(r.identificativoSdI).toBe('111')
    // NotificaDecorrenzaTermini_Type non include DataOraRicezione (MessaggiTypes_v1.1.xsd)
    expect(r.dataOraRicezione).toBeNull()
  })

  it('AT: tipo riconosciuto (fixture ufficiale fatturapa.gov.it, derivata)', () => {
    const r = parseRicevutaSdI(fx('at-valida.xml'))
    expect(r.tipo).toBe('AT')
    expect(r.nomeFileFattura).toBe('IT01234567890_11111.xml')
    expect(r.identificativoSdI).toBe('111')
    expect(r.dataOraRicezione).toBe('2026-07-10T09:30:00')
  })

  it('malformata/non-ricevuta/XXE → RicevutaNonValidaError', () => {
    for (const f of ['malformata.xml', 'non-ricevuta.xml', 'xxe-payload.xml'])
      expect(() => parseRicevutaSdI(fx(f))).toThrow(RicevutaNonValidaError)
  })

  it('XXE: entità esterna NON risolta (payload rigettato prima del parse)', () => {
    try {
      parseRicevutaSdI(fx('xxe-payload.xml'))
      expect.unreachable('doveva lanciare RicevutaNonValidaError')
    } catch (err) {
      expect(err).toBeInstanceOf(RicevutaNonValidaError)
      // non deve mai comparire contenuto risolto da file:///etc/passwd
      expect(String((err as Error).message)).not.toMatch(/root:.*:0:0:/)
    }
  })

  it('oversize → RicevutaNonValidaError', () => {
    expect(() => parseRicevutaSdI(Buffer.alloc(1_048_577, 0x20))).toThrow(RicevutaNonValidaError)
  })

  describe('validazione namespace root (fail-closed)', () => {
    const SDI_NS = 'http://www.fatturapa.gov.it/sdi/messaggi/v1.0'
    const body =
      '<IdentificativoSdI>111</IdentificativoSdI><NomeFile>IT01234567890_11111.xml</NomeFile>'

    it('local name giusto ma namespace attacker → RicevutaNonValidaError', () => {
      const xml = Buffer.from(
        `<evil:RicevutaConsegna xmlns:evil="http://attacker.example/x">${body}</evil:RicevutaConsegna>`
      )
      expect(() => parseRicevutaSdI(xml)).toThrow(RicevutaNonValidaError)
      expect(() => parseRicevutaSdI(xml)).toThrow(/namespace root non valido/)
    })

    it('prefix non dichiarato → RicevutaNonValidaError', () => {
      const xml = Buffer.from(`<zzz:RicevutaConsegna>${body}</zzz:RicevutaConsegna>`)
      expect(() => parseRicevutaSdI(xml)).toThrow(RicevutaNonValidaError)
    })

    it('root senza alcun namespace → RicevutaNonValidaError', () => {
      const xml = Buffer.from(`<RicevutaConsegna>${body}</RicevutaConsegna>`)
      expect(() => parseRicevutaSdI(xml)).toThrow(RicevutaNonValidaError)
    })

    it('namespace di default corretto senza prefix → accettato (namespace-equivalente agli ufficiali)', () => {
      const xml = Buffer.from(`<RicevutaConsegna xmlns="${SDI_NS}">${body}</RicevutaConsegna>`)
      const r = parseRicevutaSdI(xml)
      expect(r.tipo).toBe('RC')
      expect(r.nomeFileFattura).toBe('IT01234567890_11111.xml')
    })

    it('prefix diverso da types: ma namespace canonico → accettato (il prefix è arbitrario)', () => {
      const xml = Buffer.from(
        `<ns3:RicevutaConsegna xmlns:ns3="${SDI_NS}">${body}</ns3:RicevutaConsegna>`
      )
      expect(parseRicevutaSdI(xml).tipo).toBe('RC')
    })
  })

  it('difesa in profondità processEntities:false — entità senza DOCTYPE resta letterale, mai risolta', () => {
    // Riferimento a entità SENZA dichiarazione DOCTYPE/ENTITY: sfugge al
    // pre-check regex (che matcha solo `<!DOCTYPE`/`<!ENTITY`) e raggiunge il
    // parser. Con processEntities:false NULLA viene risolto o decodificato —
    // perfino &amp; resta letterale (con processEntities:true diventerebbe
    // "&"): la non-decodifica è la prova osservabile che l'opzione è attiva.
    const xml = Buffer.from(
      '<types:RicevutaConsegna xmlns:types="http://www.fatturapa.gov.it/sdi/messaggi/v1.0">' +
        '<IdentificativoSdI>111</IdentificativoSdI>' +
        '<NomeFile>IT_&xxe;_&amp;_x.xml</NomeFile>' +
        '</types:RicevutaConsegna>'
    )
    const r = parseRicevutaSdI(xml)
    expect(r.nomeFileFattura).toBe('IT_&xxe;_&amp;_x.xml')
  })
})
