# Portale Dentista v2 — Ondata 0: Pulizia 4a + fix indipendenti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rimuovere l'emissione fiscale automatica (inline B-1 e infrastruttura outbox 4a) e consolidare i fix indipendenti dal modello (gate B1, annullo atomico, DdC annullata + lettori, `fatture.lavoro_id`), lasciando il DB e il codice pronti per l'Ondata 1 (fatturazione concordata).

**Architecture:** La consegna non produce MAI documenti fiscali (spec §1). Una migration di pulizia in un'unica transazione smonta l'infrastruttura outbox applicata al DB live il 10/07 (mai usata da codice) e riscrive le 2 RPC atomiche senza outbox: `consegna_finalizza_atomica(uuid,uuid)` = sola transizione di stato; `annulla_consegna_atomica` = doppio gate fiscale su `fatture.lavoro_id` + `incluso_in_fattura`. Il batch manuale diventa l'unico writer di `fatture.lavoro_id`. I lettori DdC filtrano `stato <> 'annullata'` (il UNIQUE parziale live permette già 2+ righe per lavoro — URGENTE, audit I-4).

**Tech Stack:** Next.js 16 App Router · Supabase (Postgres + RPC plpgsql SECURITY DEFINER) · Vitest · TypeScript

**Spec di riferimento:** `docs/superpowers/specs/2026-07-10-portale-dentista-v2-fatturazione-concordata-design.md` §3 «Ondata 0» (8 punti). I Task 4–8 riusano i Task 9/11/12/13/14 del piano 4a (`docs/superpowers/plans/2026-07-09-ondata-4a-server-consegna-fiscale.md`), adattati al nuovo modello.

## Global Constraints

- **Worktree dedicato da `main`** (`ondata-0-pulizia`). Copiare nel worktree `.env.local` e `supabase/.temp` dal repo principale (gitignored, non seguono il worktree).
- **La migration di pulizia si applica al DB live `iagibumwjstnveqpjbwq` SOLO al Task 10, con conferma esplicita di Francesco** (gate). Fino ad allora: solo file. Il DB live oggi ha le 6 migration 4a applicate e inerti, 2 job pg_cron GIÀ rimossi a mano (`cron.unschedule` il 10/07).
- **QA browser SOLO sul lab E2E `00000000-0000-0000-0000-000000000001` — MAI il lab Filippo.**
- **NON si eredita dalla 4a** (spec §3 punto 8): endpoint cron, Vault/CRON_SECRET, admin «Coda emissione», idempotenza `generaFatturaPA`. `ConsegnaResult.fattura` resta `{ numero: string; stato_sdi: string } | null` e resta sempre `null` — NON cambiare il tipo in `domain.ts:587`.
- **Invariante spec:** consegna con cliente fatturabile → zero righe in `fatture`, zero progressivi consumati (regressione B-1).
- **RPC:** mai `CREATE OR REPLACE` con firma diversa (crea overload orfani — P2-9): `DROP FUNCTION` esplicito della vecchia firma + `CREATE` della nuova. Ogni firma nuova: `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `REVOKE ALL FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE TO service_role`.
- Ogni task chiude con `npx tsc --noEmit && npx vitest run` verdi prima del commit. Baseline attesa: 1133 test pass.
- Commit format: `feat(scope): …` / `fix(scope): …` — vedi CLAUDE.md §5.

---

### Task 1: B-1 — Rimozione dell'emissione fiscale inline alla consegna

Lo Step 6 di `orchestraConsegna` (pre-esistente alla 4a) crea OGGI in produzione un draft `fatture` + XML consumando un progressivo per ogni cliente con SDI/PEC, senza settare `incluso_in_fattura` (bug doppia-fatturazione auto+batch). Viola il principio §1 della spec. Va rimosso integralmente.

**Files:**
- Modify: `src/lib/consegna/orchestrate.ts:263-313` (rimozione Step 6) e `:4` (import `generaProgressivo` che resta orfano)
- Test: `tests/unit/orchestra-consegna-no-fattura.test.ts` (nuovo)

**Interfaces:**
- Consumes: nulla di nuovo.
- Produces: `orchestraConsegna` non tocca mai la tabella `fatture` né il progressivo `fattura`. `ConsegnaResult.fattura` resta `null` (nessuna modifica al tipo). I Task 4 e 6 modificano lo stesso file DOPO questo task.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/orchestra-consegna-no-fattura.test.ts
// Regressione B-1 (spec Portale Dentista v2 §3 punto 1): la consegna di un
// lavoro con cliente fatturabile (SDI/PEC) NON deve creare righe in fatture
// né consumare progressivi. La fatturazione nasce solo dal flusso concordato.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, tabelleUsate, rpcChiamate } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  tabelleUsate: [] as string[],
  rpcChiamate: [] as string[],
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: mockRpc, from: mockFrom }),
}))
vi.mock('@/lib/notifications/trigger', () => ({ triggerPushByRole: vi.fn() }))
vi.mock('@/lib/consegna/precheck', () => ({ precheckMDR: () => ({ ok: true, errori: [] }) }))
vi.mock('@/lib/consegna/traccia-materiali', () => ({
  tracciaMaterialiLavoro: async () => ({ tracciabilitaOk: true, dettaglio: [], materialiTracciati: [] }),
}))
vi.mock('@/lib/pdf/generate-ddc', () => ({ generateDdC: async () => ({ numero: 'DDC-1', url: 'u' }) }))
vi.mock('@/lib/pdf/generate-buono', () => ({ generateBuono: async () => ({ numero: 'BUO-1', url: 'u' }) }))
vi.mock('@/lib/fattura/generate-xml', () => ({ generaFatturaPA: vi.fn(async () => ({ numero: 'X' })) }))

import { orchestraConsegna } from '@/lib/consegna/orchestrate'

const LAVORO = {
  id: 'lav-1', laboratorio_id: 'lab-1', stato: 'pronto', numero_lavoro: 'n.1',
  cliente: { id: 'cli-1', codice_sdi: 'ABC1234', pec: null, telefono: null, portale_token: 't' },
  paziente: null, lavorazioni: [], materiali: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  tabelleUsate.length = 0
  rpcChiamate.length = 0

  mockRpc.mockImplementation(async (fn: string) => {
    rpcChiamate.push(fn)
    if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
    if (fn === 'genera_progressivo') return { data: 5, error: null } // pre-fix: usato dall'IIFE Step 6
    throw new Error(`Unexpected rpc: ${fn}`)
  })
  mockFrom.mockImplementation((table: string) => {
    tabelleUsate.push(table)
    if (table === 'lavori') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: LAVORO, error: null }) }) }) }) }),
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null, count: 1 }) }) }),
      }
    }
    if (table === 'fatture') {
      // pre-fix: lo Step 6 inserisce il draft qui — post-fix mai chiamato
      return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'fat-1' }, error: null }) }) }) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('regressione B-1 — consegna senza emissione fiscale', () => {
  it('cliente fatturabile (SDI): zero accessi a fatture, zero progressivi, fattura null', async () => {
    const result = await orchestraConsegna('lav-1', 'lab-1')
    // Flush del fire-and-forget pre-fix (IIFE async): senza questo il test
    // passerebbe in modo spurio anche col codice vecchio.
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.fattura).toBeNull()
    expect(tabelleUsate).not.toContain('fatture')
    expect(rpcChiamate).not.toContain('genera_progressivo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/orchestra-consegna-no-fattura.test.ts`
Expected: FAIL — `tabelleUsate` contiene `'fatture'` e `rpcChiamate` contiene `'genera_progressivo'` (l'IIFE dello Step 6 gira nel flush)

- [ ] **Step 3: Rimuovi lo Step 6**

In `src/lib/consegna/orchestrate.ts` elimina INTEGRALMENTE il blocco Step 6 (righe 263-313), cioè dal commento:

```ts
    // ----------------------------------------------------------------
    // Step 6 — FatturaPA (non blocking — fire-and-forget con draft record)
    // ----------------------------------------------------------------
```

fino alla chiusura dell'IIFE inclusa:

```ts
      })()
    }
```

(comprende la dichiarazione `const cliente = lavoro.cliente as unknown as {...}` e il ramo `if (cliente?.codice_sdi || cliente?.pec) { ... }`).

Poi rimuovi l'import diventato orfano alla riga 4:

```ts
import { generaProgressivo } from '@/lib/db/progressivi'
```

Non toccare nient'altro: Step 5 (update stato), push notification, Step 7 (WhatsApp) e Step 8 (return con `fattura: null`) restano identici.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/orchestra-consegna-no-fattura.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Suite completa + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS (1133+1)

```bash
git add src/lib/consegna/orchestrate.ts tests/unit/orchestra-consegna-no-fattura.test.ts
git commit -m "fix(consegna): rimossa emissione fiscale inline alla consegna (B-1, spec fatturazione concordata §3.1)"
```

---

### Task 2: B-2 — Il batch scrive `fatture.lavoro_id`

Oggi NESSUN writer scrive `lavoro_id` (colonna + indice `fatture_lavoro_attiva_unique` già applicati al DB live dalla 4a) → il gate annullo del Task 3 sarebbe un no-op. Il batch (`/api/fatture/batch`, loop 1 fattura ↔ 1 lavoro) è l'unico flusso di emissione rimasto: scrive `lavoro_id` nell'INSERT del draft. Le fatture pre-esistenti restano `NULL` (nessun backfill).

**Files:**
- Modify: `src/app/api/fatture/batch/route.ts:205-236` (INSERT draft + gestione 23505)
- Test: `tests/unit/fatture-batch-lavoro-id.test.ts` (nuovo)

**Interfaces:**
- Consumes: colonna `fatture.lavoro_id` + indice UNIQUE parziale `fatture_lavoro_attiva_unique (laboratorio_id, lavoro_id) WHERE lavoro_id IS NOT NULL AND stato_sdi <> 'rifiutata'` (già sul DB live).
- Produces: ogni fattura creata dal batch ha `lavoro_id` valorizzato → il doppio gate fiscale dell'annullo (Task 3) diventa effettivo. Violazione 23505 → errore pulito nel `BatchResult`, mai il messaggio Postgres grezzo.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/fatture-batch-lavoro-id.test.ts
// B-2 (spec §3 punto 2): il batch è il writer di fatture.lavoro_id.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, insertPayloads, insertResult } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  insertPayloads: [] as Array<Record<string, unknown>>,
  insertResult: { value: { data: { id: 'fat-1' }, error: null } as { data: unknown; error: unknown } },
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: async () => 7 }))
vi.mock('@/lib/fattura/generate-xml', () => ({ generaFatturaPA: async () => ({ numero: '2026-0007' }) }))

import { POST } from '../../src/app/api/fatture/batch/route'

// Chain generica: ogni metodo ritorna se stessa, i terminali risolvono result.
function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'update', 'eq', 'is', 'neq', 'in']) c[m] = () => c
  c.single = async () => result
  c.maybeSingle = async () => result
  return c
}

function req() {
  return new Request('http://localhost/api/fatture/batch', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
    body: JSON.stringify({ lavoro_ids: ['lav-1'] }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  insertPayloads.length = 0
  insertResult.value = { data: { id: 'fat-1' }, error: null }
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return chain({ data: { laboratorio_id: 'lab-1' }, error: null })
    if (table === 'lavori')
      return chain({
        data: { id: 'lav-1', numero_lavoro: 'n.1', cliente_id: 'cli-1', laboratorio_id: 'lab-1' },
        error: null,
      })
    if (table === 'fatture') {
      return {
        insert: (payload: Record<string, unknown>) => {
          insertPayloads.push(payload)
          return { select: () => ({ single: async () => insertResult.value }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/fatture/batch — lavoro_id sul draft', () => {
  it("l'INSERT del draft valorizza lavoro_id", async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0].lavoro_id).toBe('lav-1')
  })

  it('23505 (fattura attiva già collegata) → errore pulito senza leak del vincolo', async () => {
    insertResult.value = {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "fatture_lavoro_attiva_unique"' },
    }
    const res = await POST(req())
    const json = await res.json()
    expect(json.errori).toBe(1)
    expect(json.results[0].ok).toBe(false)
    expect(JSON.stringify(json)).not.toContain('fatture_lavoro_attiva_unique')
    expect(JSON.stringify(json)).not.toContain('duplicate key')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/fatture-batch-lavoro-id.test.ts`
Expected: FAIL — `insertPayloads[0].lavoro_id` è `undefined`; il caso 23505 espone il messaggio Postgres grezzo

- [ ] **Step 3: Implementa**

In `src/app/api/fatture/batch/route.ts`, nell'INSERT del draft (righe ~205-224) aggiungi `lavoro_id` subito dopo `cliente_id`:

```ts
      const { data: draftFattura, error: draftErr } = await svc
        .from('fatture')
        .insert({
          laboratorio_id: labId,
          cliente_id: (lavoro as { cliente_id: string }).cliente_id,
          lavoro_id, // B-2: unico writer — abilita il gate fiscale dell'annullo
          numero: numeroDraft,
          anno: annoFattura,
          progressivo: progFattura,
          data: new Date().toISOString().split('T')[0],
          tipo_documento: 'TD01',
          stato_sdi: 'draft',
          imponibile: 0,
          iva_importo: 0,
          bollo: 0,
          totale: 0,
          codice_iva: 'N4',
          natura_iva: 'N4',
          cliente_denominazione: '',
          cliente_indirizzo: '',
        })
        .select('id')
        .single()
```

E nel ramo di errore del draft (righe ~228-236) mappa 23505 su messaggio pulito:

```ts
      if (draftErr || !draftFattura?.id) {
        results.push({
          lavoro_id,
          numero_lavoro: numeroLavoro,
          ok: false,
          error:
            draftErr?.code === '23505'
              ? 'Esiste già una fattura attiva per questo lavoro'
              : `Errore creazione draft fattura: ${draftErr?.message ?? 'null'}`,
        })
        continue
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/fatture-batch-lavoro-id.test.ts` → PASS (2 test)

- [ ] **Step 5: Suite completa + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS (se `tests/unit/api-fatture.test.ts` copre il batch e si rompe sul nuovo campo, adeguane i mock — il payload extra `lavoro_id` è l'unico delta)

```bash
git add src/app/api/fatture/batch/route.ts tests/unit/fatture-batch-lavoro-id.test.ts
git commit -m "feat(fatture): il batch scrive fatture.lavoro_id sul draft (B-2, gate annullo effettivo)"
```

---

### Task 3: Migration di pulizia — smontaggio outbox + RPC adattate (file only)

Un'unica migration (= un'unica transazione con `supabase db push`), nell'ordine chirurgico dell'audit I-1/SRE-2 (spec §3 punti 3-4). **NON applicarla al DB live in questo task** — l'apply è il Task 10 (gate Francesco). Sul DB live i 2 job pg_cron sono già stati rimossi a mano il 10/07: l'unschedule guardato serve per replay della history / ambienti nuovi, dove i job rinascono dalla migration 4a `20260710092500`.

**Files:**
- Create: `supabase/migrations/20260710150000_ondata0_pulizia_outbox.sql`

**Interfaces:**
- Consumes: gli oggetti creati dalle 6 migration 4a `20260710090000..092500` (già in history su main).
- Produces: RPC `consegna_finalizza_atomica(p_lavoro_id uuid, p_laboratorio_id uuid)` → `json {ok}` (nessun chiamante in quest'ondata: la consumerà la 4b/Ondata 1); RPC `annulla_consegna_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_finestra_ms integer)` → `json {esito: 'ok'|'non_trovato'|'non_consegnato'|'finestra_scaduta'|'fattura_gia_emessa', ddc_assente?: boolean}` consumata dal Task 8. Restano vivi: `fatture.lavoro_id` + `fatture_lavoro_attiva_unique`, CHECK DdC con `'annullata'` + `ddc_lavoro_attiva_unique`.

- [ ] **Step 1: Scrivi la migration**

```sql
-- supabase/migrations/20260710150000_ondata0_pulizia_outbox.sql
-- Ondata 0 spec Portale Dentista v2 §3 punti 3-4 (audit I-1, SRE-2, F8).
-- Smonta l'infrastruttura outbox della 4a (mai usata da codice applicativo)
-- e adatta le RPC atomiche al modello "fatturazione concordata".
-- Ordine chirurgico VINCOLANTE: (a) unschedule guardato → (b) drop funzioni
-- outbox (claim_batch PRIMA del drop tabella: RETURNS SETOF fatture_outbox)
-- → (c) RPC nuove firme → (d) drop tabelle → (e) DROP EXTENSION pg_net.

-- (a) Unschedule GUARDATO dei job (in prod già rimossi a mano il 10/07:
-- un cron.unschedule('nome') nudo fallirebbe; il guardato è idempotente e
-- copre replay/ambienti nuovi dove i job rinascono dalla history 4a).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('outbox-emissione-tick', 'outbox-sorveglianza');

-- (b) Drop funzioni outbox. outbox_claim_batch PRIMA di DROP TABLE
-- fatture_outbox (dipendenza di catalogo: RETURNS SETOF fatture_outbox).
DROP FUNCTION IF EXISTS public.outbox_tick();
DROP FUNCTION IF EXISTS public.outbox_sorveglianza();
DROP FUNCTION IF EXISTS public.outbox_prepara_draft(uuid);
DROP FUNCTION IF EXISTS public.outbox_claim_batch(integer, integer);

-- (c1) consegna_finalizza_atomica: firma NUOVA senza parametri outbox.
-- DROP esplicito della vecchia firma — mai CREATE OR REPLACE con firma
-- diversa: creerebbe un overload orfano (lezione P2-9).
DROP FUNCTION IF EXISTS public.consegna_finalizza_atomica(uuid, uuid, boolean, integer);

CREATE FUNCTION public.consegna_finalizza_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE lavori SET
    stato = 'consegnato',
    consegna_in_corso = false,
    conformato = true,
    data_conformazione = now(),
    data_consegna_effettiva = now(),
    consegna_completata_at = now(),
    consegna_precheck_passato_al_primo_tentativo = true
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'consegna_finalizza: lavoro non trovato o eliminato';
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid) TO service_role;

-- (c2) annulla_consegna_atomica: stessa firma, corpo outbox-free.
-- Il claim outbox è sostituito dal DOPPIO GATE FISCALE (spec §3 punto 4):
--   (i)  esiste fattura non 'rifiutata' con lavoro_id = lavoro → fattura_gia_emessa
--   (ii) cintura: lavori.incluso_in_fattura = true → stesso esito
--        (copre fatture create da codice che non scrive ancora lavoro_id).
CREATE OR REPLACE FUNCTION public.annulla_consegna_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_finestra_ms integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_lavoro record;
  v_rows int;
  v_ddc_tot int;
  v_ddc_assente boolean := false;
BEGIN
  IF p_finestra_ms IS NULL OR p_finestra_ms < 1000 OR p_finestra_ms > 900000 THEN
    RAISE EXCEPTION 'p_finestra_ms fuori range (1s..15min)';
  END IF;

  SELECT id, stato, data_consegna_effettiva, incluso_in_fattura INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;
  IF v_lavoro.data_consegna_effettiva IS NULL
     OR now() - v_lavoro.data_consegna_effettiva > make_interval(secs => p_finestra_ms / 1000.0) THEN
    RETURN json_build_object('esito', 'finestra_scaduta');
  END IF;

  -- Doppio gate fiscale (i): fattura attiva collegata al lavoro
  PERFORM 1 FROM fatture
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato_sdi <> 'rifiutata';
  IF FOUND THEN
    RETURN json_build_object('esito', 'fattura_gia_emessa');
  END IF;

  -- Doppio gate fiscale (ii): cintura sul flag di claim
  IF v_lavoro.incluso_in_fattura THEN
    RETURN json_build_object('esito', 'fattura_gia_emessa');
  END IF;

  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'annullo: ripristino lavoro fallito'; END IF;

  -- P2-1: filtro corretto (include 'generata') + fail-closed sulla matrice esiti
  UPDATE dichiarazioni_conformita SET stato = 'annullata'
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato IN ('bozza','generata','firmata');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
    WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
    IF v_ddc_tot = 0 THEN
      v_ddc_assente := true; -- dato legacy/stub: consenti, segnala
    ELSE
      RAISE EXCEPTION 'annullo: DdC in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito', 'ok', 'ddc_assente', v_ddc_assente);
END;
$$;
REVOKE ALL ON FUNCTION public.annulla_consegna_atomica(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.annulla_consegna_atomica(uuid, uuid, integer) TO service_role;

-- (d) Drop tabelle outbox (vuote sul DB live, mai usate da codice)
DROP TABLE public.fatture_outbox, public.outbox_heartbeat, public.outbox_alerts;

-- (e) DROP EXTENSION pg_net (audit F8): col modello concordato non serve a
-- nulla; eliminarla chiude alla radice il nodo dei grant non revocabili su
-- Supabase gestito (oggetti di supabase_admin — spec §10).
DROP EXTENSION IF EXISTS pg_net;
```

- [ ] **Step 2: Verifica statica dell'ordine (nessun apply)**

Run: `grep -n "cron.unschedule\|DROP FUNCTION\|CREATE FUNCTION\|CREATE OR REPLACE\|DROP TABLE\|DROP EXTENSION" supabase/migrations/20260710150000_ondata0_pulizia_outbox.sql`

Verifica a occhio l'ordine delle righe: unschedule → drop outbox_tick/sorveglianza/prepara_draft/claim_batch → DROP vecchia firma consegna_finalizza → CREATE nuova → CREATE OR REPLACE annulla → DROP TABLE → DROP EXTENSION. `outbox_claim_batch` DEVE precedere `DROP TABLE public.fatture_outbox`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260710150000_ondata0_pulizia_outbox.sql
git commit -m "feat(db): migration di pulizia Ondata 0 — smonta outbox 4a, RPC senza outbox con doppio gate fiscale"
```

---

### Task 4: Gate B1 — stato consegnabile server-side in `orchestraConsegna`

Riuso del Task 9 del piano 4a (già progettato, mai eseguito). Oggi l'unico gate stato è nel client (`consegna/page.tsx:54`): un lavoro `ricevuto` o perfino `annullato` è consegnabile via API.

**Files:**
- Modify: `src/lib/consegna/orchestrate.ts` (dopo Step 1, subito dopo il check `if (lavoroError || !lavoro)`)
- Modify: `src/types/domain.ts:592-597` (union `ConsegnaError['tipo']`)
- Test: `tests/unit/orchestra-consegna-gate.test.ts` (nuovo)

**Interfaces:**
- Consumes: `isStatoConsegnabile` da `src/lib/consegna/costanti.ts` (già su main).
- Produces: `ConsegnaError.tipo` esteso con `'stato_non_consegnabile'`. La route `/api/lavori/[id]/consegna` risponde già 422 su ogni `ok:false` — nessuna modifica route.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/orchestra-consegna-gate.test.ts
// Gate B1 (spec §3 punto 5): solo 'pronto' e 'in_ritardo' sono consegnabili,
// verificato SERVER-SIDE. 7 stati non consegnabili → errore + lock rilasciato.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, mockUpdateCalls } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockUpdateCalls: [] as Array<{ table: string; values: Record<string, unknown> }>,
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: mockRpc, from: mockFrom }),
}))
vi.mock('@/lib/notifications/trigger', () => ({ triggerPushByRole: vi.fn() }))

import { orchestraConsegna } from '@/lib/consegna/orchestrate'

function mockLavoro(stato: string) {
  mockRpc.mockResolvedValue({ data: { lock_acquisito: true }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') {
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({
            data: { id: 'lav-1', laboratorio_id: 'lab-1', stato, numero_lavoro: 'n.1',
                    cliente: null, paziente: null, lavorazioni: [], materiali: [] },
            error: null,
          }) }) }) }),
        }),
        update: (values: Record<string, unknown>) => {
          mockUpdateCalls.push({ table, values })
          return { eq: () => ({ eq: () => Promise.resolve({ error: null, count: 1 }) }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('gate B1 — stato consegnabile server-side', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUpdateCalls.length = 0 })

  for (const stato of ['ricevuto','in_lavorazione','in_prova','in_prova_esterna','sospeso','annullato','consegnato']) {
    it(`stato "${stato}" → stato_non_consegnabile + lock rilasciato`, async () => {
      mockLavoro(stato)
      const result = await orchestraConsegna('lav-1', 'lab-1')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.tipo).toBe('stato_non_consegnabile')
      // rilasciaLock: un update lavori con consegna_in_corso=false
      expect(mockUpdateCalls.some(c => c.values.consegna_in_corso === false)).toBe(true)
    })
  }
})
```

Nota: `'consegnato'` passa dal gate solo perché il mock del lock risponde `lock_acquisito` (nel mondo reale risponderebbe `gia_consegnato` prima) — il gate resta comunque l'ultima difesa e il test lo documenta.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/orchestra-consegna-gate.test.ts`
Expected: FAIL — il flusso prosegue oltre lo stato (arriva a precheck e fallisce diversamente, o `tipo` ≠ `stato_non_consegnabile`)

- [ ] **Step 3: Implementa il gate**

In `src/types/domain.ts` estendi la union di `ConsegnaError.tipo`:

```ts
  tipo: 'precheck_fallito' | 'errore_pdf' | 'errore_upload' | 'errore_fattura' | 'errore_pec' | 'stato_non_consegnabile';
```

In `src/lib/consegna/orchestrate.ts`, aggiungi l'import in testa:

```ts
import { isStatoConsegnabile } from './costanti'
```

e subito DOPO il blocco Step 1 (dopo il check `if (lavoroError || !lavoro)`, prima di `// Step 2 — Precheck MDR`):

```ts
    // ----------------------------------------------------------------
    // Step 1.5 — Gate B1: solo stati consegnabili (E4, server-side)
    // ----------------------------------------------------------------
    if (!isStatoConsegnabile(lavoro.stato as string)) {
      await rilasciaLock()
      return {
        ok: false,
        tipo: 'stato_non_consegnabile',
        messaggio: `Il lavoro è in stato "${lavoro.stato}" e non può essere consegnato.`,
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/orchestra-consegna-gate.test.ts`
Expected: PASS (7 test)

- [ ] **Step 5: Suite completa + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS

```bash
git add src/lib/consegna/orchestrate.ts src/types/domain.ts tests/unit/orchestra-consegna-gate.test.ts
git commit -m "feat(consegna): gate B1 stato consegnabile server-side in orchestraConsegna (422)"
```

---

### Task 5: `generateDdC` — mai riusare una DdC annullata

Riuso del Task 11 del piano 4a. Il UNIQUE parziale `ddc_lavoro_attiva_unique` è GIÀ sul DB live: dal primo annullo+riconsegna reale possono esistere 2+ DdC per lavoro, e il guard di idempotenza attuale riuserebbe qualsiasi DdC, anche annullata (P2-3).

**Files:**
- Modify: `src/lib/pdf/generate-ddc.ts:18-22` (guard) e `:129-135` (recovery 23505)
- Test: `tests/unit/generate-ddc-annullata.test.ts` (nuovo)

**Interfaces:**
- Consumes: indice `ddc_lavoro_attiva_unique` (live). Guard e recovery filtrano `stato <> 'annullata'` → la riconsegna dopo annullo genera una DdC NUOVA con progressivo nuovo.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/generate-ddc-annullata.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, calls } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
}))

vi.mock('@/lib/pdf/typed-service-client', () => ({
  getTypedServiceClient: () => ({ from: mockFrom, storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'http://x/p.pdf' } }) }) } }),
}))
vi.mock('@/lib/pdf/render-document', () => ({ renderPdfDocument: async () => Buffer.from('pdf') }))
vi.mock('@/components/features/pdf/DdcTemplate', () => ({ DdcTemplate: () => null }))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: async () => 7 }))

import { generateDdC } from '@/lib/pdf/generate-ddc'

function chain(table: string, result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq', 'is', 'insert']) {
    c[m] = (...args: unknown[]) => { calls.push({ table, method: m, args }); return c }
  }
  c.maybeSingle = async () => result
  c.single = async () => result
  return c
}

describe('generateDdC — idempotenza filtrata su stato', () => {
  beforeEach(() => { vi.clearAllMocks(); calls.length = 0 })

  it('il guard di idempotenza esclude le DdC annullate', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dichiarazioni_conformita') return chain(table, { data: { numero_ddc: 'DDC-X', pdf_url: 'u' }, error: null })
      if (table === 'laboratori') return chain(table, { data: { id: 'lab-1', nome: 'Lab' }, error: null })
      if (table === 'rischi_tipo_dispositivo') return chain(table, { data: null, error: null })
      return chain(table, { data: null, error: null })
    })
    await generateDdC({ id: 'lav-1', laboratorio_id: 'lab-1', tipo_dispositivo: 'Corona', descrizione: 'x',
      classe_rischio: 'classe_i', cliente: { cognome: 'R', nome: 'M' }, lavorazioni: [], materiali: [] } as never)
    expect(calls).toContainEqual({ table: 'dichiarazioni_conformita', method: 'neq', args: ['stato', 'annullata'] })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/generate-ddc-annullata.test.ts`
Expected: FAIL — nessuna chiamata `.neq('stato','annullata')`

- [ ] **Step 3: Implementa**

In `src/lib/pdf/generate-ddc.ts`, guard di idempotenza (righe 18-22), aggiungi `.neq(...)`:

```ts
  const { data: ddcEsistente } = await supabase
    .from('dichiarazioni_conformita')
    .select('numero_ddc, pdf_url')
    .eq('lavoro_id', lavoro.id)
    .neq('stato', 'annullata')
    .maybeSingle()
```

Recovery 23505 (righe ~129-135): stesso filtro + `.maybeSingle()` al posto di `.single()` (con 1 annullata + 1 attiva, `.single()` senza filtro esploderebbe):

```ts
      const { data: existing } = await supabase
        .from('dichiarazioni_conformita')
        .select('numero_ddc, pdf_url')
        .eq('lavoro_id', lavoro.id)
        .neq('stato', 'annullata')
        .maybeSingle()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/generate-ddc-annullata.test.ts` → PASS

- [ ] **Step 5: Suite + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS (attenzione: `tests/unit/generate-ddc.test.ts` esiste già — se la nuova `.neq` nella chain rompe i suoi mock, adeguali: il delta è solo il metodo in più prima di `.maybeSingle()`)

```bash
git add src/lib/pdf/generate-ddc.ts tests/unit/generate-ddc-annullata.test.ts
git commit -m "fix(ddc): generateDdC ignora le DdC annullate — riconsegna genera DdC nuova (P2-3, D2)"
```

---

### Task 6: Lettori DdC — documenti MDR e percorsi critici (gruppo A)

Riuso del Task 12 del piano 4a. Dal momento in cui esistono 2+ righe DdC per lavoro, chi assume cardinalità 1 può pescare la DdC annullata — su documenti MDR **fisici** (IFU, etichetta, ricevuta).

**Files:**
- Modify: `src/lib/consegna/orchestrate.ts:50-54` (percorso `gia_consegnato`)
- Modify: `src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts:53-57`
- Modify: `src/lib/pdf/generate-ifu.ts` (query lavoro con embed ddc, ~riga 12-29)
- Modify: `src/lib/pdf/generate-etichetta.ts` (query lavoro in `generateEtichettaBuffer`, ~riga 26-45)
- Modify: `src/lib/pdf/generate-ricevuta-consegna.ts` (query lavoro, ~riga 12-29)
- Test: `tests/unit/ddc-lettori-gruppo-a.test.ts` (nuovo)

**Interfaces:**
- Consumes: convenzione filtro embed PostgREST `.neq('ddc.stato', 'annullata')` (filtra le righe embedded, non il parent).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ddc-lettori-gruppo-a.test.ts
// Verifica statica: ogni lettore critico filtra le DdC annullate.
// (test sul sorgente: i 5 file hanno pattern di query identici, un test runtime
// per file duplicherebbe il mock di tutto il modulo PDF — qui il contratto è
// la presenza del filtro nella query, verificata sul codice reale)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const FILE_CON_QUERY_DIRETTA = [
  'src/lib/consegna/orchestrate.ts',
  'src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts',
]
const FILE_CON_EMBED = [
  'src/lib/pdf/generate-ifu.ts',
  'src/lib/pdf/generate-etichetta.ts',
  'src/lib/pdf/generate-ricevuta-consegna.ts',
]

describe('lettori DdC gruppo A — mai la DdC annullata', () => {
  for (const f of FILE_CON_QUERY_DIRETTA) {
    it(`${f} filtra stato annullata sulla query dichiarazioni_conformita`, () => {
      const src = readFileSync(f, 'utf-8')
      expect(src).toMatch(/\.neq\('stato',\s*'annullata'\)/)
    })
  }
  for (const f of FILE_CON_EMBED) {
    it(`${f} filtra l'embed ddc su stato annullata`, () => {
      const src = readFileSync(f, 'utf-8')
      expect(src).toMatch(/\.neq\('ddc\.stato',\s*'annullata'\)/)
    })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ddc-lettori-gruppo-a.test.ts`
Expected: FAIL su tutti e 5 i file

- [ ] **Step 3: Implementa i 5 filtri**

`src/lib/consegna/orchestrate.ts` righe 50-54 (percorso `gia_consegnato`):

```ts
    const { data: ddcRow } = await supabase
      .from('dichiarazioni_conformita')
      .select('numero_ddc, pdf_url')
      .eq('lavoro_id', lavoro_id)
      .neq('stato', 'annullata')
      .maybeSingle()
```

`src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts` righe 53-57:

```ts
    const { data: ddc } = await svc
      .from('dichiarazioni_conformita')
      .select('storage_path_pdf')
      .eq('lavoro_id', lavoro_id)
      .neq('stato', 'annullata')
      .maybeSingle()
```

Nei 3 generator PDF (`generate-ifu.ts`, `generate-etichetta.ts` in `generateEtichettaBuffer`, `generate-ricevuta-consegna.ts`) la query lavoro con embed `ddc:dichiarazioni_conformita(*)` guadagna il filtro embed — aggiungi la riga PRIMA del metodo terminale:

```ts
    .eq('id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .neq('ddc.stato', 'annullata')
    .single()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ddc-lettori-gruppo-a.test.ts` → PASS (5 test)

- [ ] **Step 5: Suite + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS (attenzione: `tests/unit/generate-ricevuta-consegna.test.ts` e il test della route portale documento esistono già — se falliscono, adeguare i loro mock alla nuova chain `.neq`)

```bash
git add src/lib/consegna/orchestrate.ts "src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts" src/lib/pdf/generate-ifu.ts src/lib/pdf/generate-etichetta.ts src/lib/pdf/generate-ricevuta-consegna.ts tests/unit/ddc-lettori-gruppo-a.test.ts
git commit -m "fix(ddc): lettori critici (documenti MDR, portale, retry consegna) ignorano DdC annullate"
```

---

### Task 7: Lettori DdC — pagine e API con embed (gruppo B)

Riuso del Task 13 del piano 4a. Completa la lista chiusa degli 11 lettori (spec 4a §7).

**Files:**
- Modify: `src/app/(app)/lavori/[id]/page.tsx:48`
- Modify: `src/app/(app)/lavori/[id]/consegna/page.tsx:42`
- Modify: `src/app/api/lavori/[id]/route.ts:129`
- Modify: `src/app/api/fatture/[id]/xml/route.ts:154`
- Modify: `src/app/api/fatture/batch/route.ts:177`
- Modify: `src/app/portale/[token]/page.tsx:359`
- Test: `tests/unit/ddc-lettori-gruppo-b.test.ts` (nuovo)

**Interfaces:**
- Consumes: stessa convenzione `.neq('ddc.stato', 'annullata')` del Task 6.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ddc-lettori-gruppo-b.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const FILES = [
  'src/app/(app)/lavori/[id]/page.tsx',
  'src/app/(app)/lavori/[id]/consegna/page.tsx',
  'src/app/api/lavori/[id]/route.ts',
  'src/app/api/fatture/[id]/xml/route.ts',
  'src/app/api/fatture/batch/route.ts',
  'src/app/portale/[token]/page.tsx',
]

describe('lettori DdC gruppo B — embed filtrato', () => {
  for (const f of FILES) {
    it(`${f} filtra l'embed ddc su stato annullata`, () => {
      const src = readFileSync(f, 'utf-8')
      // ogni query con embed ddc:dichiarazioni_conformita deve avere il filtro
      const embeds = src.match(/ddc:dichiarazioni_conformita/g) ?? []
      const filtri = src.match(/\.neq\('ddc\.stato',\s*'annullata'\)/g) ?? []
      expect(embeds.length).toBeGreaterThan(0)
      expect(filtri.length).toBe(embeds.length)
    })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ddc-lettori-gruppo-b.test.ts` → FAIL (6 file)

- [ ] **Step 3: Implementa**

In ognuno dei 6 file, individua la query `.from('lavori').select(\`...ddc:dichiarazioni_conformita(*)...\`)` e aggiungi `.neq('ddc.stato', 'annullata')` alla chain, subito prima del metodo terminale (`.single()` / `.maybeSingle()` / esecuzione). Esempio (`src/app/(app)/lavori/[id]/page.tsx`):

```ts
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .neq('ddc.stato', 'annullata')
    .single()
```

Se un file ha più query con quell'embed, filtrale TUTTE (il test conta le occorrenze).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ddc-lettori-gruppo-b.test.ts` → PASS (6 test)

- [ ] **Step 5: Suite + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS (adeguare i mock dei test esistenti dei 6 file se la nuova `.neq` li rompe: `lavori-id-route.test.ts`, `api-fatture.test.ts`, `fatture-batch-lavoro-id.test.ts` del Task 2 — la sua chain generica ha già `.neq`)

```bash
git add "src/app/(app)/lavori/[id]/page.tsx" "src/app/(app)/lavori/[id]/consegna/page.tsx" "src/app/api/lavori/[id]/route.ts" "src/app/api/fatture/[id]/xml/route.ts" src/app/api/fatture/batch/route.ts "src/app/portale/[token]/page.tsx" tests/unit/ddc-lettori-gruppo-b.test.ts
git commit -m "fix(ddc): embed ddc filtrato su annullata in pagine e API (P2-3 raggio d'impatto)"
```

---

### Task 8: Route annullo — sottile sulla RPC atomica

Riuso del Task 14 del piano 4a, ADATTATO al nuovo modello: l'esito `fattura_in_emissione` non esiste più (niente outbox); il doppio gate fiscale della RPC ritorna `fattura_gia_emessa` (409, messaggio nota di credito). La route attuale fa update diretti non atomici e ha il bug P2-1 (filtro DdC senza `'generata'` = no-op da sempre).

**Files:**
- Rewrite: `src/app/api/lavori/[id]/annulla-consegna/route.ts`
- Test: `tests/unit/annulla-consegna-route.test.ts` (nuovo)

**Interfaces:**
- Consumes: RPC `annulla_consegna_atomica(p_lavoro_id, p_laboratorio_id, p_finestra_ms)` (Task 3 — sul DB live la versione 4a con stessa firma risponde in modo compatibile finché la pulizia non è applicata al Task 10), `FINESTRA_ANNULLO_MS` (già su main).
- Produces: mappatura esiti → HTTP: `ok`→200 · `non_trovato`→404 · `non_consegnato`/`finestra_scaduta`→400 · `fattura_gia_emessa`→409 · errore/esito ignoto→500. L'Ondata 4b UI consuma questi codici.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/annulla-consegna-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(), mockFrom: vi.fn(), mockRpc: vi.fn(),
}))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))

import { POST } from '../../src/app/api/lavori/[id]/annulla-consegna/route'
import { FINESTRA_ANNULLO_MS } from '@/lib/consegna/costanti'

function req() {
  return new Request('http://localhost/api/lavori/lav-1/annulla-consegna', {
    method: 'POST', headers: { origin: 'http://localhost', host: 'localhost' },
  }) as never
}
const ctx = { params: Promise.resolve({ id: 'lav-1' }) }

describe('POST /api/lavori/[id]/annulla-consegna', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1' }, error: null }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('chiama la RPC con la finestra condivisa (10 min)', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_assente: false }, error: null })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('annulla_consegna_atomica', {
      p_lavoro_id: 'lav-1', p_laboratorio_id: 'lab-1', p_finestra_ms: FINESTRA_ANNULLO_MS,
    })
  })

  const casi: Array<[string, number]> = [
    ['non_trovato', 404], ['non_consegnato', 400], ['finestra_scaduta', 400],
    ['fattura_gia_emessa', 409],
  ]
  for (const [esito, status] of casi) {
    it(`esito ${esito} → ${status}`, async () => {
      mockRpc.mockResolvedValue({ data: { esito }, error: null })
      const res = await POST(req(), ctx)
      expect(res.status).toBe(status)
    })
  }

  it('errore RPC → 500 senza leak del messaggio Postgres', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'duplicate key value violates...' } })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('duplicate key')
  })

  it('esito ignoto → 500', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'fattura_in_emissione' }, error: null })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
  })

  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/annulla-consegna-route.test.ts`
Expected: FAIL — la route attuale non chiama la RPC (fa update diretti)

- [ ] **Step 3: Riscrivi la route**

```ts
// src/app/api/lavori/[id]/annulla-consegna/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { FINESTRA_ANNULLO_MS } from '@/lib/consegna/costanti'

// Tutta la logica transazionale (gate stato/finestra, doppio gate fiscale,
// ripristino lavoro, annullo DdC fail-closed) vive nella RPC
// annulla_consegna_atomica (Ondata 0 spec §3 punto 4). La route mappa solo
// gli esiti su HTTP.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: lavoro_id } = await params
  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()
  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const { data, error } = await svc.rpc('annulla_consegna_atomica', {
    p_lavoro_id: lavoro_id,
    p_laboratorio_id: utente.laboratorio_id,
    p_finestra_ms: FINESTRA_ANNULLO_MS,
  })

  if (error) {
    console.error('[ANNULLA-CONSEGNA] RPC error:', error.message)
    return NextResponse.json({ error: 'Errore durante l\'annullamento' }, { status: 500 })
  }

  const esito = (data as { esito: string; ddc_assente?: boolean } | null)?.esito

  switch (esito) {
    case 'ok':
      return NextResponse.json({ ok: true, messaggio: 'Consegna annullata — lavoro riportato a Pronto' })
    case 'non_trovato':
      return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
    case 'non_consegnato':
      return NextResponse.json({ error: 'Il lavoro non è in stato consegnato' }, { status: 400 })
    case 'finestra_scaduta':
      return NextResponse.json({ error: 'La finestra di annullamento è scaduta (10 minuti dalla consegna)' }, { status: 400 })
    case 'fattura_gia_emessa':
      return NextResponse.json({ error: 'Esiste già una fattura per questo lavoro: per stornare serve una nota di credito' }, { status: 409 })
    default:
      console.error('[ANNULLA-CONSEGNA] esito RPC inatteso:', esito)
      return NextResponse.json({ error: 'Errore durante l\'annullamento' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/annulla-consegna-route.test.ts` → PASS (8 test)

- [ ] **Step 5: Grep finestra + suite + commit**

Run: `grep -rn "5 \* 60 \* 1000" src/` → atteso: nessun risultato.
Run: `npx tsc --noEmit && npx vitest run` → PASS

```bash
git add "src/app/api/lavori/[id]/annulla-consegna/route.ts" tests/unit/annulla-consegna-route.test.ts
git commit -m "feat(consegna): annullo su RPC atomica con doppio gate fiscale 409 (P2-1, P2-6, spec §3.4-3.5)"
```

---

### Task 9: Pulizia costanti outbox + dead code

Spec §3 punto 6 (audit M-2) + P2-9. Rimuove da `costanti.ts` le 4 costanti outbox-only e il modulo dead-code `pec-idempotency.ts` (mai importato da `src/`, verificato con grep il 10/07 — l'unico riferimento è il suo test).

**Files:**
- Modify: `src/lib/consegna/costanti.ts` (rimozione 4 costanti)
- Modify: `tests/unit/consegna-costanti.test.ts` (rimozione assert sulle costanti eliminate)
- Delete: `src/lib/consegna/pec-idempotency.ts` + `tests/unit/pec-idempotency.test.ts`

**Interfaces:**
- Produces: `costanti.ts` esporta SOLO `STATI_CONSEGNABILI`, `StatoConsegnabile`, `FINESTRA_ANNULLO_MS`, `isStatoConsegnabile`.

- [ ] **Step 1: Verifica che nessun codice usi ciò che stai per rimuovere**

Run: `grep -rn "MAX_TENTATIVI_EMISSIONE\|OUTBOX_BATCH_MAX\|OUTBOX_TIME_BUDGET_MS\|WATCHDOG_IN_LAVORAZIONE_MIN\|pec-idempotency" src tests --include="*.ts" --include="*.tsx" | grep -v "costanti.ts" | grep -v "pec-idempotency.test.ts" | grep -v "consegna-costanti.test.ts"`
Expected: nessun risultato (solo il file stesso e i 2 test da aggiornare/eliminare). Se compare altro: FERMATI e segnala.

- [ ] **Step 2: Aggiorna il test delle costanti (RED)**

Riscrivi `tests/unit/consegna-costanti.test.ts` così (rimuovendo import e assert delle 4 costanti outbox):

```ts
import { describe, it, expect } from 'vitest'
import {
  STATI_CONSEGNABILI, FINESTRA_ANNULLO_MS, isStatoConsegnabile,
} from '@/lib/consegna/costanti'

describe('costanti condivise consegna/annullo', () => {
  it('STATI_CONSEGNABILI è la coppia pronto/in_ritardo (E4)', () => {
    expect(STATI_CONSEGNABILI).toEqual(['pronto', 'in_ritardo'])
  })

  it('FINESTRA_ANNULLO_MS è 10 minuti (C4)', () => {
    expect(FINESTRA_ANNULLO_MS).toBe(10 * 60 * 1000)
  })

  it('isStatoConsegnabile riconosce solo gli stati consegnabili', () => {
    expect(isStatoConsegnabile('pronto')).toBe(true)
    expect(isStatoConsegnabile('in_ritardo')).toBe(true)
    expect(isStatoConsegnabile('ricevuto')).toBe(false)
    expect(isStatoConsegnabile('consegnato')).toBe(false)
  })

  it('le costanti outbox non esistono più (M-2)', async () => {
    const mod = await import('@/lib/consegna/costanti')
    expect('MAX_TENTATIVI_EMISSIONE' in mod).toBe(false)
    expect('OUTBOX_BATCH_MAX' in mod).toBe(false)
    expect('OUTBOX_TIME_BUDGET_MS' in mod).toBe(false)
    expect('WATCHDOG_IN_LAVORAZIONE_MIN' in mod).toBe(false)
  })
})
```

Run: `npx vitest run tests/unit/consegna-costanti.test.ts` → FAIL sull'ultimo test (le costanti esistono ancora)

- [ ] **Step 3: Rimuovi costanti e dead code**

`src/lib/consegna/costanti.ts` diventa:

```ts
// Costanti condivise del flusso consegna/annullo (Ondata 0 — fatturazione concordata).
// Modulo client-safe: lo importano anche componenti client (banner) e pagine.

export const STATI_CONSEGNABILI = ['pronto', 'in_ritardo'] as const // E4 — unica fonte
export type StatoConsegnabile = (typeof STATI_CONSEGNABILI)[number]

export const FINESTRA_ANNULLO_MS = 10 * 60 * 1000 // C4 — 10 minuti

export function isStatoConsegnabile(stato: string): boolean {
  return (STATI_CONSEGNABILI as readonly string[]).includes(stato)
}
```

```bash
git rm src/lib/consegna/pec-idempotency.ts tests/unit/pec-idempotency.test.ts
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/consegna-costanti.test.ts` → PASS (4 test)

- [ ] **Step 5: Suite + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS

```bash
git add src/lib/consegna/costanti.ts tests/unit/consegna-costanti.test.ts
git commit -m "chore(consegna): rimosse costanti outbox-only e dead code pec-idempotency (M-2, P2-9)"
```

---

### Task 10: GATE — applica la migration di pulizia al DB live + FASE 6b ⚠️ CONFERMA FRANCESCO

**⚠️ STOP: questo task NON parte senza il via esplicito di Francesco.** Applica la migration del Task 3 al DB live `iagibumwjstnveqpjbwq`. Distruttiva solo verso oggetti mai usati dal codice (tabelle outbox vuote, funzioni senza chiamanti) — rollback = riapplicare i file 4a in git (spec §11).

**Files:**
- Regenerate: `src/types/database.types.ts`

- [ ] **Step 1: Chiedi conferma a Francesco** — mostra il contenuto della migration e attendi «ok applica». MAI procedere senza.

- [ ] **Step 2: Applica con la CLI (history-correct)**

Run: `npx supabase db push` (con `supabase/.temp` copiato nel worktree; la CLI registra la versione `20260710150000` corretta in `schema_migrations` — NON usare l'MCP `apply_migration`, che timestampa da sé: gotcha B21)
Expected: `Applying migration 20260710150000_ondata0_pulizia_outbox.sql... Finished`. Poi `npx supabase migration list` → local = remote, zero pendenti.

- [ ] **Step 3: Verifiche post-apply sul DB live** (via MCP `execute_sql` o `psql`):

```sql
-- 1. Job spariti (attesi 0):
SELECT jobname FROM cron.job WHERE jobname IN ('outbox-emissione-tick','outbox-sorveglianza');
-- 2. Funzioni outbox sparite (attese 0 righe):
SELECT proname FROM pg_proc WHERE proname IN ('outbox_tick','outbox_sorveglianza','outbox_prepara_draft','outbox_claim_batch');
-- 3. consegna_finalizza_atomica: UNA sola firma, 2 argomenti (mai overload orfani):
SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname = 'consegna_finalizza_atomica';
-- 4. Tabelle sparite (attese 0):
SELECT tablename FROM pg_tables WHERE tablename IN ('fatture_outbox','outbox_heartbeat','outbox_alerts');
-- 5. pg_net sparita (attesa 0):
SELECT extname FROM pg_extension WHERE extname = 'pg_net';
-- 6. Grants RPC nuove: solo service_role (+postgres):
SELECT routine_name, grantee, privilege_type FROM information_schema.role_routine_grants
WHERE routine_name IN ('consegna_finalizza_atomica','annulla_consegna_atomica');
-- 7. Eredità 4a ancora viva (attese 2 righe indice):
SELECT indexname FROM pg_indexes WHERE indexname IN ('fatture_lavoro_attiva_unique','ddc_lavoro_attiva_unique');
```

- [ ] **Step 4: FASE 6b — rigenera i tipi**

Run: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
Poi: apri la coda del file e rimuovi l'eventuale messaggio CLI residuo; verifica che `fatture` contenga `lavoro_id` e che `fatture_outbox` NON esista.
Run: `npx tsc --noEmit` → 0 errori.

- [ ] **Step 5: Suite + commit**

Run: `npx vitest run && npx next build` → PASS

```bash
git add src/types/database.types.ts
git commit -m "chore(db): FASE 6b — tipi rigenerati post-migration pulizia Ondata 0"
```

---

### Task 11: Verifica finale di ondata + QA browser (lab E2E)

Richiede il Task 10 completato (migration applicata). QA SOLO sul lab E2E `00000000-0000-0000-0000-000000000001` — MAI il lab Filippo.

**Files:** nessuna modifica attesa (solo verifica; eventuali fix emersi → mini-cicli TDD dedicati).

- [ ] **Step 1: Verifica tecnica completa**

Run: `npx tsc --noEmit && npx vitest run && npx next build && bash scripts/check-ds-compliance.sh`
Expected: tutto verde, zero regressioni sulla baseline.

- [ ] **Step 2: Seed E2E**

Run: `DOTENV_CONFIG_PATH=.env.local npx tsx scripts/seed-e2e.ts` (gotcha: dotenv legge solo `.env` di default). Registra il baseline: `SELECT count(*) FROM fatture WHERE laboratorio_id = '00000000-0000-0000-0000-000000000001'` e l'ultimo progressivo `fattura` del lab E2E in `progressivi`.

- [ ] **Step 3: QA flusso consegna (regressione B-1 dal vivo)**

Dev server del worktree su porta dedicata (vedi `.claude/launch.json`). Sul lab E2E: assicura un cliente con `codice_sdi` valorizzato e un lavoro in stato `pronto` (creali via UI/API se mancano). Esegui la consegna dalla UI. Verifica sul DB: **zero nuove righe in `fatture`, progressivo `fattura` invariato**; lavoro `consegnato`; DdC `generata` presente.

- [ ] **Step 4: QA annullo + riconsegna (P2-1, P2-3, D2 dal vivo)**

Entro 10 min dall'annullo: annulla la consegna dalla UI → verifica DB: lavoro `pronto`, DdC in stato `annullata` (il no-op storico P2-1 è chiuso). Riconsegna lo stesso lavoro → verifica: NUOVA DdC `generata` con progressivo diverso, la annullata resta come storia (2 righe totali); il portale dentista e la pagina lavoro mostrano la DdC nuova.

- [ ] **Step 5: QA gate fiscale annullo (409)**

Sul lavoro consegnato: genera la fattura dal batch (`/fatture` → selezione lavoro → genera; richiede `decisione_fatturazione='fatturare'` — impostala dallo scadenzario). Verifica DB: la fattura ha `lavoro_id` valorizzato (B-2). Poi riconsegna un altro lavoro di test, fatturalo, e prova l'annullo entro la finestra → atteso **409 «nota di credito»**.

- [ ] **Step 6: QA gate B1 (422)**

Con un lavoro in stato `ricevuto`, chiama `POST /api/lavori/[id]/consegna` (fetch da console browser, stessa origin) → atteso 422 con `tipo: 'stato_non_consegnabile'`.

- [ ] **Step 7: Pulizia dati test**

Rimuovi i dati creati in QA (lavori, DdC, fatture di test) via query dirette sul lab E2E; verifica baseline a 0 residui rispetto allo Step 2.

- [ ] **Step 8: Chiusura**

Nessun commit atteso. Compila il riepilogo di ondata per la review finale whole-branch (superpowers:requesting-code-review) e il merge (superpowers:finishing-a-development-branch): merge su `main` e push SOLO dopo review verde e dopo che il Task 10 è stato applicato (mai deployare codice che chiama la RPC nuova senza la migration in history remota — hazard SRE-1 inverso).

---

## Copertura spec §3 (self-review)

| Punto spec §3 | Task |
|---|---|
| 1. Rimozione emissione inline (B-1) + test regressione | Task 1 |
| 2. `fatture.lavoro_id` dal batch (B-2) | Task 2 |
| 3. Migration di pulizia ordine (a)-(e) | Task 3 |
| 4. Adattamento RPC (firma nuova + doppio gate fiscale) | Task 3 (+8 per il consumo) |
| 5. Fix ereditati 4a: gate B1 · route annullo · generateDdC · 11 lettori DdC | Task 4 · 8 · 5 · 6+7 |
| 6. Pulizia costanti (M-2) | Task 9 |
| 7. FASE 6b post-pulizia | Task 10 |
| 8. NON si eredita (cron/Vault/admin/idempotenza; `fattura` resta null) | Global Constraints + Task 1 |
