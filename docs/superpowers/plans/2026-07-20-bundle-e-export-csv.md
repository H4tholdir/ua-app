# Bundle E — Export CSV lavori + cedolini batch (A16) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** due nuove route CSV (`GET /api/lavori/export`, `GET /api/tecnici/cedolini-batch`) + helper CSV/paginazione condivisi + retrofit anti-injection e paginazione su `fatture/export`.

**Architecture:** pattern `fatture/export/route.ts` (auth via `getFreshLabContext`, service client con filtro `laboratorio_id`, CSV BOM+`;` per Excel IT). Helper puri in `src/lib/utils/` (csv, paginate, mese). Nessuna migration, nessuna UI.

**Tech Stack:** Next.js 16 App Router (route handlers), supabase-js (PostgREST), Vitest (`tests/unit/`, jsdom, mock hoisted).

**Spec di riferimento (LEGGERLA PRIMA):** `docs/superpowers/specs/2026-07-20-bundle-e-export-csv-design.md`

## Global Constraints

- Lavorare nel worktree del bundle (creato con superpowers:using-git-worktrees), branch dedicata.
- MAI committare senza test verdi; ogni task termina con commit.
- Convenzioni commit: `feat(export): …`, `test(export): …`, `refactor(pdf): …`.
- Nessun `duration` inline, nessuna UI, nessuna migration in questo bundle.
- Comandi verifica: `npx vitest run tests/unit/<file> --reporter=dot` per il singolo file; FASE 7 finale: `npx tsc --noEmit` + `npx vitest run` + `npx next build`.
- I nomi ruolo sono `titolare`, `tecnico`, `front_desk`, `admin_rete` (MAI `admin`).
- La matrice N13 consente i GET a `sospeso`/`scaduto`; `blacklist` è terminale anche sui GET.

---

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

### Task 2: Helper paginazione — `src/lib/utils/paginate.ts`

**Files:**
- Create: `src/lib/utils/paginate.ts`
- Test: `tests/unit/paginate.test.ts`

**Interfaces:**
- Produces: `type PageResult<T> = { data: T[] | null; error: { message: string } | null }` · `fetchAllPages<T>(getPage: (from: number, to: number) => PromiseLike<PageResult<T>>, pageSize?: number): Promise<{ data: T[]; error: string | null }>`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/paginate.test.ts
// Bundle E: PostgREST (db-max-rows=1000 su Supabase) tronca a 1000 righe in
// silenzio — fetchAllPages legge a pagine finché una torna corta, fail-closed.
import { describe, it, expect, vi } from 'vitest'
import { fetchAllPages } from '@/lib/utils/paginate'

const righe = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: offset + i }))

describe('fetchAllPages', () => {
  it('una pagina corta: una sola chiamata, range 0-999', async () => {
    const getPage = vi.fn(async () => ({ data: righe(3), error: null }))
    const res = await fetchAllPages(getPage)
    expect(res).toEqual({ data: righe(3), error: null })
    expect(getPage).toHaveBeenCalledTimes(1)
    expect(getPage).toHaveBeenCalledWith(0, 999)
  })

  it('pagina piena da 1000 → continua: 1000+1000+2 = 2002 righe, 3 chiamate', async () => {
    const getPage = vi.fn(async (from: number) => {
      if (from === 0) return { data: righe(1000, 0), error: null }
      if (from === 1000) return { data: righe(1000, 1000), error: null }
      return { data: righe(2, 2000), error: null }
    })
    const res = await fetchAllPages(getPage)
    expect(res.error).toBeNull()
    expect(res.data).toHaveLength(2002)
    expect(res.data[2001]).toEqual({ id: 2001 })
    expect(getPage).toHaveBeenNthCalledWith(3, 2000, 2999)
  })

  it('pagina esattamente vuota dopo una piena: si ferma senza errore', async () => {
    const getPage = vi.fn(async (from: number) =>
      from === 0 ? { data: righe(1000), error: null } : { data: [], error: null }
    )
    const res = await fetchAllPages(getPage)
    expect(res.data).toHaveLength(1000)
    expect(getPage).toHaveBeenCalledTimes(2)
  })

  it('errore su una pagina: fail-closed, data vuota + messaggio', async () => {
    const getPage = vi.fn(async (from: number) =>
      from === 0
        ? { data: righe(1000), error: null }
        : { data: null, error: { message: 'boom' } }
    )
    const res = await fetchAllPages(getPage)
    expect(res).toEqual({ data: [], error: 'boom' })
  })

  it('pageSize custom rispettato', async () => {
    const getPage = vi.fn(async () => ({ data: righe(1), error: null }))
    await fetchAllPages(getPage, 50)
    expect(getPage).toHaveBeenCalledWith(0, 49)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/paginate.test.ts --reporter=dot`
Expected: FAIL — modulo inesistente.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/utils/paginate.ts
// Bundle E: PostgREST (db-max-rows, default Supabase = 1000) tronca ogni
// risposta a 1000 righe in silenzio. Gli export leggono a pagine finché una
// torna corta. Fail-closed: al primo errore si ferma e lo propaga — un CSV
// parziale silenzioso è peggio di un errore.
export type PageResult<T> = { data: T[] | null; error: { message: string } | null }

export async function fetchAllPages<T>(
  getPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000
): Promise<{ data: T[]; error: string | null }> {
  const all: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getPage(from, from + pageSize - 1)
    if (error) return { data: [], error: error.message }
    const page = data ?? []
    all.push(...page)
    if (page.length < pageSize) break
  }
  return { data: all, error: null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/paginate.test.ts --reporter=dot`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/paginate.ts tests/unit/paginate.test.ts
git commit -m "feat(export): fetchAllPages — paginazione fail-closed oltre il cap PostgREST"
```

---

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

### Task 4: `GET /api/lavori/export` + esenzione N13

**Files:**
- Create: `src/app/api/lavori/export/route.ts`
- Modify: `src/lib/supabase/lab-guard-exempt-routes.ts` (aggiungere UNA riga sotto il commento «Export GDPR/portabilità», accanto a `fatture/export`)
- Test: `tests/unit/lavori-export-route.test.ts`

**Interfaces:**
- Consumes: Task 1 (`CSV_BOM`, `csvCell`, `csvRiga`), Task 2 (`fetchAllPages`), `annoRoma()` da `@/lib/utils/data-roma`, `getFreshLabContext` da `@/lib/supabase/lab-context`, `getServiceClient` da `@/lib/supabase/server-service`.
- Produces: route handler `GET(req: Request): Promise<NextResponse>`; CSV con 15 colonne (vedi spec §2).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/lavori-export-route.test.ts
// Bundle E (A16): export CSV lavori — esente N13 (portabilità) con blocco
// blacklist esplicito; scoping tenant verificato (riserva advisor).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET } from '../../src/app/api/lavori/export/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const LAVORO_BASE = {
  numero_lavoro: 'L-2026-0001', created_at: '2026-03-01T10:00:00.000Z',
  stato: 'consegnato', priorita: 'normale', tipo_dispositivo: 'corona',
  descrizione: 'Corona zirconia 1.6', paziente_nome_snapshot: 'M.R.',
  data_consegna_prevista: '2026-03-10', data_consegna_effettiva: '2026-03-09',
  conformato: true, incluso_in_fattura: false, spedizione_stato: null,
  spedizione_tracking: null,
  cliente: { nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' },
  tecnico: { nome: 'Luca', cognome: 'Bianchi' },
}

let lavori: Array<Record<string, unknown>>
let pagine: Array<Array<Record<string, unknown>>> | null
let chiamateEq: Array<[string, unknown]>
let chiamateGte: Array<[string, unknown]>
let chiamateLt: Array<[string, unknown]>
let chiamateOrder: string[]

function setupBuilder() {
  chiamateEq = []; chiamateGte = []; chiamateLt = []; chiamateOrder = []
  let pagina = 0
  const builder: Record<string, unknown> = {}
  Object.assign(builder, {
    select: () => builder,
    eq: (c: string, v: unknown) => { chiamateEq.push([c, v]); return builder },
    is: () => builder,
    gte: (c: string, v: unknown) => { chiamateGte.push([c, v]); return builder },
    lt: (c: string, v: unknown) => { chiamateLt.push([c, v]); return builder },
    order: (c: string) => { chiamateOrder.push(c); return builder },
    range: async () => {
      if (pagine) {
        const data = pagine[pagina] ?? []
        pagina += 1
        return { data, error: null }
      }
      return { data: lavori, error: null }
    },
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') return builder
    throw new Error(`tabella inattesa: ${table}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  lavori = [LAVORO_BASE]
  pagine = null
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  setupBuilder()
})

describe('GET /api/lavori/export — auth e guardie', () => {
  it('401 senza utente', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.status).toBe(401)
  })
  it('403 senza laboratorio', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.status).toBe(403)
  })
  it('403 blacklist (terminale anche su route esente)', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { ...CONTEXT.lab, stato: 'blacklist' },
    })
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.status).toBe(403)
  })
  it('200 con lab sospeso (esente N13: portabilità aperta)', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { ...CONTEXT.lab, stato: 'sospeso' },
    })
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/lavori/export — scoping tenant (riserva advisor)', () => {
  it('la query filtra SEMPRE per laboratorio_id del context', async () => {
    await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    expect(chiamateEq).toContainEqual(['laboratorio_id', LAB_ID])
  })
})

describe('GET /api/lavori/export — CSV', () => {
  it('header 15 colonne + riga dati con cliente=studio e booleani Sì/No', async () => {
    const res = await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="lavori-2026.csv"')
    const [header, riga] = (await res.text()).split('\n')
    expect(header).toContain('Numero Lavoro')
    expect(header).toContain('Tracking')
    expect(header.split(';')).toHaveLength(15)
    expect(riga).toContain('L-2026-0001')
    expect(riga).toContain('2026-03-01')       // created_at → date-only
    expect(riga).toContain('Studio Rossi')      // studio_nome vince su nome/cognome
    expect(riga).toContain('Bianchi Luca')      // tecnico cognome+nome
    expect(riga).toContain('Sì')                // conformato
  })
  it('anti CSV-injection: descrizione che inizia con = viene neutralizzata', async () => {
    lavori = [{ ...LAVORO_BASE, descrizione: '=SUM(A1:A9)' }]
    const res = await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    const [, riga] = (await res.text()).split('\n')
    expect(riga).toContain(`"'=SUM(A1:A9)"`)
    expect(riga).not.toContain(';=SUM')
  })
  it('cella con separatore: quotata', async () => {
    lavori = [{ ...LAVORO_BASE, descrizione: 'ponte; 3 elementi' }]
    const res = await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    const [, riga] = (await res.text()).split('\n')
    expect(riga).toContain('"ponte; 3 elementi"')
  })
})

describe('GET /api/lavori/export — anno', () => {
  it('default = annoRoma() (31/12 23:30 UTC → anno nuovo a Roma)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="lavori-2027.csv"')
    expect(chiamateGte).toContainEqual(['created_at', '2027-01-01'])
    expect(chiamateLt).toContainEqual(['created_at', '2028-01-01'])
  })
  it('year malformato → default annoRoma()', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    const res = await GET(new Request('http://localhost/api/lavori/export?year=abcd'))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="lavori-2026.csv"')
  })
})

describe('GET /api/lavori/export — paginazione', () => {
  it('1000+2 righe su due pagine: tutte nel CSV, ordinamento con tiebreaker id', async () => {
    const mille = Array.from({ length: 1000 }, (_, i) => ({
      ...LAVORO_BASE, numero_lavoro: `L-${String(i).padStart(4, '0')}`,
    }))
    pagine = [mille, [{ ...LAVORO_BASE, numero_lavoro: 'L-ULTIMO-1' }, { ...LAVORO_BASE, numero_lavoro: 'L-ULTIMO-2' }]]
    const res = await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    const righe = (await res.text()).split('\n')
    expect(righe).toHaveLength(1 + 1002)
    expect(righe[1002]).toContain('L-ULTIMO-2')
    expect(chiamateOrder).toEqual(expect.arrayContaining(['created_at', 'id']))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/lavori-export-route.test.ts --reporter=dot`
Expected: FAIL — route inesistente.

- [ ] **Step 3: Write the route + exemption**

```typescript
// src/app/api/lavori/export/route.ts
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { annoRoma } from '@/lib/utils/data-roma'
import { CSV_BOM, csvCell, csvRiga } from '@/lib/utils/csv'
import { fetchAllPages, type PageResult } from '@/lib/utils/paginate'

type LavoroExportRow = {
  numero_lavoro: string | null
  created_at: string | null
  stato: string | null
  priorita: string | null
  tipo_dispositivo: string | null
  descrizione: string | null
  paziente_nome_snapshot: string | null
  data_consegna_prevista: string | null
  data_consegna_effettiva: string | null
  conformato: boolean | null
  incluso_in_fattura: boolean | null
  spedizione_stato: string | null
  spedizione_tracking: string | null
  cliente: { nome: string | null; cognome: string | null; studio_nome: string | null } | null
  tecnico: { nome: string | null; cognome: string | null } | null
}

export async function GET(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // N13: route ESENTE dalla guard (export portabilità, aperto a
  // sospeso/scaduto come fatture/export) — blacklist resta terminale.
  if (context.lab?.stato === 'blacklist') {
    return NextResponse.json({ error: 'Account disabilitato' }, { status: 403 })
  }

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  // ── Parametri ─────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year') ?? ''
  const year = /^\d{4}$/.test(yearParam) ? Number(yearParam) : annoRoma()

  // ── Fetch (a pagine: PostgREST tronca a 1000 righe in silenzio) ───────────
  const { data: lavori, error } = await fetchAllPages<LavoroExportRow>(
    (from, to) =>
      svc
        .from('lavori')
        .select(
          `
          numero_lavoro, created_at, stato, priorita, tipo_dispositivo,
          descrizione, paziente_nome_snapshot, data_consegna_prevista,
          data_consegna_effettiva, conformato, incluso_in_fattura,
          spedizione_stato, spedizione_tracking,
          cliente:clienti(nome, cognome, studio_nome),
          tecnico:tecnici(nome, cognome)
        `
        )
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${year + 1}-01-01`)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<LavoroExportRow>>
  )
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  // ── Genera CSV ────────────────────────────────────────────────────────────
  const header = csvRiga([
    'Numero Lavoro', 'Data Creazione', 'Stato', 'Priorità', 'Tipo Dispositivo',
    'Descrizione', 'Cliente', 'Paziente', 'Tecnico', 'Consegna Prevista',
    'Consegna Effettiva', 'Conformato', 'Fatturato', 'Spedizione', 'Tracking',
  ])

  const rows = lavori.map((l) => {
    const cliente = l.cliente
      ? l.cliente.studio_nome || [l.cliente.cognome, l.cliente.nome].filter(Boolean).join(' ')
      : ''
    const tecnico = l.tecnico
      ? [l.tecnico.cognome, l.tecnico.nome].filter(Boolean).join(' ')
      : ''
    return csvRiga([
      csvCell(l.numero_lavoro),
      l.created_at?.split('T')[0] ?? '',
      csvCell(l.stato),
      csvCell(l.priorita),
      csvCell(l.tipo_dispositivo),
      csvCell(l.descrizione),
      csvCell(cliente),
      csvCell(l.paziente_nome_snapshot),
      csvCell(tecnico),
      l.data_consegna_prevista?.split('T')[0] ?? '',
      l.data_consegna_effettiva?.split('T')[0] ?? '',
      l.conformato ? 'Sì' : 'No',
      l.incluso_in_fattura ? 'Sì' : 'No',
      csvCell(l.spedizione_stato),
      csvCell(l.spedizione_tracking),
    ])
  })

  const csv = CSV_BOM + [header, ...rows].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lavori-${year}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
```

In `src/lib/supabase/lab-guard-exempt-routes.ts`, nel blocco esistente «Export GDPR/portabilità», aggiungere la riga:

```typescript
  // Export GDPR/portabilità: canale in-band ratificato, resta aperto
  'app/api/fatture/export/route.ts',
  'app/api/lavori/export/route.ts',
```

- [ ] **Step 4: Run tests (nuovo + guardia statica)**

Run: `npx vitest run tests/unit/lavori-export-route.test.ts tests/unit/lab-guard-static.test.ts --reporter=dot`
Expected: PASS entrambi (la guardia statica accetta l'esenzione e trova il file).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/lavori/export/route.ts src/lib/supabase/lab-guard-exempt-routes.ts tests/unit/lavori-export-route.test.ts
git commit -m "feat(export): GET /api/lavori/export — CSV annuale lavori (A16)"
```

---

### Task 5: `GET /api/tecnici/cedolini-batch`

**Files:**
- Create: `src/app/api/tecnici/cedolini-batch/route.ts`
- Test: `tests/unit/cedolini-batch-route.test.ts`

**Interfaces:**
- Consumes: Task 1 (`CSV_BOM`, `csvCell`, `csvNumIT`, `csvRiga`), Task 2 (`fetchAllPages`, `PageResult`), Task 3 (`meseBoundaries`), `oggiRomaISO` da `@/lib/utils/data-roma`, `assertLabOperativo` da `@/lib/supabase/lab-guard`.
- Produces: route handler `GET(req: Request)`; CSV 5 colonne `Tecnico · Voce Listino · Quantità · Compenso Unitario (€) · Compenso Totale (€)`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/cedolini-batch-route.test.ts
// Bundle E (A16): cedolini di tutto il lab in un CSV — GUARDED N13,
// RBAC solo titolare/admin_rete (espone i compensi di TUTTI i tecnici).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET } from '../../src/app/api/tecnici/cedolini-batch/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const riga = (tecnico: { id: string; nome: string; cognome: string }, voce: string, cu: number, quantita = 1) => ({
  quantita,
  lavori: { tecnico_id: tecnico.id, tecnici: { nome: tecnico.nome, cognome: tecnico.cognome } },
  listino: { nome: voce, compenso_tecnico: cu },
})
const ROSSI = { id: 'tec-1', nome: 'Mario', cognome: 'Rossi' }
const VERDI = { id: 'tec-2', nome: 'Anna', cognome: 'Verdi' }

let righe: Array<Record<string, unknown>>
let chiamateEq: Array<[string, unknown]>
let chiamateGte: Array<[string, unknown]>
let chiamateLt: Array<[string, unknown]>

function setupBuilder() {
  chiamateEq = []; chiamateGte = []; chiamateLt = []
  const builder: Record<string, unknown> = {}
  Object.assign(builder, {
    select: () => builder,
    eq: (c: string, v: unknown) => { chiamateEq.push([c, v]); return builder },
    gte: (c: string, v: unknown) => { chiamateGte.push([c, v]); return builder },
    lt: (c: string, v: unknown) => { chiamateLt.push([c, v]); return builder },
    not: () => builder,
    order: () => builder,
    range: async () => ({ data: righe, error: null }),
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori_lavorazioni') return builder
    throw new Error(`tabella inattesa: ${table}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  righe = []
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  setupBuilder()
})

describe('GET /api/tecnici/cedolini-batch — auth, guard N13, RBAC', () => {
  it('401 senza utente', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(401)
  })
  it('403 senza laboratorio', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(403)
  })
  it('403 blacklist (guard N13, terminale anche sui GET)', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { ...CONTEXT.lab, stato: 'blacklist' },
    })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(403)
  })
  it('200 con lab sospeso (matrice N13: GET in sola lettura consentito)', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { ...CONTEXT.lab, stato: 'sospeso' },
    })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(200)
  })
  it.each(['tecnico', 'front_desk'])('403 per ruolo %s', async (ruolo) => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, ruolo })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(403)
  })
  it('200 per admin_rete', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, ruolo: 'admin_rete' })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/tecnici/cedolini-batch — scoping tenant', () => {
  it('filtra per laboratorio_id su tabella E su lavori embedded', async () => {
    await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-05'))
    expect(chiamateEq).toContainEqual(['laboratorio_id', LAB_ID])
    expect(chiamateEq).toContainEqual(['lavori.laboratorio_id', LAB_ID])
    expect(chiamateEq).toContainEqual(['lavori.stato', 'consegnato'])
  })
})

describe('GET /api/tecnici/cedolini-batch — CSV e aggregazione', () => {
  it('aggrega per tecnico × voce, ordina per cognome poi voce, totali giusti', async () => {
    righe = [
      riga(VERDI, 'Corona zirconia', 12, 2),
      riga(ROSSI, 'Scheletrato', 30, 1),
      riga(VERDI, 'Corona zirconia', 12, 3),
      riga(ROSSI, 'Corona zirconia', 12, 1),
    ]
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-05'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="cedolini-2026-05.csv"')
    const testo = await res.text()
    const [header, ...dati] = testo.split('\n')
    expect(header.split(';')).toHaveLength(5)
    expect(dati).toHaveLength(3)
    expect(dati[0]).toBe('Rossi Mario;Corona zirconia;1;12,00;12,00')
    expect(dati[1]).toBe('Rossi Mario;Scheletrato;1;30,00;30,00')
    expect(dati[2]).toBe('Verdi Anna;Corona zirconia;5;12,00;60,00')
  })
  it('nessuna lavorazione nel mese: solo header', async () => {
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-05'))
    const testo = await res.text()
    expect(testo.split('\n')).toHaveLength(1)
  })
  it('anti CSV-injection sul nome voce listino', async () => {
    righe = [riga(ROSSI, '=HYPERLINK("http://evil")', 10, 1)]
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-05'))
    const testo = await res.text()
    expect(testo).toContain(`'=HYPERLINK`)
  })
})

describe('GET /api/tecnici/cedolini-batch — mese', () => {
  it('mese esplicito: confini [from, to) corretti', async () => {
    await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-12'))
    expect(chiamateGte).toContainEqual(['lavori.data_consegna_effettiva', '2026-12-01'])
    expect(chiamateLt).toContainEqual(['lavori.data_consegna_effettiva', '2027-01-01'])
  })
  it('default = mese corrente Europe/Rome (31/12 23:30 UTC → gennaio nuovo anno)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="cedolini-2027-01.csv"')
  })
  it('mese malformato → default', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=maggio'))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="cedolini-2026-06.csv"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cedolini-batch-route.test.ts --reporter=dot`
Expected: FAIL — route inesistente.

- [ ] **Step 3: Write the route**

```typescript
// src/app/api/tecnici/cedolini-batch/route.ts
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { oggiRomaISO } from '@/lib/utils/data-roma'
import { meseBoundaries } from '@/lib/utils/mese'
import { CSV_BOM, csvCell, csvNumIT, csvRiga } from '@/lib/utils/csv'
import { fetchAllPages, type PageResult } from '@/lib/utils/paginate'

type RigaBatch = {
  quantita: number
  lavori: {
    tecnico_id: string | null
    tecnici: { nome: string | null; cognome: string | null } | null
  } | null
  listino: { nome: string; compenso_tecnico: number | null } | null
}

export async function GET(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'GET')
  if (guard) return guard

  // ── RBAC: il batch espone i compensi di TUTTI i tecnici ───────────────────
  // (il singolo tecnico usa GET /api/tecnici/[id]/cedolino)
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  // ── Parametri ─────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const meseParam = searchParams.get('mese') ?? ''
  const mese = /^\d{4}-\d{2}$/.test(meseParam) ? meseParam : oggiRomaISO().slice(0, 7)
  const { from: dal, to: al } = meseBoundaries(mese)

  // ── Fetch (a pagine, tiebreaker id) ───────────────────────────────────────
  const { data: righe, error } = await fetchAllPages<RigaBatch>(
    (from, to) =>
      svc
        .from('lavori_lavorazioni')
        .select(
          `
          quantita,
          lavori!inner(tecnico_id, tecnici(nome, cognome), stato, laboratorio_id, data_consegna_effettiva),
          listino!inner(nome, compenso_tecnico)
        `
        )
        .eq('laboratorio_id', labId)
        .eq('lavori.laboratorio_id', labId)
        .eq('lavori.stato', 'consegnato')
        .gte('lavori.data_consegna_effettiva', dal)
        .lt('lavori.data_consegna_effettiva', al)
        .not('lavori.tecnico_id', 'is', null)
        .not('listino.compenso_tecnico', 'is', null)
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<RigaBatch>>
  )
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  // ── Aggregazione per tecnico × voce listino ───────────────────────────────
  type Voce = { tecnico: string; voce: string; quantita: number; compensoUnitario: number }
  const agg = new Map<string, Voce>()
  for (const r of righe) {
    const tecnicoId = r.lavori?.tecnico_id
    const voce = r.listino?.nome
    if (!tecnicoId || !voce) continue
    const tecnico =
      [r.lavori?.tecnici?.cognome, r.lavori?.tecnici?.nome].filter(Boolean).join(' ') || tecnicoId
    const key = `${tecnicoId} ${voce}`
    const cur = agg.get(key)
    if (cur) {
      cur.quantita += r.quantita
    } else {
      agg.set(key, {
        tecnico,
        voce,
        quantita: r.quantita,
        compensoUnitario: r.listino?.compenso_tecnico ?? 0,
      })
    }
  }

  // ── Genera CSV ────────────────────────────────────────────────────────────
  const header = csvRiga([
    'Tecnico', 'Voce Listino', 'Quantità', 'Compenso Unitario (€)', 'Compenso Totale (€)',
  ])
  const rows = Array.from(agg.values())
    .sort((a, b) => a.tecnico.localeCompare(b.tecnico, 'it') || a.voce.localeCompare(b.voce, 'it'))
    .map((v) =>
      csvRiga([
        csvCell(v.tecnico),
        csvCell(v.voce),
        String(v.quantita),
        csvNumIT(v.compensoUnitario),
        csvNumIT(v.compensoUnitario * v.quantita),
      ])
    )

  const csv = CSV_BOM + [header, ...rows].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cedolini-${mese}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
```

- [ ] **Step 4: Run tests (nuovo + guardia statica: la route è GUARDED, non va in exempt)**

Run: `npx vitest run tests/unit/cedolini-batch-route.test.ts tests/unit/lab-guard-static.test.ts --reporter=dot`
Expected: PASS entrambi.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tecnici/cedolini-batch/route.ts tests/unit/cedolini-batch-route.test.ts
git commit -m "feat(export): GET /api/tecnici/cedolini-batch — CSV compensi mensili (A16)"
```

---

### Task 6: Retrofit `fatture/export` (helper CSV + paginazione)

**Files:**
- Modify: `src/app/api/fatture/export/route.ts` (righe 64-131: BOM/SEP/escapeField/num → helper; fetch → fetchAllPages)
- Modify: `tests/unit/fatture-export-route.test.ts` (SOLO il mock builder: `order` torna il builder, si aggiunge `range` che risolve i dati; gli assert esistenti NON si toccano)

**Interfaces:**
- Consumes: Task 1 (`CSV_BOM`, `csvCell`, `csvNumIT`, `csvRiga`), Task 2 (`fetchAllPages`, `PageResult`).

- [ ] **Step 1: Add the failing test (anti-injection) + adegua il mock**

Nel mock builder esistente di `tests/unit/fatture-export-route.test.ts` (righe 33-43), sostituire il ramo `fatture` con:

```typescript
    if (table === 'fatture') {
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        gte: () => builder,
        lte: () => builder,
        order: () => builder,
        range: async () => ({ data: fatture, error: null }),
      }
      return builder
    }
```

E aggiungere in coda al `describe` esistente:

```typescript
  it('anti CSV-injection: denominazione che inizia con = viene neutralizzata', async () => {
    fatture = [{
      numero: '2026-0014', data: '2026-07-01', cliente_denominazione: '=CMD()|studio',
      cliente_cf: null, cliente_piva: null, imponibile: 10, iva_importo: 0,
      totale: 10, bollo: 0, stato_sdi: 'accettata', pagata: true, inviata_via: 'pec',
      tipo_documento: 'TD01',
    }]
    const res = await GET(req())
    const csv = await res.text()
    expect(csv).toContain(`"'=CMD()|studio"`)
    expect(csv.split('\n')[1]).not.toMatch(/^=|;=/)
  })
```

- [ ] **Step 2: Run test to verify the new one fails**

Run: `npx vitest run tests/unit/fatture-export-route.test.ts --reporter=dot`
Expected: 3 PASS (esistenti, col mock adeguato falliranno finché la route non usa `.range` — accettato: in questo step falliscono TUTTI per il mock; il GREEN arriva allo Step 3) — in pratica: eseguire e annotare il fallimento.

- [ ] **Step 3: Retrofit della route**

In `src/app/api/fatture/export/route.ts`:

1. Aggiungere import:
```typescript
import { CSV_BOM, CSV_SEP, csvCell, csvNumIT, csvRiga } from '@/lib/utils/csv'
import { fetchAllPages, type PageResult } from '@/lib/utils/paginate'
```
2. Definire il tipo riga (sopra `GET`):
```typescript
type FatturaExportRow = {
  numero: string | null
  data: string | null
  cliente_denominazione: string | null
  cliente_cf: string | null
  cliente_piva: string | null
  imponibile: number | null
  iva_importo: number | null
  totale: number | null
  bollo: number | null
  stato_sdi: string | null
  pagata: boolean | null
  inviata_via: string | null
  tipo_documento: string | null
}
```
3. Sostituire il fetch (righe 35-62) con:
```typescript
  const { data: fatture, error } = await fetchAllPages<FatturaExportRow>(
    (from, to) =>
      svc
        .from('fatture')
        .select(
          `
          numero, data, cliente_denominazione, cliente_cf, cliente_piva,
          imponibile, iva_importo, totale, bollo, stato_sdi, pagata,
          inviata_via, tipo_documento
        `
        )
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .gte('data', dateFrom)
        .lte('data', dateTo)
        .order('data', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<FatturaExportRow>>
  )
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }
```
4. Rimuovere `const BOM = …` e `const SEP = ';'` locali; `header` diventa `csvRiga([...])`; nel map righe: rimuovere `escapeField` e `num` locali e usare:
```typescript
    return csvRiga([
      f.numero ?? '',
      isTD04 ? 'Nota di Credito' : 'Fattura',
      f.data?.split('T')[0] ?? '',
      csvCell(f.cliente_denominazione),
      f.cliente_cf ?? '',
      cfPiva,
      csvNumIT(f.imponibile, segno),
      csvNumIT(f.iva_importo, segno),
      csvNumIT(f.bollo, segno),
      csvNumIT(f.totale, segno),
      labelStatoSDI[f.stato_sdi ?? 'draft'] ?? f.stato_sdi ?? 'bozza',
      f.pagata ? 'Sì' : 'No',
      f.inviata_via === 'pec' ? 'PEC' : f.inviata_via === 'sdi_coop' ? 'SDI-Coop' : '',
    ])
```
5. `const csv = CSV_BOM + [header, ...rows].join('\n')` (il commento TD04 esistente alle righe 100-107 NON si tocca).

- [ ] **Step 4: Run tests to verify all green**

Run: `npx vitest run tests/unit/fatture-export-route.test.ts tests/unit/csv-utils.test.ts --reporter=dot`
Expected: PASS — 4 test fatture (3 esistenti con assert invariati + injection) + helper.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/fatture/export/route.ts tests/unit/fatture-export-route.test.ts
git commit -m "refactor(export): fatture/export su helper CSV condiviso + paginazione fail-closed"
```

---

### Task 7: Verifica FASE 7 completa

- [ ] **Step 1: TypeScript** — Run: `npx tsc --noEmit` · Expected: zero errori.
- [ ] **Step 2: Suite completa** — Run: `npx vitest run` · Expected: tutti verdi (≥ 2238 + i nuovi), zero regressioni.
- [ ] **Step 3: Build** — Run: `npx next build` · Expected: build OK, le 2 route nuove elencate.
- [ ] **Step 4: Commit finale (se restano file)** — `git status` pulito o commit di eventuali residui.

## Self-review (fatta in scrittura piano)

- Spec coverage: §1→Task 1 · §4-bis→Task 2 · estrazione mese→Task 3 · §2→Task 4 · §3→Task 5 · §4→Task 6 · §5 test distribuiti nei task · FASE 7→Task 7. Nessun gap.
- Tipi coerenti: `PageResult<T>`/`fetchAllPages` identici in Task 2/4/5/6; `csvCell`/`csvNumIT`/`csvRiga` identici in Task 1/4/5/6; `meseBoundaries` identica in Task 3/5.
- Niente placeholder; ogni step ha codice o comando concreto.
