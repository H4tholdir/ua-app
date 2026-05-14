/**
 * Test per funzioni pure FatturaPA — importate da xml-helpers.ts
 * (il file generate-xml.ts ha 'server-only' e non è importabile in Vitest)
 */
import { describe, it, expect } from 'vitest'
import { xe, fmt2, formatNumeroFattura, validaIdentificativoFiscale } from '@/lib/fattura/xml-helpers'

describe('xe — XML escape', () => {
  it('esegue escape di &', () => {
    expect(xe('Studio D\'Angelo & Figli')).toBe('Studio D&apos;Angelo &amp; Figli')
  })

  it('esegue escape di <>', () => {
    expect(xe('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('esegue escape di apostrofo', () => {
    expect(xe("dell'Allegato")).toBe('dell&apos;Allegato')
  })

  it('ritorna stringa vuota per null/undefined', () => {
    expect(xe(null)).toBe('')
    expect(xe(undefined)).toBe('')
    expect(xe('')).toBe('')
  })

  it('lascia invariati testi senza caratteri speciali', () => {
    expect(xe('Studio Dentistico Rossi')).toBe('Studio Dentistico Rossi')
  })

  it('NON fa double-escape (applicato una sola volta)', () => {
    const raw = 'D\'Angelo'
    const once = xe(raw)
    const twice = xe(once)
    expect(once).toBe('D&apos;Angelo')
    // Se si applicasse due volte: D&amp;apos;Angelo
    expect(twice).not.toBe(once)
  })
})

describe('fmt2 — formattazione numerica FatturaPA', () => {
  it('usa punto come separatore decimale', () => {
    expect(fmt2(100)).toBe('100.00')
    expect(fmt2(77.47)).toBe('77.47')
    expect(fmt2(2)).toBe('2.00')
  })

  it('arrotonda a 2 decimali', () => {
    // JavaScript floating point: 100.005.toFixed(2) = '100.00' (binary precision)
    expect(fmt2(100.126)).toBe('100.13')
    expect(fmt2(0.1 + 0.2)).toBe('0.30')
  })
})

describe('formatNumeroFattura — formato XSD FatturaPA', () => {
  it('usa trattino non slash (XSD vieta /)', () => {
    const numero = formatNumeroFattura(2026, 1)
    expect(numero).not.toContain('/')
    expect(numero).toMatch(/^\d{4}-\d{4}$/)
    expect(numero).toBe('2026-0001')
  })

  it('padda con zeri fino a 4 cifre', () => {
    expect(formatNumeroFattura(2026, 42)).toBe('2026-0042')
    expect(formatNumeroFattura(2026, 1000)).toBe('2026-1000')
  })

  it('lunghezza massima 20 caratteri (limite XSD)', () => {
    const numero = formatNumeroFattura(2026, 9999)
    expect(numero.length).toBeLessThanOrEqual(20)
  })

  it('contiene solo caratteri ammessi da XSD ([a-zA-Z0-9-_])', () => {
    const numero = formatNumeroFattura(2026, 1)
    expect(numero).toMatch(/^[a-zA-Z0-9\-_]+$/)
  })
})

describe('validaIdentificativoFiscale', () => {
  it('non lancia se piva presente', () => {
    expect(() => validaIdentificativoFiscale('12345678901', null, 'Lab')).not.toThrow()
  })

  it('non lancia se cf presente', () => {
    expect(() => validaIdentificativoFiscale(null, 'RSSMRA80A01H703Y', 'Lab')).not.toThrow()
  })

  it('lancia se entrambi mancano', () => {
    expect(() => validaIdentificativoFiscale(null, null, 'Lab')).toThrow('manca P.IVA')
    expect(() => validaIdentificativoFiscale(undefined, undefined, 'Cliente')).toThrow('Cliente')
  })
})
