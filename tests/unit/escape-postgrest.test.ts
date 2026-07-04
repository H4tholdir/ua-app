import { describe, expect, it } from 'vitest'
import { pgrestQuote } from '@/lib/utils/escape-postgrest'

describe('pgrestQuote', () => {
  it('racchiude il valore tra doppi apici (sintassi PostgREST per valori letterali)', () => {
    expect(pgrestQuote('CNC')).toBe('"CNC"')
  })

  it('lascia intatta una virgola — non deve più spezzare il parsing di .or()', () => {
    expect(pgrestQuote('Rossi, Mario')).toBe('"Rossi, Mario"')
  })

  it('lascia intatte le parentesi', () => {
    expect(pgrestQuote('Studio (Roma)')).toBe('"Studio (Roma)"')
  })

  it('lascia intatti punto e due punti', () => {
    expect(pgrestQuote('CNC.TitCer:v2')).toBe('"CNC.TitCer:v2"')
  })

  it('escapa le doppie virgolette interne', () => {
    expect(pgrestQuote('Lab "Sorriso"')).toBe('"Lab \\"Sorriso\\""')
  })

  it('escapa il backslash prima di escapare le virgolette (evita un doppio escape errato)', () => {
    expect(pgrestQuote('a\\b')).toBe('"a\\\\b"')
  })

  it('preserva il wildcard % del pattern ilike se già incluso nel valore', () => {
    expect(pgrestQuote('%CNC%')).toBe('"%CNC%"')
  })

  it('stringa vuota → coppia di doppi apici', () => {
    expect(pgrestQuote('')).toBe('""')
  })
})
