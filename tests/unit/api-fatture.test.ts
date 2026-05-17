/**
 * Test delle funzioni pure per FatturaPA usate dalla route API fatture.
 *
 * Funzioni importate da src/lib/fattura/xml-helpers.ts:
 *   xe                        — escape XML
 *   fmt2                      — formato decimale con punto
 *   formatNumeroFattura       — formato numero fattura XSD
 *   validaIdentificativoFiscale — validazione P.IVA/CF obbligatoria
 *
 * calcolaBollo è una funzione inline della route API (non esportata).
 * Viene definita e testata qui per documentare il comportamento
 * normativo (Art. 13 DPR 642/1972, soglia €77,47 strettamente maggiore).
 *
 * I test xe/fmt2/formatNumeroFattura sono complementari rispetto a
 * xml-escape.test.ts: qui si verifica la prospettiva della route API
 * fatture (valori decimali reali, numeri fattura 2026, bollo).
 */

import { describe, it, expect } from 'vitest'
import { xe, fmt2, formatNumeroFattura, validaIdentificativoFiscale } from '@/lib/fattura/xml-helpers'

// ─── calcolaBollo — definizione inline (replica logica della route API) ───────
// Art. 13 DPR 642/1972: bollo €2,00 se imponibile strettamente > €77,47
// Applicabile su fatture con IVA esente (natura N4) come le prestazioni
// odontotecniche (Art. 10 n.18 DPR 633/72).
function calcolaBollo(imponibile: number): number {
  return imponibile > 77.47 ? 2.00 : 0
}

// ─── xe — XML escape (prospettiva route API) ──────────────────────────────────

describe('xe — XML escape (route API fatture)', () => {
  it('lascia invariata una stringa senza caratteri speciali XML', () => {
    expect(xe('Studio Dentistico Rossi')).toBe('Studio Dentistico Rossi')
  })

  it('esegue escape di & in &amp;', () => {
    expect(xe('Opromolla & Figli')).toBe('Opromolla &amp; Figli')
  })

  it('esegue escape di < e > in &lt; e &gt;', () => {
    expect(xe('<protesi>')).toBe('&lt;protesi&gt;')
  })

  it('ritorna stringa vuota per null (dati opzionali mancanti)', () => {
    expect(xe(null)).toBe('')
  })

  it('ritorna stringa vuota per undefined', () => {
    expect(xe(undefined)).toBe('')
  })

  it('ritorna stringa vuota per stringa vuota', () => {
    expect(xe('')).toBe('')
  })
})

// ─── fmt2 — formato decimale FatturaPA ───────────────────────────────────────

describe('fmt2 — formato decimale FatturaPA (route API fatture)', () => {
  it('100 → "100.00" (intero con decimali espliciti)', () => {
    expect(fmt2(100)).toBe('100.00')
  })

  it('usa punto non virgola come separatore (XSD FatturaPA)', () => {
    const result = fmt2(1234.56)
    expect(result).toContain('.')
    expect(result).not.toContain(',')
  })

  it('arrotonda correttamente alla seconda cifra decimale', () => {
    expect(fmt2(100.126)).toBe('100.13')
    expect(fmt2(77.474)).toBe('77.47')
    // Nota: 77.475 in IEEE 754 è 77.4749999... → arrotonda a '77.47' (comportamento noto di toFixed)
    expect(fmt2(77.476)).toBe('77.48')
  })

  it('0.1 + 0.2 → "0.30" (floating point gestito correttamente)', () => {
    expect(fmt2(0.1 + 0.2)).toBe('0.30')
  })

  it('importo bollo €2,00 → "2.00"', () => {
    expect(fmt2(2.00)).toBe('2.00')
  })

  it('soglia bollo €77,47 → "77.47"', () => {
    expect(fmt2(77.47)).toBe('77.47')
  })
})

// ─── formatNumeroFattura — formato XSD FatturaPA ─────────────────────────────

describe('formatNumeroFattura — formato XSD FatturaPA (route API fatture)', () => {
  it('(2026, 1) → "2026-0001" con zero-padding a 4 cifre', () => {
    expect(formatNumeroFattura(2026, 1)).toBe('2026-0001')
  })

  it('usa trattino come separatore (lo slash / non è ammesso da XSD)', () => {
    const numero = formatNumeroFattura(2026, 1)
    expect(numero).not.toContain('/')
    expect(numero).toContain('-')
  })

  it('zero-padding a 4 cifre per progressivi < 1000', () => {
    expect(formatNumeroFattura(2026, 42)).toBe('2026-0042')
    expect(formatNumeroFattura(2026, 999)).toBe('2026-0999')
  })

  it('progressivo a 4 cifre non viene troncato', () => {
    expect(formatNumeroFattura(2026, 1000)).toBe('2026-1000')
    expect(formatNumeroFattura(2026, 9999)).toBe('2026-9999')
  })

  it('lunghezza massima 20 caratteri (limite XSD v1.2)', () => {
    const numero = formatNumeroFattura(2026, 9999)
    expect(numero.length).toBeLessThanOrEqual(20)
  })

  it('contiene solo caratteri ammessi da XSD ([a-zA-Z0-9-_])', () => {
    const numero = formatNumeroFattura(2026, 1)
    expect(numero).toMatch(/^[a-zA-Z0-9\-_]+$/)
  })
})

// ─── calcolaBollo — logica normativa bollo (Art. 13 DPR 642/1972) ────────────

describe('calcolaBollo — bollo €2,00 su fatture esenti IVA', () => {
  it('imponibile > €77,47 → bollo €2,00', () => {
    expect(calcolaBollo(77.48)).toBe(2.00)
    expect(calcolaBollo(100)).toBe(2.00)
    expect(calcolaBollo(5000)).toBe(2.00)
  })

  it('imponibile ≤ €77,47 → nessun bollo (€0)', () => {
    expect(calcolaBollo(77.47)).toBe(0)
    expect(calcolaBollo(77.46)).toBe(0)
    expect(calcolaBollo(50)).toBe(0)
    expect(calcolaBollo(0)).toBe(0)
  })

  it('soglia esatta €77,47 → 0 (strettamente maggiore richiesto)', () => {
    // Art. 13 DPR 642/1972: "superiore a €77,47" — il valore esatto è ESENTE
    expect(calcolaBollo(77.47)).toBe(0)
  })

  it('€77,48 è il primo valore che attiva il bollo', () => {
    expect(calcolaBollo(77.47)).toBe(0)
    expect(calcolaBollo(77.48)).toBe(2.00)
  })

  it('il bollo è fisso €2,00 indipendentemente dall\'importo', () => {
    // Non è proporzionale — è fisso per ogni documento
    expect(calcolaBollo(1000)).toBe(calcolaBollo(200))
    expect(calcolaBollo(1000)).toBe(2.00)
  })

  it('imponibile negativo → nessun bollo (caso difensivo)', () => {
    // Non dovrebbe verificarsi in produzione, ma il comportamento è safe
    expect(calcolaBollo(-1)).toBe(0)
  })
})

// ─── validaIdentificativoFiscale — XSD FatturaPA ─────────────────────────────

describe('validaIdentificativoFiscale — XSD FatturaPA (route API fatture)', () => {
  it('non lancia se P.IVA presente (cedente lab con partita IVA)', () => {
    expect(() =>
      validaIdentificativoFiscale('03508740655', null, 'Cedente')
    ).not.toThrow()
  })

  it('non lancia se Codice Fiscale presente (cessionario dentista persona fisica)', () => {
    expect(() =>
      validaIdentificativoFiscale(null, 'RSSMRA80A01H703Y', 'Cessionario')
    ).not.toThrow()
  })

  it('non lancia se entrambi P.IVA e CF sono presenti', () => {
    expect(() =>
      validaIdentificativoFiscale('03508740655', 'RSSMRA80A01H703Y', 'Cedente')
    ).not.toThrow()
  })

  it('lancia se entrambi null — FatturaPA non generabile (XSD violation)', () => {
    expect(() =>
      validaIdentificativoFiscale(null, null, 'Lab')
    ).toThrow('manca P.IVA')
  })

  it('lancia se entrambi undefined', () => {
    expect(() =>
      validaIdentificativoFiscale(undefined, undefined, 'Cliente')
    ).toThrow('Cliente')
  })

  it('il messaggio di errore include il label per diagnostica', () => {
    expect(() =>
      validaIdentificativoFiscale(null, null, 'Cessionario Dentista')
    ).toThrow('Cessionario Dentista')
  })
})
