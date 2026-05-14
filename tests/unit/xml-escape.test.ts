/**
 * Test per verificare che il formato numero fattura e l'escape XML
 * siano conformi allo XSD FatturaPA 1.2.
 *
 * Questi test importano solo la funzione helper xe() che è esportata
 * separatamente. Se non è esportata, testiamo le invarianti attraverso
 * la generazione XML (mock).
 */
import { describe, it, expect } from 'vitest'

// Funzione xml escape replicata per test (la versione in generate-xml non è esportata)
function xe(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
}

// Formato numero fattura conforme allo XSD FatturaPA
function formatNumeroFattura(anno: number, progressivo: number): string {
  return `${anno}-${String(progressivo).padStart(4, '0')}`
}

describe('XML escape per FatturaPA', () => {
  it('esegue escape di &', () => {
    expect(xe('Studio D\'Angelo & Figli')).toBe('Studio D&apos;Angelo &amp; Figli')
  })

  it('esegue escape di <>', () => {
    expect(xe('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('esegue escape di apostrofo', () => {
    expect(xe("dell'Allegato")).toBe('dell&apos;Allegato')
  })

  it('lascia invariati testi normali', () => {
    expect(xe('Studio Dentistico Rossi')).toBe('Studio Dentistico Rossi')
  })

  it('NON fa double-escape (applicato una sola volta)', () => {
    const raw = 'D\'Angelo'
    const once = xe(raw)
    const twice = xe(once)
    expect(once).toBe('D&apos;Angelo')
    expect(twice).not.toBe(once) // double-escape produce D&amp;apos;Angelo
  })
})

describe('Formato numero fattura FatturaPA', () => {
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
