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

