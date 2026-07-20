### Task 1: Helper CSV — `src/lib/utils/csv.ts`

**Files:**
- Create: `src/lib/utils/csv.ts`
- Test: `tests/unit/csv-utils.test.ts`

**Interfaces:**
- Produces: `CSV_BOM: string` · `CSV_SEP: ';'` · `csvCell(val: string | null | undefined): string` · `csvNumIT(n: number | null | undefined, segno?: 1 | -1): string` · `csvRiga(celle: string[]): string`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/csv-utils.test.ts --reporter=dot`
Expected: FAIL — `Cannot find module '@/lib/utils/csv'` (o equivalente resolve error).

- [ ] **Step 3: Write minimal implementation**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/csv-utils.test.ts --reporter=dot`
Expected: PASS (tutti i test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/csv.ts tests/unit/csv-utils.test.ts
git commit -m "feat(export): helper CSV condiviso con escaping anti-injection"
```

---

