// src/lib/utils/csv.ts
// Bundle E (A16): helper CSV unico per gli export — separatore/BOM Excel IT +
// escaping anti CSV-injection (OWASP): una cella che inizia con = + - @ TAB CR
// verrebbe interpretata come formula da Excel/LibreOffice → prefisso apostrofo.
// I numeri passano da csvNumIT (mai da csvCell): lì il segno meno è legittimo
// perché il contenuto è generato da toFixed, non da input utente.
export const CSV_BOM = '﻿'
export const CSV_SEP = ';'

const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(val: string | null | undefined): string {
  const originale = val ?? ''
  let s = originale
  if (FORMULA_START.test(s)) s = `'${s}`
  if (s !== originale || /[";\n\r]/.test(s) || s.includes(CSV_SEP)) {
    s = `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function csvNumIT(n: number | null | undefined, segno: 1 | -1 = 1): string {
  return ((n ?? 0) * segno).toFixed(2).replace('.', ',')
}

export function csvRiga(celle: string[]): string {
  return celle.join(CSV_SEP)
}
