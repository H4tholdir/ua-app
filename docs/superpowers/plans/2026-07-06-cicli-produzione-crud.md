# Cicli di Produzione CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add creazione, modifica e cancellazione (soft-delete) dei cicli di produzione (`cicli_produzione`), oggi limitati a sola ricerca (`GET /api/cicli`) e modifica fasi (`PATCH /api/cicli/[id]/fasi`).

**Architecture:** 1 migration (colonna `created_by` + fix indice UNIQUE parziale su `codice`), 3 route API nuove/modificate replicando esattamente il pattern auth+tenant già in uso in `PATCH /api/cicli/[id]/fasi` (`isSameOrigin` → `getServerUserClient` → `getServiceClient` con scoping manuale `laboratorio_id`), 1 bottom sheet riusabile create/edit (`CicloNuovoSheet`, pattern `ListinoNuovoSheet`), 1 bottone elimina (`CicloDeleteButton`, pattern `MagazzinoDeleteButton`), header actions aggiunte a `CicloFasiEditor` esistente.

**Tech Stack:** Next.js 16 App Router (route handler), Supabase (service-role client, RLS bypassata con scoping manuale), TypeScript, Vitest + Testing Library, Motion (`motionTokens` da `@/design-system/motion`).

## Global Constraints

- Spec di riferimento: `docs/superpowers/specs/2026-07-06-cicli-produzione-crud-design.md` (v2, verificata con advisor + schema reale, commit `dce010d`).
- Nessun gating di ruolo su create/modifica/cancellazione ciclo (decisione esplicita di Francesco).
- PATCH allowlist esplicita (mai blocklist) — regola CLAUDE.md.
- Ogni route mutante verifica `isSameOrigin(req)` (CSRF) prima di tutto il resto.
- Ogni query successiva alla risoluzione di `laboratorio_id` deve filtrare esplicitamente `.eq('laboratorio_id', labId)` — il client è `getServiceClient()`, RLS bypassata.
- `classe_rischio` sempre facoltativa; `tipo_dispositivo` sempre obbligatoria, validata contro la lista canonica dedicata ai cicli (NON l'enum a slug di `lavori`/`TabDati.tsx`).
- Dopo la migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` + `npx tsc --noEmit` (FASE 6b obbligatoria, CLAUDE.md).
- Migration su schema di produzione: richiede conferma esplicita di Francesco prima di applicarla (precedente: piano B3, B7, B8).
- Verificato via `pg_trigger`: `cicli_produzione` ha già un trigger `BEFORE UPDATE` (`trg_cicli_produzione_updated_at`) che aggiorna `updated_at` automaticamente — NON impostarlo manualmente nel payload PATCH (a differenza del pattern in `lavori/[id]/route.ts`, che non ha questo trigger).
- Verificato via query dati reali: 140 righe in `cicli_produzione`, 0 soft-deletate, nessun duplicato `(laboratorio_id, codice)` — la migration del punto successivo è sicura da applicare senza backfill.

---

### Task 1: Migration — `created_by` + fix indice UNIQUE parziale su `codice`

**Files:**
- Create: `supabase/migrations/20260706100000_cicli_produzione_crud_created_by.sql`
- Modify: `src/types/database.types.ts` (rigenerato, non a mano)

**Interfaces:**
- Produces: colonna `cicli_produzione.created_by uuid null` (FK → `utenti.id`); indice `cicli_produzione_laboratorio_id_codice_active_key` UNIQUE su `(laboratorio_id, codice) WHERE deleted_at IS NULL` (sostituisce `cicli_produzione_laboratorio_id_codice_key`, droppato). Tutti i task successivi che fanno INSERT/UPDATE su `cicli_produzione` assumono questo indice attivo (self-update allo stesso `codice` non genera più falso conflitto perché l'indice esclude le righe soft-deletate, non perché esclude "se stesso" — un `codice` duplicato tra due righe attive continua a violare l'indice, correttamente).

- [ ] **Step 1: Scrivi il file di migration**

```sql
-- supabase/migrations/20260706100000_cicli_produzione_crud_created_by.sql
-- UÀ Migration — CRUD cicli_produzione: traccia il creatore + fix unicità codice.
--
-- 1. created_by: tracciamento esplicito di chi ha creato il ciclo (nullable,
--    i cicli storici restano senza creatore tracciato retroattivamente —
--    nessun backfill, coerente con updated_by già esistente da B3).
--
-- 2. Fix B18-style: cicli_produzione_laboratorio_id_codice_key è un UNIQUE
--    pieno su (laboratorio_id, codice), non parziale — dopo un soft-delete
--    (deleted_at impostato) il codice resta bloccato per sempre e non è mai
--    riusabile. Sostituito con indice UNIQUE parziale sulle sole righe attive,
--    stesso fix già applicato a fasi_produzione in
--    20260704140000_b18_fasi_produzione_partial_unique_index.sql.
--
-- Verificato prima dell'applicazione (06/07/2026, via Supabase MCP execute_sql
-- sul progetto iagibumwjstnveqpjbwq): 140 righe in cicli_produzione, 0
-- soft-deletate, nessun duplicato (laboratorio_id, codice) — nessun conflitto
-- possibile con i dati esistenti.

ALTER TABLE cicli_produzione
  ADD COLUMN created_by UUID REFERENCES utenti(id);

ALTER TABLE cicli_produzione
  DROP CONSTRAINT cicli_produzione_laboratorio_id_codice_key;

CREATE UNIQUE INDEX cicli_produzione_laboratorio_id_codice_active_key
  ON cicli_produzione (laboratorio_id, codice)
  WHERE deleted_at IS NULL;
```

- [ ] **Step 2: Chiedi conferma esplicita a Francesco prima di applicare**

Questa migration tocca lo schema del progetto Supabase di produzione (`iagibumwjstnveqpjbwq`). Non procedere allo Step 3 senza un "ok" esplicito — stesso protocollo già seguito per B3/B7/B8.

- [ ] **Step 3: Applica la migration via Supabase MCP**

Usa lo strumento MCP `mcp__plugin_supabase_supabase__apply_migration` con:
- `project_id`: `iagibumwjstnveqpjbwq`
- `name`: `cicli_produzione_crud_created_by`
- `query`: il contenuto SQL dello Step 1

- [ ] **Step 4: Verifica che la migration sia stata applicata correttamente**

Con `mcp__plugin_supabase_supabase__execute_sql` (project_id `iagibumwjstnveqpjbwq`):

```sql
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'public.cicli_produzione'::regclass;
```

Expected: nessuna riga `cicli_produzione_laboratorio_id_codice_key`; presente `cicli_produzione_created_by_fkey`; l'indice `cicli_produzione_laboratorio_id_codice_active_key` compare tramite `pg_indexes` (i CREATE UNIQUE INDEX non appaiono in `pg_constraint`, verificalo con `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'cicli_produzione';`).

- [ ] **Step 5: Rigenera i tipi TypeScript**

Run: `cd ua-app && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`

Poi apri `src/types/database.types.ts` e rimuovi manualmente qualunque riga di messaggio CLI (es. warning su versione) che il comando può appendere in fondo al file — deve restare solo TypeScript valido.

- [ ] **Step 6: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260706100000_cicli_produzione_crud_created_by.sql src/types/database.types.ts
git commit -m "feat(db): aggiungi cicli_produzione.created_by e fix indice UNIQUE parziale su codice"
```

---

### Task 2: Lista canonica opzioni (`tipo_dispositivo`/`classe_rischio` per i cicli) + POST /api/cicli

**Files:**
- Create: `src/lib/domain/cicli-produzione.ts`
- Modify: `src/app/api/cicli/route.ts` (aggiungi `POST`, `GET` esistente invariato in questo task)
- Test: `tests/unit/cicli-route.test.ts` (nuovo blocco `describe('POST /api/cicli', ...)`)

**Interfaces:**
- Produces: `TIPO_DISPOSITIVO_CICLO_OPTIONS: readonly string[]`, `CLASSE_RISCHIO_CICLO_OPTIONS: readonly string[]` da `@/lib/domain/cicli-produzione` — importati sia dalla route API (validazione server-side) sia da `CicloNuovoSheet.tsx` (Task 6, select options) — unica fonte di verità, evita drift tra le due liste.
- Produces: `POST /api/cicli` — 201 `{ ciclo: { id, codice, nome, tipo_dispositivo, classe_rischio } }` o errore.
- Consumes: `getServerUserClient` (`@/lib/supabase/server-user`), `getServiceClient` (`@/lib/supabase/server-service`), `isSameOrigin` (`@/lib/utils/csrf`) — stesso pattern esatto di `PATCH /api/cicli/[id]/fasi`.

- [ ] **Step 1: Crea il file delle opzioni canoniche**

```ts
// src/lib/domain/cicli-produzione.ts
//
// Valori realmente in uso oggi in cicli_produzione.tipo_dispositivo (140
// righe, verificato via query diretta sul DB il 06/07/2026) — testo libero
// in italiano, NESSUN CHECK constraint a livello DB. Dominio distinto
// dall'enum a slug in TabDati.tsx (lavori.tipo_dispositivo: 'protesi_fissa',
// 'cad_cam', ecc.) — nessun join tra i due campi, non riusare quell'enum qui.
// "Riferimento" (1 riga su 140, dato anomalo) escluso di proposito.
export const TIPO_DISPOSITIVO_CICLO_OPTIONS = [
  'Protesi fissa',
  'Protesi mobile',
  'Protesi combinata',
  'Protesi provvisoria',
  'Protesi scheletrica',
  'Protesi ortodontica',
] as const

// Stessi 4 valori del CHECK constraint cicli_produzione_classe_rischio_check.
export const CLASSE_RISCHIO_CICLO_OPTIONS = [
  'classe_i',
  'classe_iia',
  'classe_iib',
  'classe_iii',
] as const
```

- [ ] **Step 2: Scrivi i test falliti per POST /api/cicli**

Aggiungi in fondo a `tests/unit/cicli-route.test.ts` (il file esiste già con i test di `GET`, mantieni gli import e le costanti `AUTH_USER`/`LAB_ID` esistenti in cima al file):

```ts
import { POST } from '../../src/app/api/cicli/route'

function postReq(body: unknown) {
  return new Request('http://localhost/api/cicli', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/cicli', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  function mockInsert(result: { data: unknown; error: unknown }) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      }
      if (table === 'cicli_produzione') {
        return { insert: () => ({ select: () => ({ single: async () => result }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  }

  it('nome mancante → 400', async () => {
    const res = await POST(postReq({ codice: 'C1', tipo_dispositivo: 'Protesi fissa' }))
    expect(res.status).toBe(400)
  })

  it('codice mancante → 400', async () => {
    const res = await POST(postReq({ nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa' }))
    expect(res.status).toBe(400)
  })

  it('tipo_dispositivo mancante → 400', async () => {
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1' }))
    expect(res.status).toBe(400)
  })

  it('tipo_dispositivo fuori dalla lista canonica → 400', async () => {
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Slug non valido' }))
    expect(res.status).toBe(400)
  })

  it('classe_rischio non valida → 400', async () => {
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Protesi fissa', classe_rischio: 'classe_x' }))
    expect(res.status).toBe(400)
  })

  it('happy path senza classe_rischio (facoltativa) → 201, created_by/updated_by = utente corrente', async () => {
    mockInsert({
      data: { id: 'ciclo-nuovo', codice: 'C1', nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa', classe_rischio: null },
      error: null,
    })
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Protesi fissa' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.ciclo).toEqual({ id: 'ciclo-nuovo', codice: 'C1', nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa', classe_rischio: null })
  })

  it('happy path con classe_rischio → 201', async () => {
    mockInsert({
      data: { id: 'ciclo-nuovo', codice: 'C2', nome: 'Corona ceramica su impianto', tipo_dispositivo: 'Protesi fissa', classe_rischio: 'classe_iia' },
      error: null,
    })
    const res = await POST(postReq({ nome: 'Corona ceramica su impianto', codice: 'C2', tipo_dispositivo: 'Protesi fissa', classe_rischio: 'classe_iia' }))
    expect(res.status).toBe(201)
  })

  it('codice duplicato nello stesso laboratorio (23505) → 409', async () => {
    mockInsert({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } })
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Protesi fissa' }))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toBe('Esiste già un ciclo con questo codice in questo laboratorio')
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(postReq({ nome: 'X', codice: 'C1', tipo_dispositivo: 'Protesi fissa' }))
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 3: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/cicli-route.test.ts`
Expected: FAIL — `POST` non esportato da `src/app/api/cicli/route.ts`.

- [ ] **Step 4: Implementa `POST /api/cicli`**

Aggiungi in fondo a `src/app/api/cicli/route.ts` (che già contiene `GET`, invariato in questo task):

```ts
import { isSameOrigin } from '@/lib/utils/csrf'
import { TIPO_DISPOSITIVO_CICLO_OPTIONS, CLASSE_RISCHIO_CICLO_OPTIONS } from '@/lib/domain/cicli-produzione'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  const codice = typeof body.codice === 'string' ? body.codice.trim() : ''
  const tipoDispositivo = typeof body.tipo_dispositivo === 'string' ? body.tipo_dispositivo.trim() : ''
  const classeRischio = body.classe_rischio == null || body.classe_rischio === '' ? null : body.classe_rischio

  if (!nome) {
    return NextResponse.json({ error: 'Il campo "nome" è obbligatorio' }, { status: 400 })
  }
  if (!codice) {
    return NextResponse.json({ error: 'Il campo "codice" è obbligatorio' }, { status: 400 })
  }
  if (!tipoDispositivo) {
    return NextResponse.json({ error: 'Il campo "tipo_dispositivo" è obbligatorio' }, { status: 400 })
  }
  if (!(TIPO_DISPOSITIVO_CICLO_OPTIONS as readonly string[]).includes(tipoDispositivo)) {
    return NextResponse.json({ error: 'Tipo dispositivo non valido' }, { status: 400 })
  }
  if (classeRischio != null && !(CLASSE_RISCHIO_CICLO_OPTIONS as readonly string[]).includes(classeRischio as string)) {
    return NextResponse.json({ error: 'Classe di rischio non valida' }, { status: 400 })
  }

  const { data: ciclo, error: insertError } = await svc
    .from('cicli_produzione')
    .insert({
      laboratorio_id: labId,
      nome,
      codice,
      tipo_dispositivo: tipoDispositivo,
      classe_rischio: classeRischio,
      created_by: user.id,
      updated_by: user.id,
      attivo: true,
    })
    .select('id, codice, nome, tipo_dispositivo, classe_rischio')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Esiste già un ciclo con questo codice in questo laboratorio' }, { status: 409 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ciclo }, { status: 201 })
}
```

- [ ] **Step 5: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/cicli-route.test.ts`
Expected: PASS, tutti i test (GET esistenti + POST nuovi).

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/cicli-produzione.ts src/app/api/cicli/route.ts tests/unit/cicli-route.test.ts
git commit -m "feat(cicli): aggiungi POST /api/cicli con validazione e lista tipo_dispositivo dedicata"
```

---

### Task 3: `GET /api/cicli` — filtro `attivo` solo sulla ricerca testuale

**Files:**
- Modify: `src/app/api/cicli/route.ts:32-48` (la funzione `GET` esistente)
- Test: `tests/unit/cicli-route.test.ts` (estendi il blocco `describe('GET /api/cicli', ...)` esistente)

**Interfaces:**
- Consumes: nessuna nuova dipendenza.
- Produces: nessun cambio di firma — stesso `GET(req: Request)`, stesso shape di risposta `{ cicli: [...] }`.

- [ ] **Step 1: Scrivi il test di regressione (fallisce con il codice attuale)**

Aggiungi dentro il blocco `describe('GET /api/cicli', ...)` esistente in `tests/unit/cicli-route.test.ts`:

```ts
  it('lookup per id di un ciclo disattivato (attivo=false) continua a ritornarlo — idratazione CicloComboBox su lavoro esistente', async () => {
    const cicloDisattivato = { id: 'ciclo-9', codice: 'OLD1', nome: 'Ciclo disattivato', tipo_dispositivo: 'Protesi fissa' }
    mockLab({ data: [cicloDisattivato], error: null })
    const res = await GET(req('http://localhost/api/cicli?id=ciclo-9'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.cicli).toEqual([cicloDisattivato])
  })

  it('ricerca testuale esclude i cicli disattivati (attivo=false) — non proponibili per nuove assegnazioni', async () => {
    const cicliChain = mockLab({ data: [], error: null })
    await GET(req('http://localhost/api/cicli?q=CNC'))
    expect(cicliChain.calls).toContainEqual({ method: 'eq', args: ['attivo', true] })
  })

  it('lookup per id NON applica il filtro attivo — nessuna chiamata .eq(\'attivo\', ...)', async () => {
    const cicliChain = mockLab({ data: [], error: null })
    await GET(req('http://localhost/api/cicli?id=ciclo-9'))
    expect(cicliChain.calls).not.toContainEqual({ method: 'eq', args: ['attivo', true] })
  })
```

- [ ] **Step 2: Esegui i test e verifica che l'ultimo (o il secondo) fallisca**

Run: `npx vitest run tests/unit/cicli-route.test.ts -t "ricerca testuale esclude"`
Expected: FAIL — oggi `GET` non chiama mai `.eq('attivo', ...)`.

- [ ] **Step 3: Applica il fix in `src/app/api/cicli/route.ts`**

Nella funzione `GET`, cambia solo il branch `else if (q)`:

```ts
  if (id) {
    query = query.eq('id', id)
  } else if (q) {
    const pattern = pgrestQuote(`%${q}%`)
    query = query.eq('attivo', true).or(`codice.ilike.${pattern},nome.ilike.${pattern}`)
  }
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/cicli-route.test.ts`
Expected: PASS, tutti (GET + POST).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cicli/route.ts tests/unit/cicli-route.test.ts
git commit -m "fix(cicli): filtro attivo solo sulla ricerca testuale, mai sul lookup per id"
```

---

### Task 4: `PATCH /api/cicli/[id]`

**Files:**
- Create: `src/app/api/cicli/[id]/route.ts` (solo `PATCH` in questo task, `DELETE` nel Task 5)
- Test: `tests/unit/cicli-id-route.test.ts`

**Interfaces:**
- Consumes: `TIPO_DISPOSITIVO_CICLO_OPTIONS`, `CLASSE_RISCHIO_CICLO_OPTIONS` da `@/lib/domain/cicli-produzione` (Task 2).
- Produces: `PATCH /api/cicli/[id]` — 200 `{ ciclo: { id, codice, nome, tipo_dispositivo, classe_rischio, attivo } }`, 400/404/409.

- [ ] **Step 1: Scrivi i test falliti**

```ts
// tests/unit/cicli-id-route.test.ts
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

import { PATCH } from '../../src/app/api/cicli/[id]/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const CICLO_ID = 'ciclo-1'
const params = Promise.resolve({ id: CICLO_ID })

function patchReq(body: unknown) {
  return new Request(`http://localhost/api/cicli/${CICLO_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

function mockUpdate(result: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'cicli_produzione') {
      return { update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ single: async () => result }) }) }) }) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('PATCH /api/cicli/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('aggiornamento parziale (solo nome) → 200', async () => {
    mockUpdate({
      data: { id: CICLO_ID, codice: 'C1', nome: 'Nuovo nome', tipo_dispositivo: 'Protesi fissa', classe_rischio: null, attivo: true },
      error: null,
    })
    const res = await PATCH(patchReq({ nome: 'Nuovo nome' }), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ciclo.nome).toBe('Nuovo nome')
  })

  it('tipo_dispositivo fuori dalla lista canonica → 400', async () => {
    const res = await PATCH(patchReq({ tipo_dispositivo: 'Slug non valido' }), { params })
    expect(res.status).toBe(400)
  })

  it('classe_rischio non valida → 400', async () => {
    const res = await PATCH(patchReq({ classe_rischio: 'classe_x' }), { params })
    expect(res.status).toBe(400)
  })

  it('attivo non booleano → 400', async () => {
    const res = await PATCH(patchReq({ attivo: 'sì' }), { params })
    expect(res.status).toBe(400)
  })

  it('ciclo non trovato o di altro laboratorio (PGRST116) → 404', async () => {
    mockUpdate({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(404)
  })

  it('codice duplicato (23505) → 409', async () => {
    mockUpdate({ data: null, error: { code: '23505', message: 'duplicate' } })
    const res = await PATCH(patchReq({ codice: 'GIA-USATO' }), { params })
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toBe('Esiste già un ciclo con questo codice in questo laboratorio')
  })

  it('attivo:false disattiva il ciclo → 200', async () => {
    mockUpdate({
      data: { id: CICLO_ID, codice: 'C1', nome: 'Ciclo X', tipo_dispositivo: 'Protesi fissa', classe_rischio: null, attivo: false },
      error: null,
    })
    const res = await PATCH(patchReq({ attivo: false }), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ciclo.attivo).toBe(false)
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/cicli-id-route.test.ts`
Expected: FAIL — il file `src/app/api/cicli/[id]/route.ts` non esiste.

- [ ] **Step 3: Implementa `PATCH /api/cicli/[id]`**

```ts
// src/app/api/cicli/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { TIPO_DISPOSITIVO_CICLO_OPTIONS, CLASSE_RISCHIO_CICLO_OPTIONS } from '@/lib/domain/cicli-produzione'

type RouteContext = { params: Promise<{ id: string }> }

const PATCH_ALLOWLIST = ['nome', 'codice', 'tipo_dispositivo', 'classe_rischio', 'attivo'] as const

export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {}
  for (const field of PATCH_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field]
    }
  }

  if (typeof payload.nome === 'string') payload.nome = payload.nome.trim()
  if (typeof payload.codice === 'string') payload.codice = payload.codice.trim()
  if (typeof payload.tipo_dispositivo === 'string') payload.tipo_dispositivo = payload.tipo_dispositivo.trim()

  if (Object.prototype.hasOwnProperty.call(payload, 'tipo_dispositivo')) {
    if (!(TIPO_DISPOSITIVO_CICLO_OPTIONS as readonly string[]).includes(payload.tipo_dispositivo as string)) {
      return NextResponse.json({ error: 'Tipo dispositivo non valido' }, { status: 400 })
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'classe_rischio') && payload.classe_rischio != null) {
    if (!(CLASSE_RISCHIO_CICLO_OPTIONS as readonly string[]).includes(payload.classe_rischio as string)) {
      return NextResponse.json({ error: 'Classe di rischio non valida' }, { status: 400 })
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'attivo') && typeof payload.attivo !== 'boolean') {
    return NextResponse.json({ error: 'Il campo "attivo" deve essere booleano' }, { status: 400 })
  }

  payload.updated_by = user.id

  const { data: ciclo, error: updateError } = await svc
    .from('cicli_produzione')
    .update(payload)
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .select('id, codice, nome, tipo_dispositivo, classe_rischio, attivo')
    .single()

  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json({ error: 'Esiste già un ciclo con questo codice in questo laboratorio' }, { status: 409 })
    }
    if (updateError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Ciclo non trovato' }, { status: 404 })
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ciclo })
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/cicli-id-route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cicli/[id]/route.ts tests/unit/cicli-id-route.test.ts
git commit -m "feat(cicli): aggiungi PATCH /api/cicli/[id] con allowlist esplicita"
```

---

### Task 5: `DELETE /api/cicli/[id]`

**Files:**
- Modify: `src/app/api/cicli/[id]/route.ts` (aggiungi `DELETE` accanto a `PATCH`)
- Test: `tests/unit/cicli-id-route.test.ts` (nuovo blocco `describe('DELETE /api/cicli/[id]', ...)`)

**Interfaces:**
- Consumes: nessuna nuova dipendenza esterna al file.
- Produces: `DELETE /api/cicli/[id]` — 200 `{ ok: true }`, 404, 409 `{ error: string }`.

- [ ] **Step 1: Scrivi i test falliti**

Prima modifica la riga di import in cima a `tests/unit/cicli-id-route.test.ts` (creata nel Task 4) per includere anche `DELETE`:

```ts
import { PATCH, DELETE } from '../../src/app/api/cicli/[id]/route'
```

Poi aggiungi in fondo al file:

```ts
function deleteReq() {
  return new Request(`http://localhost/api/cicli/${CICLO_ID}`, {
    method: 'DELETE',
    headers: { origin: 'http://localhost', host: 'localhost' },
  })
}

describe('DELETE /api/cicli/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  function mockDeleteFlow(opts: {
    cicloEsiste?: boolean
    countLavori?: number
    listinoUpdateError?: unknown
    softDeleteError?: unknown
  }) {
    const {
      cicloEsiste = true,
      countLavori = 0,
      listinoUpdateError = null,
      softDeleteError = null,
    } = opts

    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      }
      if (table === 'cicli_produzione') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({
            data: cicloEsiste ? { id: CICLO_ID } : null,
            error: cicloEsiste ? null : { code: 'PGRST116' },
          }) }) }) }) }),
          update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: softDeleteError }) }) }),
        }
      }
      if (table === 'lavori') {
        return { select: () => ({ eq: (): unknown => ({ eq: () => Promise.resolve({ count: countLavori, error: null }) }) }) }
      }
      if (table === 'listino') {
        return { update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: listinoUpdateError }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  }

  it('ciclo non referenziato da nessun lavoro → 200, listino.ciclo_id nullato, soft-delete', async () => {
    mockDeleteFlow({ countLavori: 0 })
    const res = await DELETE(deleteReq(), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
  })

  it('ciclo referenziato da 3 lavori → 409, nessun soft-delete eseguito', async () => {
    mockDeleteFlow({ countLavori: 3 })
    const res = await DELETE(deleteReq(), { params })
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toBe('Ciclo in uso da 3 lavori — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.')
  })

  it('ciclo referenziato da 1 lavoro → messaggio singolare corretto', async () => {
    mockDeleteFlow({ countLavori: 1 })
    const res = await DELETE(deleteReq(), { params })
    const json = await res.json()
    expect(json.error).toBe('Ciclo in uso da 1 lavoro — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.')
  })

  it('ciclo non trovato o di altro laboratorio → 404', async () => {
    mockDeleteFlow({ cicloEsiste: false })
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(404)
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/cicli-id-route.test.ts -t "DELETE"`
Expected: FAIL — `DELETE` non esportato.

- [ ] **Step 3: Implementa `DELETE /api/cicli/[id]`**

Aggiungi in fondo a `src/app/api/cicli/[id]/route.ts`:

```ts
export async function DELETE(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

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

  const { data: existing } = await svc
    .from('cicli_produzione')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Ciclo non trovato' }, { status: 404 })
  }

  // Nessun filtro su lavori.deleted_at: anche un lavoro storico/soft-cancellato
  // deve continuare a bloccare la cancellazione, per non rompere retroattivamente
  // un documento QMS (Scheda di Fabbricazione, Art. 10(9) MDR) già emesso.
  const { count } = await svc
    .from('lavori')
    .select('id', { count: 'exact', head: true })
    .eq('ciclo_id', id)
    .eq('laboratorio_id', labId)

  if (count && count > 0) {
    const label = count === 1 ? 'lavoro' : 'lavori'
    return NextResponse.json(
      { error: `Ciclo in uso da ${count} ${label} — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.` },
      { status: 409 }
    )
  }

  // listino.ciclo_id è un default suggerito su un template di listino, non un
  // record storico MDR — va nullato, non blocca la cancellazione (a differenza
  // di lavori.ciclo_id sopra).
  await svc
    .from('listino')
    .update({ ciclo_id: null })
    .eq('ciclo_id', id)
    .eq('laboratorio_id', labId)

  const { error: deleteError } = await svc
    .from('cicli_produzione')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('laboratorio_id', labId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/cicli-id-route.test.ts`
Expected: PASS, tutti (PATCH + DELETE).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cicli/[id]/route.ts tests/unit/cicli-id-route.test.ts
git commit -m "feat(cicli): aggiungi DELETE /api/cicli/[id] con blocco referenziale su lavori e null-out su listino"
```

---

### Task 6: `CicloNuovoSheet` (bottom sheet create/edit)

**Files:**
- Create: `src/components/features/cicli/CicloNuovoSheet.tsx`
- Test: `tests/unit/CicloNuovoSheet.test.tsx`

**Interfaces:**
- Consumes: `TIPO_DISPOSITIVO_CICLO_OPTIONS`, `CLASSE_RISCHIO_CICLO_OPTIONS` (`@/lib/domain/cicli-produzione`), `motionTokens` (`@/design-system/motion`), `hapticLight`/`hapticMedium` (`@/lib/feedback/haptic`), `useRouter` (`next/navigation`).
- Produces: `CicloNuovoSheet({ mode: 'create' | 'edit', cicloId?: string, initialValues?: { codice: string; nome: string; tipo_dispositivo: string; classe_rischio: string | null } })` — usato da Task 8 (pagina lista, `mode="create"`) e Task 9 (`CicloFasiEditor`, `mode="edit"`).

- [ ] **Step 1: Scrivi i test falliti**

```tsx
// tests/unit/CicloNuovoSheet.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CicloNuovoSheet } from '../../src/components/features/cicli/CicloNuovoSheet'

describe('CicloNuovoSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  function openCreate() {
    render(<CicloNuovoSheet mode="create" />)
    fireEvent.click(screen.getByRole('button', { name: 'Nuovo ciclo' }))
  }

  it('modalità create: submit senza nome mostra errore e non chiama fetch', async () => {
    openCreate()
    fireEvent.click(screen.getByRole('button', { name: 'Crea ciclo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('nome')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('select tipo dispositivo espone le 6 opzioni canoniche', () => {
    openCreate()
    const select = screen.getByLabelText('Tipo dispositivo *') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)
    expect(values).toEqual([
      '', 'Protesi fissa', 'Protesi mobile', 'Protesi combinata',
      'Protesi provvisoria', 'Protesi scheletrica', 'Protesi ortodontica',
    ])
  })

  it('select classe di rischio espone le 4 opzioni + non specificata', () => {
    openCreate()
    const select = screen.getByLabelText('Classe di rischio') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)
    expect(values).toEqual(['', 'classe_i', 'classe_iia', 'classe_iib', 'classe_iii'])
  })

  it('modalità create: submit valido chiama POST /api/cicli con i campi nel body', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ciclo: { id: 'ciclo-nuovo', codice: 'C1', nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa', classe_rischio: null } }),
    })
    openCreate()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona ceramica' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'C1' } })
    fireEvent.change(screen.getByLabelText('Tipo dispositivo *'), { target: { value: 'Protesi fissa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea ciclo' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cicli')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body as string)
    expect(body).toEqual({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Protesi fissa', classe_rischio: null })
  })

  it('modalità edit: precompila i campi con initialValues e chiama PATCH /api/cicli/[id]', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ciclo: { id: 'ciclo-1', codice: 'C1', nome: 'Corona modificata', tipo_dispositivo: 'Protesi fissa', classe_rischio: null } }),
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload: reloadMock } })

    render(
      <CicloNuovoSheet
        mode="edit"
        cicloId="ciclo-1"
        initialValues={{ codice: 'C1', nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa', classe_rischio: null }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }))

    expect(screen.getByLabelText('Nome *')).toHaveValue('Corona ceramica')
    expect(screen.getByLabelText('Codice *')).toHaveValue('C1')

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona modificata' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cicli/ciclo-1')
    expect(options.method).toBe('PATCH')
  })

  it('modalità edit: valore tipo_dispositivo fuori lista (es. dato storico) resta selezionato tra le opzioni', () => {
    render(
      <CicloNuovoSheet
        mode="edit"
        cicloId="ciclo-1"
        initialValues={{ codice: 'C1', nome: 'Ciclo storico', tipo_dispositivo: 'Riferimento', classe_rischio: null }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }))
    const select = screen.getByLabelText('Tipo dispositivo *') as HTMLSelectElement
    expect(select.value).toBe('Riferimento')
    expect(Array.from(select.options).map(o => o.value)).toContain('Riferimento')
  })

  it('errore server mostra messaggio inline e non chiude lo sheet', async () => {
    fetchMock().mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Esiste già un ciclo con questo codice in questo laboratorio' }) })
    openCreate()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'X' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'C1' } })
    fireEvent.change(screen.getByLabelText('Tipo dispositivo *'), { target: { value: 'Protesi fissa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea ciclo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esiste già un ciclo con questo codice in questo laboratorio')
    expect(screen.getByLabelText('Nome *')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/CicloNuovoSheet.test.tsx`
Expected: FAIL — il file componente non esiste.

- [ ] **Step 3: Implementa `CicloNuovoSheet.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'
import { TIPO_DISPOSITIVO_CICLO_OPTIONS, CLASSE_RISCHIO_CICLO_OPTIONS } from '@/lib/domain/cicli-produzione'

interface CicloValues {
  codice: string
  nome: string
  tipo_dispositivo: string
  classe_rischio: string | null
}

interface CicloNuovoSheetProps {
  mode: 'create' | 'edit'
  cicloId?: string
  initialValues?: CicloValues
}

function emptyForm(initialValues?: CicloValues) {
  return {
    nome: initialValues?.nome ?? '',
    codice: initialValues?.codice ?? '',
    tipo_dispositivo: initialValues?.tipo_dispositivo ?? '',
    classe_rischio: initialValues?.classe_rischio ?? '',
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  background: 'var(--elv, #EDEDEA)',
  border: '1px solid var(--prs, #D4CFC9)',
  borderRadius: 9,
  fontSize: 13,
  color: 'var(--t1)',
  fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--t2)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  fontFamily: 'DM Sans, sans-serif',
  marginBottom: 3,
  display: 'block',
}

const CLASSE_RISCHIO_LABELS: Record<string, string> = {
  classe_i: 'Classe I',
  classe_iia: 'Classe IIa',
  classe_iib: 'Classe IIb',
  classe_iii: 'Classe III',
}

export function CicloNuovoSheet({ mode, cicloId, initialValues }: CicloNuovoSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm(initialValues))

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setForm(emptyForm(initialValues))
  }

  const tipoOptions = form.tipo_dispositivo && !(TIPO_DISPOSITIVO_CICLO_OPTIONS as readonly string[]).includes(form.tipo_dispositivo)
    ? [form.tipo_dispositivo, ...TIPO_DISPOSITIVO_CICLO_OPTIONS]
    : TIPO_DISPOSITIVO_CICLO_OPTIONS

  const handleSave = async () => {
    setError(null)

    if (!form.nome.trim()) {
      setError('Il campo "nome" è obbligatorio')
      return
    }
    if (!form.codice.trim()) {
      setError('Il campo "codice" è obbligatorio')
      return
    }
    if (!form.tipo_dispositivo) {
      setError('Il campo "tipo_dispositivo" è obbligatorio')
      return
    }

    setSaving(true)
    hapticLight()

    const payload = {
      nome: form.nome.trim(),
      codice: form.codice.trim(),
      tipo_dispositivo: form.tipo_dispositivo,
      classe_rischio: form.classe_rischio || null,
    }

    try {
      const res = mode === 'create'
        ? await fetch('/api/cicli', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/cicli/${cicloId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Errore durante il salvataggio, riprova')
        setSaving(false)
        return
      }

      hapticMedium()

      if (mode === 'create') {
        const d = (await res.json()) as { ciclo: { id: string } }
        router.push(`/cicli-produzione/${d.ciclo.id}`)
      } else {
        window.location.reload()
      }
    } catch {
      setError('Errore di rete — controlla la connessione')
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); hapticLight() }}
        aria-label={mode === 'create' ? 'Nuovo ciclo' : 'Modifica'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '40px',
          minHeight: mode === 'create' ? 52 : 44,
          padding: '0 16px',
          borderRadius: '12px',
          background: mode === 'create' ? 'var(--primary, #D90012)' : 'var(--elv, #EDEDEA)',
          color: mode === 'create' ? '#fff' : 'var(--t1)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {mode === 'create' ? 'Nuovo ciclo' : 'Modifica'}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={motionTokens.spring.gentle}
              onClick={handleClose}
              style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 200 }}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={motionTokens.spring.soft}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--sfc, #E4DFD9)',
                borderRadius: '20px 20px 0 0',
                padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
                zIndex: 201,
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'var(--prs)', borderRadius: 2, margin: '0 auto 20px' }} />

              <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
                {mode === 'create' ? 'Nuovo ciclo di produzione' : 'Modifica ciclo di produzione'}
              </h3>

              {error && (
                <p role="alert" style={{ margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="ciclo-nuovo-nome">Nome *</label>
                  <input
                    id="ciclo-nuovo-nome"
                    style={inputStyle}
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle} htmlFor="ciclo-nuovo-codice">Codice *</label>
                  <input
                    id="ciclo-nuovo-codice"
                    style={inputStyle}
                    value={form.codice}
                    onChange={e => setForm(p => ({ ...p, codice: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle} htmlFor="ciclo-nuovo-tipo">Tipo dispositivo *</label>
                  <select
                    id="ciclo-nuovo-tipo"
                    style={inputStyle}
                    value={form.tipo_dispositivo}
                    onChange={e => setForm(p => ({ ...p, tipo_dispositivo: e.target.value }))}
                  >
                    <option value="">Seleziona tipo</option>
                    {tipoOptions.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle} htmlFor="ciclo-nuovo-classe-rischio">Classe di rischio</label>
                  <select
                    id="ciclo-nuovo-classe-rischio"
                    style={inputStyle}
                    value={form.classe_rischio}
                    onChange={e => setForm(p => ({ ...p, classe_rischio: e.target.value }))}
                  >
                    <option value="">Non specificata</option>
                    {CLASSE_RISCHIO_CICLO_OPTIONS.map(v => (
                      <option key={v} value={v}>{CLASSE_RISCHIO_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '13px',
                  background: saving ? 'var(--prs)' : 'var(--primary, #D90012)',
                  color: 'white',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  minHeight: 44,
                }}
              >
                {saving
                  ? 'Salvataggio...'
                  : mode === 'create' ? 'Crea ciclo' : 'Salva modifiche'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

Nota: l'etichetta della classe di rischio (`v.replace(...)`) è solo cosmetica lato client — verifica nel test che l'`option value` resti lo slug esatto (`classe_i` ecc.), non il testo trasformato; il test sopra asserisce solo su `.value`, non su `.textContent`, quindi è già corretto così.

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/CicloNuovoSheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/cicli/CicloNuovoSheet.tsx tests/unit/CicloNuovoSheet.test.tsx
git commit -m "feat(cicli): aggiungi CicloNuovoSheet (bottom sheet create/edit)"
```

---

### Task 7: `CicloDeleteButton`

**Files:**
- Create: `src/components/features/cicli/CicloDeleteButton.tsx`
- Test: `tests/unit/CicloDeleteButton.test.tsx`

**Interfaces:**
- Produces: `CicloDeleteButton({ cicloId: string, cicloNome: string })` — usato da Task 9.

- [ ] **Step 1: Scrivi i test falliti**

```tsx
// tests/unit/CicloDeleteButton.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const pushMock = vi.fn()
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

import { CicloDeleteButton } from '../../src/components/features/cicli/CicloDeleteButton'

describe('CicloDeleteButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    pushMock.mockClear()
    refreshMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('conferma negata (window.confirm → false) → nessuna fetch', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<CicloDeleteButton cicloId="ciclo-1" cicloNome="CNC Corona" />)
    fireEvent.click(screen.getByRole('button', { name: /elimina ciclo/i }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('conferma accettata, 200 → DELETE /api/cicli/[id] e redirect a /cicli-produzione', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    render(<CicloDeleteButton cicloId="ciclo-1" cicloNome="CNC Corona" />)
    fireEvent.click(screen.getByRole('button', { name: /elimina ciclo/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/cicli-produzione'))
    expect(fetch).toHaveBeenCalledWith('/api/cicli/ciclo-1', { method: 'DELETE' })
    expect(refreshMock).toHaveBeenCalled()
  })

  it('409 (ciclo referenziato) → alert con il messaggio del server, nessun redirect', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Ciclo in uso da 2 lavori — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.' }),
    })

    render(<CicloDeleteButton cicloId="ciclo-1" cicloNome="CNC Corona" />)
    fireEvent.click(screen.getByRole('button', { name: /elimina ciclo/i }))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Ciclo in uso da 2 lavori — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.'))
    expect(pushMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/CicloDeleteButton.test.tsx`
Expected: FAIL — il file componente non esiste.

- [ ] **Step 3: Implementa `CicloDeleteButton.tsx`**

```tsx
// src/components/features/cicli/CicloDeleteButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  cicloId: string
  cicloNome: string
}

export function CicloDeleteButton({ cicloId, cicloNome }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Eliminare il ciclo "${cicloNome}"?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/cicli/${cicloId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/cicli-produzione')
        router.refresh()
      } else {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? 'Errore durante l\'eliminazione')
        setDeleting(false)
      }
    } catch {
      alert('Errore di rete — riprova')
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label={`Elimina ciclo ${cicloNome}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 16px',
        minHeight: '44px',
        borderRadius: '12px',
        border: '1px solid rgba(217,0,18,.25)',
        background: 'rgba(217,0,18,.06)',
        color: '#D90012',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600,
        fontSize: '13px',
        cursor: deleting ? 'wait' : 'pointer',
        opacity: deleting ? 0.6 : 1,
      }}
    >
      {deleting ? 'Eliminazione…' : 'Elimina ciclo'}
    </button>
  )
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/CicloDeleteButton.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/cicli/CicloDeleteButton.tsx tests/unit/CicloDeleteButton.test.tsx
git commit -m "feat(cicli): aggiungi CicloDeleteButton"
```

---

### Task 8: Bottone "Nuovo ciclo" nella pagina lista `/cicli-produzione`

**Files:**
- Modify: `src/app/(app)/cicli-produzione/page.tsx`

**Interfaces:**
- Consumes: `CicloNuovoSheet` (Task 6), `mode="create"`.

- [ ] **Step 1: Aggiungi il bottone all'header**

Modifica `src/app/(app)/cicli-produzione/page.tsx`:

```tsx
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { CicliProduzioneList } from '@/components/features/cicli/CicliProduzioneList'
import { CicloNuovoSheet } from '@/components/features/cicli/CicloNuovoSheet'

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
      <AppHeader title="Cicli di produzione" backHref="/dashboard" actions={<CicloNuovoSheet mode="create" />} />
      <PageWrapper>
        <CicliProduzioneList cicli={cicli ?? []} />
      </PageWrapper>
    </>
  )
}
```

Nessun test dedicato per questa pagina server component (nessun precedente nel repo la testa direttamente — la logica di business è già coperta dai test di `CicliProduzioneList` e `CicloNuovoSheet`).

- [ ] **Step 2: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/cicli-produzione/page.tsx"
git commit -m "feat(cicli): aggiungi bottone Nuovo ciclo alla pagina lista"
```

---

### Task 9: Header actions in `CicloFasiEditor` (Modifica/Elimina/Creato da) + wiring pagina dettaglio

**Files:**
- Modify: `src/components/features/cicli/CicloFasiEditor.tsx:27-32,78,170-181`
- Modify: `src/app/(app)/cicli-produzione/[id]/page.tsx`
- Test: `tests/unit/CicloFasiEditor.test.tsx` (nuovo blocco, non toccare i test esistenti)

**Interfaces:**
- Consumes: `CicloNuovoSheet` (Task 6, `mode="edit"`), `CicloDeleteButton` (Task 7).
- Produces: `CicloFasiEditorProps` esteso con `headerActions?: { codice: string; tipoDispositivo: string; classeRischio: string | null; creatoDaLabel: string | null }` — opzionale, `undefined` per tutte le chiamate esistenti nei test già presenti (che passano solo `cicloId`/`nomeCiclo`/`fasiIniziali`/`ultimaModificaLabel`), quindi nessuna rottura dei test correnti.

- [ ] **Step 1: Scrivi il test fallito per gli header actions**

Aggiungi in fondo a `tests/unit/CicloFasiEditor.test.tsx` (nuovo `describe`, non toccare i blocchi esistenti):

```tsx
describe('CicloFasiEditor — header actions', () => {
  it('senza headerActions: nessun bottone Modifica/Elimina, nessuna riga Creato da', () => {
    render(<CicloFasiEditor cicloId="ciclo-1" nomeCiclo="CNC Corona" fasiIniziali={[]} ultimaModificaLabel={null} />)
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /elimina ciclo/i })).not.toBeInTheDocument()
  })

  it('con headerActions: mostra Modifica, Elimina, e la riga Creato da', () => {
    render(
      <CicloFasiEditor
        cicloId="ciclo-1"
        nomeCiclo="CNC Corona"
        fasiIniziali={[]}
        ultimaModificaLabel={null}
        headerActions={{
          codice: 'CNC01',
          tipoDispositivo: 'Protesi fissa',
          classeRischio: null,
          creatoDaLabel: 'Mario Rossi il 6 lug 2026, 10:00',
        }}
      />
    )
    expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /elimina ciclo/i })).toBeInTheDocument()
    expect(screen.getByText(/Creato da Mario Rossi il 6 lug 2026, 10:00/)).toBeInTheDocument()
  })

  it('con headerActions ma creatoDaLabel null: nessuna riga Creato da (ciclo storico)', () => {
    render(
      <CicloFasiEditor
        cicloId="ciclo-1"
        nomeCiclo="CNC Corona"
        fasiIniziali={[]}
        ultimaModificaLabel={null}
        headerActions={{ codice: 'CNC01', tipoDispositivo: 'Protesi fissa', classeRischio: null, creatoDaLabel: null }}
      />
    )
    expect(screen.queryByText(/Creato da/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/CicloFasiEditor.test.tsx -t "header actions"`
Expected: FAIL — `headerActions` non esiste ancora nei props.

- [ ] **Step 3: Estendi `CicloFasiEditor.tsx`**

Modifica l'interfaccia props (righe 27-32):

```tsx
interface CicloFasiEditorProps {
  cicloId: string
  nomeCiclo: string
  fasiIniziali: FaseItem[]
  ultimaModificaLabel: string | null
  headerActions?: {
    codice: string
    tipoDispositivo: string
    classeRischio: string | null
    creatoDaLabel: string | null
  }
}
```

Aggiungi gli import in cima al file:

```tsx
import { CicloNuovoSheet } from './CicloNuovoSheet'
import { CicloDeleteButton } from './CicloDeleteButton'
```

Modifica la firma della funzione (riga 78):

```tsx
export function CicloFasiEditor({ cicloId, nomeCiclo, fasiIniziali, ultimaModificaLabel, headerActions }: CicloFasiEditorProps) {
```

Modifica il blocco header card (righe 172-181) aggiungendo il nuovo contenuto dopo la riga `ultimaModificaLabel`:

```tsx
      <div style={cardStyle}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6, fontFamily }}>
          {nomeCiclo}
        </div>
        {ultimaModificaLabel && (
          <div style={{ fontSize: 12, color: 'var(--t2)', fontFamily }}>
            Ultima modifica di {ultimaModificaLabel}
          </div>
        )}
        {headerActions?.creatoDaLabel && (
          <div style={{ fontSize: 12, color: 'var(--t2)', fontFamily }}>
            Creato da {headerActions.creatoDaLabel}
          </div>
        )}
        {headerActions && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <CicloNuovoSheet
              mode="edit"
              cicloId={cicloId}
              initialValues={{
                codice: headerActions.codice,
                nome: nomeCiclo,
                tipo_dispositivo: headerActions.tipoDispositivo,
                classe_rischio: headerActions.classeRischio,
              }}
            />
            <CicloDeleteButton cicloId={cicloId} cicloNome={nomeCiclo} />
          </div>
        )}
      </div>
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/CicloFasiEditor.test.tsx`
Expected: PASS, tutti (blocchi esistenti + nuovo blocco header actions).

- [ ] **Step 5: Espandi la select in `[id]/page.tsx` e passa `headerActions`**

Modifica `src/app/(app)/cicli-produzione/[id]/page.tsx`:

```tsx
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
    .select('id, codice, nome, tipo_dispositivo, classe_rischio, created_by, created_at, updated_by, updated_at')
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
    const { data: editor } = await svc
      .from('utenti')
      .select('nome, cognome')
      .eq('id', ciclo.updated_by)
      .eq('laboratorio_id', utente.laboratorio_id)
      .single()
    if (editor) {
      ultimaModificaLabel = `${editor.nome} ${editor.cognome} il ${formatDataOra(ciclo.updated_at)}`
    }
  }

  let creatoDaLabel: string | null = null
  if (ciclo.created_by) {
    const { data: creatore } = await svc
      .from('utenti')
      .select('nome, cognome')
      .eq('id', ciclo.created_by)
      .eq('laboratorio_id', utente.laboratorio_id)
      .single()
    if (creatore) {
      creatoDaLabel = `${creatore.nome} ${creatore.cognome} il ${formatDataOra(ciclo.created_at)}`
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
          headerActions={{
            codice: ciclo.codice,
            tipoDispositivo: ciclo.tipo_dispositivo,
            classeRischio: ciclo.classe_rischio,
            creatoDaLabel,
          }}
        />
      </PageWrapper>
    </>
  )
}
```

`creatoDaLabel` include la data (`created_at`), stesso formato di `ultimaModificaLabel` — coerente con la spec (§3 UI: "Creato da {nome} {cognome} il {data}") e con il test del Task 9 Step 1, che passa già un `creatoDaLabel` con data inclusa nella stringa.

- [ ] **Step 6: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 7: Commit**

```bash
git add src/components/features/cicli/CicloFasiEditor.tsx "src/app/(app)/cicli-produzione/[id]/page.tsx" tests/unit/CicloFasiEditor.test.tsx
git commit -m "feat(cicli): aggiungi Modifica/Elimina/Creato da alla pagina dettaglio ciclo"
```

---

### Task 10: Verifica finale end-to-end

**Files:** nessuno (solo comandi di verifica).

- [ ] **Step 1: Type check completo**

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 2: Intera suite di test**

Run: `npx vitest run`
Expected: tutti i test passano, inclusi i preesistenti (nessuna regressione — in particolare `CicloFasiEditor.test.tsx` con i 4 argomenti originali, `cicli-route.test.ts` con i test `GET` preesistenti).

- [ ] **Step 3: Build di produzione**

Run: `npx next build`
Expected: build completata senza errori.

- [ ] **Step 4: QA browser manuale (3 viewport, light+dark) — FASE 9 CLAUDE.md**

Su `/cicli-produzione`: crea un ciclo nuovo, verifica redirect alla pagina dettaglio. Sulla pagina dettaglio: modifica il ciclo appena creato, verifica persistenza. Prova a eliminare un ciclo referenziato da un lavoro esistente (se disponibile in ambiente di test) → verifica messaggio 409. Elimina un ciclo non referenziato → verifica redirect a `/cicli-produzione` e sparizione dalla lista.

- [ ] **Step 5: Aggiorna memoria (BP-1, CLAUDE.md)**

Aggiorna `memory/MEMORY.md` (nuove API routes, nuovi componenti) e `docs/roadmap/ROADMAP-UFFICIALE.md` (feature completata) prima di chiudere la sessione.
