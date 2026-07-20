// tests/unit/csv-utils.test.ts
// Bundle E (A16): helper CSV unico — quoting condizionale + anti CSV-injection
// (OWASP: celle che iniziano con = + - @ TAB CR prefissate con apostrofo).
import { describe, it, expect } from 'vitest'
import { csvCell, csvNumIT, csvRiga, CSV_SEP, CSV_BOM } from '@/lib/utils/csv'

describe('csvCell', () => {
  it('testo normale: invariato, senza quoting', () => {
    expect(csvCell('Studio Rossi')).toBe('Studio Rossi')
  })
  it('null/undefined → stringa vuota', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })
  it('quota se contiene separatore, apici o newline (apici raddoppiati)', () => {
    expect(csvCell('a;b')).toBe('"a;b"')
    expect(csvCell('dis "x"')).toBe('"dis ""x"""')
    expect(csvCell('a\nb')).toBe('"a\nb"')
  })
  it('anti-formula: = + - @ TAB CR a inizio cella → prefisso apostrofo + quoting', () => {
    expect(csvCell('=SUM(A1)')).toBe(`"'=SUM(A1)"`)
    expect(csvCell('+39 333 1234567')).toBe(`"'+39 333 1234567"`)
    expect(csvCell('-2 monconi')).toBe(`"'-2 monconi"`)
    expect(csvCell('@echo')).toBe(`"'@echo"`)
    expect(csvCell('\tx')).toBe(`"'\tx"`)
  })
  it('carattere formula NON a inizio cella: nessun prefisso', () => {
    expect(csvCell('tel. +39')).toBe('tel. +39')
  })
})

describe('csvNumIT', () => {
  it('due decimali con virgola', () => {
    expect(csvNumIT(122)).toBe('122,00')
    expect(csvNumIT(3.456)).toBe('3,46')
  })
  it('null → 0,00 · segno -1 nega', () => {
    expect(csvNumIT(null)).toBe('0,00')
    expect(csvNumIT(75, -1)).toBe('-75,00')
  })
})

describe('csvRiga', () => {
  it('join con separatore', () => {
    expect(csvRiga(['a', 'b', 'c'])).toBe(`a${CSV_SEP}b${CSV_SEP}c`)
  })
})

describe('costanti', () => {
  it('BOM UTF-8 e separatore Excel IT', () => {
    expect(CSV_BOM).toBe('﻿')
    expect(CSV_SEP).toBe(';')
  })
})
