# Ondata 4a-server — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix fiscali della consegna: gate stato server-side, annullo atomico con DdC, finestra 10 min con emissione fattura differita via outbox + pg_cron/pg_net, osservabilità completa.

**Architecture:** Le transizioni fiscali vivono in 4 RPC Postgres transazionali (consegna, annullo, claim batch, preparazione draft); un endpoint Next.js protetto da secret processa la coda ogni minuto su tick pg_cron→pg_net; il codice TS orchestral (orchestrate.ts, route annullo, generate-xml) diventa sottile e idempotente. Spec di riferimento: `docs/superpowers/specs/2026-07-09-ondata-4a-server-consegna-fiscale-design.md` (LEGGERLA prima di ogni task).

**Tech Stack:** Next.js 16 App Router · Supabase (Postgres + pg_cron + pg_net + Vault) · Vitest (helper `tests/unit/helpers/supabase-chain-mock`).

## Global Constraints

- **Worktree dedicato** (`superpowers:using-git-worktrees`), branch da `main`. Copiare `.env.local` dal repo padre (gitignored, non arriva col worktree).
- **Dominio critico fiscale**: percorso Grande BP-2; review rafforzata; MAI dichiarare fatto senza output reale di `npx tsc --noEmit` + `npx vitest run` + `npx next build`.
- **Migration**: i file si SCRIVONO nei task 2–7 ma si APPLICANO al DB live `iagibumwjstnveqpjbwq` SOLO nel Task 8, con conferma esplicita di Francesco (gate). Dopo l'apply: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` (rimuovere eventuale log CLI in coda) + `npx tsc --noEmit` (FASE 6b).
- **RPC**: sempre `SECURITY DEFINER` + `SET search_path = public, pg_temp` + `REVOKE ALL ... FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE ... TO service_role`. Nessun SQL dinamico. Ogni statement filtrato per `laboratorio_id` + id.
- **Costanti**: SOLO da `src/lib/consegna/costanti.ts` (Task 1). MAI rilanciare `5 * 60 * 1000` o array di stati inline.
- **Test route**: pattern `tests/unit/cicli-route.test.ts` — `vi.hoisted` + mock di `@/lib/supabase/server-user`/`server-service` + helper `createChain`.
- **Commit format**: `feat(consegna): ...` / `fix(db): ...` / `chore(db): ...`; commit frequenti, uno per task minimo.
- Admin UI usa il pattern `/admin` esistente (`admin.css`, layout con check `ruolo === 'admin_sistema'`) — NON DS v3, NON serve mockup gate.

---

### Task 1: Costanti condivise consegna

**Files:**
- Create: `src/lib/consegna/costanti.ts`
- Modify: `src/components/features/lavori/AnnullaConsegnaBanner.tsx:6`
- Modify: `src/app/(app)/lavori/[id]/consegna/page.tsx:54-55`
- Test: `tests/unit/consegna-costanti.test.ts`

**Interfaces:**
- Produces: `STATI_CONSEGNABILI: readonly ['pronto','in_ritardo']`, `FINESTRA_ANNULLO_MS = 600000`, `MAX_TENTATIVI_EMISSIONE = 8`, `OUTBOX_BATCH_MAX = 20`, `OUTBOX_TIME_BUDGET_MS = 45000`, `WATCHDOG_IN_LAVORAZIONE_MIN = 5`, `isStatoConsegnabile(stato: string): boolean`. Modulo client-safe: NIENTE `import 'server-only'`, niente import Supabase.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/consegna-costanti.test.ts
import { describe, it, expect } from 'vitest'
import {
  STATI_CONSEGNABILI, FINESTRA_ANNULLO_MS, MAX_TENTATIVI_EMISSIONE,
  OUTBOX_BATCH_MAX, OUTBOX_TIME_BUDGET_MS, WATCHDOG_IN_LAVORAZIONE_MIN,
  isStatoConsegnabile,
} from '@/lib/consegna/costanti'

describe('costanti consegna', () => {
  it('STATI_CONSEGNABILI contiene esattamente pronto e in_ritardo', () => {
    expect([...STATI_CONSEGNABILI]).toEqual(['pronto', 'in_ritardo'])
  })
  it('finestra annullo è 10 minuti', () => {
    expect(FINESTRA_ANNULLO_MS).toBe(10 * 60 * 1000)
  })
  it('valori outbox', () => {
    expect(MAX_TENTATIVI_EMISSIONE).toBe(8)
    expect(OUTBOX_BATCH_MAX).toBe(20)
    expect(OUTBOX_TIME_BUDGET_MS).toBe(45_000)
    expect(WATCHDOG_IN_LAVORAZIONE_MIN).toBe(5)
  })
  it('isStatoConsegnabile', () => {
    expect(isStatoConsegnabile('pronto')).toBe(true)
    expect(isStatoConsegnabile('in_ritardo')).toBe(true)
    for (const s of ['ricevuto','in_lavorazione','in_prova','in_prova_esterna','consegnato','sospeso','annullato']) {
      expect(isStatoConsegnabile(s)).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/consegna-costanti.test.ts`
Expected: FAIL — "Cannot find module '@/lib/consegna/costanti'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/consegna/costanti.ts
// Costanti condivise del flusso consegna/annullo/emissione (spec 4a §3).
// Modulo client-safe: lo importano anche componenti client (banner) e pagine.

export const STATI_CONSEGNABILI = ['pronto', 'in_ritardo'] as const // E4 — unica fonte
export type StatoConsegnabile = (typeof STATI_CONSEGNABILI)[number]

export const FINESTRA_ANNULLO_MS = 10 * 60 * 1000 // C4 — 10 minuti
export const MAX_TENTATIVI_EMISSIONE = 8           // con backoff esponenziale ≈ 2h
export const OUTBOX_BATCH_MAX = 20
export const OUTBOX_TIME_BUDGET_MS = 45_000        // 75% di maxDuration=60
export const WATCHDOG_IN_LAVORAZIONE_MIN = 5       // > maxDuration, < finestra

export function isStatoConsegnabile(stato: string): boolean {
  return (STATI_CONSEGNABILI as readonly string[]).includes(stato)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/consegna-costanti.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Sostituisci le copie locali nei due consumatori**

In `src/components/features/lavori/AnnullaConsegnaBanner.tsx` rimuovi la riga 6 (`const GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minuti`) e aggiungi in testa agli import:

```ts
import { FINESTRA_ANNULLO_MS } from '@/lib/consegna/costanti'
```

poi sostituisci le due occorrenze di `GRACE_PERIOD_MS` nel file con `FINESTRA_ANNULLO_MS`.

In `src/app/(app)/lavori/[id]/consegna/page.tsx` rimuovi la riga 54 (`const STATI_CONSEGNABILI = ['pronto', 'in_ritardo'] as const`) e aggiungi l'import:

```ts
import { isStatoConsegnabile } from '@/lib/consegna/costanti'
```

sostituendo alla riga 55 `if (!STATI_CONSEGNABILI.includes(lavoroDettaglio.stato as typeof STATI_CONSEGNABILI[number])) {` con:

```ts
if (!isStatoConsegnabile(lavoroDettaglio.stato)) {
```

NOTA: la route `annulla-consegna/route.ts:6` ha ancora `GRACE_PERIOD_MS` locale — NON toccarla qui, viene riscritta interamente nel Task 14.

- [ ] **Step 6: Grep di accettazione + verifica**

Run: `grep -rn "5 \* 60 \* 1000" src/ | grep -v annulla-consegna` → atteso: nessun risultato.
Run: `grep -rn "STATI_CONSEGNABILI" src/ | grep -v "lib/consegna/costanti"` → atteso: solo import da `@/lib/consegna/costanti`.
Run: `npx tsc --noEmit && npx vitest run` → Expected: PASS, zero errori.

- [ ] **Step 7: Commit**

```bash
git add src/lib/consegna/costanti.ts src/components/features/lavori/AnnullaConsegnaBanner.tsx "src/app/(app)/lavori/[id]/consegna/page.tsx" tests/unit/consegna-costanti.test.ts
git commit -m "feat(consegna): costanti condivise STATI_CONSEGNABILI + finestra annullo 10 min (E4, C4)"
```

---

### Task 2: Migration — DdC stato 'annullata' + UNIQUE parziale (M1+M2)

**Files:**
- Create: `supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql`

**Interfaces:**
- Produces: CHECK `dichiarazioni_conformita.stato` con `'annullata'`; indice `ddc_lavoro_attiva_unique`. NON applicare al DB (gate Task 8).

- [ ] **Step 1: Scrivi il file migration**

```sql
-- supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql
-- Spec 4a §4 M1+M2 (B2 + P2-3, decisione D2 "annulla + rigenera").

-- M1: la CHECK ammette anche 'annullata' (oggi: bozza/generata/firmata/consegnata)
ALTER TABLE public.dichiarazioni_conformita
  DROP CONSTRAINT dichiarazioni_conformita_stato_check;
ALTER TABLE public.dichiarazioni_conformita
  ADD CONSTRAINT dichiarazioni_conformita_stato_check
  CHECK (stato IN ('bozza','generata','firmata','consegnata','annullata'));

-- M2: da UNIQUE pieno a UNIQUE parziale — le DdC annullate restano come storia,
-- la riconsegna genera una DdC nuova (una sola ATTIVA per lavoro).
ALTER TABLE public.dichiarazioni_conformita
  DROP CONSTRAINT ddc_lavoro_unique;
CREATE UNIQUE INDEX ddc_lavoro_attiva_unique
  ON public.dichiarazioni_conformita (laboratorio_id, lavoro_id)
  WHERE stato <> 'annullata';
```

- [ ] **Step 2: Verifica sintassi (dry parse locale)**

Run: `grep -c "annullata" supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql`
Expected: `3`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql
git commit -m "feat(db): migration DdC stato annullata + UNIQUE parziale attiva (B2, P2-3)"
```

---

### Task 3: Migration — fatture.lavoro_id + UNIQUE parziale (M3)

**Files:**
- Create: `supabase/migrations/20260710090500_fatture_lavoro_id_unique.sql`

**Interfaces:**
- Produces: colonna `fatture.lavoro_id uuid NULL` + indice `fatture_lavoro_attiva_unique`. Il Task 6 (RPC `outbox_prepara_draft`) la valorizza; il Task 16 la usa.

- [ ] **Step 1: Scrivi il file migration**

```sql
-- supabase/migrations/20260710090500_fatture_lavoro_id_unique.sql
-- Spec 4a §4 M3 — cintura strutturale: ogni doppia emissione per lavoro = 23505.
-- Nessun backfill: le fatture esistenti restano lavoro_id NULL.

ALTER TABLE public.fatture
  ADD COLUMN lavoro_id uuid NULL REFERENCES public.lavori(id);

CREATE UNIQUE INDEX fatture_lavoro_attiva_unique
  ON public.fatture (laboratorio_id, lavoro_id)
  WHERE lavoro_id IS NOT NULL AND stato_sdi <> 'rifiutata';

CREATE INDEX idx_fatture_lavoro ON public.fatture (lavoro_id) WHERE lavoro_id IS NOT NULL;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260710090500_fatture_lavoro_id_unique.sql
git commit -m "feat(db): migration fatture.lavoro_id + UNIQUE parziale anti doppia emissione"
```

---

### Task 4: Migration — fatture_outbox + heartbeat + alerts (M4+M5)

**Files:**
- Create: `supabase/migrations/20260710091000_fatture_outbox.sql`

**Interfaces:**
- Produces: tabelle `fatture_outbox`, `outbox_heartbeat`, `outbox_alerts` (tutte RLS deny-all). Stati outbox: `in_attesa|in_lavorazione|emessa|annullata|saltata|errore`.

- [ ] **Step 1: Scrivi il file migration**

```sql
-- supabase/migrations/20260710091000_fatture_outbox.sql
-- Spec 4a §4 M4+M5 — coda emissione differita + osservabilità (E3, D4).

CREATE TABLE public.fatture_outbox (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id uuid NOT NULL REFERENCES public.laboratori(id),
  lavoro_id      uuid NOT NULL REFERENCES public.lavori(id),
  stato          text NOT NULL DEFAULT 'in_attesa'
                 CHECK (stato IN ('in_attesa','in_lavorazione','emessa','annullata','saltata','errore')),
  emetti_dopo    timestamptz NOT NULL,
  tentativi      int  NOT NULL DEFAULT 0,
  ultimo_errore  text,
  motivo_salto   text,
  fattura_id     uuid NULL REFERENCES public.fatture(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Una sola emissione pendente per lavoro
CREATE UNIQUE INDEX outbox_lavoro_attiva
  ON public.fatture_outbox (lavoro_id)
  WHERE stato IN ('in_attesa','in_lavorazione');
-- Scan del cron
CREATE INDEX outbox_scan ON public.fatture_outbox (emetti_dopo) WHERE stato = 'in_attesa';
-- Watchdog
CREATE INDEX outbox_watchdog ON public.fatture_outbox (updated_at) WHERE stato = 'in_lavorazione';

-- Deny-all: accesso esclusivo via service_role (nessuna policy = nessun accesso anon/authenticated)
ALTER TABLE public.fatture_outbox ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.outbox_heartbeat (
  id                  smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_tick_at        timestamptz,
  entries_processate  int NOT NULL DEFAULT 0,
  errori_tick         int NOT NULL DEFAULT 0
);
INSERT INTO public.outbox_heartbeat (id) VALUES (1);
ALTER TABLE public.outbox_heartbeat ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.outbox_alerts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       text NOT NULL CHECK (tipo IN ('coda_ferma','entry_stantia','entry_errore','lavoro_senza_fattura')),
  dettaglio  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  risolto_at timestamptz NULL
);
CREATE INDEX outbox_alerts_aperti ON public.outbox_alerts (tipo) WHERE risolto_at IS NULL;
ALTER TABLE public.outbox_alerts ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260710091000_fatture_outbox.sql
git commit -m "feat(db): migration fatture_outbox + heartbeat + alerts (E3, D4)"
```

---

### Task 5: Migration — RPC consegna_finalizza_atomica + annulla_consegna_atomica (M6a)

**Files:**
- Create: `supabase/migrations/20260710091500_rpc_consegna_annullo_atomiche.sql`

**Interfaces:**
- Produces: `consegna_finalizza_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_cliente_fatturabile boolean, p_finestra_ms integer) RETURNS json` → `{ok, fattura_programmata, emetti_dopo?}`; `annulla_consegna_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_finestra_ms integer) RETURNS json` → `{esito: 'ok'|'non_trovato'|'non_consegnato'|'finestra_scaduta'|'fattura_in_emissione'|'fattura_gia_emessa', ddc_assente?}`. Consumate dai Task 10 e 14.

- [ ] **Step 1: Scrivi il file migration**

```sql
-- supabase/migrations/20260710091500_rpc_consegna_annullo_atomiche.sql
-- Spec 4a §5-§6 — transizioni fiscali atomiche.

CREATE OR REPLACE FUNCTION public.consegna_finalizza_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_cliente_fatturabile boolean, p_finestra_ms integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_rows int;
  v_emetti_dopo timestamptz;
BEGIN
  IF p_finestra_ms IS NULL OR p_finestra_ms < 1000 OR p_finestra_ms > 900000 THEN
    RAISE EXCEPTION 'p_finestra_ms fuori range (1s..15min)';
  END IF;

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

  IF p_cliente_fatturabile THEN
    v_emetti_dopo := now() + make_interval(secs => p_finestra_ms / 1000.0);
    INSERT INTO fatture_outbox (laboratorio_id, lavoro_id, emetti_dopo)
    VALUES (p_laboratorio_id, p_lavoro_id, v_emetti_dopo)
    ON CONFLICT (lavoro_id) WHERE stato IN ('in_attesa','in_lavorazione')
    DO UPDATE SET emetti_dopo = EXCLUDED.emetti_dopo, tentativi = 0, stato = 'in_attesa',
                  fattura_id = NULL, ultimo_errore = NULL, motivo_salto = NULL, updated_at = now();
    RETURN json_build_object('ok', true, 'fattura_programmata', true, 'emetti_dopo', v_emetti_dopo);
  END IF;

  RETURN json_build_object('ok', true, 'fattura_programmata', false);
END;
$$;
REVOKE ALL ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid, boolean, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.annulla_consegna_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_finestra_ms integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_lavoro record;
  v_entry record;
  v_rows int;
  v_ddc_tot int;
  v_ddc_assente boolean := false;
BEGIN
  IF p_finestra_ms IS NULL OR p_finestra_ms < 1000 OR p_finestra_ms > 900000 THEN
    RAISE EXCEPTION 'p_finestra_ms fuori range (1s..15min)';
  END IF;

  SELECT id, stato, data_consegna_effettiva INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;
  IF v_lavoro.data_consegna_effettiva IS NULL
     OR now() - v_lavoro.data_consegna_effettiva > make_interval(secs => p_finestra_ms / 1000.0) THEN
    RETURN json_build_object('esito', 'finestra_scaduta');
  END IF;

  -- Claim fiscale: l'arbitro tra annullo e cron è il lock di riga.
  -- 0 righe = nessuna entry (cliente non fatturabile) → l'annullo PROCEDE.
  SELECT id, stato, fattura_id INTO v_entry
  FROM fatture_outbox
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato IN ('in_attesa','in_lavorazione','emessa')
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;
  IF FOUND THEN
    IF v_entry.stato = 'in_lavorazione' THEN
      RETURN json_build_object('esito', 'fattura_in_emissione');
    END IF;
    IF v_entry.stato = 'emessa' OR v_entry.fattura_id IS NOT NULL THEN
      RETURN json_build_object('esito', 'fattura_gia_emessa');
    END IF;
    UPDATE fatture_outbox SET stato = 'annullata', updated_at = now() WHERE id = v_entry.id;
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260710091500_rpc_consegna_annullo_atomiche.sql
git commit -m "feat(db): RPC atomiche consegna_finalizza + annulla_consegna (B1-supporto, P2-1, P2-6, P2-8)"
```

---

### Task 6: Migration — RPC outbox_claim_batch + outbox_prepara_draft (M6b)

**Files:**
- Create: `supabase/migrations/20260710092000_rpc_outbox_claim_prepara.sql`

**Interfaces:**
- Produces: `outbox_claim_batch(p_limite integer, p_watchdog_min integer) RETURNS SETOF fatture_outbox` (watchdog integrato); `outbox_prepara_draft(p_entry_id uuid) RETURNS json` → `{esito: 'ok'|'entry_non_claimata'|'lavoro_non_consegnato'|'saltata_decisione'|'gia_fatturato', fattura_id?, ripresa?}`. Consumate dal Task 16.

- [ ] **Step 1: Scrivi il file migration**

```sql
-- supabase/migrations/20260710092000_rpc_outbox_claim_prepara.sql
-- Spec 4a §8 — claim SKIP LOCKED + preparazione draft transazionale (D3).

CREATE OR REPLACE FUNCTION public.outbox_claim_batch(
  p_limite integer, p_watchdog_min integer
) RETURNS SETOF public.fatture_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_limite IS NULL OR p_limite < 1 OR p_limite > 100 THEN
    RAISE EXCEPTION 'p_limite fuori range (1..100)';
  END IF;
  IF p_watchdog_min IS NULL OR p_watchdog_min < 1 OR p_watchdog_min > 60 THEN
    RAISE EXCEPTION 'p_watchdog_min fuori range (1..60)';
  END IF;

  -- Watchdog: entry incastrate (crash a metà batch) tornano in_attesa.
  -- NON incrementa tentativi: il conteggio riflette fallimenti reali, non timeout altrui.
  UPDATE fatture_outbox SET stato = 'in_attesa', updated_at = now()
  WHERE stato = 'in_lavorazione'
    AND updated_at < now() - make_interval(mins => p_watchdog_min);

  RETURN QUERY
  UPDATE fatture_outbox SET stato = 'in_lavorazione', updated_at = now()
  WHERE id IN (
    SELECT id FROM fatture_outbox
    WHERE stato = 'in_attesa' AND emetti_dopo <= now()
    ORDER BY emetti_dopo
    LIMIT p_limite
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.outbox_claim_batch(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outbox_claim_batch(integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.outbox_prepara_draft(p_entry_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_entry record;
  v_lavoro record;
  v_rows int;
  v_anno int;
  v_prog int;
  v_numero text;
  v_fattura_id uuid;
BEGIN
  SELECT * INTO v_entry FROM fatture_outbox WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND OR v_entry.stato <> 'in_lavorazione' THEN
    RETURN json_build_object('esito', 'entry_non_claimata');
  END IF;

  -- Ripresa idempotente post-crash: il draft esiste già, riusalo.
  IF v_entry.fattura_id IS NOT NULL THEN
    RETURN json_build_object('esito', 'ok', 'fattura_id', v_entry.fattura_id, 'ripresa', true);
  END IF;

  SELECT id, stato, deleted_at, decisione_fatturazione, incluso_in_fattura, cliente_id INTO v_lavoro
  FROM lavori
  WHERE id = v_entry.lavoro_id AND laboratorio_id = v_entry.laboratorio_id
  FOR UPDATE;
  IF NOT FOUND OR v_lavoro.deleted_at IS NOT NULL OR v_lavoro.stato <> 'consegnato' THEN
    RETURN json_build_object('esito', 'lavoro_non_consegnato');
  END IF;

  -- D3 "emetti salvo rifiuto"
  IF v_lavoro.decisione_fatturazione = 'non_fatturare' THEN
    RETURN json_build_object('esito', 'saltata_decisione');
  END IF;

  -- Claim atomico anti doppia-fatturazione (pattern batch/route.ts)
  UPDATE lavori SET incluso_in_fattura = true
  WHERE id = v_lavoro.id AND laboratorio_id = v_entry.laboratorio_id
    AND incluso_in_fattura = false;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN json_build_object('esito', 'gia_fatturato');
  END IF;

  -- SOLO QUI si consuma il progressivo (P2-5); data/anno congelati sul draft.
  v_anno := EXTRACT(year FROM now())::int;
  v_prog := public.genera_progressivo(v_entry.laboratorio_id, 'fattura', v_anno);
  v_numero := v_anno::text || '-' || lpad(v_prog::text, 4, '0');

  INSERT INTO fatture (laboratorio_id, cliente_id, lavoro_id, numero, anno, progressivo,
                       data, tipo_documento, stato_sdi, imponibile, iva_importo, bollo, totale)
  VALUES (v_entry.laboratorio_id, v_lavoro.cliente_id, v_entry.lavoro_id, v_numero, v_anno, v_prog,
          CURRENT_DATE, 'TD01', 'draft', 0, 0, 0, 0)
  RETURNING id INTO v_fattura_id;

  UPDATE fatture_outbox SET fattura_id = v_fattura_id, updated_at = now() WHERE id = p_entry_id;

  RETURN json_build_object('esito', 'ok', 'fattura_id', v_fattura_id, 'ripresa', false);
END;
$$;
REVOKE ALL ON FUNCTION public.outbox_prepara_draft(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outbox_prepara_draft(uuid) TO service_role;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260710092000_rpc_outbox_claim_prepara.sql
git commit -m "feat(db): RPC outbox_claim_batch (SKIP LOCKED + watchdog) e outbox_prepara_draft (D3, P2-5)"
```

---

### Task 7: Migration — pg_net + tick + sorveglianza + pulizia (M7+M8+M9)

**Files:**
- Create: `supabase/migrations/20260710092500_pg_net_tick_sorveglianza.sql`

**Interfaces:**
- Produces: estensione pg_net (hardened), `outbox_tick()` (EXECUTE solo postgres; legge `outbox_cron_secret` e `outbox_cron_url` dal Vault — creati a mano nel Task 8), `outbox_sorveglianza()`, 2 job pg_cron, drop overload orfano.

- [ ] **Step 1: Scrivi il file migration**

```sql
-- supabase/migrations/20260710092500_pg_net_tick_sorveglianza.sql
-- Spec 4a §4 M7-M9, §9-§10 — tick HTTP, dead-man's switch, pulizia P2-9.

-- M7a: pg_net + hardening grants NELLA STESSA MIGRATION (requisito sicurezza #3:
-- authenticated con net.http_post = SSRF dal database)
CREATE EXTENSION IF NOT EXISTS pg_net;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA net FROM anon, authenticated;

-- M7b: wrapper tick — secret e URL SOLO dal Vault a runtime (mai in cron.job.command,
-- mai in questa migration). EXECUTE a nessun ruolo applicativo, nemmeno service_role:
-- la invoca solo il job pg_cron (che gira come proprietario del job).
CREATE OR REPLACE FUNCTION public.outbox_tick()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'outbox_cron_secret';
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'outbox_cron_url';
  IF v_secret IS NULL OR v_url IS NULL THEN
    RAISE WARNING 'outbox_tick: outbox_cron_secret/outbox_cron_url mancanti nel Vault';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('x-cron-secret', v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
END;
$$;
REVOKE ALL ON FUNCTION public.outbox_tick() FROM PUBLIC, anon, authenticated, service_role;

-- M8: sorveglianza SQL pura (sopravvive alla rottura del canale HTTP), dedup su alert aperti
CREATE OR REPLACE FUNCTION public.outbox_sorveglianza()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- (a) coda ferma: heartbeat vecchio E lavoro in coda scaduto
  INSERT INTO outbox_alerts (tipo, dettaglio)
  SELECT 'coda_ferma', 'ultimo tick: ' || COALESCE(h.last_tick_at::text, 'mai')
  FROM outbox_heartbeat h
  WHERE h.id = 1
    AND (h.last_tick_at IS NULL OR h.last_tick_at < now() - interval '5 minutes')
    AND EXISTS (SELECT 1 FROM fatture_outbox WHERE stato = 'in_attesa' AND emetti_dopo <= now())
    AND NOT EXISTS (SELECT 1 FROM outbox_alerts WHERE tipo = 'coda_ferma' AND risolto_at IS NULL);

  -- (b) entry stantie (> 15 min oltre emetti_dopo)
  INSERT INTO outbox_alerts (tipo, dettaglio)
  SELECT 'entry_stantia', count(*)::text || ' entry in attesa da oltre 15 minuti'
  FROM fatture_outbox
  WHERE stato = 'in_attesa' AND emetti_dopo < now() - interval '15 minutes'
    AND NOT EXISTS (SELECT 1 FROM outbox_alerts WHERE tipo = 'entry_stantia' AND risolto_at IS NULL)
  HAVING count(*) > 0;

  -- (c) entry in errore definitivo
  INSERT INTO outbox_alerts (tipo, dettaglio)
  SELECT 'entry_errore', count(*)::text || ' entry in errore definitivo'
  FROM fatture_outbox
  WHERE stato = 'errore'
    AND NOT EXISTS (SELECT 1 FROM outbox_alerts WHERE tipo = 'entry_errore' AND risolto_at IS NULL)
  HAVING count(*) > 0;

  -- (d) riconciliazione: consegnato fatturabile senza entry né fattura (rete di sicurezza P2-4)
  INSERT INTO outbox_alerts (tipo, dettaglio)
  SELECT 'lavoro_senza_fattura', 'lavori: ' || string_agg(l.numero_lavoro, ', ')
  FROM lavori l
  JOIN clienti c ON c.id = l.cliente_id
  WHERE l.stato = 'consegnato' AND l.deleted_at IS NULL
    AND l.consegna_completata_at < now() - interval '15 minutes'
    AND (c.codice_sdi IS NOT NULL OR c.pec IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM fatture_outbox o WHERE o.lavoro_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM fatture f WHERE f.lavoro_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM outbox_alerts WHERE tipo = 'lavoro_senza_fattura' AND risolto_at IS NULL)
  HAVING count(*) > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.outbox_sorveglianza() FROM PUBLIC, anon, authenticated, service_role;

-- Job pg_cron (comandi SENZA segreti)
SELECT cron.schedule('outbox-emissione-tick', '* * * * *', 'SELECT public.outbox_tick()');
SELECT cron.schedule('outbox-sorveglianza', '*/10 * * * *', 'SELECT public.outbox_sorveglianza()');

-- M9: pulizia P2-9 — overload orfano a 1 argomento (usa get_lab_id(), NULL sotto service_role)
DROP FUNCTION IF EXISTS public.consegna_lavoro_lock(uuid);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260710092500_pg_net_tick_sorveglianza.sql
git commit -m "feat(db): pg_net hardened + outbox_tick via Vault + sorveglianza dead-man + drop overload orfano"
```

---

### Task 8: GATE — applica migration, Vault, env, tipi (FASE 6b) ⚠️ CONFERMA FRANCESCO

**Files:**
- Modify: `src/types/database.types.ts` (rigenerato)

**Interfaces:**
- Produces: schema live aggiornato + tipi TS per `fatture_outbox`/`outbox_alerts`/`outbox_heartbeat` e le 4 RPC. I task 9+ dipendono da questo.

⚠️ **STOP: chiedere conferma esplicita a Francesco prima di ogni comando di questo task** (modifica il DB di produzione).

- [ ] **Step 1: Applica le 6 migration in ordine** (Task 2→7). Preferire `npx supabase db push`; se non disponibile, MCP `apply_migration` una alla volta e poi riallineare la version in `supabase_migrations.schema_migrations` al timestamp del filename (gotcha noto: l'MCP timestampa da sé).

- [ ] **Step 2: Crea i secret nel Vault** (SQL editor / execute_sql — MAI committare il valore):

```sql
-- Genera il secret PRIMA con: openssl rand -hex 32
SELECT vault.create_secret('<VALORE-64-HEX>', 'outbox_cron_secret', 'Secret endpoint cron emissione fatture');
SELECT vault.create_secret('https://uachelab.com/api/cron/emissione-fatture', 'outbox_cron_url', 'URL endpoint cron emissione');
```

- [ ] **Step 3: Env Vercel**: aggiungi `CRON_SECRET=<stesso valore>` (Production + Preview) via dashboard Vercel; `CRON_SECRET_PREVIOUS` resta vuota. Aggiungi anche a `.env.local`.

- [ ] **Step 4: Verifiche post-apply** (output nel report del task):

```sql
-- 1. Il comando cron NON contiene il secret
SELECT jobname, command FROM cron.job WHERE jobname LIKE 'outbox%';
-- 2. Grants pg_net puliti
SELECT routine_name, grantee FROM information_schema.routine_privileges
WHERE specific_schema = 'net' AND grantee IN ('anon','authenticated','PUBLIC');
-- atteso: 0 righe
-- 3. RPC grants
SELECT p.proname, r.rolname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN LATERAL aclexplode(p.proacl) a ON true
LEFT JOIN pg_roles r ON r.oid = a.grantee
WHERE n.nspname='public' AND p.proname IN ('consegna_finalizza_atomica','annulla_consegna_atomica','outbox_claim_batch','outbox_prepara_draft')
ORDER BY 1,2;
-- atteso: solo postgres + service_role
-- 4. Overload orfano droppato
SELECT count(*) FROM pg_proc WHERE proname='consegna_lavoro_lock'; -- atteso: 1
```

- [ ] **Step 5: Rigenera tipi + verifica**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
# rimuovere eventuale riga di log CLI in coda al file
npx tsc --noEmit
```

- [ ] **Step 6: Runbook rotazione secret** — crea `docs/security/runbook-cron-secret.md`:

```markdown
# Runbook — rotazione secret cron emissione fatture

Il secret vive in DUE posti: Supabase Vault (`outbox_cron_secret`, lato mittente pg_cron)
e env Vercel `CRON_SECRET` (lato ricevente). Rotazione senza downtime:

1. Genera: `openssl rand -hex 32`
2. Vercel: sposta il valore attuale in `CRON_SECRET_PREVIOUS`, metti il nuovo in `CRON_SECRET` → redeploy
3. Vault: `SELECT vault.update_secret((SELECT id FROM vault.secrets WHERE name='outbox_cron_secret'), '<NUOVO>');`
4. Verifica: pannello `/admin/coda-emissione` → «Tick manuale» → heartbeat aggiornato
5. Vercel: svuota `CRON_SECRET_PREVIOUS`

Diagnosi coda ferma: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
e `SELECT status_code, created FROM net._http_response ORDER BY created DESC LIMIT 10;`
(NB: timeout ~5s lato pg_net sono NORMALI — la funzione dura di più; fa fede l'heartbeat.)
Rotazione pianificata: almeno annuale o su sospetto leak.
```

- [ ] **Step 7: Commit**

```bash
git add src/types/database.types.ts docs/security/runbook-cron-secret.md
git commit -m "chore(db): apply migration 4a-server + regen types + runbook rotazione secret (FASE 6b)"
```

---

### Task 9: Gate B1 — stato consegnabile in orchestraConsegna

**Files:**
- Modify: `src/lib/consegna/orchestrate.ts` (dopo Step 1, ~riga 138)
- Modify: `src/types/domain.ts:594-599` (union `ConsegnaError['tipo']`)
- Test: `tests/unit/orchestra-consegna-gate.test.ts`

**Interfaces:**
- Consumes: `isStatoConsegnabile` (Task 1).
- Produces: `ConsegnaError.tipo` esteso con `'stato_non_consegnabile'`. La route `/api/lavori/[id]/consegna` già risponde 422 su `ok:false` — nessuna modifica route.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/orchestra-consegna-gate.test.ts
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

  for (const stato of ['ricevuto','in_lavorazione','in_prova','in_prova_esterna','sospeso','annullato']) {
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/orchestra-consegna-gate.test.ts`
Expected: FAIL — il flusso prosegue oltre lo stato (arriva a precheck/DdC e fallisce diversamente, o `tipo` ≠ `stato_non_consegnabile`)

- [ ] **Step 3: Implementa il gate**

In `src/types/domain.ts` estendi la union:

```ts
  tipo: 'precheck_fallito' | 'errore_pdf' | 'errore_upload' | 'errore_fattura' | 'errore_pec' | 'stato_non_consegnabile';
```

In `src/lib/consegna/orchestrate.ts`, aggiungi l'import in testa:

```ts
import { isStatoConsegnabile, FINESTRA_ANNULLO_MS } from './costanti'
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
Expected: PASS (6 test)

- [ ] **Step 5: Suite completa + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS

```bash
git add src/lib/consegna/orchestrate.ts src/types/domain.ts tests/unit/orchestra-consegna-gate.test.ts
git commit -m "feat(consegna): gate B1 stato consegnabile server-side in orchestraConsegna"
```

---

### Task 10: orchestraConsegna → RPC consegna_finalizza_atomica + ConsegnaResult.fattura

**Files:**
- Modify: `src/lib/consegna/orchestrate.ts` (Step 5 righe ~216-254 e Step 6 righe ~263-313, più percorso `gia_consegnato` ~47-91)
- Modify: `src/types/domain.ts:587` (`ConsegnaResult.fattura`)
- Delete: `src/lib/consegna/pec-idempotency.ts` (dead code, P2-9)
- Test: `tests/unit/orchestra-consegna-finalizza.test.ts`

**Interfaces:**
- Consumes: RPC `consegna_finalizza_atomica` (Task 5), `FINESTRA_ANNULLO_MS` (Task 1).
- Produces: `ConsegnaResult.fattura: { stato: 'programmata'; emetti_dopo: string } | null` (il campo attuale `{numero, stato_sdi}|null` è sempre stato `null`: nessun consumer ne legge la forma — verificare comunque con grep allo Step 5).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/orchestra-consegna-finalizza.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom } = vi.hoisted(() => ({ mockRpc: vi.fn(), mockFrom: vi.fn() }))

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

import { orchestraConsegna } from '@/lib/consegna/orchestrate'

const LAVORO = {
  id: 'lav-1', laboratorio_id: 'lab-1', stato: 'pronto', numero_lavoro: 'n.1',
  cliente: { id: 'cli-1', codice_sdi: 'ABC1234', pec: null, telefono: null, portale_token: 't' },
  paziente: null, lavorazioni: [], materiali: [],
}

function setup(rpcFinalizza: { data: unknown; error: unknown }) {
  mockRpc.mockImplementation(async (fn: string) => {
    if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
    if (fn === 'consegna_finalizza_atomica') return rpcFinalizza
    throw new Error(`Unexpected rpc: ${fn}`)
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: LAVORO, error: null }) }) }) }) }),
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null, count: 1 }) }) }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('orchestraConsegna — finalizzazione atomica', () => {
  beforeEach(() => vi.clearAllMocks())

  it('successo: chiama la RPC con fatturabile=true e ritorna fattura programmata', async () => {
    setup({ data: { ok: true, fattura_programmata: true, emetti_dopo: '2026-07-10T12:10:00Z' }, error: null })
    const result = await orchestraConsegna('lav-1', 'lab-1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.fattura).toEqual({ stato: 'programmata', emetti_dopo: '2026-07-10T12:10:00Z' })
    expect(mockRpc).toHaveBeenCalledWith('consegna_finalizza_atomica', {
      p_lavoro_id: 'lav-1', p_laboratorio_id: 'lab-1',
      p_cliente_fatturabile: true, p_finestra_ms: 10 * 60 * 1000,
    })
    // MAI insert diretto su fatture dall'orchestrazione
    expect(mockFrom).not.toHaveBeenCalledWith('fatture')
  })

  it('RPC fallisce → errore, lock rilasciato, nessun successo mascherato', async () => {
    setup({ data: null, error: { message: 'boom' } })
    const result = await orchestraConsegna('lav-1', 'lab-1')
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/orchestra-consegna-finalizza.test.ts`
Expected: FAIL — la RPC `consegna_finalizza_atomica` non viene chiamata (il codice attuale fa update diretto + IIFE)

- [ ] **Step 3: Implementa**

In `src/types/domain.ts:587`:

```ts
  fattura: { stato: 'programmata'; emetti_dopo: string } | null;
```

In `src/lib/consegna/orchestrate.ts` SOSTITUISCI l'intero blocco Step 5 (update + check count, righe ~216-254) e l'intero Step 6 (IIFE fatture, righe ~263-313) con:

```ts
    // ----------------------------------------------------------------
    // Step 5+6 — Finalizzazione ATOMICA: stato + programmazione fattura
    // (spec 4a §5 — mai più "consegna ok, fattura persa in silenzio")
    // ----------------------------------------------------------------
    const clienteFisc = lavoro.cliente as unknown as {
      codice_sdi?: string | null
      pec?: string | null
    } | null
    const clienteFatturabile = !!(clienteFisc?.codice_sdi || clienteFisc?.pec)

    const { data: finalizzaData, error: finalizzaError } = await supabase.rpc('consegna_finalizza_atomica', {
      p_lavoro_id: lavoro_id,
      p_laboratorio_id: laboratorio_id,
      p_cliente_fatturabile: clienteFatturabile,
      p_finestra_ms: FINESTRA_ANNULLO_MS,
    })

    if (finalizzaError) {
      await rilasciaLock()
      console.error('[CONSEGNA] consegna_finalizza_atomica error:', finalizzaError)
      return {
        ok: false,
        tipo: 'errore_pdf',
        messaggio: 'Errore durante la registrazione della consegna.',
      }
    }

    const finalizza = finalizzaData as {
      ok: boolean
      fattura_programmata: boolean
      emetti_dopo?: string
    }

    // Push notification — lavoro consegnato → front_desk (invariato)
    await triggerPushByRole(laboratorio_id, 'front_desk', {
      title: 'Lavoro consegnato',
      body: `${lavoro.numero_lavoro} — ${(lavoro.cliente as unknown as { cognome?: string } | null)?.cognome ?? 'Cliente'} è stato consegnato`,
      url: `/lavori/${lavoro_id}`,
    })
```

e nel return finale (Step 8) sostituisci `fattura: null,` con:

```ts
      fattura: finalizza.fattura_programmata && finalizza.emetti_dopo
        ? { stato: 'programmata' as const, emetti_dopo: finalizza.emetti_dopo }
        : null,
```

Nel percorso idempotente `gia_consegnato` (righe ~47-91) sostituisci `fattura: null,` con la lettura dell'entry attiva — aggiungi PRIMA del `return`:

```ts
    const { data: entryAttiva } = await supabase
      .from('fatture_outbox')
      .select('emetti_dopo')
      .eq('lavoro_id', lavoro_id)
      .eq('laboratorio_id', laboratorio_id)
      .in('stato', ['in_attesa', 'in_lavorazione'])
      .maybeSingle()
```

e nel return:

```ts
      fattura: entryAttiva
        ? { stato: 'programmata' as const, emetti_dopo: entryAttiva.emetti_dopo as string }
        : null,
```

Elimina il file `src/lib/consegna/pec-idempotency.ts` (`git rm`). Rimuovi anche gli import ora inutilizzati in orchestrate.ts: `generaProgressivo` (riga 4) — verifica con `npx tsc --noEmit`.

- [ ] **Step 4: Grep contratto + run test**

Run: `grep -rn "\.fattura" src --include="*.tsx" --include="*.ts" | grep -v "stato_sdi\|fatture\|fattura_" | head` → verificare che nessun consumer legga `result.fattura.numero` (atteso: nessuno).
Run: `npx vitest run tests/unit/orchestra-consegna-finalizza.test.ts` → PASS

- [ ] **Step 5: Suite completa + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS

```bash
git rm src/lib/consegna/pec-idempotency.ts
git add src/lib/consegna/orchestrate.ts src/types/domain.ts tests/unit/orchestra-consegna-finalizza.test.ts
git commit -m "feat(consegna): finalizzazione atomica via RPC + fattura programmata in ConsegnaResult (E3, P2-4)"
```

---

### Task 11: generateDdC — mai riusare una DdC annullata

**Files:**
- Modify: `src/lib/pdf/generate-ddc.ts:18-26` (guard) e `:127-137` (recovery 23505)
- Test: `tests/unit/generate-ddc-annullata.test.ts`

**Interfaces:**
- Consumes: indice `ddc_lavoro_attiva_unique` (Task 2). Il guard e il recovery filtrano `stato <> 'annullata'` → la riconsegna dopo annullo genera una DdC NUOVA.

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

In `src/lib/pdf/generate-ddc.ts`, guard (righe 18-22), aggiungi `.neq(...)`:

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

Run: `npx tsc --noEmit && npx vitest run` → PASS

```bash
git add src/lib/pdf/generate-ddc.ts tests/unit/generate-ddc-annullata.test.ts
git commit -m "fix(ddc): generateDdC ignora le DdC annullate — riconsegna genera DdC nuova (P2-3, D2)"
```

---

### Task 12: Lettori DdC — documenti MDR e percorsi critici (gruppo A)

**Files:**
- Modify: `src/lib/consegna/orchestrate.ts:50-54` (percorso `gia_consegnato`)
- Modify: `src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts:53-57`
- Modify: `src/lib/pdf/generate-ifu.ts` (query lavoro, ~riga 12-29)
- Modify: `src/lib/pdf/generate-etichetta.ts` (query lavoro in `generateEtichettaBuffer`, ~riga 26-45)
- Modify: `src/lib/pdf/generate-ricevuta-consegna.ts` (query lavoro, ~riga 12-29)
- Test: `tests/unit/ddc-lettori-gruppo-a.test.ts`

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
Expected: FAIL su tutti e 5 i file (orchestrate.ts matcha già per il Task 11? NO: il Task 11 tocca generate-ddc.ts, non orchestrate.ts)

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

Nei 3 generator PDF (`generate-ifu.ts`, `generate-etichetta.ts` in `generateEtichettaBuffer`, `generate-ricevuta-consegna.ts`) la query lavoro con embed `ddc:dichiarazioni_conformita(*)` guadagna il filtro embed — aggiungi la riga PRIMA di `.single()`:

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

Run: `npx tsc --noEmit && npx vitest run` → PASS (attenzione: `tests/unit/generate-ricevuta-consegna.test.ts` e `portale-documento-route.test.ts` esistono già — se falliscono, adeguare i loro mock alla nuova chain `.neq`)

```bash
git add src/lib/consegna/orchestrate.ts "src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts" src/lib/pdf/generate-ifu.ts src/lib/pdf/generate-etichetta.ts src/lib/pdf/generate-ricevuta-consegna.ts tests/unit/ddc-lettori-gruppo-a.test.ts
git commit -m "fix(ddc): lettori critici (documenti MDR, portale, retry consegna) ignorano DdC annullate"
```

---

### Task 13: Lettori DdC — pagine e API con embed (gruppo B)

**Files:**
- Modify: `src/app/(app)/lavori/[id]/page.tsx:48`
- Modify: `src/app/(app)/lavori/[id]/consegna/page.tsx:42`
- Modify: `src/app/api/lavori/[id]/route.ts:129`
- Modify: `src/app/api/fatture/[id]/xml/route.ts:154`
- Modify: `src/app/api/fatture/batch/route.ts:177`
- Modify: `src/app/portale/[token]/page.tsx:359`
- Test: `tests/unit/ddc-lettori-gruppo-b.test.ts`

**Interfaces:**
- Consumes: stessa convenzione `.neq('ddc.stato', 'annullata')` del Task 12.

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

In ognuno dei 6 file, individua la query `.from('lavori').select(\`...ddc:dichiarazioni_conformita(*)...\`)` e aggiungi `.neq('ddc.stato', 'annullata')` alla chain, subito prima del metodo terminale (`.single()` / `.maybeSingle()` / esecuzione della query). Esempio (`src/app/(app)/lavori/[id]/page.tsx`):

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

Run: `npx tsc --noEmit && npx vitest run` → PASS (adeguare i mock dei test esistenti dei 6 file se la nuova `.neq` li rompe: `lavori-id-route.test.ts`, `api-fatture.test.ts`)

```bash
git add "src/app/(app)/lavori/[id]/page.tsx" "src/app/(app)/lavori/[id]/consegna/page.tsx" "src/app/api/lavori/[id]/route.ts" "src/app/api/fatture/[id]/xml/route.ts" src/app/api/fatture/batch/route.ts "src/app/portale/[token]/page.tsx" tests/unit/ddc-lettori-gruppo-b.test.ts
git commit -m "fix(ddc): embed ddc filtrato su annullata in pagine e API (P2-3 raggio d'impatto)"
```

---

### Task 14: Route annullo — sottile sulla RPC atomica

**Files:**
- Rewrite: `src/app/api/lavori/[id]/annulla-consegna/route.ts`
- Test: `tests/unit/annulla-consegna-route.test.ts`

**Interfaces:**
- Consumes: RPC `annulla_consegna_atomica` (Task 5), `FINESTRA_ANNULLO_MS` (Task 1).
- Produces: mappatura esiti → HTTP: `ok`→200 · `non_trovato`→404 · `non_consegnato`/`finestra_scaduta`→400 · `fattura_in_emissione`/`fattura_gia_emessa`→409 · errore RPC→500. La 4b consuma questi codici.

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
    ['fattura_in_emissione', 409], ['fattura_gia_emessa', 409],
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

  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/annulla-consegna-route.test.ts`
Expected: FAIL — la route attuale non chiama la RPC (fa update diretti con finestra 5 min)

- [ ] **Step 3: Riscrivi la route**

```ts
// src/app/api/lavori/[id]/annulla-consegna/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { FINESTRA_ANNULLO_MS } from '@/lib/consegna/costanti'

// Tutta la logica transazionale (gate stato/finestra, claim outbox, ripristino
// lavoro, annullo DdC fail-closed) vive nella RPC annulla_consegna_atomica
// (spec 4a §6). La route mappa solo gli esiti su HTTP.
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
    case 'fattura_in_emissione':
      return NextResponse.json({ error: 'La fattura è in emissione proprio ora: annullo non più possibile' }, { status: 409 })
    case 'fattura_gia_emessa':
      return NextResponse.json({ error: 'Fattura già emessa: per stornare serve una nota di credito' }, { status: 409 })
    default:
      console.error('[ANNULLA-CONSEGNA] esito RPC inatteso:', esito)
      return NextResponse.json({ error: 'Errore durante l\'annullamento' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/annulla-consegna-route.test.ts` → PASS (9 test)

- [ ] **Step 5: Grep finestra + suite + commit**

Run: `grep -rn "5 \* 60 \* 1000" src/` → atteso: nessun risultato (l'ultima copia è sparita).
Run: `npx tsc --noEmit && npx vitest run` → PASS

```bash
git add "src/app/api/lavori/[id]/annulla-consegna/route.ts" tests/unit/annulla-consegna-route.test.ts
git commit -m "feat(consegna): annullo su RPC atomica, finestra 10 min, esiti fiscali 409 (P2-1, P2-6, C4)"
```

---

### Task 15: generaFatturaPA idempotente (ramo fatturaId)

**Files:**
- Modify: `src/lib/fattura/generate-xml.ts` (righe ~67-93 progressivi, ~166 data, ~169/244 path, ~295-303 update finale)
- Test: `tests/unit/genera-fattura-idempotenza.test.ts`

**Interfaces:**
- Consumes: draft creato da `outbox_prepara_draft` (Task 6) con `data`/`anno` congelati.
- Produces: `generaFatturaPA(lavoro, fatturaId)` sicura da rieseguire: stesso `progressivo_sdi`, stesso path Storage, UPDATE guardato su `stato_sdi IN ('draft','generata')` con count check fail-closed.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/genera-fattura-idempotenza.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockStorage, calls } = vi.hoisted(() => ({
  mockFrom: vi.fn(), mockStorage: vi.fn(),
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
}))
const mockGeneraProgressivo = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, storage: { from: mockStorage } }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: mockGeneraProgressivo }))
vi.mock('server-only', () => ({}))

import { generaFatturaPA } from '@/lib/fattura/generate-xml'

const LAB = { id: 'lab-1', nome: 'Lab', ragione_sociale: 'Lab Srl', partita_iva: '01234567890',
  codice_fiscale: null, indirizzo: 'Via X 1', cap: '80100', citta: 'Napoli', provincia: 'NA',
  regime_fiscale: 'RF01', pec: null, pec_host: null, pec_port: null, pec_user: null,
  pec_smtp_configurata: false, pec_vault_key_id: null }

// Draft GIÀ passato da una prima esecuzione: progressivo_sdi e path valorizzati
const DRAFT_RIPRESA = { numero: '2026-0007', progressivo: 7, anno: 2026, data: '2026-07-10',
  stato_sdi: 'generata', progressivo_sdi: '00042',
  nome_file_xml: 'IT01234567890_00042.xml', xml_storage_path: 'lab-1/2026/IT01234567890_00042.xml' }

function chain(table: string, single: unknown) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'update', 'insert']) {
    c[m] = (...args: unknown[]) => { calls.push({ table, method: m, args }); return c }
  }
  c.single = async () => ({ data: single, error: null })
  return c
}

const LAVORO = { id: 'lav-1', laboratorio_id: 'lab-1', descrizione: 'Corona', prezzo_unitario: 100,
  cliente: { id: 'cli-1', codice_sdi: 'ABC1234', pec: null, partita_iva: '09876543210', codice_fiscale: null,
             studio_nome: 'Studio R', cognome: 'R', nome: 'M', indirizzo: 'Via Y', cap: '80100',
             citta: 'Napoli', provincia: 'NA', paese: 'IT' },
  lavorazioni: [] }

describe('generaFatturaPA — idempotenza su ripresa', () => {
  beforeEach(() => {
    vi.clearAllMocks(); calls.length = 0
    mockStorage.mockReturnValue({
      upload: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'http://x/f.xml' } }),
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return chain(table, LAB)
      if (table === 'fatture') {
        const c = chain(table, DRAFT_RIPRESA)
        ;(c as { select: unknown }).select = (...args: unknown[]) => { calls.push({ table, method: 'select', args }); return c }
        return c
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('con progressivo_sdi già sul draft NON consuma un nuovo progressivo sdi_invio', async () => {
    await generaFatturaPA(LAVORO as never, 'fat-1')
    expect(mockGeneraProgressivo).not.toHaveBeenCalledWith(expect.anything(), 'lab-1', 'sdi_invio')
  })

  it('l\'update finale è guardato su stato_sdi draft/generata', async () => {
    await generaFatturaPA(LAVORO as never, 'fat-1')
    expect(calls).toContainEqual({ table: 'fatture', method: 'in', args: ['stato_sdi', ['draft', 'generata']] })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/genera-fattura-idempotenza.test.ts`
Expected: FAIL — `generaProgressivo` chiamato con `'sdi_invio'` incondizionatamente (riga 71) e nessuna `.in('stato_sdi', ...)`

- [ ] **Step 3: Implementa in `src/lib/fattura/generate-xml.ts`**

(a) Sposta la generazione del progressivo SDI DENTRO il branch (sostituisce le righe ~70-93):

```ts
  // ── 2. Numero, progressivi, data — con riuso su ripresa (idempotenza) ─────
  let anno: number
  let dataDocumento: string
  let numero: string
  let progressivoFattura: number
  let progressivoSdiStr: string
  let nomeFileRiusato: string | null = null
  let storagePathRiusato: string | null = null

  if (fatturaId) {
    const { data: draft, error: draftErr } = await supabase
      .from('fatture')
      .select('numero, progressivo, anno, data, stato_sdi, progressivo_sdi, nome_file_xml, xml_storage_path')
      .eq('id', fatturaId)
      .single()
    if (draftErr || !draft) {
      throw new Error(`Draft fattura non trovato (id=${fatturaId}): ${draftErr?.message ?? 'null'}`)
    }
    const d = draft as { numero: string; progressivo: number; anno: number; data: string | null;
      stato_sdi: string; progressivo_sdi: string | null; nome_file_xml: string | null; xml_storage_path: string | null }
    numero = d.numero
    progressivoFattura = d.progressivo
    anno = d.anno                                     // congelato dal draft (cavallo d'anno)
    dataDocumento = d.data ?? new Date().toISOString().split('T')[0]
    if (d.progressivo_sdi) {
      // Ripresa post-crash: riusa progressivo e path — l'upsert colpisce lo stesso file
      progressivoSdiStr = d.progressivo_sdi
      nomeFileRiusato = d.nome_file_xml
      storagePathRiusato = d.xml_storage_path
    } else {
      const progressivoSdi = await generaProgressivo(supabase, lavoro.laboratorio_id, 'sdi_invio')
      progressivoSdiStr = String(progressivoSdi).padStart(5, '0')
    }
  } else {
    anno = new Date().getFullYear()
    dataDocumento = new Date().toISOString().split('T')[0]
    const progressivoSdi = await generaProgressivo(supabase, lavoro.laboratorio_id, 'sdi_invio')
    progressivoSdiStr = String(progressivoSdi).padStart(5, '0')
    progressivoFattura = await generaProgressivo(supabase, lavoro.laboratorio_id, 'fattura')
    numero = `${anno}-${String(progressivoFattura).padStart(4, '0')}`
  }
```

(b) Sezione 8 (riga ~166): elimina `const oggi = ...` e usa `dataDocumento` nel template XML (`<Data>${dataDocumento}</Data>`).

(c) Sezione 9/10 (righe ~169 e ~244): riuso path su ripresa:

```ts
  const nomeFileXml = nomeFileRiusato ?? `IT${labPiva}_${progressivoSdiStr}.xml`
  ...
  const storagePath = storagePathRiusato ?? `${lavoro.laboratorio_id}/${anno}/${nomeFileXml}`
```

(d) Insert (ramo senza fatturaId, riga ~318): sostituisci `data: oggi` con `data: dataDocumento`.

(e) UPDATE finale (righe ~295-303) guardato + fail-closed:

```ts
  if (fatturaId) {
    const { data: aggiornata, error: updateError } = await supabase
      .from('fatture')
      .update(xmlFields as Record<string, unknown>)
      .eq('id', fatturaId)
      .in('stato_sdi', ['draft', 'generata'])
      .select('id')

    if (updateError) {
      throw new Error(`UPDATE fattura fallito: ${updateError.message}`)
    }
    if (!aggiornata || aggiornata.length === 0) {
      // La fattura è avanzata di stato (es. smtp_inviata): mai sovrascrivere
      // XML/hash di un documento già inviato (conservazione sostitutiva).
      throw new Error(`Fattura ${fatturaId} in stato avanzato: XML non sovrascritto`)
    }
  } else {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/genera-fattura-idempotenza.test.ts` → PASS (2 test)

- [ ] **Step 5: Suite + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS (se `api-fatture.test.ts` o altri test esistenti mockano il vecchio ordine di chiamate, adeguarli: il comportamento senza `fatturaId` è invariato)

```bash
git add src/lib/fattura/generate-xml.ts tests/unit/genera-fattura-idempotenza.test.ts
git commit -m "fix(fatture): generaFatturaPA idempotente su ripresa — riuso progressivo SDI/path, update guardato"
```

---

### Task 16: Endpoint cron emissione — `POST /api/cron/emissione-fatture`

**Files:**
- Create: `src/app/api/cron/emissione-fatture/route.ts`
- Test: `tests/unit/cron-emissione-fatture.test.ts`

**Interfaces:**
- Consumes: RPC `outbox_claim_batch`/`outbox_prepara_draft` (Task 6), `generaFatturaPA` idempotente (Task 15), costanti (Task 1), `triggerPushByRole(laboratorio_id, ruolo, {title, body, url})`.
- Produces: risposta minimale `{ processate, saltate, errori }`. Auth: header `x-cron-secret` vs env `CRON_SECRET`/`CRON_SECRET_PREVIOUS`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cron-emissione-fatture.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, mockPush, updateCalls } = vi.hoisted(() => ({
  mockRpc: vi.fn(), mockFrom: vi.fn(), mockPush: vi.fn(),
  updateCalls: [] as Array<{ table: string; values: Record<string, unknown>; eqs: unknown[][] }>,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/notifications/trigger', () => ({ triggerPushByRole: mockPush }))
vi.mock('@/lib/fattura/generate-xml', () => ({
  generaFatturaPA: vi.fn(async () => ({ numero: '2026-0007', stato_sdi: 'generata' })),
}))
import { generaFatturaPA } from '@/lib/fattura/generate-xml'
import { POST } from '../../src/app/api/cron/emissione-fatture/route'
import { MAX_TENTATIVI_EMISSIONE } from '@/lib/consegna/costanti'

const SECRET = 'a'.repeat(64)
process.env.CRON_SECRET = SECRET

function req(secret?: string) {
  return new Request('http://localhost/api/cron/emissione-fatture', {
    method: 'POST', headers: secret ? { 'x-cron-secret': secret } : {},
  }) as never
}

const ENTRY = { id: 'ent-1', laboratorio_id: 'lab-1', lavoro_id: 'lav-1', tentativi: 0, fattura_id: null }
const LAVORO_OK = { id: 'lav-1', stato: 'consegnato', deleted_at: null,
  cliente: { id: 'cli-1', codice_sdi: 'ABC1234', pec: null }, lavorazioni: [] }

function setupFrom(lavoro: unknown) {
  updateCalls.length = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') {
      return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: lavoro, error: null }) }) }) }) }
    }
    if (table === 'fatture_outbox' || table === 'outbox_heartbeat') {
      return {
        update: (values: Record<string, unknown>) => {
          const eqs: unknown[][] = []
          const c = { eq: (...a: unknown[]) => { eqs.push(a); return c }, then: (r: (v: unknown) => void) => r({ error: null }) }
          updateCalls.push({ table, values, eqs })
          return c
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('POST /api/cron/emissione-fatture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET_PREVIOUS
  })

  it('senza secret → 401 senza toccare il DB', async () => {
    const res = await POST(req())
    expect(res.status).toBe(401)
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('secret sbagliato (stessa lunghezza) → 401 identico', async () => {
    const res = await POST(req('b'.repeat(64)))
    expect(res.status).toBe(401)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('CRON_SECRET_PREVIOUS accettato (rotazione)', async () => {
    process.env.CRON_SECRET_PREVIOUS = 'c'.repeat(64)
    mockRpc.mockResolvedValue({ data: [], error: null })
    setupFrom(LAVORO_OK)
    const res = await POST(req('c'.repeat(64)))
    expect(res.status).toBe(200)
  })

  it('happy path: claim → prepara draft → generaFatturaPA → entry emessa + heartbeat', async () => {
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'outbox_claim_batch') return { data: [ENTRY], error: null }
      if (fn === 'outbox_prepara_draft') return { data: { esito: 'ok', fattura_id: 'fat-1', ripresa: false }, error: null }
      throw new Error(`rpc ${fn}`)
    })
    setupFrom(LAVORO_OK)
    const res = await POST(req(SECRET))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ processate: 1, saltate: 0, errori: 0 })
    expect(generaFatturaPA).toHaveBeenCalledWith(expect.objectContaining({ id: 'lav-1' }), 'fat-1')
    expect(updateCalls.some(c => c.table === 'fatture_outbox' && c.values.stato === 'emessa')).toBe(true)
    expect(updateCalls.some(c => c.table === 'outbox_heartbeat')).toBe(true)
  })

  it('lavoro non più consegnato → entry saltata, nessuna fattura', async () => {
    mockRpc.mockResolvedValue({ data: [ENTRY], error: null })
    setupFrom({ ...LAVORO_OK, stato: 'pronto' })
    const res = await POST(req(SECRET))
    const json = await res.json()
    expect(json.saltate).toBe(1)
    expect(generaFatturaPA).not.toHaveBeenCalled()
    const salto = updateCalls.find(c => c.values.stato === 'saltata')
    expect(salto?.values.motivo_salto).toBe('lavoro_non_consegnato')
  })

  it('errore transitorio → backoff su emetti_dopo, tentativi+1, stato in_attesa', async () => {
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'outbox_claim_batch') return { data: [ENTRY], error: null }
      if (fn === 'outbox_prepara_draft') return { data: { esito: 'ok', fattura_id: 'fat-1' }, error: null }
      throw new Error(`rpc ${fn}`)
    })
    setupFrom(LAVORO_OK)
    vi.mocked(generaFatturaPA).mockRejectedValueOnce(new Error('fetch failed'))
    const res = await POST(req(SECRET))
    expect((await res.json()).errori).toBe(1)
    const retry = updateCalls.find(c => c.table === 'fatture_outbox' && c.values.stato === 'in_attesa')
    expect(retry?.values.tentativi).toBe(1)
    expect(retry?.values.emetti_dopo).toBeDefined()
    expect(mockPush).not.toHaveBeenCalled() // non definitivo: niente push
  })

  it('ultimo tentativo → stato errore + push aggregata al titolare', async () => {
    const entryQuasiMorta = { ...ENTRY, tentativi: MAX_TENTATIVI_EMISSIONE - 1 }
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'outbox_claim_batch') return { data: [entryQuasiMorta], error: null }
      if (fn === 'outbox_prepara_draft') return { data: { esito: 'ok', fattura_id: 'fat-1' }, error: null }
      throw new Error(`rpc ${fn}`)
    })
    setupFrom(LAVORO_OK)
    vi.mocked(generaFatturaPA).mockRejectedValueOnce(new Error('storage down'))
    await POST(req(SECRET))
    expect(updateCalls.some(c => c.values.stato === 'errore')).toBe(true)
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('lab-1', 'titolare', expect.objectContaining({ title: expect.stringContaining('attur') }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cron-emissione-fatture.test.ts`
Expected: FAIL — "Cannot find module .../api/cron/emissione-fatture/route"

- [ ] **Step 3: Implementa la route**

```ts
// src/app/api/cron/emissione-fatture/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getServiceClient } from '@/lib/supabase/server-service'
import { triggerPushByRole } from '@/lib/notifications/trigger'
import {
  OUTBOX_BATCH_MAX, OUTBOX_TIME_BUDGET_MS,
  MAX_TENTATIVI_EMISSIONE, WATCHDOG_IN_LAVORAZIONE_MIN,
} from '@/lib/consegna/costanti'
import type { LavoroDettaglio } from '@/types/domain'

export const maxDuration = 60

// Unica difesa dell'endpoint: secret in header (pg_net non manda Origin —
// isSameOrigin passerebbe sempre e NON va usato qui). Confronto su digest
// SHA-256 (timingSafeEqual richiede lunghezze uguali; l'hash elimina l'oracle).
function secretValido(req: NextRequest): boolean {
  const fornito = req.headers.get('x-cron-secret') ?? ''
  const attesi = [process.env.CRON_SECRET, process.env.CRON_SECRET_PREVIOUS]
    .filter((s): s is string => !!s)
  if (!fornito || attesi.length === 0) return false
  const fornitoHash = crypto.createHash('sha256').update(fornito).digest()
  return attesi.some((s) =>
    crypto.timingSafeEqual(fornitoHash, crypto.createHash('sha256').update(s).digest())
  )
}

// Errori permanenti: ritentare non li risolve — entry in errore subito.
function erroreEPermanente(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /identificativo fiscale|non trovato|non valido/i.test(msg)
}

interface EntryOutbox {
  id: string
  laboratorio_id: string
  lavoro_id: string
  tentativi: number
  fattura_id: string | null
}

export async function POST(req: NextRequest) {
  if (!secretValido(req)) {
    // Log aggregabile (spec §10.4): mai gli header, solo il fatto
    console.warn('[CRON-EMISSIONE] richiesta respinta: secret assente o errato')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = getServiceClient()
  const inizio = Date.now()
  let processate = 0
  let saltate = 0
  let errori = 0
  const erroriPerLab = new Map<string, number>()

  const { data: batch, error: claimError } = await svc.rpc('outbox_claim_batch', {
    p_limite: OUTBOX_BATCH_MAX,
    p_watchdog_min: WATCHDOG_IN_LAVORAZIONE_MIN,
  })
  if (claimError) {
    console.error('[CRON-EMISSIONE] claim error:', claimError.message)
    return NextResponse.json({ error: 'claim' }, { status: 500 })
  }

  const salta = async (entryId: string, motivo: string) => {
    await svc.from('fatture_outbox')
      .update({ stato: 'saltata', motivo_salto: motivo, updated_at: new Date().toISOString() })
      .eq('id', entryId).eq('stato', 'in_lavorazione')
    saltate++
  }

  for (const entry of ((batch ?? []) as EntryOutbox[])) {
    // Time budget: il resto va al tick successivo, senza consumare tentativi
    if (Date.now() - inizio > OUTBOX_TIME_BUDGET_MS) {
      await svc.from('fatture_outbox')
        .update({ stato: 'in_attesa', updated_at: new Date().toISOString() })
        .eq('id', entry.id).eq('stato', 'in_lavorazione')
      continue
    }

    try {
      // Scoping per-entry fail-closed: SEMPRE (laboratorio_id, lavoro_id) insieme
      const { data: lavoro } = await svc
        .from('lavori')
        .select('*, cliente:clienti(*), lavorazioni:lavori_lavorazioni(*)')
        .eq('id', entry.lavoro_id)
        .eq('laboratorio_id', entry.laboratorio_id)
        .single()

      if (!lavoro || lavoro.deleted_at || lavoro.stato !== 'consegnato') {
        await salta(entry.id, 'lavoro_non_consegnato')
        continue
      }
      const cliente = lavoro.cliente as { codice_sdi?: string | null; pec?: string | null } | null
      if (!cliente?.codice_sdi && !cliente?.pec) {
        await salta(entry.id, 'cliente_senza_recapito')
        continue
      }

      const { data: prep, error: prepError } = await svc.rpc('outbox_prepara_draft', { p_entry_id: entry.id })
      if (prepError) throw new Error(prepError.message)
      const preparazione = prep as { esito: string; fattura_id?: string }

      if (preparazione.esito === 'saltata_decisione') { await salta(entry.id, 'decisione_non_fatturare'); continue }
      if (preparazione.esito === 'gia_fatturato') { await salta(entry.id, 'gia_fatturato'); continue }
      if (preparazione.esito === 'lavoro_non_consegnato') { await salta(entry.id, 'lavoro_non_consegnato'); continue }
      if (preparazione.esito !== 'ok' || !preparazione.fattura_id) {
        throw new Error(`outbox_prepara_draft esito inatteso: ${preparazione.esito}`)
      }

      const { generaFatturaPA } = await import('@/lib/fattura/generate-xml')
      await generaFatturaPA(lavoro as unknown as LavoroDettaglio, preparazione.fattura_id)

      await svc.from('fatture_outbox')
        .update({ stato: 'emessa', updated_at: new Date().toISOString() })
        .eq('id', entry.id).eq('stato', 'in_lavorazione')
      processate++
    } catch (err) {
      errori++
      const messaggio = err instanceof Error ? err.message : String(err)
      const tentativi = entry.tentativi + 1
      const definitivo = erroreEPermanente(err) || tentativi >= MAX_TENTATIVI_EMISSIONE

      if (definitivo) {
        await svc.from('fatture_outbox')
          .update({ stato: 'errore', tentativi, ultimo_errore: messaggio, updated_at: new Date().toISOString() })
          .eq('id', entry.id)
        erroriPerLab.set(entry.laboratorio_id, (erroriPerLab.get(entry.laboratorio_id) ?? 0) + 1)
      } else {
        // Backoff esponenziale: 2,4,8,...60 min — libera la testa della coda
        const backoffMin = Math.min(2 ** tentativi, 60)
        await svc.from('fatture_outbox')
          .update({
            stato: 'in_attesa', tentativi, ultimo_errore: messaggio,
            emetti_dopo: new Date(Date.now() + backoffMin * 60_000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', entry.id)
      }
      console.error(`[CRON-EMISSIONE] entry ${entry.id} fallita (tentativo ${tentativi}):`, messaggio)
    }
  }

  // Push AGGREGATA per lab (mai una per entry)
  for (const [labId, n] of erroriPerLab) {
    await triggerPushByRole(labId, 'titolare', {
      title: 'Fatture non emesse',
      body: `${n} fattur${n === 1 ? 'a' : 'e'} in errore definitivo — controlla in Fatture`,
      url: '/fatture',
    })
  }

  await svc.from('outbox_heartbeat')
    .update({ last_tick_at: new Date().toISOString(), entries_processate: processate, errori_tick: errori })
    .eq('id', 1)

  // Risposta MINIMALE: finisce in net._http_response (~6h) — mai dati fiscali
  return NextResponse.json({ processate, saltate, errori })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/cron-emissione-fatture.test.ts` → PASS (7 test)

- [ ] **Step 5: Suite + commit**

Run: `npx tsc --noEmit && npx vitest run` → PASS

```bash
git add src/app/api/cron/emissione-fatture/route.ts tests/unit/cron-emissione-fatture.test.ts
git commit -m "feat(fatture): endpoint cron emissione differita — claim, backoff, push aggregata, heartbeat (E3, D3)"
```

---

### Task 17: Admin — sezione «Coda emissione»

**Files:**
- Create: `src/app/api/admin/outbox/route.ts` (POST azioni)
- Create: `src/app/admin/coda-emissione/page.tsx` (server component)
- Create: `src/app/admin/coda-emissione/AzioniCoda.tsx` (client component)
- Modify: `src/app/admin/admin-nav.tsx` (aggiungi link)
- Test: `tests/unit/admin-outbox-route.test.ts`

**Interfaces:**
- Consumes: auth admin pattern di `src/app/api/admin/labs/route.ts` (helper che verifica `utenti.ruolo === 'admin_sistema'`); tabelle Task 4; endpoint Task 16 (per il tick manuale, chiamato server-side con `process.env.CRON_SECRET`).
- Produces: POST `/api/admin/outbox` body `{ azione: 'riprova' | 'risolvi_alert' | 'tick', id?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/admin-outbox-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, updateCalls } = vi.hoisted(() => ({
  mockGetUser: vi.fn(), mockFrom: vi.fn(),
  updateCalls: [] as Array<{ table: string; values: Record<string, unknown> }>,
}))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { POST } from '../../src/app/api/admin/outbox/route'

function req(body: unknown) {
  return new Request('http://localhost/api/admin/outbox', {
    method: 'POST', headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

function setupRuolo(ruolo: string) {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { ruolo }, error: null }) }) }) }
    if (table === 'fatture_outbox' || table === 'outbox_alerts') {
      return {
        update: (values: Record<string, unknown>) => {
          updateCalls.push({ table, values })
          const c = { eq: () => c, then: (r: (v: unknown) => void) => r({ error: null }) }
          return c
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('POST /api/admin/outbox', () => {
  beforeEach(() => { vi.clearAllMocks(); updateCalls.length = 0 })

  it('non admin → 403', async () => {
    setupRuolo('titolare')
    const res = await POST(req({ azione: 'riprova', id: 'ent-1' }))
    expect(res.status).toBe(403)
  })

  it('riprova: entry errore → in_attesa con tentativi azzerati', async () => {
    setupRuolo('admin_sistema')
    const res = await POST(req({ azione: 'riprova', id: 'ent-1' }))
    expect(res.status).toBe(200)
    const call = updateCalls.find(c => c.table === 'fatture_outbox')
    expect(call?.values).toMatchObject({ stato: 'in_attesa', tentativi: 0 })
  })

  it('risolvi_alert: setta risolto_at', async () => {
    setupRuolo('admin_sistema')
    const res = await POST(req({ azione: 'risolvi_alert', id: 'al-1' }))
    expect(res.status).toBe(200)
    expect(updateCalls.find(c => c.table === 'outbox_alerts')?.values.risolto_at).toBeDefined()
  })

  it('azione sconosciuta → 400', async () => {
    setupRuolo('admin_sistema')
    const res = await POST(req({ azione: 'boom' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/admin-outbox-route.test.ts` → FAIL (modulo inesistente)

- [ ] **Step 3: Implementa API**

```ts
// src/app/api/admin/outbox/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

async function requireAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { azione?: string; id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body non valido' }, { status: 400 }) }

  const svc = getServiceClient()
  const now = new Date().toISOString()

  if (body.azione === 'riprova' && body.id) {
    await svc.from('fatture_outbox')
      .update({ stato: 'in_attesa', tentativi: 0, ultimo_errore: null, emetti_dopo: now, updated_at: now })
      .eq('id', body.id).eq('stato', 'errore')
    return NextResponse.json({ ok: true })
  }

  if (body.azione === 'risolvi_alert' && body.id) {
    await svc.from('outbox_alerts').update({ risolto_at: now }).eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  if (body.azione === 'tick') {
    // Tick manuale: chiama l'endpoint cron server-side col secret (runbook rotazione)
    const url = new URL('/api/cron/emissione-fatture', req.url)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
    })
    const esito = await res.json().catch(() => ({}))
    return NextResponse.json({ ok: res.ok, esito })
  }

  return NextResponse.json({ error: 'Azione sconosciuta' }, { status: 400 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/admin-outbox-route.test.ts` → PASS (4 test)

- [ ] **Step 5: Pagina admin**

```tsx
// src/app/admin/coda-emissione/page.tsx
import { getServiceClient } from '@/lib/supabase/server-service'
import { AzioniCoda } from './AzioniCoda'

export const dynamic = 'force-dynamic'

export default async function CodaEmissionePage() {
  const svc = getServiceClient()

  const [{ data: heartbeat }, { data: perStato }, { data: erroriRecenti }, { data: alerts }] = await Promise.all([
    svc.from('outbox_heartbeat').select('*').eq('id', 1).maybeSingle(),
    svc.from('fatture_outbox').select('stato'),
    svc.from('fatture_outbox').select('id, laboratorio_id, lavoro_id, tentativi, ultimo_errore, updated_at')
      .eq('stato', 'errore').order('updated_at', { ascending: false }).limit(20),
    svc.from('outbox_alerts').select('*').is('risolto_at', null).order('created_at', { ascending: false }),
  ])

  const conteggi = new Map<string, number>()
  for (const r of (perStato ?? []) as Array<{ stato: string }>) {
    conteggi.set(r.stato, (conteggi.get(r.stato) ?? 0) + 1)
  }
  const { data: piuVecchia } = await svc.from('fatture_outbox').select('emetti_dopo')
    .eq('stato', 'in_attesa').order('emetti_dopo').limit(1).maybeSingle()

  return (
    <main className="adm-main">
      <h1>Coda emissione fatture</h1>
      <section className="adm-card">
        <h2>Heartbeat</h2>
        <p>Ultimo tick: {heartbeat?.last_tick_at ?? 'mai'} · processate: {heartbeat?.entries_processate ?? 0} · errori tick: {heartbeat?.errori_tick ?? 0}</p>
        <p>Entry più vecchia in attesa: {piuVecchia?.emetti_dopo ?? '—'}</p>
        <p>{['in_attesa','in_lavorazione','emessa','saltata','annullata','errore'].map(s => `${s}: ${conteggi.get(s) ?? 0}`).join(' · ')}</p>
        <AzioniCoda azione="tick" label="Tick manuale" />
      </section>
      <section className="adm-card">
        <h2>Alert aperti ({(alerts ?? []).length})</h2>
        {(alerts ?? []).map((a) => (
          <div key={a.id as string} className="adm-row">
            <strong>{a.tipo as string}</strong> — {a.dettaglio as string} ({a.created_at as string})
            <AzioniCoda azione="risolvi_alert" id={a.id as string} label="Risolvi" />
          </div>
        ))}
      </section>
      <section className="adm-card">
        <h2>Entry in errore</h2>
        {(erroriRecenti ?? []).map((e) => (
          <div key={e.id as string} className="adm-row">
            lavoro {e.lavoro_id as string} · tentativi {e.tentativi as number} · {e.ultimo_errore as string}
            <AzioniCoda azione="riprova" id={e.id as string} label="Riprova" />
          </div>
        ))}
      </section>
    </main>
  )
}
```

```tsx
// src/app/admin/coda-emissione/AzioniCoda.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AzioniCoda({ azione, id, label }: { azione: 'riprova' | 'risolvi_alert' | 'tick'; id?: string; label: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button className="adm-btn" disabled={busy} onClick={async () => {
      setBusy(true)
      await fetch('/api/admin/outbox', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ azione, id }),
      })
      setBusy(false)
      router.refresh()
    }}>{label}</button>
  )
}
```

In `src/app/admin/admin-nav.tsx` aggiungi accanto ai link esistenti (stesso stile dei `<Link>` presenti):

```tsx
<Link href="/admin/coda-emissione">Coda emissione</Link>
```

NOTA CSS: usa le classi già definite in `src/app/admin/admin.css`; se `adm-card`/`adm-row`/`adm-btn`/`adm-main` non esistono con questi nomi, riusa le classi reali delle pagine admin esistenti (`src/app/admin/labs/`) invece di inventarne di nuove — coerenza col pannello, zero stili inline.

- [ ] **Step 6: Suite + commit**

Run: `npx tsc --noEmit && npx vitest run && npx next build` → PASS (build verifica la pagina admin)

```bash
git add src/app/api/admin/outbox/route.ts src/app/admin/coda-emissione/ src/app/admin/admin-nav.tsx tests/unit/admin-outbox-route.test.ts
git commit -m "feat(admin): sezione Coda emissione — heartbeat, alert, riprova, tick manuale (D4)"
```

---

### Task 18: Verifica finale di ondata

**Files:** nessuno nuovo (solo verifiche + eventuale fix).

- [ ] **Step 1: Verifiche complete (output reale nel report)**

```bash
npx tsc --noEmit          # 0 errori
npx vitest run            # tutti PASS, zero regressioni
npx next build            # pulito, route /api/cron/emissione-fatture e /admin/coda-emissione nel manifest
bash scripts/check-ds-compliance.sh
```

- [ ] **Step 2: Grep di accettazione spec**

```bash
grep -rn "5 \* 60 \* 1000" src/                                  # atteso: 0
grep -rn "GRACE_PERIOD_MS" src/                                   # atteso: 0
grep -rln "pec-idempotency" src/                                  # atteso: 0
grep -c "neq('ddc.stato'" $(grep -rln "ddc:dichiarazioni_conformita" src/) # ogni file ≥1
```

- [ ] **Step 3: Checklist spec §11 (requisiti sicurezza)** — verificare uno a uno i 10 punti contro il codice scritto; annotare l'esito nel report del task.

- [ ] **Step 4: Commit finale (se fix emersi) e handoff a review d'ondata**

La review rafforzata (fiscale), la QA browser (lab E2E `00000000-0000-0000-0000-000000000001`, MAI il lab Filippo: consegna reale → banner 10 min → annullo → riconsegna → attesa tick → fattura in /fatture e in /admin/coda-emissione) e il merge su `main` seguono il flusso d'ondata standard (BP-2 FASE 8-10), fuori da questo piano.

---

## Ordine e dipendenze

1 → (2,3,4 in parallelo) → (5,6,7 dopo 4) → **8 (GATE Francesco)** → 9,10 (dopo 8; 10 dopo 9) → 11 → (12,13 dopo 11) → 14 (dopo 8) → 15 (dopo 8) → 16 (dopo 6,15) → 17 (dopo 16) → 18 (ultimo).
