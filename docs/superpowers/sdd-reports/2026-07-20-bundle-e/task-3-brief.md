### Task 3: Estrazione `meseBoundaries` — `src/lib/utils/mese.ts`

**Files:**
- Create: `src/lib/utils/mese.ts`
- Modify: `src/lib/pdf/generate-cedolino-tecnico.ts` (rimuovere la funzione privata alle righe 10-20, importare da `@/lib/utils/mese`)
- Test: `tests/unit/mese.test.ts` (+ `tests/unit/generate-cedolino-tecnico.test.ts` esistente DEVE restare verde invariato)

**Interfaces:**
- Produces: `meseBoundaries(mese: string): { from: string; to: string }` — semantica IDENTICA alla privata attuale (from = primo del mese, to = primo del mese successivo, date-only ISO).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mese.test.ts
// Estratta da generate-cedolino-tecnico (Bundle E): confini [from, to) di un
// mese YYYY-MM come date-only ISO — riusata da cedolino singolo e batch.
import { describe, it, expect } from 'vitest'
import { meseBoundaries } from '@/lib/utils/mese'

describe('meseBoundaries', () => {
  it('mese centrale', () => {
    expect(meseBoundaries('2026-05')).toEqual({ from: '2026-05-01', to: '2026-06-01' })
  })
  it('dicembre: to sfora nell anno successivo', () => {
    expect(meseBoundaries('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' })
  })
  it('gennaio', () => {
    expect(meseBoundaries('2026-01')).toEqual({ from: '2026-01-01', to: '2026-02-01' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mese.test.ts --reporter=dot`
Expected: FAIL — modulo inesistente.

- [ ] **Step 3: Write implementation + refactor del chiamante**

```typescript
// src/lib/utils/mese.ts
// Confini [from, to) di un mese "YYYY-MM" come date-only ISO. Estratta da
// generate-cedolino-tecnico per il riuso nel batch cedolini (Bundle E).
export function meseBoundaries(mese: string): { from: string; to: string } {
  const [year, month] = mese.split('-').map(Number)
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to = new Date(Date.UTC(year, month, 1))
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}
```

In `src/lib/pdf/generate-cedolino-tecnico.ts`: eliminare il blocco `// ─── Helpers ───…` con la funzione privata `meseBoundaries` (righe 10-20) e aggiungere in testa agli import:

```typescript
import { meseBoundaries } from '@/lib/utils/mese'
```

- [ ] **Step 4: Run tests to verify green (nuovo + regressione cedolino)**

Run: `npx vitest run tests/unit/mese.test.ts tests/unit/generate-cedolino-tecnico.test.ts --reporter=dot`
Expected: PASS entrambi, zero modifiche al test cedolino esistente.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/mese.ts src/lib/pdf/generate-cedolino-tecnico.ts tests/unit/mese.test.ts
git commit -m "refactor(pdf): estrai meseBoundaries in lib/utils/mese per riuso batch"
```

---

