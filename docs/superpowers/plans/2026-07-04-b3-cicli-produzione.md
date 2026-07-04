# B3 — Cicli di produzione: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** far generare automaticamente le fasi di produzione (`lavori_fasi`) alla creazione di un lavoro quando ha un ciclo assegnato, e rendere finalmente funzionante l'esecuzione/tracciamento delle fasi già esistente ma rotto in `TabProduzione`.

**Architecture:** nessuna nuova tabella. 1 migration (2 colonne `updated_by` + 2 trigger di audit). Estensione di 2 route esistenti (`POST /api/lavori`, `PATCH /api/lavori/[id]/fasi/[fase_id]`). 3 route nuove (`GET /api/cicli`, `GET /api/fasi-produzione/ricerca`, `PATCH /api/cicli/[id]/fasi` — batch save, stesso pattern di `PATCH /api/qualita/rischi/[id]`). 1 componente combobox nuovo (gemello di `ClienteComboBox`), 1 fix in `TabProduzione`/`LavoroFormClient`, 1 nuova coppia di pagine (lista + editor, pattern `qualita/rischi`).

**Tech Stack:** Next.js 16 App Router, Supabase (service client + RLS), Vitest, TypeScript.

**Nota di correzione rispetto alla spec approvata:** la spec (§2.2) descriveva 4 endpoint granulari CRUD per le fasi di un ciclo (`POST`/`PATCH`/`DELETE` per singola fase). Rileggendo `RischiEditor.tsx` + `PATCH /api/qualita/rischi/[id]` (il pattern che la spec stessa indicava come riferimento in §3), il pattern reale usato ovunque nel progetto per "editor di una lista di sotto-elementi" è un **singolo salvataggio batch** (l'intera lista viene inviata e sostituita in un colpo solo), non CRUD granulare. Questo piano adotta il pattern batch — più semplice, più coerente col resto del codebase, stesso comportamento percepito dall'utente. Tutto il resto della spec è invariato.

## Global Constraints

- Nessun colore hardcoded fuori da `var(--token, #fallback)`. Font sempre `'DM Sans', sans-serif`. Touch target ≥44px.
- Ogni nuova route API: auth via `getServerUserClient()`, scoping lab via `utenti.laboratorio_id` + `getServiceClient()`, errore Supabase mai esposto grezzo al client (messaggio generico), cattura esplicita dell'errore sul lookup `utenti` (500 vs 403 mascherato — pattern hardening B10).
- Soft delete ovunque (`deleted_at`), mai `DELETE` SQL reale su `cicli_produzione`/`fasi_produzione` (il FK `fasi_produzione_ciclo_id_fkey` non ha `ON DELETE CASCADE` — un delete reale del ciclo fallirebbe comunque se ci sono fasi).
- `tsc --noEmit` pulito e `vitest run` verde dopo ogni task.
- Dopo la migration (Task 1): `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` seguito da `npx tsc --noEmit` — non facoltativo.

---

## Task 1: Migration — `updated_by` + trigger di audit

**Files:**
- Create: `supabase/migrations/20260704120000_b3_cicli_fasi_audit.sql`
- Modify: `src/types/database.types.ts` (rigenerato, non a mano)

**Interfaces:**
- Produces: colonna `cicli_produzione.updated_by` (uuid, nullable, FK → `utenti(id)`), colonna `fasi_produzione.updated_by` (uuid, nullable, FK → `utenti(id)`). Trigger `_audit_cicli_produzione`, `_audit_fasi_produzione` (nessuna nuova interfaccia TS, solo side-effect su `audit_log`).

**Verifica pre-flight già fatta (04/07/2026):** letto il body di `_audit_trigger_fn()` (`pg_get_functiondef`) prima di scrivere questo task — legge solo `id`/`laboratorio_id` via `to_jsonb(...)  ->> '...'` (mai un errore se la colonna manca, ritorna solo NULL) e avvolge `auth.uid()` in un blocco `EXCEPTION WHEN OTHERS`. È generico e sicuro da agganciare a qualunque tabella con `id`, incluse `cicli_produzione`/`fasi_produzione` — confermato, nessun rischio di 500 su ogni INSERT/UPDATE dopo l'attach.

- [ ] **Step 1: Scrivi la migration**

```sql
-- supabase/migrations/20260704120000_b3_cicli_fasi_audit.sql

ALTER TABLE public.cicli_produzione
  ADD COLUMN updated_by uuid REFERENCES public.utenti(id);

ALTER TABLE public.fasi_produzione
  ADD COLUMN updated_by uuid REFERENCES public.utenti(id);

CREATE TRIGGER _audit_cicli_produzione
  AFTER INSERT OR DELETE OR UPDATE ON public.cicli_produzione
  FOR EACH ROW EXECUTE FUNCTION _audit_trigger_fn();

CREATE TRIGGER _audit_fasi_produzione
  AFTER INSERT OR DELETE OR UPDATE ON public.fasi_produzione
  FOR EACH ROW EXECUTE FUNCTION _audit_trigger_fn();
```

- [ ] **Step 2: Applica la migration al progetto live (`iagibumwjstnveqpjbwq`)**

Usa il tool MCP Supabase `apply_migration` (nome: `b3_cicli_fasi_audit`, contenuto: il file sopra). Conferma esplicita con Francesco prima di eseguire — tocca lo schema di produzione.

- [ ] **Step 3: Verifica le colonne e i trigger sul DB live**

Query di verifica (via `execute_sql`, sola lettura):
```sql
select column_name from information_schema.columns
where table_name in ('cicli_produzione','fasi_produzione') and column_name = 'updated_by';

select tgname from pg_trigger where tgname in ('_audit_cicli_produzione','_audit_fasi_produzione');
```
Atteso: 2 righe nella prima query, 2 righe nella seconda.

- [ ] **Step 4: Rigenera i types TypeScript**

Run: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
Poi rimuovi eventuale riga di messaggio CLI in fondo al file (se presente), come da convenzione del progetto.

- [ ] **Step 5: Verifica TypeScript**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260704120000_b3_cicli_fasi_audit.sql src/types/database.types.ts
git commit -m "feat(db): add updated_by tracking + audit triggers to cicli/fasi produzione"
```

---

## Task 2: `POST /api/lavori` genera `lavori_fasi` dal ciclo scelto

**Files:**
- Modify: `src/app/api/lavori/route.ts:74-203` (funzione `POST`)
- Test: `tests/unit/lavori-post-ciclo.test.ts` (nuovo)

**Interfaces:**
- Consumes: nessuna dipendenza da altri task di questo piano (indipendente, può partire subito dopo Task 1).
- Produces: `POST /api/lavori` ora accetta `ciclo_id?: string` nel body; se valorizzato e appartenente al lab, genera righe `lavori_fasi`. Nessun cambio alla forma della risposta (`{ lavoro }`, status 201).

- [ ] **Step 1: Scrivi i test che falliscono**

```typescript
// tests/unit/lavori-post-ciclo.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST } from '../../src/app/api/lavori/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const CICLO_ID = 'ciclo-1'

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'order', 'insert', 'single']
  for (const m of methods) c[m] = () => c
  c.single = async () => result
  return c
}

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/lavori', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

const BASE_BODY = {
  cliente_id: 'cliente-1',
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona 14',
  data_consegna_prevista: '2026-08-01',
}

describe('POST /api/lavori — generazione fasi da ciclo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
    mockRpc.mockResolvedValue({ data: 1, error: null })
  })

  function setupTables({ cicloOwned = true, fasiRows = [] as unknown[], insertLavoriFasi = { error: null } } = {}) {
    const insertedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      }
      if (table === 'clienti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      }
      if (table === 'cicli_produzione') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: cicloOwned ? { laboratorio_id: LAB_ID } : { laboratorio_id: 'other-lab' }, error: null }) }) }) }) }
      }
      if (table === 'lavori') {
        return {
          insert: () => ({
            select: () => ({ single: async () => ({ data: { id: 'lavoro-1', numero_lavoro: '2026/0001', stato: 'ricevuto' }, error: null }) }),
          }),
        }
      }
      if (table === 'fasi_produzione') {
        return { select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ order: async () => ({ data: fasiRows, error: null }) }) }) }) }) }
      }
      if (table === 'lavori_fasi') {
        return { insert: (rows: unknown[]) => { insertedRows.push(...rows); return Promise.resolve(insertLavoriFasi) } }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    return insertedRows
  }

  it('ciclo con fasi → genera N righe lavori_fasi ordinate', async () => {
    const fasiRows = [
      { id: 'fase-1', ordine: 1, responsabile_id: null },
      { id: 'fase-2', ordine: 2, responsabile_id: 'tecnico-1' },
    ]
    const inserted = setupTables({ fasiRows })

    const res = await POST(req({ ...BASE_BODY, ciclo_id: CICLO_ID }))

    expect(res.status).toBe(201)
    expect(inserted).toEqual([
      { lavoro_id: 'lavoro-1', fase_id: 'fase-1', laboratorio_id: LAB_ID, tecnico_id: null },
      { lavoro_id: 'lavoro-1', fase_id: 'fase-2', laboratorio_id: LAB_ID, tecnico_id: 'tecnico-1' },
    ])
  })

  it('ciclo senza fasi → 201, nessun insert su lavori_fasi', async () => {
    setupTables({ fasiRows: [] })
    const insertSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori_fasi') { insertSpy(); return { insert: () => Promise.resolve({ error: null }) } }
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      if (table === 'clienti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'cicli_produzione') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'lavori') return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'lavoro-1', numero_lavoro: '2026/0001', stato: 'ricevuto' }, error: null }) }) }) }
      if (table === 'fasi_produzione') return { select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ order: async () => ({ data: [], error: null }) }) }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await POST(req({ ...BASE_BODY, ciclo_id: CICLO_ID }))

    expect(res.status).toBe(201)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('nessun ciclo_id → comportamento invariato, nessuna query su cicli_produzione/fasi_produzione', async () => {
    const cicloQuerySpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'cicli_produzione' || table === 'fasi_produzione') { cicloQuerySpy(table); throw new Error('non deve essere chiamato') }
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      if (table === 'clienti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'lavori') return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'lavoro-1', numero_lavoro: '2026/0001', stato: 'ricevuto' }, error: null }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await POST(req(BASE_BODY))

    expect(res.status).toBe(201)
    expect(cicloQuerySpy).not.toHaveBeenCalled()
  })

  it('ciclo_id di un altro laboratorio → 403, lavoro non creato', async () => {
    const lavoriInsertSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      if (table === 'clienti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'cicli_produzione') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'other-lab' }, error: null }) }) }) }) }
      if (table === 'lavori') { lavoriInsertSpy(); return { insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) } }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await POST(req({ ...BASE_BODY, ciclo_id: CICLO_ID }))

    expect(res.status).toBe(403)
    expect(lavoriInsertSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/lavori-post-ciclo.test.ts`
Expected: FAIL (il body non accetta ancora `ciclo_id`, nessuna generazione fasi).

- [ ] **Step 3: Implementa — aggiungi `ciclo_id` alla validazione FK esistente**

In `src/app/api/lavori/route.ts`, modifica il blocco `FK_FIELDS_INSERT`/`fkCandidates` (righe 123-132):

```typescript
  const FK_FIELDS_INSERT: { field: string; table: string }[] = [
    { field: 'cliente_id', table: 'clienti' },
    { field: 'paziente_id', table: 'pazienti' },
    { field: 'tecnico_id', table: 'tecnici' },
    { field: 'ciclo_id', table: 'cicli_produzione' },
  ]
  const fkCandidates: Record<string, unknown> = {
    cliente_id: body.cliente_id,
    paziente_id: body.paziente_id ?? null,
    tecnico_id: body.tecnico_id ?? null,
    ciclo_id: body.ciclo_id ?? null,
  }
```

(Il loop di validazione sotto usa già `fkCandidates`/`FK_FIELDS_INSERT` genericamente — nessun'altra modifica necessaria lì, la validazione di `ciclo_id` scatta automaticamente.)

- [ ] **Step 4: Implementa — aggiungi `ciclo_id` all'insert e la generazione fasi dopo l'insert**

Modifica `insertData` (riga 169) aggiungendo `ciclo_id: body.ciclo_id ?? null,` e sostituisci il blocco finale (righe 192-203) con:

```typescript
  const insertData = {
    laboratorio_id: labId,
    numero_lavoro,
    anno_lavoro: anno,
    stato: 'ricevuto' as const,
    tipo_dispositivo: body.tipo_dispositivo,
    descrizione: body.descrizione,
    data_consegna_prevista: body.data_consegna_prevista,
    ora_consegna: body.ora_consegna ?? null,
    richiedente_nome: body.richiedente_nome ?? null,
    priorita: body.priorita ?? 'normale',
    dispositivo_semilavorato: body.dispositivo_semilavorato ?? false,
    note_interne: body.note_interne ?? null,
    cliente_id: body.cliente_id,
    paziente_id: body.paziente_id ?? null,
    tecnico_id: body.tecnico_id ?? null,
    ciclo_id: body.ciclo_id ?? null,
    classe_rischio: body.classe_rischio ?? 'classe_i',
    da_conformare: body.da_conformare ?? true,
    codice_iva: body.codice_iva ?? 'N4',
    natura_iva: body.natura_iva ?? 'N4',
    data_ingresso: new Date().toISOString().split('T')[0],
  }

  const { data: lavoro, error: insertError } = await svc
    .from('lavori')
    .insert(insertData)
    .select('id, numero_lavoro, stato')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Genera le fasi di produzione dal ciclo scelto, se presente.
  // Non blocca la creazione del lavoro già avvenuta se qualcosa qui fallisce:
  // le fasi si possono sempre aggiungere/correggere dopo.
  if (body.ciclo_id && typeof body.ciclo_id === 'string') {
    const { data: fasiCiclo } = await svc
      .from('fasi_produzione')
      .select('id, ordine, responsabile_id')
      .eq('ciclo_id', body.ciclo_id)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('ordine', { ascending: true })

    if (fasiCiclo && fasiCiclo.length > 0) {
      const lavoriFasiRows = fasiCiclo.map((fase) => ({
        lavoro_id: lavoro.id,
        fase_id: fase.id,
        laboratorio_id: labId,
        tecnico_id: fase.responsabile_id ?? null,
      }))
      await svc.from('lavori_fasi').insert(lavoriFasiRows)
    }
  }

  return NextResponse.json({ lavoro }, { status: 201 })
}
```

- [ ] **Step 5: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/lavori-post-ciclo.test.ts`
Expected: PASS (tutti e 4 i casi).

- [ ] **Step 6: Esegui l'intera suite per verificare nessuna regressione**

Run: `npx vitest run`
Expected: tutti i test verdi (incluso `tests/unit/lavori-route.test.ts` se esiste, invariato).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/lavori/route.ts tests/unit/lavori-post-ciclo.test.ts
git commit -m "feat(lavori): generate lavori_fasi from ciclo_id on creation"
```

---

## Task 3: `PATCH /api/lavori/[id]/fasi/[fase_id]` risolve `tecnico_id` lato server

**Files:**
- Modify: `src/app/api/lavori/[id]/fasi/[fase_id]/route.ts`
- Test: `tests/unit/lavori-fasi-patch-tecnico.test.ts` (nuovo)

**Interfaces:**
- Consumes: nessuna dipendenza da altri task (indipendente).
- Produces: quando il body PATCH imposta `esito` (non null), la route risolve da sola il `tecnico_id` dell'utente loggato e lo include nell'update — il client non può più impostarlo.

- [ ] **Step 1: Scrivi i test che falliscono**

```typescript
// tests/unit/lavori-fasi-patch-tecnico.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/fasi/[fase_id]/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/lavori/lavoro-1/fasi/fase-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: 'lavoro-1', fase_id: 'fase-1' })

describe('PATCH /api/lavori/[id]/fasi/[fase_id] — tecnico_id server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('esito valorizzato + utente con record tecnici → tecnico_id risolto dal server, non dal body', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      if (table === 'tecnici') return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { id: 'tecnico-99' }, error: null }) }) }) }) }
      if (table === 'lavori_fasi') {
        return {
          update: (payload: Record<string, unknown>) => {
            updateSpy(payload)
            return { eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'fase-1', ...payload }, error: null }) }) }) }) }) }) }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    // Il client tenta di impostare un tecnico_id arbitrario: deve essere ignorato.
    await PATCH(req({ esito: 'ok', eseguita_at: '2026-07-04T10:00:00Z', tecnico_id: 'tecnico-fasullo' }), { params })

    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ tecnico_id: 'tecnico-99' }))
  })

  it('esito valorizzato + utente SENZA record tecnici (es. titolare) → tecnico_id non impostato, nessun errore bloccante', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      if (table === 'tecnici') return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }) }
      if (table === 'lavori_fasi') {
        return {
          update: (payload: Record<string, unknown>) => {
            updateSpy(payload)
            return { eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'fase-1', ...payload }, error: null }) }) }) }) }) }) }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await PATCH(req({ esito: 'ok', eseguita_at: '2026-07-04T10:00:00Z' }), { params })

    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith(expect.not.objectContaining({ tecnico_id: expect.anything() }))
  })

  it('esito assente dal body (es. solo azione_correttiva) → non risolve tecnico_id, nessuna query su tecnici', async () => {
    const tecniciQuerySpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      if (table === 'tecnici') { tecniciQuerySpy(); throw new Error('non deve essere chiamato') }
      if (table === 'lavori_fasi') {
        return { update: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'fase-1' }, error: null }) }) }) }) }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await PATCH(req({ azione_correttiva: 'sostituito lotto materiale' }), { params })

    expect(res.status).toBe(200)
    expect(tecniciQuerySpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/lavori-fasi-patch-tecnico.test.ts`
Expected: FAIL (`tecnico_id` non è mai risolto lato server, il body del client passa inalterato).

- [ ] **Step 3: Implementa**

Sostituisci l'intero file `src/app/api/lavori/[id]/fasi/[fase_id]/route.ts` con:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string; fase_id: string }> }

const ALLOWED_FIELDS = [
  'esito',
  'eseguita_at',
  'note',
  'materiali_usati',
  'valore_misurato',
  'non_conforme',
  'azione_correttiva',
] as const

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const { id: lavoro_id, fase_id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = utente.laboratorio_id

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key]
  }

  // tecnico_id non è mai fidato dal client: si risolve qui, dal record `tecnici`
  // collegato all'utente loggato, solo quando si sta registrando un esito
  // (altrimenti non tocchiamo l'assegnazione già presente sulla riga).
  if ('esito' in updates && updates.esito != null) {
    const { data: tecnico } = await svc
      .from('tecnici')
      .select('id')
      .eq('utente_id', user.id)
      .eq('laboratorio_id', labId)
      .single()
    if (tecnico?.id) {
      updates.tecnico_id = tecnico.id
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nessun campo aggiornabile fornito' }, { status: 400 })
  }

  const { data, error } = await svc
    .from('lavori_fasi')
    .update(updates)
    .eq('id', fase_id)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json(data)
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/lavori-fasi-patch-tecnico.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Esegui l'intera suite**

Run: `npx vitest run`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/lavori/[id]/fasi/[fase_id]/route.ts tests/unit/lavori-fasi-patch-tecnico.test.ts
git commit -m "fix(lavori): resolve tecnico_id server-side on fase esito update"
```

---

## Task 4: `TabProduzione` — fix persistenza, `non_conforme`, `azione_correttiva`, empty-state

**Files:**
- Modify: `src/components/features/lavori/LavoroFormClient.tsx:70-74,113-118`
- Modify: `src/components/features/lavori/form/TabProduzione.tsx` (intero file)
- Test: `tests/unit/TabProduzione.test.tsx` (nuovo)

**Interfaces:**
- Consumes: nessuna dipendenza da Task 2/3 per funzionare a runtime con l'endpoint attuale (funziona già oggi), ma il comportamento end-to-end completo (tecnico_id registrato) richiede Task 3 già mergiato.
- Produces: `TabProduzione` accetta ora un prop `hasCiclo: boolean` in più. `handleUpdateFase` in `LavoroFormClient` diventa `async`, persiste via `fetch`, fa rollback dello stato locale se la risposta non è ok.

- [ ] **Step 1: Scrivi il test component che fallisce**

```tsx
// tests/unit/TabProduzione.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabProduzione } from '../../src/components/features/lavori/form/TabProduzione'
import type { LavoroFase } from '../../src/types/domain'

const FASE: LavoroFase = {
  id: 'fase-1',
  lavoro_id: 'lavoro-1',
  fase_id: 'fp-1',
  laboratorio_id: 'lab-1',
  esito: null,
  eseguita_at: null,
  note: null,
  materiali_usati: null,
  attrezzatura_usata: null,
  valore_misurato: null,
  non_conforme: false,
  azione_correttiva: null,
  tecnico_id: null,
  fase: {
    codice_fase: 'OL10',
    descrizione: 'Disegno modelli progettazione',
    ordine: 1,
    obbligatoria: true,
    misurazioni_da_rilevare: false,
  },
}

describe('TabProduzione', () => {
  it('click su "Non conf." invia esito E non_conforme=true', () => {
    const onUpdateFase = vi.fn()
    render(<TabProduzione fasi={[FASE]} onUpdateFase={onUpdateFase} hasCiclo={true} />)

    fireEvent.click(screen.getByRole('button', { name: 'Non conf.' }))

    expect(onUpdateFase).toHaveBeenCalledWith('fase-1', expect.objectContaining({
      esito: 'non_conforme',
      non_conforme: true,
    }))
  })

  it('click su "OK" invia esito=ok E non_conforme=false', () => {
    const onUpdateFase = vi.fn()
    render(<TabProduzione fasi={[FASE]} onUpdateFase={onUpdateFase} hasCiclo={true} />)

    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(onUpdateFase).toHaveBeenCalledWith('fase-1', expect.objectContaining({
      esito: 'ok',
      non_conforme: false,
    }))
  })

  it('quando esito è non_conforme, mostra il campo Azione correttiva', () => {
    const faseNC = { ...FASE, esito: 'non_conforme' as const, non_conforme: true }
    render(<TabProduzione fasi={[faseNC]} onUpdateFase={vi.fn()} hasCiclo={true} />)

    expect(screen.getByLabelText(/Azione correttiva/i)).toBeInTheDocument()
  })

  it('scrivendo e uscendo dal campo Azione correttiva, invia azione_correttiva', () => {
    const onUpdateFase = vi.fn()
    const faseNC = { ...FASE, esito: 'non_conforme' as const, non_conforme: true }
    render(<TabProduzione fasi={[faseNC]} onUpdateFase={onUpdateFase} hasCiclo={true} />)

    const textarea = screen.getByLabelText(/Azione correttiva/i)
    fireEvent.change(textarea, { target: { value: 'Sostituito lotto materiale' } })
    fireEvent.blur(textarea)

    expect(onUpdateFase).toHaveBeenCalledWith('fase-1', { azione_correttiva: 'Sostituito lotto materiale' })
  })

  it('nessuna fase + hasCiclo=false → messaggio "assegna un ciclo"', () => {
    render(<TabProduzione fasi={[]} onUpdateFase={vi.fn()} hasCiclo={false} />)
    expect(screen.getByText(/assegna un ciclo nella tab Dati/i)).toBeInTheDocument()
  })

  it('nessuna fase + hasCiclo=true → messaggio "ciclo assegnato ma nessuna fase definita" + link a /cicli-produzione', () => {
    render(<TabProduzione fasi={[]} onUpdateFase={vi.fn()} hasCiclo={true} />)
    expect(screen.getByText(/nessuna fase.*definita/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /definisci le fasi di questo ciclo/i })).toHaveAttribute('href', '/cicli-produzione')
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/TabProduzione.test.tsx`
Expected: FAIL (prop `hasCiclo` non esiste, nessun campo Azione correttiva, `non_conforme` mai inviato).

- [ ] **Step 3: Riscrivi `TabProduzione.tsx`**

Sostituisci l'intero file `src/components/features/lavori/form/TabProduzione.tsx` con:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LavoroFase } from '@/types/domain'
import { raisedShadow } from './styles'

interface TabProduzioneProps {
  fasi: LavoroFase[]
  onUpdateFase: (id: string, updates: Partial<LavoroFase>) => void
  hasCiclo: boolean
}

function formatTimestamp(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Colore pulsante per esito
const ESITO_CONFIG = {
  ok: {
    label: 'OK',
    bg: 'rgba(22,163,74,.10)',
    bgActive: 'var(--success, #16A34A)',
    color: 'var(--success, #16A34A)',
    colorActive: '#fff',
  },
  non_conforme: {
    label: 'Non conf.',
    bg: 'rgba(217,0,18,.10)',
    bgActive: 'var(--primary, #D90012)',
    color: 'var(--primary, #D90012)',
    colorActive: '#fff',
  },
  parziale: {
    label: 'Parziale',
    bg: 'rgba(249,115,22,.10)',
    bgActive: 'var(--urgente, #F97316)',
    color: 'var(--urgente, #F97316)',
    colorActive: '#fff',
  },
} as const

type EsitoKey = keyof typeof ESITO_CONFIG

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--t2, #4A3D33)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '4px',
}

export function TabProduzione({ fasi, onUpdateFase, hasCiclo }: TabProduzioneProps) {
  // Bozza locale per Azione correttiva: si scrive mentre l'utente digita,
  // si invia solo su blur (evita una PATCH per ogni carattere).
  const [azioneDraft, setAzioneDraft] = useState<Record<string, string>>({})

  if (fasi.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface, #E4DFD9)',
          borderRadius: '14px',
          padding: '32px 20px',
          textAlign: 'center',
          boxShadow: raisedShadow,
        }}
        role="status"
        aria-label="Nessuna fase disponibile"
      >
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: 'var(--t2, #4A3D33)',
            margin: 0,
          }}
        >
          {hasCiclo
            ? 'Ciclo assegnato ma nessuna fase ancora definita per questo ciclo.'
            : 'Nessuna fase — assegna un ciclo nella tab Dati.'}
        </p>
        {hasCiclo && (
          <Link
            href="/cicli-produzione"
            style={{
              display: 'inline-block',
              marginTop: '10px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--primary, #D90012)',
              textDecoration: 'none',
            }}
          >
            Definisci le fasi di questo ciclo →
          </Link>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {fasi.map((fase) => {
        const esitoAttuale = fase.esito as EsitoKey | null
        const azioneValue = azioneDraft[fase.id] ?? fase.azione_correttiva ?? ''

        return (
          <div
            key={fase.id}
            style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: raisedShadow,
            }}
          >
            {/* Intestazione fase */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--t2, #4A3D33)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {fase.fase.codice_fase}
                </span>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--t1, #1C1916)',
                    margin: '2px 0 0',
                  }}
                >
                  {fase.fase.descrizione}
                </p>
              </div>

              {/* Timestamp esecuzione */}
              {fase.eseguita_at && (
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    color: 'var(--t2, #4A3D33)',
                    flexShrink: 0,
                  }}
                >
                  {formatTimestamp(fase.eseguita_at)}
                </span>
              )}
            </div>

            {/* Pulsanti esito */}
            <div
              role="group"
              aria-label={`Esito fase ${fase.fase.codice_fase}`}
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              {(Object.keys(ESITO_CONFIG) as EsitoKey[]).map((key) => {
                const config = ESITO_CONFIG[key]
                const isActive = esitoAttuale === key
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      const now = new Date().toISOString()
                      const nextEsito = isActive ? null : key
                      onUpdateFase(fase.id, {
                        esito: nextEsito,
                        eseguita_at: nextEsito ? now : null,
                        non_conforme: nextEsito === 'non_conforme',
                      })
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '36px',
                      minHeight: '44px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: isActive ? config.bgActive : config.bg,
                      color: isActive ? config.colorActive : config.color,
                      transition: 'background var(--tr), color var(--tr)',
                      boxShadow: isActive
                        ? 'var(--sh-i, inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70))'
                        : 'none',
                    }}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>

            {/* Azione correttiva — solo se la fase è segnata non conforme */}
            {esitoAttuale === 'non_conforme' && (
              <div style={{ marginTop: '10px' }}>
                <label htmlFor={`azione-correttiva-${fase.id}`} style={labelStyle}>
                  Azione correttiva
                </label>
                <textarea
                  id={`azione-correttiva-${fase.id}`}
                  rows={2}
                  placeholder="Cosa è stato fatto per correggere la non conformità..."
                  value={azioneValue}
                  onChange={(e) =>
                    setAzioneDraft((prev) => ({ ...prev, [fase.id]: e.target.value }))
                  }
                  onBlur={(e) => onUpdateFase(fase.id, { azione_correttiva: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg, #DDD8D3)',
                    border: '1px solid rgba(0,0,0,.06)',
                    color: 'var(--t1, #1C1916)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Aggiorna `LavoroFormClient.tsx` — persistenza reale + prop `hasCiclo`**

Sostituisci la funzione `handleUpdateFase` (righe 70-74) con:

```typescript
  async function handleUpdateFase(id: string, updates: Partial<LavoroFase>) {
    const previous = fasi.find((f) => f.id === id)
    setFasi((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)))

    try {
      const res = await fetch(`/api/lavori/${lavoro.id}/fasi/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok && previous) {
        setFasi((prev) => prev.map((f) => (f.id === id ? previous : f)))
      }
    } catch {
      if (previous) {
        setFasi((prev) => prev.map((f) => (f.id === id ? previous : f)))
      }
    }
  }
```

E aggiorna il render del case `'produzione'` (righe 113-118) per passare `hasCiclo`:

```tsx
            case 'produzione':
              return (
                <TabProduzione
                  fasi={fasi}
                  onUpdateFase={handleUpdateFase}
                  hasCiclo={!!(data.ciclo_id ?? lavoro.ciclo_id)}
                />
              )
```

- [ ] **Step 5: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/TabProduzione.test.tsx`
Expected: PASS (6/6).

- [ ] **Step 6: Esegui l'intera suite**

Run: `npx vitest run && npx tsc --noEmit`
Expected: verde, nessun errore TS.

- [ ] **Step 7: Commit**

```bash
git add src/components/features/lavori/form/TabProduzione.tsx src/components/features/lavori/LavoroFormClient.tsx tests/unit/TabProduzione.test.tsx
git commit -m "fix(produzione): persist fase esito, sync non_conforme boolean, add azione correttiva"
```

---

## Task 5: `GET /api/cicli?q=` — ricerca cicli

**Files:**
- Create: `src/app/api/cicli/route.ts`
- Test: `tests/unit/cicli-route.test.ts`

**Interfaces:**
- Consumes: nessuna dipendenza da altri task.
- Produces: `GET /api/cicli?q=<testo>` → `{ cicli: [{id, codice, nome, tipo_dispositivo}] }`, usato da `CicloComboBox` (Task 6).

- [ ] **Step 1: Scrivi i test che falliscono**

```typescript
// tests/unit/cicli-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET } from '../../src/app/api/cicli/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

const CICLI_ROWS = [
  { id: 'ciclo-1', codice: 'CNC.TitCer', nome: 'CNC Corona in titanio-ceramica', tipo_dispositivo: 'Protesi fissa' },
  { id: 'ciclo-2', codice: 'CNC.TitCerImp', nome: 'CNC Corona in titanio-ceramica su impianto', tipo_dispositivo: 'Protesi fissa' },
]

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'or', 'order', 'limit']) c[m] = () => c
  c.then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

function mockLab(cicliResult: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'cicli_produzione') return chain(cicliResult)
    throw new Error(`Unexpected table: ${table}`)
  })
}

function req(url: string) {
  return new Request(url)
}

describe('GET /api/cicli', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    expect(res.status).toBe(403)
  })

  it('ricerca con match → 200, lista cicli', async () => {
    mockLab({ data: CICLI_ROWS, error: null })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.cicli).toEqual(CICLI_ROWS)
  })

  it('nessun match → 200, lista vuota', async () => {
    mockLab({ data: [], error: null })
    const res = await GET(req('http://localhost/api/cicli?q=xxxxx'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.cicli).toEqual([])
  })

  it('errore Supabase → 500, messaggio generico', async () => {
    mockLab({ data: null, error: { message: 'connection error, socket 5432 refused' } })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).not.toContain('5432')
  })

  it('errore su lookup laboratorio → 500 (non 403 mascherato)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'db down' } }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/cicli-route.test.ts`
Expected: FAIL (il file `src/app/api/cicli/route.ts` non esiste).

- [ ] **Step 3: Implementa**

```typescript
// src/app/api/cicli/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (utenteError) {
    return NextResponse.json({ error: 'Errore nel recupero del laboratorio' }, { status: 500 })
  }
  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = utente.laboratorio_id

  let query = svc
    .from('cicli_produzione')
    .select('id, codice, nome, tipo_dispositivo')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .order('codice', { ascending: true })
    .limit(8)

  if (q) {
    query = query.or(`codice.ilike.%${q}%,nome.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei cicli' }, { status: 500 })
  }

  return NextResponse.json({ cicli: data ?? [] })
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/cicli-route.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cicli/route.ts tests/unit/cicli-route.test.ts
git commit -m "feat(api): add GET /api/cicli search endpoint"
```

---

## Task 6: `CicloComboBox.tsx` — componente combobox

**Files:**
- Create: `src/components/features/lavori/CicloComboBox.tsx`
- Test: `tests/unit/CicloComboBox.test.tsx`

**Interfaces:**
- Consumes: `GET /api/cicli?q=` (Task 5).
- Produces: `<CicloComboBox value={string} onChange={(id: string, label: string) => void} placeholder? id? />`, gemello di `ClienteComboBox`.

- [ ] **Step 1: Scrivi il test che fallisce**

```tsx
// tests/unit/CicloComboBox.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CicloComboBox } from '../../src/components/features/lavori/CicloComboBox'

const originalFetch = global.fetch

describe('CicloComboBox', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it('digitando, cerca via GET /api/cicli?q= e mostra i risultati con tipo_dispositivo come etichetta', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cicli: [{ id: 'ciclo-1', codice: 'CNC.TitCer', nome: 'CNC Corona in titanio-ceramica', tipo_dispositivo: 'Protesi fissa' }],
      }),
    }) as unknown as typeof fetch

    const onChange = vi.fn()
    render(<CicloComboBox value="" onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CNC' } })
    await vi.advanceTimersByTimeAsync(250)

    await waitFor(() => {
      expect(screen.getByText('CNC Corona in titanio-ceramica')).toBeInTheDocument()
      expect(screen.getByText('Protesi fissa')).toBeInTheDocument()
    })

    fireEvent.mouseDown(screen.getByText('CNC Corona in titanio-ceramica'))
    expect(onChange).toHaveBeenCalledWith('ciclo-1', 'CNC.TitCer — CNC Corona in titanio-ceramica')
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/CicloComboBox.test.tsx`
Expected: FAIL (il file non esiste).

- [ ] **Step 3: Implementa**

```tsx
// src/components/features/lavori/CicloComboBox.tsx
'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  background: 'var(--bg, #DDD8D3)',
  border: '1px solid var(--elv, #EDEDEA)',
  color: 'var(--t1, #1C1916)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  boxShadow:
    'inset 3px 3px 8px rgba(0,0,0,.07), inset -2px -2px 6px rgba(255,255,255,.70)',
  outline: 'none',
  boxSizing: 'border-box',
}

interface CicloOption {
  id: string
  codice: string
  nome: string
  tipo_dispositivo: string
}

export interface CicloComboBoxProps {
  value: string
  onChange: (id: string, label: string) => void
  placeholder?: string
  id?: string
}

function buildLabel(option: CicloOption): string {
  return `${option.codice} — ${option.nome}`
}

export function CicloComboBox({
  value,
  onChange,
  placeholder = 'Cerca ciclo per codice o nome...',
  id,
}: CicloComboBoxProps) {
  const inputId = useId()
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<CicloOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  const prevValueRef = useRef(value)
  useEffect(() => {
    if (prevValueRef.current !== '' && value === '') {
      prevValueRef.current = value
      setSelectedLabel('')
      setQuery('')
    } else {
      prevValueRef.current = value
    }
  }, [value])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setOptions([])
      setOpen(false)
      return
    }
    setLoading(true)
    const thisRequest = ++requestIdRef.current
    try {
      const res = await fetch(`/api/cicli?q=${encodeURIComponent(q)}`)
      const json = res.ok ? await res.json() : { cicli: [] }
      if (thisRequest !== requestIdRef.current) return
      setOptions(Array.isArray(json.cicli) ? json.cicli : [])
      setOpen((Array.isArray(json.cicli) ? json.cicli : []).length > 0)
    } finally {
      if (thisRequest === requestIdRef.current) setLoading(false)
    }
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (value) {
      onChange('', '')
      setSelectedLabel('')
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 200)
  }

  function closeDropdown() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleSelect(option: CicloOption) {
    const label = buildLabel(option)
    setSelectedLabel(label)
    setQuery(label)
    closeDropdown()
    setOptions([])
    onChange(option.id, label)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && options[activeIndex]) {
        handleSelect(options[activeIndex])
      }
    } else if (e.key === 'Escape') {
      closeDropdown()
    }
  }

  const displayValue = selectedLabel || query

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        id={id ?? inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        autoComplete="off"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (query && options.length > 0) setOpen(true) }}
        placeholder={placeholder}
        style={{ ...inputBase, paddingRight: loading ? '40px' : '14px' }}
      />

      {loading && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: '2px solid rgba(0,0,0,.12)',
            borderTopColor: 'var(--primary, #D90012)',
            animation: 'ciclo-combobox-spin 0.7s linear infinite',
            display: 'inline-block',
          }}
        />
      )}

      {open && options.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Risultati ricerca ciclo"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            margin: 0,
            padding: '4px',
            listStyle: 'none',
            borderRadius: '12px',
            background: 'var(--surface, #E4DFD9)',
            border: '1px solid var(--elv, #EDEDEA)',
            boxShadow: 'var(--sh-b)',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {options.map((option, index) => {
            const isActive = index === activeIndex
            return (
              <li
                key={option.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={option.id === value}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(option) }}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: 'var(--t1, #1C1916)',
                  background: isActive ? 'var(--elv, #EDEDEA)' : 'transparent',
                  transition: 'background var(--tr)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontWeight: 600 }}>{option.nome}</span>
                <span style={{ fontSize: '12px', color: 'var(--t2, #4A3D33)' }}>
                  {option.codice} · {option.tipo_dispositivo}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <style>{`
        @keyframes ciclo-combobox-spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/CicloComboBox.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/lavori/CicloComboBox.tsx tests/unit/CicloComboBox.test.tsx
git commit -m "feat(lavori): add CicloComboBox component"
```

---

## Task 7: Selettore ciclo in `TabDati` + `NuovoLavoroPage`

**Files:**
- Modify: `src/components/features/lavori/form/TabDati.tsx`
- Modify: `src/app/(app)/lavori/nuovo/page.tsx`
- Test: `tests/unit/TabDati.test.tsx` (nuovo, se non esiste già un test file per TabDati — verifica prima con `find tests -iname "*TabDati*"`; se esiste, aggiungi i casi sotto invece di creare un file nuovo)

**Interfaces:**
- Consumes: `CicloComboBox` (Task 6).
- Produces: `TabDati` accetta 2 nuovi prop opzionali `cicloId?: string`, `onCicloChange?: (id: string, label: string) => void`. `NuovoLavoroPage` invia `ciclo_id` nel body di `POST /api/lavori` (consumato da Task 2).

- [ ] **Step 1: Scrivi i test che falliscono**

```tsx
// tests/unit/TabDati.test.tsx (o append se esiste già)
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TabDati } from '../../src/components/features/lavori/form/TabDati'

describe('TabDati — selettore ciclo', () => {
  it('onCicloChange fornito → mostra il campo "Ciclo di produzione"', () => {
    render(
      <TabDati
        data={{}}
        onChange={vi.fn()}
        cicloId=""
        onCicloChange={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/Ciclo di produzione/i)).toBeInTheDocument()
  })

  it('onCicloChange assente → il campo "Ciclo di produzione" non è renderizzato', () => {
    render(<TabDati data={{}} onChange={vi.fn()} />)
    expect(screen.queryByLabelText(/Ciclo di produzione/i)).not.toBeInTheDocument()
  })

  it('il campo ciclo non è mai contrassegnato come obbligatorio', () => {
    render(
      <TabDati data={{}} onChange={vi.fn()} cicloId="" onCicloChange={vi.fn()} />
    )
    const field = screen.getByLabelText(/Ciclo di produzione/i)
    expect(field).not.toHaveAttribute('aria-required', 'true')
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/TabDati.test.tsx`
Expected: FAIL (prop `cicloId`/`onCicloChange` non esistono).

- [ ] **Step 3: Modifica `TabDati.tsx`**

Aggiungi l'import e i prop (in cima al file, dopo l'import di `ClienteComboBox`):

```typescript
import { CicloComboBox } from '@/components/features/lavori/CicloComboBox'
```

Estendi `TabDatiProps` (righe 64-70):

```typescript
interface TabDatiProps {
  data: Partial<Lavoro>
  onChange: (updates: Partial<Lavoro>) => void
  clienteId?: string
  onClienteChange?: (id: string, label: string) => void
  fieldErrors?: Record<string, string>
  cicloId?: string
  onCicloChange?: (id: string, label: string) => void
}
```

Aggiorna la firma della funzione (riga 80):

```typescript
export function TabDati({ data, onChange, clienteId, onClienteChange, fieldErrors, cicloId, onCicloChange }: TabDatiProps) {
```

Inserisci il nuovo campo subito dopo il blocco "1. Tipo dispositivo" (dopo la chiusura del `<div style={fieldStyle}>` del tipo dispositivo, riga 174, prima del blocco "2. Descrizione"):

```tsx
      {/* 1.5 Ciclo di produzione (facoltativo) */}
      {onCicloChange && (
        <div style={fieldStyle}>
          <label htmlFor="field-ciclo_id" style={labelStyle}>
            Ciclo di produzione
          </label>
          <CicloComboBox
            id="field-ciclo_id"
            value={cicloId ?? ''}
            onChange={onCicloChange}
          />
        </div>
      )}
```

- [ ] **Step 4: Modifica `src/app/(app)/lavori/nuovo/page.tsx`**

Aggiungi lo stato e il gestore (dopo `handleClienteChange`, riga 92):

```typescript
  const [cicloId, setCicloId] = useState('')

  const handleCicloChange = useCallback((id: string) => {
    setCicloId(id)
  }, [])
```

Passa i nuovi prop a `TabDati` (nel render, riga 189-195):

```tsx
              <TabDati
                data={formData}
                onChange={handleChange}
                clienteId={clienteId}
                onClienteChange={handleClienteChange}
                fieldErrors={fieldErrors}
                cicloId={cicloId}
                onCicloChange={handleCicloChange}
              />
```

Includi `ciclo_id` nel body della POST (riga 130):

```typescript
        body: JSON.stringify({ ...formData, cliente_id: clienteId, ciclo_id: cicloId || null }),
```

- [ ] **Step 5: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/TabDati.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 6: Esegui l'intera suite e tsc**

Run: `npx vitest run && npx tsc --noEmit`
Expected: verde, nessun errore.

- [ ] **Step 7: Commit**

```bash
git add src/components/features/lavori/form/TabDati.tsx "src/app/(app)/lavori/nuovo/page.tsx" tests/unit/TabDati.test.tsx
git commit -m "feat(lavori): add optional ciclo di produzione selector to creation form"
```

---

## Task 8: `GET /api/fasi-produzione/ricerca?q=` — typeahead libreria

**Files:**
- Create: `src/app/api/fasi-produzione/ricerca/route.ts`
- Test: `tests/unit/fasi-produzione-ricerca-route.test.ts`

**Interfaces:**
- Consumes: nessuna dipendenza da altri task.
- Produces: `GET /api/fasi-produzione/ricerca?q=<testo>` → `{ fasi: [{codice_fase, descrizione, attrezzatura, controllo_misura, esito_atteso, materiali_nota, obbligatoria}] }` (mai `id`/`ciclo_id` — sono campi da copiare, non riferimenti). Consumato da `CicloFasiEditor` (Task 10).

- [ ] **Step 1: Scrivi i test che falliscono**

```typescript
// tests/unit/fasi-produzione-ricerca-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET } from '../../src/app/api/fasi-produzione/ricerca/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

const ROWS = [
  { codice_fase: 'OL10', descrizione: 'Disegno modelli progettazione', attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null, obbligatoria: true },
]

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'or', 'order', 'limit']) c[m] = () => c
  c.then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

function mockLab(result: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    if (table === 'fasi_produzione') return chain(result)
    throw new Error(`Unexpected table: ${table}`)
  })
}

function req(url: string) { return new Request(url) }

describe('GET /api/fasi-produzione/ricerca', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(req('http://localhost/api/fasi-produzione/ricerca?q=disegno'))
    expect(res.status).toBe(401)
  })

  it('match trovato → 200, solo campi copiabili (mai id/ciclo_id)', async () => {
    mockLab({ data: ROWS, error: null })
    const res = await GET(req('http://localhost/api/fasi-produzione/ricerca?q=disegno'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.fasi).toEqual(ROWS)
    expect(json.fasi[0]).not.toHaveProperty('id')
    expect(json.fasi[0]).not.toHaveProperty('ciclo_id')
  })

  it('nessun match → 200, lista vuota', async () => {
    mockLab({ data: [], error: null })
    const res = await GET(req('http://localhost/api/fasi-produzione/ricerca?q=xxxxx'))
    const json = await res.json()
    expect(json.fasi).toEqual([])
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/fasi-produzione-ricerca-route.test.ts`
Expected: FAIL (route inesistente).

- [ ] **Step 3: Implementa**

```typescript
// src/app/api/fasi-produzione/ricerca/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (utenteError) {
    return NextResponse.json({ error: 'Errore nel recupero del laboratorio' }, { status: 500 })
  }
  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = utente.laboratorio_id

  let query = svc
    .from('fasi_produzione')
    .select('codice_fase, descrizione, attrezzatura, controllo_misura, esito_atteso, materiali_nota, obbligatoria')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .order('codice_fase', { ascending: true })
    .limit(8)

  if (q) {
    query = query.or(`codice_fase.ilike.%${q}%,descrizione.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Errore nella ricerca fasi' }, { status: 500 })
  }

  return NextResponse.json({ fasi: data ?? [] })
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/fasi-produzione-ricerca-route.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/fasi-produzione/ricerca/route.ts tests/unit/fasi-produzione-ricerca-route.test.ts
git commit -m "feat(api): add GET /api/fasi-produzione/ricerca typeahead endpoint"
```

---

## Task 9: `PATCH /api/cicli/[id]/fasi` — salvataggio batch (pattern `RischiEditor`)

**Files:**
- Create: `src/app/api/cicli/[id]/fasi/route.ts`
- Test: `tests/unit/cicli-fasi-patch-route.test.ts`

**Interfaces:**
- Consumes: nessuna dipendenza da altri task.
- Produces: `PATCH /api/cicli/[id]/fasi` con body `{ fasi: Array<{ id?: string, codice_fase: string, descrizione: string, obbligatoria?: boolean, attrezzatura?: string|null, controllo_misura?: string|null, esito_atteso?: string|null, materiali_nota?: string|null }> }`. Sostituisce l'intera lista fasi del ciclo: righe con `id` esistente vengono aggiornate, righe senza `id` vengono create, righe esistenti non più presenti nell'array vengono soft-deleted. `ordine` = posizione nell'array (1-based). Consumato da `CicloFasiEditor` (Task 10).

- [ ] **Step 1: Scrivi i test che falliscono**

```typescript
// tests/unit/cicli-fasi-patch-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/cicli/[id]/fasi/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const CICLO_ID = 'ciclo-1'
const params = Promise.resolve({ id: CICLO_ID })

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/cicli/ciclo-1/fasi', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

/** Costruisce un mockFrom con: ciclo esistente per il lab, fasi esistenti date,
 *  e spy separati per insert/update/delete su fasi_produzione. */
function setupTables({
  cicloOwned = true,
  existingFasi = [] as Array<{ id: string; codice_fase: string }>,
  insertSpy = vi.fn(),
  updateSpy = vi.fn(),
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'cicli_produzione') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: cicloOwned ? { id: CICLO_ID, laboratorio_id: LAB_ID } : null, error: null }) }) }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
    }
    if (table === 'fasi_produzione') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ is: () => Promise.resolve({ data: existingFasi, error: null }) }) }) }),
        insert: (rows: unknown[]) => { insertSpy(rows); return Promise.resolve({ error: null }) },
        update: (payload: Record<string, unknown>) => {
          updateSpy(payload)
          // .update(...).eq('id', ...).eq('laboratorio_id', ...) — 2 livelli di chain
          return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
  return { insertSpy, updateSpy }
}

describe('PATCH /api/cicli/[id]/fasi — salvataggio batch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('ciclo di un altro laboratorio → 404', async () => {
    setupTables({ cicloOwned: false })
    const res = await PATCH(req({ fasi: [{ codice_fase: 'X1', descrizione: 'Test' }] }), { params })
    expect(res.status).toBe(404)
  })

  it('fase senza descrizione → 422, nessuna scrittura', async () => {
    const { insertSpy } = setupTables({ existingFasi: [] })
    const res = await PATCH(req({ fasi: [{ codice_fase: 'X1', descrizione: '' }] }), { params })
    expect(res.status).toBe(422)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('2 fasi nuove (senza id) → 2 insert con ciclo_id/laboratorio_id/ordine/updated_by corretti', async () => {
    const { insertSpy } = setupTables({ existingFasi: [] })
    const res = await PATCH(req({
      fasi: [
        { codice_fase: 'X1', descrizione: 'Prima fase' },
        { codice_fase: 'X2', descrizione: 'Seconda fase' },
      ],
    }), { params })

    expect(res.status).toBe(200)
    expect(insertSpy).toHaveBeenCalledWith([
      expect.objectContaining({ ciclo_id: CICLO_ID, laboratorio_id: LAB_ID, ordine: 1, codice_fase: 'X1', updated_by: AUTH_USER.id }),
      expect.objectContaining({ ciclo_id: CICLO_ID, laboratorio_id: LAB_ID, ordine: 2, codice_fase: 'X2', updated_by: AUTH_USER.id }),
    ])
  })

  it('fase esistente presente nell\'array → update, non insert', async () => {
    const { insertSpy, updateSpy } = setupTables({ existingFasi: [{ id: 'fase-esistente', codice_fase: 'X1' }] })
    const res = await PATCH(req({
      fasi: [{ id: 'fase-esistente', codice_fase: 'X1', descrizione: 'Descrizione modificata' }],
    }), { params })

    expect(res.status).toBe(200)
    expect(insertSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ descrizione: 'Descrizione modificata', ordine: 1, updated_by: AUTH_USER.id }))
  })

  it('fase esistente NON presente nell\'array → soft delete (updateSpy con deleted_at)', async () => {
    const { updateSpy } = setupTables({ existingFasi: [{ id: 'fase-rimossa', codice_fase: 'X0' }] })
    const res = await PATCH(req({ fasi: [] }), { params })

    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.any(String), updated_by: AUTH_USER.id }))
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/cicli-fasi-patch-route.test.ts`
Expected: FAIL (route inesistente).

- [ ] **Step 3: Implementa**

```typescript
// src/app/api/cicli/[id]/fasi/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string }> }

interface FaseInput {
  id?: string
  codice_fase: string
  descrizione: string
  obbligatoria?: boolean
  attrezzatura?: string | null
  controllo_misura?: string | null
  esito_atteso?: string | null
  materiali_nota?: string | null
}

export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id: cicloId } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (utenteError) {
    return NextResponse.json({ error: 'Errore nel recupero del laboratorio' }, { status: 500 })
  }
  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = utente.laboratorio_id

  const { data: ciclo } = await svc
    .from('cicli_produzione')
    .select('id')
    .eq('id', cicloId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!ciclo) {
    return NextResponse.json({ error: 'Ciclo non trovato' }, { status: 404 })
  }

  let body: { fasi?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const fasiInput = Array.isArray(body.fasi) ? (body.fasi as FaseInput[]) : []

  for (let i = 0; i < fasiInput.length; i++) {
    const f = fasiInput[i]
    if (!f.codice_fase?.trim()) {
      return NextResponse.json({ error: `Fase #${i + 1}: campo "codice_fase" obbligatorio` }, { status: 422 })
    }
    if (!f.descrizione?.trim()) {
      return NextResponse.json({ error: `Fase #${i + 1}: campo "descrizione" obbligatorio` }, { status: 422 })
    }
  }

  const { data: existingFasi } = await svc
    .from('fasi_produzione')
    .select('id, codice_fase')
    .eq('ciclo_id', cicloId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)

  const existing = existingFasi ?? []
  const existingIds = new Set(existing.map((row) => row.id))
  // Un id che il client manda ma che non appartiene a QUESTO ciclo/lab (fetched
  // sopra, già scoped) viene trattato come inesistente — mai fidarsi ciecamente
  // di un id arbitrario per un UPDATE cross-tenant.
  const keptIds = new Set(fasiInput.map((f) => f.id).filter((id): id is string => !!id && existingIds.has(id)))
  const now = new Date().toISOString()

  // Righe nuove: insert in blocco (include anche un id fornito dal client
  // ma non riconosciuto come esistente per questo ciclo)
  const nuove = fasiInput
    .map((f, index) => ({ f, ordine: index + 1 }))
    .filter(({ f }) => !f.id || !existingIds.has(f.id))
  if (nuove.length > 0) {
    await svc.from('fasi_produzione').insert(
      nuove.map(({ f, ordine }) => ({
        ciclo_id: cicloId,
        laboratorio_id: labId,
        ordine,
        codice_fase: f.codice_fase,
        descrizione: f.descrizione,
        obbligatoria: f.obbligatoria ?? true,
        attrezzatura: f.attrezzatura ?? null,
        controllo_misura: f.controllo_misura ?? null,
        esito_atteso: f.esito_atteso ?? null,
        materiali_nota: f.materiali_nota ?? null,
        updated_by: user.id,
      }))
    )
  }

  // Righe esistenti presenti nell'array (id riconosciuto per QUESTO ciclo/lab):
  // update singolo, scoped anche per laboratorio_id per difesa-in-profondità
  // (bassa cardinalità, nessuna ottimizzazione batch necessaria — coerente col
  // volume atteso, decine di fasi per ciclo)
  for (let index = 0; index < fasiInput.length; index++) {
    const f = fasiInput[index]
    if (!f.id || !existingIds.has(f.id)) continue
    await svc
      .from('fasi_produzione')
      .update({
        ordine: index + 1,
        descrizione: f.descrizione,
        obbligatoria: f.obbligatoria ?? true,
        attrezzatura: f.attrezzatura ?? null,
        controllo_misura: f.controllo_misura ?? null,
        esito_atteso: f.esito_atteso ?? null,
        materiali_nota: f.materiali_nota ?? null,
        updated_by: user.id,
      })
      .eq('id', f.id)
      .eq('laboratorio_id', labId)
  }

  // Righe esistenti non più presenti nell'array: soft delete
  for (const row of existing) {
    if (!keptIds.has(row.id)) {
      await svc
        .from('fasi_produzione')
        .update({ deleted_at: now, updated_by: user.id })
        .eq('id', row.id)
        .eq('laboratorio_id', labId)
    }
  }

  // Bump "ultima modifica" sul ciclo padre
  await svc
    .from('cicli_produzione')
    .update({ updated_by: user.id, updated_at: now })
    .eq('id', cicloId)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/cicli-fasi-patch-route.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Esegui l'intera suite**

Run: `npx vitest run`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cicli/[id]/fasi/route.ts tests/unit/cicli-fasi-patch-route.test.ts
git commit -m "feat(api): add PATCH /api/cicli/[id]/fasi batch save endpoint"
```

---

## Task 10: `CicloFasiEditor.tsx` — editor fasi (pattern `RischiEditor`)

**Files:**
- Create: `src/components/features/cicli/CicloFasiEditor.tsx`
- Test: `tests/unit/CicloFasiEditor.test.tsx`

**Interfaces:**
- Consumes: `PATCH /api/cicli/[id]/fasi` (Task 9), `GET /api/fasi-produzione/ricerca` (Task 8).
- Produces: `<CicloFasiEditor cicloId nomeCiclo fasiIniziali ultimaModificaLabel />`. Usato dalla pagina dettaglio (Task 11).

- [ ] **Step 1: Scrivi i test che falliscono**

```tsx
// tests/unit/CicloFasiEditor.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CicloFasiEditor } from '../../src/components/features/cicli/CicloFasiEditor'

const originalFetch = global.fetch

describe('CicloFasiEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it('nessuna fase iniziale → messaggio "nessuna fase" e bottone aggiungi', () => {
    render(<CicloFasiEditor cicloId="ciclo-1" nomeCiclo="CNC Corona" fasiIniziali={[]} ultimaModificaLabel={null} />)
    expect(screen.getByText(/nessuna fase/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ Aggiungi fase/i })).toBeInTheDocument()
  })

  it('"+ Aggiungi fase" aggiunge una riga vuota compilabile', () => {
    render(<CicloFasiEditor cicloId="ciclo-1" nomeCiclo="CNC Corona" fasiIniziali={[]} ultimaModificaLabel={null} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ Aggiungi fase/i }))
    expect(screen.getByLabelText(/Fase 1 — Codice/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fase 1 — Descrizione/i)).toBeInTheDocument()
  })

  it('cerca in libreria → seleziona un risultato → precompila una nuova riga', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ fasi: [{ codice_fase: 'OL10', descrizione: 'Disegno modelli progettazione', attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null, obbligatoria: true }] }),
    }) as unknown as typeof fetch

    render(<CicloFasiEditor cicloId="ciclo-1" nomeCiclo="CNC Corona" fasiIniziali={[]} ultimaModificaLabel={null} />)

    fireEvent.change(screen.getByPlaceholderText(/Cerca nella libreria/i), { target: { value: 'disegno' } })
    await vi.advanceTimersByTimeAsync(250)

    await waitFor(() => expect(screen.getByText('Disegno modelli progettazione')).toBeInTheDocument())
    fireEvent.mouseDown(screen.getByText('Disegno modelli progettazione'))

    expect(screen.getByDisplayValue('OL10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Disegno modelli progettazione')).toBeInTheDocument()
  })

  it('rimuovi fase → la rimuove dalla lista locale', () => {
    render(
      <CicloFasiEditor
        cicloId="ciclo-1"
        nomeCiclo="CNC Corona"
        fasiIniziali={[{ id: 'fase-1', codice_fase: 'OL10', descrizione: 'Disegno modelli', obbligatoria: true, attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null }]}
        ultimaModificaLabel="Francesco Formicola il 04/07/2026"
      />
    )
    expect(screen.getByText(/Francesco Formicola/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Rimuovi fase 1/i }))
    expect(screen.queryByLabelText(/Fase 1 — Codice/i)).not.toBeInTheDocument()
  })

  it('Salva → chiama PATCH /api/cicli/:id/fasi col body corretto', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    global.fetch = fetchSpy as unknown as typeof fetch

    const reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { reload }, writable: true })

    render(
      <CicloFasiEditor
        cicloId="ciclo-1"
        nomeCiclo="CNC Corona"
        fasiIniziali={[{ id: 'fase-1', codice_fase: 'OL10', descrizione: 'Disegno modelli', obbligatoria: true, attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null }]}
        ultimaModificaLabel={null}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Salva modifiche/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      '/api/cicli/ciclo-1/fasi',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ fasi: [{ id: 'fase-1', codice_fase: 'OL10', descrizione: 'Disegno modelli', obbligatoria: true, attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null }] }),
      })
    ))
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/CicloFasiEditor.test.tsx`
Expected: FAIL (il file non esiste).

- [ ] **Step 3: Implementa**

```tsx
// src/components/features/cicli/CicloFasiEditor.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'

export interface FaseItem {
  id?: string
  codice_fase: string
  descrizione: string
  obbligatoria: boolean
  attrezzatura: string | null
  controllo_misura: string | null
  esito_atteso: string | null
  materiali_nota: string | null
}

interface LibreriaResult {
  codice_fase: string
  descrizione: string
  attrezzatura: string | null
  controllo_misura: string | null
  esito_atteso: string | null
  materiali_nota: string | null
  obbligatoria: boolean
}

interface CicloFasiEditorProps {
  cicloId: string
  nomeCiclo: string
  fasiIniziali: FaseItem[]
  ultimaModificaLabel: string | null
}

const fontFamily = "'DM Sans', system-ui, sans-serif"

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  background: 'var(--elv, #EDEDEA)',
  border: '1px solid var(--prs, #D4CFC9)',
  borderRadius: 9,
  fontSize: 13,
  color: 'var(--t1)',
  fontFamily,
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--t2)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  fontFamily,
  marginBottom: 3,
  display: 'block',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--sfc, #E4DFD9)',
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
}

function faseVuota(): FaseItem {
  return {
    codice_fase: '',
    descrizione: '',
    obbligatoria: true,
    attrezzatura: null,
    controllo_misura: null,
    esito_atteso: null,
    materiali_nota: null,
  }
}

export function CicloFasiEditor({ cicloId, nomeCiclo, fasiIniziali, ultimaModificaLabel }: CicloFasiEditorProps) {
  const [fasi, setFasi] = useState<FaseItem[]>(fasiIniziali)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [libreriaQuery, setLibreriaQuery] = useState('')
  const [libreriaResults, setLibreriaResults] = useState<LibreriaResult[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleLibreriaSearch(q: string) {
    setLibreriaQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setLibreriaResults([]); return }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/fasi-produzione/ricerca?q=${encodeURIComponent(q)}`)
      const json = res.ok ? await res.json() : { fasi: [] }
      setLibreriaResults(Array.isArray(json.fasi) ? json.fasi : [])
    }, 200)
  }

  function aggiungiDaLibreria(r: LibreriaResult) {
    setFasi((prev) => [...prev, {
      codice_fase: r.codice_fase,
      descrizione: r.descrizione,
      obbligatoria: r.obbligatoria,
      attrezzatura: r.attrezzatura,
      controllo_misura: r.controllo_misura,
      esito_atteso: r.esito_atteso,
      materiali_nota: r.materiali_nota,
    }])
    setLibreriaQuery('')
    setLibreriaResults([])
    hapticLight()
  }

  function aggiungiVuota() {
    setFasi((prev) => [...prev, faseVuota()])
    hapticLight()
  }

  function aggiornaFase(index: number, patch: Partial<FaseItem>) {
    setFasi((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function rimuoviFase(index: number) {
    setFasi((prev) => prev.filter((_, i) => i !== index))
    hapticLight()
  }

  async function handleSave() {
    setError(null)

    for (let i = 0; i < fasi.length; i++) {
      if (!fasi[i].codice_fase.trim()) {
        setError(`Fase ${i + 1}: campo "codice" obbligatorio`)
        return
      }
      if (!fasi[i].descrizione.trim()) {
        setError(`Fase ${i + 1}: campo "descrizione" obbligatorio`)
        return
      }
    }

    setSaving(true)
    hapticLight()

    try {
      const res = await fetch(`/api/cicli/${cicloId}/fasi`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fasi }),
      })

      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Errore durante il salvataggio, riprova')
        setSaving(false)
        return
      }

      hapticMedium()
      window.location.reload()
    } catch {
      setError('Errore di rete — controlla la connessione')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '0 20px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6, fontFamily }}>
          {nomeCiclo}
        </div>
        {ultimaModificaLabel && (
          <div style={{ fontSize: 12, color: 'var(--t2)', fontFamily }}>
            Ultima modifica di {ultimaModificaLabel}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, fontFamily, fontSize: 13, color: 'var(--primary, #D90012)' }}>
          {error}
        </p>
      )}

      {fasi.length === 0 && (
        <p style={{ margin: 0, fontFamily, fontSize: 14, color: 'var(--t2)' }}>
          Nessuna fase definita per questo ciclo.
        </p>
      )}

      {fasi.map((f, i) => (
        <div key={f.id ?? `nuova-${i}`} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', fontFamily }}>Fase {i + 1}</span>
            <button
              type="button"
              onClick={() => rimuoviFase(i)}
              aria-label={`Rimuovi fase ${i + 1}`}
              style={{ background: 'none', border: 'none', color: 'var(--primary, #D90012)', cursor: 'pointer', fontSize: 12, fontFamily, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 10px' }}
            >
              Rimuovi
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={labelStyle} htmlFor={`fase-${i}-codice`}>Fase {i + 1} — Codice</label>
              <input id={`fase-${i}-codice`} style={inputStyle} value={f.codice_fase} onChange={(e) => aggiornaFase(i, { codice_fase: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle} htmlFor={`fase-${i}-descrizione`}>Fase {i + 1} — Descrizione</label>
              <input id={`fase-${i}-descrizione`} style={inputStyle} value={f.descrizione} onChange={(e) => aggiornaFase(i, { descrizione: e.target.value })} />
            </div>
          </div>
        </div>
      ))}

      <div style={cardStyle}>
        <label style={labelStyle} htmlFor="cerca-libreria">Cerca nella libreria fasi esistenti</label>
        <input
          id="cerca-libreria"
          style={inputStyle}
          placeholder="Cerca nella libreria per codice o descrizione..."
          value={libreriaQuery}
          onChange={(e) => handleLibreriaSearch(e.target.value)}
        />
        {libreriaResults.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
            {libreriaResults.map((r) => (
              <li
                key={r.codice_fase}
                onMouseDown={() => aggiungiDaLibreria(r)}
                style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily, color: 'var(--t1)' }}
              >
                <strong>{r.codice_fase}</strong> — {r.descrizione}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={aggiungiVuota}
        style={{ padding: '10px 14px', borderRadius: 10, border: '1px dashed var(--prs, #D4CFC9)', background: 'transparent', color: 'var(--t2)', fontWeight: 600, fontSize: 13, fontFamily, cursor: 'pointer', minHeight: 44 }}
      >
        + Aggiungi fase
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{ padding: '13px', background: saving ? 'var(--prs)' : 'var(--primary, #D90012)', color: 'white', borderRadius: 12, fontWeight: 700, fontSize: 15, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily, minHeight: 48 }}
      >
        {saving ? 'Salvataggio...' : 'Salva modifiche'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/CicloFasiEditor.test.tsx`
Expected: PASS (5/5).

- [ ] **Step 5: Esegui l'intera suite e tsc**

Run: `npx vitest run && npx tsc --noEmit`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/cicli/CicloFasiEditor.tsx tests/unit/CicloFasiEditor.test.tsx
git commit -m "feat(cicli): add CicloFasiEditor component"
```

---

## Task 11: Pagine `/cicli-produzione` (lista) e `/cicli-produzione/[id]` (dettaglio)

**Files:**
- Create: `src/components/features/cicli/CicliProduzioneList.tsx` (client, filtro locale)
- Create: `src/app/(app)/cicli-produzione/page.tsx` (server component)
- Create: `src/app/(app)/cicli-produzione/[id]/page.tsx` (server component)
- Test: `tests/unit/CicliProduzioneList.test.tsx`

**Interfaces:**
- Consumes: `CicloFasiEditor` (Task 10). Query dirette a `cicli_produzione`/`fasi_produzione`/`utenti` (nessuna nuova API — pattern identico a `qualita/rischi/page.tsx`).
- Produces: route pubbliche (per gli utenti autenticati del lab, tutti i ruoli) `/cicli-produzione` e `/cicli-produzione/[id]`.

- [ ] **Step 1: Scrivi il test del filtro locale che fallisce**

```tsx
// tests/unit/CicliProduzioneList.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CicliProduzioneList } from '../../src/components/features/cicli/CicliProduzioneList'

const CICLI = [
  { id: 'c1', codice: 'CNC.TitCer', nome: 'CNC Corona in titanio-ceramica', tipo_dispositivo: 'Protesi fissa' },
  { id: 'c2', codice: 'Ceramizz', nome: 'Ceramizzazione opaco', tipo_dispositivo: 'Protesi fissa' },
]

describe('CicliProduzioneList', () => {
  it('mostra tutti i cicli inizialmente', () => {
    render(<CicliProduzioneList cicli={CICLI} />)
    expect(screen.getByText('CNC Corona in titanio-ceramica')).toBeInTheDocument()
    expect(screen.getByText('Ceramizzazione opaco')).toBeInTheDocument()
  })

  it('filtra per codice/nome digitando nel campo di ricerca', () => {
    render(<CicliProduzioneList cicli={CICLI} />)
    fireEvent.change(screen.getByPlaceholderText(/Cerca ciclo/i), { target: { value: 'titanio' } })
    expect(screen.getByText('CNC Corona in titanio-ceramica')).toBeInTheDocument()
    expect(screen.queryByText('Ceramizzazione opaco')).not.toBeInTheDocument()
  })

  it('ogni riga è un link verso /cicli-produzione/[id]', () => {
    render(<CicliProduzioneList cicli={CICLI} />)
    expect(screen.getByRole('link', { name: /CNC Corona in titanio-ceramica/i })).toHaveAttribute('href', '/cicli-produzione/c1')
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/CicliProduzioneList.test.tsx`
Expected: FAIL (il file non esiste).

- [ ] **Step 3: Implementa `CicliProduzioneList.tsx`**

```tsx
// src/components/features/cicli/CicliProduzioneList.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface CicloListItem {
  id: string
  codice: string
  nome: string
  tipo_dispositivo: string
}

const fontFamily = "'DM Sans', system-ui, sans-serif"

export function CicliProduzioneList({ cicli }: { cicli: CicloListItem[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? cicli.filter((c) =>
        c.codice.toLowerCase().includes(query.toLowerCase()) ||
        c.nome.toLowerCase().includes(query.toLowerCase())
      )
    : cicli

  return (
    <div style={{ padding: '0 20px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="text"
        placeholder="Cerca ciclo per codice o nome..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          background: 'var(--bg, #DDD8D3)',
          border: '1px solid var(--elv, #EDEDEA)',
          color: 'var(--t1, #1C1916)',
          fontFamily,
          fontSize: 15,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {filtered.length === 0 && (
        <p style={{ fontFamily, fontSize: 14, color: 'var(--t2)', textAlign: 'center', margin: '24px 0' }}>
          Nessun ciclo trovato.
        </p>
      )}

      {filtered.map((c) => (
        <Link
          key={c.id}
          href={`/cicli-produzione/${c.id}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: '14px 16px',
            borderRadius: 14,
            background: 'var(--sfc, #E4DFD9)',
            textDecoration: 'none',
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily, fontSize: 15, fontWeight: 600, color: 'var(--t1, #1C1916)' }}>
            {c.nome}
          </span>
          <span style={{ fontFamily, fontSize: 12, color: 'var(--t2, #4A3D33)' }}>
            {c.codice} · {c.tipo_dispositivo}
          </span>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/CicliProduzioneList.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Implementa la pagina lista**

```tsx
// src/app/(app)/cicli-produzione/page.tsx
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { CicliProduzioneList } from '@/components/features/cicli/CicliProduzioneList'

export const metadata = { title: 'Cicli di produzione' }

export default async function CicliProduzionePage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) return null

  const { data: cicli } = await svc
    .from('cicli_produzione')
    .select('id, codice, nome, tipo_dispositivo')
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .order('codice', { ascending: true })
    .limit(500)

  return (
    <>
      <AppHeader title="Cicli di produzione" backHref="/dashboard" />
      <PageWrapper>
        <CicliProduzioneList cicli={cicli ?? []} />
      </PageWrapper>
    </>
  )
}
```

- [ ] **Step 6: Implementa la pagina dettaglio**

```tsx
// src/app/(app)/cicli-produzione/[id]/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { CicloFasiEditor } from '@/components/features/cicli/CicloFasiEditor'
import type { FaseItem } from '@/components/features/cicli/CicloFasiEditor'

interface Props { params: Promise<{ id: string }> }

function formatDataOra(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function CicloDettaglioPage({ params }: Props) {
  const { id } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: ciclo } = await svc
    .from('cicli_produzione')
    .select('id, codice, nome, updated_by, updated_at')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!ciclo) redirect('/cicli-produzione')

  const { data: fasiRows } = await svc
    .from('fasi_produzione')
    .select('id, codice_fase, descrizione, obbligatoria, attrezzatura, controllo_misura, esito_atteso, materiali_nota')
    .eq('ciclo_id', id)
    .is('deleted_at', null)
    .order('ordine', { ascending: true })

  let ultimaModificaLabel: string | null = null
  if (ciclo.updated_by) {
    const { data: editor } = await svc.from('utenti').select('nome, cognome').eq('id', ciclo.updated_by).single()
    if (editor) {
      ultimaModificaLabel = `${editor.nome} ${editor.cognome} il ${formatDataOra(ciclo.updated_at)}`
    }
  }

  return (
    <>
      <AppHeader title={ciclo.nome} subtitle={ciclo.codice} backHref="/cicli-produzione" />
      <PageWrapper>
        <CicloFasiEditor
          cicloId={ciclo.id}
          nomeCiclo={ciclo.nome}
          fasiIniziali={(fasiRows ?? []) as FaseItem[]}
          ultimaModificaLabel={ultimaModificaLabel}
        />
      </PageWrapper>
    </>
  )
}
```

- [ ] **Step 7: Verifica manuale in browser (dev server)**

Avvia `npm run dev`, naviga a `/cicli-produzione` (utente autenticato), verifica che la lista carichi, il filtro funzioni, e che il click su un ciclo apra `/cicli-produzione/[id]` con l'editor fasi. Salva una modifica e verifica il reload + persistenza.

- [ ] **Step 8: Esegui l'intera suite e tsc**

Run: `npx vitest run && npx tsc --noEmit`
Expected: verde.

- [ ] **Step 9: Commit**

```bash
git add src/components/features/cicli/CicliProduzioneList.tsx "src/app/(app)/cicli-produzione" tests/unit/CicliProduzioneList.test.tsx
git commit -m "feat(cicli): add /cicli-produzione list and detail pages"
```

---

## Task 12: Verifica end-to-end completa + QA manuale in browser

**Files:** nessuno (solo verifica — nessun file di produzione modificato in questo task).

**Interfaces:**
- Consumes: tutti i task precedenti (1-11), tutti devono essere completati e committati.
- Produces: conferma che l'intero flusso B3 funziona end-to-end, prima di chiudere il lavoro.

- [ ] **Step 1: Verifica automatica completa**

Run in sequenza:
```bash
npx tsc --noEmit
npx vitest run
npx next build
```
Expected: tutti e 3 puliti/verdi. Annota il numero totale di test (era 377 prima di questo lavoro).

- [ ] **Step 2: QA manuale — flusso creazione lavoro con ciclo**

In un lab E2E isolato (mai il lab Filippo — usa `scripts/seed-e2e.ts` se serve un fornitore/cliente di test), login come `e2e-titolare@ua-test.local`:
1. Vai su `/cicli-produzione`, verifica che la lista carichi con i cicli reali del lab.
2. Apri un ciclo, usa "Cerca nella libreria" per aggiungere 2-3 fasi (es. cerca "disegno" o "ceratura"), salva.
3. Verifica in rete: 1 sola `PATCH /api/cicli/[id]/fasi`, 200, pagina ricaricata, le fasi salvate sono visibili.
4. Vai su `/lavori/nuovo`, compila i campi obbligatori, cerca e seleziona nel campo "Ciclo di produzione" lo stesso ciclo appena popolato, crea il lavoro.
5. Apri il lavoro creato → tab Produzione → verifica che le fasi del ciclo siano precompilate nell'ordine corretto.
6. Segna una fase "OK", ricarica la pagina → verifica che l'esito sia rimasto (regressione diretta del bug di persistenza trovato in fase di audit).
7. Segna un'altra fase "Non conf.", compila "Azione correttiva", esci dal campo, ricarica → verifica che sia persistito.
8. Vai su `/qualita` → verifica che la fase appena segnata "Non conf." compaia nella sezione "Non Conformità Recenti" (regressione diretta del secondo bug trovato in fase di audit).
9. Verifica via query diretta su Supabase (progetto E2E, mai produzione) che le fasi segnate ai punti 6-7 (da `e2e-titolare`, che non ha un record `tecnici` collegato) hanno `lavori_fasi.tecnico_id = null` — comportamento atteso per Task 3 ("non è un errore bloccante" quando l'utente loggato non è un tecnico), non un bug.
10. Logout, login come `e2e-tecnico@ua-test.local`, apri lo stesso lavoro → tab Produzione → segna una fase "OK" → verifica via query diretta che quella riga `lavori_fasi.tecnico_id` è ora valorizzato con l'id del record `tecnici` collegato a quell'utente (non `null`, e non un valore che il client potrebbe aver inviato).

- [ ] **Step 3: QA manuale — 3 viewport, light/dark**

Ripeti l'apertura di `/cicli-produzione`, `/cicli-produzione/[id]` e la tab Produzione di un lavoro a 390px, 768px, 1280px, sia light sia dark. Verifica: nessuna shadow raised in dark mode, touch target ≥44px sui bottoni "Rimuovi"/"+ Aggiungi fase"/esito, nessun colore hardcoded fuori tema.

- [ ] **Step 4: Pulizia dati di test**

Rimuovi qualsiasi fase/ciclo di test creato durante la QA nel lab E2E (query diretta o UI), ripristina la baseline (rieseguire `scripts/seed-e2e.ts` se necessario).

- [ ] **Step 5: Code review finale whole-branch**

Dispatch review (pattern già usato in B8/B9/B10): agente `code-reviewer` o `general-purpose` sull'intero diff del branch, verifica "Ready to merge: Yes/No" e applica eventuali fix Critical/Important prima del merge.

---

## Task 13: BP-1 — Aggiorna memoria e roadmap

**Files:**
- Modify: `ua-app/memory/MEMORY.md`
- Modify: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`
- Modify: `docs/roadmap/ROADMAP-UFFICIALE.md` (se B3 vi è referenziato)
- Modify: `ua-app/memory/SESSION_ACTIVE.md`

**Interfaces:**
- Consumes: Task 1-12 completati e mergiati.
- Produces: nessuno (chiusura documentale del lavoro, regola BP-1 del progetto).

- [ ] **Step 1: Correggi la nota falsa in MEMORY.md**

Cerca la frase "277 lavori storici hanno fasi" in `MEMORY.md` §0 (riferita a B3/fasi produzione) e sostituiscila con una nota corretta: `lavori_fasi` era vuota (0 righe) su tutto il DB prima di questo lavoro — la nota precedente era imprecisa, verificata e corretta durante l'analisi di B3 (04/07/2026).

- [ ] **Step 2: Aggiungi la voce di chiusura B3 in MEMORY.md §0**

Segui il formato delle voci precedenti (B9, B10): data, branch/commit, causa, fix, verifica automatica (numero test), QA manuale, riferimento a spec/piano (`docs/superpowers/specs/2026-07-04-b3-cicli-produzione-design.md`, `docs/superpowers/plans/2026-07-04-b3-cicli-produzione.md`). Menziona esplicitamente i 2 bug aggiuntivi corretti (persistenza fase, `non_conforme` boolean) e la scoperta A20 (audit trail senza autore).

- [ ] **Step 3: Aggiorna lo stato di B3 in BACKLOG-TECNICO-2026-07-02.md**

Cambia lo stato di B3 da ⏳ a ✅ nella tabella "STATO AVANZAMENTO" (riga `| B3 | ... |`), con data e commit di merge. Aggiorna la nota del corpo (sezione `### B3.`) con "✅ RISOLTO" e riepilogo, stesso stile delle altre voci chiuse.

- [ ] **Step 4: Aggiorna `SESSION_ACTIVE.md`**

Sostituisci il contenuto (non appendere) con l'handoff per la prossima sessione: B3 risolto, prossimo item aperto nel backlog Blocker (verifica quale sia il prossimo ⏳ nella tabella dopo B3 — quasi certamente **B4**, `as any` nei PDF MDR). Max 200 token, stesso stile del file attuale.

- [ ] **Step 5: Verifica finale e commit**

```bash
npx tsc --noEmit
git add ua-app/memory/MEMORY.md ua-app/memory/SESSION_ACTIVE.md docs/roadmap/BACKLOG-TECNICO-2026-07-02.md docs/roadmap/ROADMAP-UFFICIALE.md
git commit -m "docs(b3): close out — update MEMORY.md, backlog status, session handoff"
```

- [ ] **Step 6: Merge e deploy** (segue `superpowers:finishing-a-development-branch` — non eseguire senza conferma esplicita di Francesco, tocca `main`/produzione)
