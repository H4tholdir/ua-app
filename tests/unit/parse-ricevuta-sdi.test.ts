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
})
