# Date fiscali Europe/Rome — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le date e gli anni FISCALI (fatture, XML FatturaPA, DdC, buono, DPA, PSUR, export) si calcolano sul giorno civile di Roma, mai in UTC — con numero documento, serie progressiva e data sempre coerenti fra loro anche a cavallo di capodanno; stesso fix nelle due RPC PL/pgSQL che emettono draft fiscali lato DB.

**Architecture:** Un nuovo `annoRoma()` in `data-roma.ts`; `generaProgressivo` prende l'anno come parametro **obbligatorio** (riserva backend #1: il default opzionale reintrodurrebbe la divergenza numero/serie); ogni call-site fiscale calcola UN solo istante (`const adesso = new Date()`) e ne deriva `oggi` e `anno` (riserva backend #2). Una migration ridefinisce `outbox_prepara_draft` e `emetti_nota_credito_atomica` con `v_data := (now() AT TIME ZONE 'Europe/Rome')::date; v_anno := EXTRACT(year FROM v_data)::int` (un solo `now()`, riserva backend #3), ripartendo dai body PIÙ RECENTI (outbox: migration 20260710092000; nota credito: migration 20260715120000 — NON la 100000) e ridichiarando `SECURITY DEFINER SET search_path` + REVOKE/GRANT (riserva appsec #4).

**Tech Stack:** Next.js 16, TypeScript, Vitest, Supabase (Postgres + CLI migration), helper `src/lib/utils/data-roma.ts` già in prod (Bundle T).

## Global Constraints

- Panel advisor 20/07: 3× CONFERMATA CON RISERVE — tutte le riserve integrate qui; deviazioni vietate senza nuovo panel.
- **Fuori scope dichiarato** (riserva appsec #2): draft di dicembre emesso a gennaio mantiene numero/serie/data congelati sul draft (ramo `fatturaId` di generate-xml INTATTO) — comportamento pre-esistente da segnalare a Francesco nel report, non da cambiare qui.
- **Esclusi esplicitamente** (riserva appsec #6): i timestamptz completi (`generate-ddc.ts` data_emissione/pdf_generato_at, `updated_at`, ecc.) sono corretti così — NON toccarli.
- Migration applicata al DB live PRIMA del push del codice TS (riserva architect #1) + gate FASE 6b (gen types + tsc; diff types atteso VUOTO — riserva architect #3).
- Rollback = roll-forward: nessuna down, nessun body commentato; la migration cita in testa i file+commit dei body precedenti (riserva architect #2).
- `outbox_claim_batch` NON si tocca (riserva appsec #4).
- Smoke post-deploy: query `pg_proc.prosrc` deve contenere `Europe/Rome` per entrambe le funzioni (riserva architect #5).
- Worktree: `.claude/worktrees/date-fiscali-roma` (branch `worktree-date-fiscali-roma` da main `c2df1a2`).
- Commit format `fix(fiscale)|feat(db)|test(...)`; MAI commit con test rossi.

---

### Task 1: `annoRoma()` + commento header veritiero in data-roma.ts

**Files:**
- Modify: `src/lib/utils/data-roma.ts` (nuova funzione + header)
- Test: `tests/unit/data-roma.test.ts` (aggiungi describe)

**Interfaces:**
- Produces: `annoRoma(d?: Date): number` — anno del giorno civile di Roma.

- [ ] **Step 1: Write the failing test** (in coda a data-roma.test.ts; aggiungi `annoRoma` all'import)

```typescript
describe('annoRoma — anno del giorno civile di Roma (date fiscali)', () => {
  it('capodanno: 23:30 UTC del 31/12 è GIÀ il 2027 a Roma (CET +1)', () => {
    expect(annoRoma(new Date('2026-12-31T23:30:00Z'))).toBe(2027)
  })
  it('22:30 UTC del 31/12 è ancora 2026 a Roma (23:30 CET)', () => {
    expect(annoRoma(new Date('2026-12-31T22:30:00Z'))).toBe(2026)
  })
  it('a metà anno coincide con l\'anno UTC', () => {
    expect(annoRoma(new Date('2026-07-20T12:00:00Z'))).toBe(2026)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/data-roma.test.ts` — Expected: FAIL (`annoRoma` non esportata).

- [ ] **Step 3: Implementazione** (dopo `oggiRomaISO`):

```typescript
/** L'anno del giorno civile di Roma — per numeri documento e serie progressive
 *  fiscali (a capodanno l'anno UTC resta indietro di 1-2 ore). */
export function annoRoma(d: Date = new Date()): number {
  return Number(oggiRomaISO(d).slice(0, 4))
}
```

E sostituisci l'ultima riga del commento header (ora falsa dopo questo fix):

```typescript
// Dal fix date-fiscali (20/07/2026) passano da qui ANCHE fatture, XML
// FatturaPA, DdC, buono e DPA (annoRoma/oggiRomaISO): la data documento è il
// giorno civile italiano ex Art. 21 DPR 633/72. I timestamptz completi
// (data_emissione, *_at) restano invece istanti assoluti — corretti così.
```

- [ ] **Step 4: Run** stesso comando — Expected: PASS (14 test).

- [ ] **Step 5: Commit** `git add … && git commit -m "feat(utils): annoRoma — anno del giorno civile di Roma per le date fiscali"`

---

### Task 2: `generaProgressivo` con anno OBBLIGATORIO + aggiornamento meccanico dei 5 call-site

**Files:**
- Modify: `src/lib/db/progressivi.ts`
- Modify (meccanico, coerenza raffinata nei task 3-6): `src/app/api/fatture/batch/route.ts:210`, `src/lib/fattura/generate-xml.ts:204,218`, `src/lib/pdf/generate-ddc.ts:69`, `src/lib/pdf/generate-buono.ts:35`
- Test: `tests/unit/progressivi.test.ts` (nuovo)

**Interfaces:**
- Produces: `generaProgressivo(supabase, laboratorio_id, tipo, anno: number): Promise<number>` — il chiamante DEVE passare l'anno (lo stesso che stampa nel numero documento).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/progressivi.test.ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { generaProgressivo } from '../../src/lib/db/progressivi'

describe('generaProgressivo — anno esplicito (fix date fiscali)', () => {
  it('passa alla RPC ESATTAMENTE l\'anno ricevuto dal chiamante', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 7, error: null })
    const n = await generaProgressivo({ rpc } as never, 'lab-1', 'fattura', 2027)
    expect(n).toBe(7)
    expect(rpc).toHaveBeenCalledWith('genera_progressivo', {
      p_laboratorio_id: 'lab-1', p_tipo: 'fattura', p_anno: 2027,
    })
  })
  it('errore RPC → throw con tipo nel messaggio', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(generaProgressivo({ rpc } as never, 'lab-1', 'ddc', 2026)).rejects.toThrow(/ddc.*boom/)
  })
})
```

- [ ] **Step 2: Run** — Expected: FAIL (firma a 3 parametri, `p_anno` = anno UTC).

- [ ] **Step 3: Implementazione** — in `progressivi.ts` la firma diventa:

```typescript
export async function generaProgressivo(
  supabase: SupabaseClient,
  laboratorio_id: string,
  tipo: string,
  /** Anno della serie — OBBLIGATORIO e identico a quello stampato nel numero
   *  documento (Europe/Rome via annoRoma()): mai ricalcolarlo qui, la
   *  divergenza numero/serie a capodanno è esattamente il bug chiuso il 20/07. */
  anno: number
): Promise<number> {
  const { data, error } = await supabase.rpc('genera_progressivo', {
    p_laboratorio_id: laboratorio_id,
    p_tipo: tipo,
    p_anno: anno,
  })
  // … (resto invariato)
```

Aggiorna i 5 call-site in modo che COMPILINO passando l'anno già calcolato nel file (nei file dove `anno` non esiste ancora come variabile Roma, introducila subito: `const anno = annoRoma()` — la coerenza istante-unico si rifinisce nei task 3-6).

- [ ] **Step 4: Run** `npx vitest run tests/unit/progressivi.test.ts && npx tsc --noEmit` — Expected: PASS + 0 errori.

- [ ] **Step 5: Commit** `fix(db): generaProgressivo richiede l'anno del chiamante — serie e numero mai divergenti`

---

### Task 3: POST /api/fatture — istante unico + guard su body.data

**Files:**
- Modify: `src/app/api/fatture/route.ts:100-125`
- Test: `tests/unit/fatture-data-roma.test.ts` (nuovo)

- [ ] **Step 1: Write the failing test** — mock pattern da `tests/unit/impostazioni-url-storage.test.ts` (lab-context + service client + csrf); la chain del mock `from('fatture')` deve supportare `.insert().select().single()`; `svc.rpc` mockata per `genera_progressivo`.

```typescript
// tests/unit/fatture-data-roma.test.ts
// POST /api/fatture — data/anno dal giorno civile di Roma (fix date fiscali 20/07)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(), mockFrom: vi.fn(), mockRpc: vi.fn(),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext, getLabContextWithTimings: vi.fn(),
}))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST } from '../../src/app/api/fatture/route'

const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: 'lab-1',
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}
function req(body: unknown): Request {
  return new Request('http://localhost/api/fatture', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

let inserted: Record<string, unknown>[]
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  inserted = []
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  mockRpc.mockResolvedValue({ data: 1, error: null })
  mockFrom.mockImplementation(() => ({
    insert: (payload: Record<string, unknown>) => {
      inserted.push(payload)
      return { select: () => ({ single: async () => ({ data: { id: 'f1', ...payload }, error: null }) }) }
    },
  }))
})
afterEach(() => { vi.useRealTimers() })

describe('POST /api/fatture — capodanno Europe/Rome', () => {
  it('23:30 UTC del 31/12 → numero 2027-0001, anno 2027, data 2027-01-01, serie p_anno 2027', async () => {
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    const res = await POST(req({ cliente_id: 'cli-1' }))
    expect(res.status).toBe(201)
    expect(mockRpc).toHaveBeenCalledWith('genera_progressivo', expect.objectContaining({ p_anno: 2027 }))
    expect(inserted[0]).toMatchObject({ numero: '2027-0001', anno: 2027, data: '2027-01-01' })
  })
  it('body.data di un anno DIVERSO dalla serie → 422, nessun progressivo bruciato prima del check', async () => {
    vi.setSystemTime(new Date('2026-07-20T10:00:00Z'))
    const res = await POST(req({ cliente_id: 'cli-1', data: '2025-12-31' }))
    expect(res.status).toBe(422)
    expect(inserted).toHaveLength(0)
  })
  it('body.data dello STESSO anno → accettata (retrodatazione infra-anno legittima)', async () => {
    vi.setSystemTime(new Date('2026-07-20T10:00:00Z'))
    const res = await POST(req({ cliente_id: 'cli-1', data: '2026-07-01' }))
    expect(res.status).toBe(201)
    expect(inserted[0]).toMatchObject({ data: '2026-07-01', anno: 2026 })
  })
})
```

- [ ] **Step 2: Run** — Expected: FAIL (data UTC `2026-12-31`, anno 2026, nessun 422).

- [ ] **Step 3: Implementazione** in `fatture/route.ts` (sostituisce righe 100-125):

```typescript
  // Fix date fiscali (20/07): un SOLO istante → anno serie, numero e data
  // sempre coerenti (Europe/Rome), anche a cavallo di capodanno.
  const adesso = new Date()
  const oggi = oggiRomaISO(adesso)
  const anno = annoRoma(adesso)

  // Guard (riserva appsec): una data documento fuori dall'anno della serie
  // produrrebbe numero 2026-… su fattura datata 2025 — si rifiuta PRIMA di
  // bruciare il progressivo. Retrodatazione infra-anno = legittima.
  const dataRichiesta = typeof body.data === 'string' ? body.data : null
  if (dataRichiesta && !dataRichiesta.startsWith(`${anno}-`)) {
    return NextResponse.json(
      { error: `La data ${dataRichiesta} non appartiene all'anno della serie ${anno}` },
      { status: 422 }
    )
  }

  const { data: progressivo, error: rpcError } = await svc.rpc('genera_progressivo', {
    p_laboratorio_id: labId, p_tipo: 'fattura', p_anno: anno,
  })
  // … (gestione errore invariata) …
  const numero = `${anno}-${String(progressivo).padStart(4, '0')}`
  // … insertData: data: dataRichiesta ?? oggi, anno, numero invariati nel resto
```

con import `import { oggiRomaISO, annoRoma } from '@/lib/utils/data-roma'`.

- [ ] **Step 4: Run** test nuovo + `npx vitest run tests/unit --silent -t fatture` per i test fatture esistenti — Expected: tutti PASS.

- [ ] **Step 5: Commit** `fix(fiscale): data e anno fattura dal giorno civile di Roma + guard data/serie (POST /api/fatture)`

---

### Task 4: batch fatture — istante unico per iterazione

**Files:**
- Modify: `src/app/api/fatture/batch/route.ts:209-222`
- Test: aggiungi a `tests/unit/fatture-data-roma.test.ts` SOLO se il file batch ha già test dedicati con mock pronti (verificare `grep -l "fatture/batch" tests/unit`); altrimenti il caso NYE è coperto dal pattern comune e si documenta nel commento.

- [ ] **Step 1: Implementazione** (righe 209-222):

```typescript
      // Fix date fiscali (20/07): un solo istante per iterazione — numero,
      // serie e data del draft sempre coerenti (Europe/Rome).
      const adessoDraft = new Date()
      const annoFattura = annoRoma(adessoDraft)
      const progFattura = await generaProgressivo(svc, labId, 'fattura', annoFattura)
      const numeroDraft = `${annoFattura}-${String(progFattura).padStart(4, '0')}`
      // … insert: anno: annoFattura, data: oggiRomaISO(adessoDraft) …
```

- [ ] **Step 2: Run** `npx tsc --noEmit && npx vitest run tests/unit` (i test batch esistenti non asseriscono la data UTC — verificare che restino verdi).

- [ ] **Step 3: Commit** `fix(fiscale): draft batch con data/anno Europe/Rome per iterazione`

---

### Task 5: generate-xml — stesso anno per entrambe le serie e per il numero

**Files:**
- Modify: `src/lib/fattura/generate-xml.ts:199-221`
- Test: `tests/unit/generate-xml-pdf-cortesia.test.ts:100` (allineamento, riserva architect #4)

- [ ] **Step 1: Implementazione** (righe 202-220):

```typescript
  // Fix date fiscali (20/07): un solo istante → l'anno passato a ENTRAMBE le
  // serie (sdi_invio e fattura) è lo stesso stampato nel numero e nella data
  // (riserva panel: se una serie ricalcolasse l'anno, il bug capodanno
  // rientrerebbe dalla finestra). Ramo draft (fatturaId): numero/anno/data
  // restano CONGELATI sul draft — deliberato, vedi piano §Global Constraints.
  const adesso = new Date()
  const anno = annoRoma(adesso)
  const oggi = oggiRomaISO(adesso)
  const progressivoSdi = await generaProgressivo(supabase, laboratorioId, 'sdi_invio', anno)
  // … ramo else: generaProgressivo(supabase, laboratorioId, 'fattura', anno) …
```

- [ ] **Step 2: Allinea il test cortesia** — `tests/unit/generate-xml-pdf-cortesia.test.ts:100`: sostituisci `const oggi = new Date().toISOString().split('T')[0]` con `const oggi = oggiRomaISO()` (import da `@/lib/utils/data-roma`) — l'atteso segue la stessa semantica del codice, mai più divergente di notte.

- [ ] **Step 3: Run** `npx vitest run tests/unit/generate-xml-pdf-cortesia.test.ts tests/unit/generate-xml-prezzo.test.ts && npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 4: Commit** `fix(fiscale): XML FatturaPA con anno/data Europe/Rome — un istante, due serie coerenti`

---

### Task 6: DdC, buono, DPA, fallback orchestrate, PSUR, export — annoRoma puntuale

**Files:**
- Modify: `src/lib/pdf/generate-ddc.ts:51,69` · `src/lib/pdf/generate-buono.ts:21,35` · `src/lib/pdf/generate-dpa.ts:37` · `src/lib/consegna/orchestrate.ts:74,77` · `src/app/api/qualita/psur/route.ts:98` · `src/app/api/fatture/export/route.ts:29`
- Test: `tests/unit/generate-ddc.test.ts` (aggiungi caso NYE)

- [ ] **Step 1: Write the failing test** (in coda a generate-ddc.test.ts):

```typescript
describe('numero DDC a capodanno (fix date fiscali 20/07)', () => {
  afterEach(() => { vi.useRealTimers() })
  it('23:30 UTC del 31/12 → DDC-2027-0001 e serie p_anno… coerente', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    mockTables(LAB_FIXTURE)
    const result = await generateDdC(LAVORO_FIXTURE)
    expect(result.numero).toBe('DDC-2027-0001')
    expect(mockGeneraProgressivo).toHaveBeenCalledWith(expect.anything(), 'lab-test-001', 'ddc', 2027)
  })
})
```

(Verifica l'id lab della fixture in `tests/unit/helpers/pdf-fixtures.ts` e adegua l'atteso. `mockGeneraProgressivo` esiste già nel file.)

- [ ] **Step 2: Run** — Expected: FAIL (`DDC-2026-…`, chiamata senza anno o con 2026).

- [ ] **Step 3: Implementazione** — in ciascun file:
  - `generate-ddc.ts`: `const anno = annoRoma()` (riga 51) e `generaProgressivo(supabase, lavoro.laboratorio_id, 'ddc', anno)` (riga 69).
  - `generate-buono.ts`: idem con la variabile `anno` esistente → `annoRoma()`, e `generaProgressivo(…, 'buono', anno)`.
  - `generate-dpa.ts:37`: `DPA-${annoRoma()}-…`.
  - `orchestrate.ts:74,77`: fallback `DDC-${annoRoma()}-000` / `BUO-${annoRoma()}-000`.
  - `psur/route.ts:98`: `annoRoma() - 1`.
  - `fatture/export/route.ts:29`: `String(annoRoma())`.
  (Import `annoRoma` in ognuno.)

- [ ] **Step 4: Run** `npx vitest run tests/unit/generate-ddc.test.ts tests/unit/orchestra-consegna-no-fattura.test.ts tests/unit/qualita-psur-route.test.ts && npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 5: Commit** `fix(fiscale): DdC/buono/DPA/PSUR/export su anno del giorno civile di Roma`

---

### Task 7: Migration — le due RPC fiscali su Europe/Rome

**Files:**
- Create: `supabase/migrations/20260720150000_date_fiscali_europe_rome.sql`

**Interfaces:**
- Consumes: body correnti di `outbox_prepara_draft` (da `20260710092000_rpc_outbox_claim_prepara.sql:37-97`) e `emetti_nota_credito_atomica` (da `20260715120000_cap_storno_totale_fattura.sql` — l'ULTIMA definizione, include il cap storno).

- [ ] **Step 1: Scrivi la migration** — struttura obbligata:

```sql
-- Date fiscali Europe/Rome (fix 20/07/2026, panel advisor 3× confermato):
-- EXTRACT(year FROM now()) e current_date sul DB (UTC) datavano draft e
-- nota di credito al giorno/anno UTC — sbagliato tra le 00:00 e le 02:00 di
-- Roma, e a capodanno sbagliava anche la serie progressiva.
-- ROLLBACK = roll-forward: i body precedenti sono in git —
--   outbox_prepara_draft:        supabase/migrations/20260710092000_rpc_outbox_claim_prepara.sql (main c2df1a2)
--   emetti_nota_credito_atomica: supabase/migrations/20260715120000_cap_storno_totale_fattura.sql (main c2df1a2)
-- NB: outbox_claim_batch NON è toccata.

CREATE OR REPLACE FUNCTION public.outbox_prepara_draft(p_entry_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
-- [body COPIATO INTEGRALMENTE dalla 20260710092000, con SOLO queste righe cambiate:]
--   v_data date;                                  -- (nuova variabile in DECLARE)
--   v_data := (now() AT TIME ZONE 'Europe/Rome')::date;
--   v_anno := EXTRACT(year FROM v_data)::int;     -- (al posto di EXTRACT(year FROM now()))
--   … VALUES (…, v_data, 'TD01', …)               -- (al posto di CURRENT_DATE)
$$;

CREATE OR REPLACE FUNCTION public.emetti_nota_credito_atomica(…)
-- [idem: body INTEGRALE dalla 20260715120000; v_anno/current_date → v_data Europe/Rome]

-- Difesa in profondità (idempotente — i grant sopravvivono al REPLACE ma si ribadiscono):
REVOKE ALL ON FUNCTION public.outbox_prepara_draft(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outbox_prepara_draft(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.emetti_nota_credito_atomica(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emetti_nota_credito_atomica(uuid, text, uuid) TO service_role;
```

(I commenti-placeholder nel blocco sopra indicano il PUNTO delle sostituzioni: nel file reale va il body completo copiato dalla migration sorgente, con le 3 sostituzioni applicate. Firma di `emetti_nota_credito_atomica` esattamente come nella 20260715120000.)

- [ ] **Step 2: Lint locale** — `grep -c "Europe/Rome" supabase/migrations/20260720150000_date_fiscali_europe_rome.sql` ≥ 2; `grep -c "SECURITY DEFINER SET search_path" …` = 2; nessuna occorrenza residua di `CURRENT_DATE`/`current_date`/`EXTRACT(year FROM now())` nel nuovo file.

- [ ] **Step 3: Applica al DB live** (PRIMA del push TS — riserva architect #1): comando di progetto per le migration (`npx supabase db push` con il progetto linkato `iagibumwjstnveqpjbwq`); se il CLI non è autenticato in questa sessione, FERMARSI e chiedere a Francesco di applicarla.

- [ ] **Step 4: FASE 6b** — `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` (rimuovere eventuale riga CLI in coda) + `git diff src/types/database.types.ts` (atteso: nessun diff) + `npx tsc --noEmit`.

- [ ] **Step 5: Smoke DB** — via query (psql/REST service): `SELECT proname FROM pg_proc WHERE proname IN ('outbox_prepara_draft','emetti_nota_credito_atomica') AND prosrc LIKE '%Europe/Rome%'` → 2 righe.

- [ ] **Step 6: Commit** `feat(db): outbox_prepara_draft + emetti_nota_credito_atomica su giorno civile Europe/Rome`

---

### FASI FINALI

- [ ] **FASE 7:** `npx tsc --noEmit && npx vitest run && npx next build` — output reale, zero errori.
- [ ] **FASE 8:** review subagent sul diff whole-branch (template requesting-code-review), fix Critical/Important, verdetto.
- [ ] **FASE 10:** merge --no-ff su main → push → CI verde → CD Vercel → smoke prod.
- [ ] **FASE 11 (BP-1):** MEMORY.md voce nuova (fix date fiscali: superficie, panel, fuori-scope draft dic→gen) + ROADMAP voce testa + SESSION_ACTIVE.

## Fuori scope (riportare a Francesco nel report)

- Draft fattura creato a dicembre ed emesso a gennaio: numero/serie/data restano quelli del draft (congelamento deliberato pre-esistente). Se indesiderato → decisione dedicata (rigenerare progressivo se `draft.anno !== annoRoma()`).
- Componenti CLIENT con date UTC (NuovoOrdineSheet, RegistraPagamentoSheet, RichiestaClientForm) e range produttività/cedolino: non fiscali, restano nel backlog O1b-residui.
