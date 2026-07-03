# B2 — Contabilità Clienti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire la tabella `lavori_partitario` (0 righe, mai scritta — causa radice del blocker B2) con un ledger pagamenti polimorfico reale, una decisione fatturazione per lavoro, e un credito cliente con eccedenze/rimborsi — così che Dashboard, Scadenzario, widget Front Desk e `admin/labs/[id]/live` mostrino lo stesso numero coerente sullo stesso cliente.

**Architecture:** Nuova tabella `pagamenti` (riferimento polimorfico `fattura_id` XOR `lavoro_id`, mai entrambi), nuova tabella `credito_clienti_movimenti` (eccedenza/applicazione/rimborso), nuova colonna `lavori.decisione_fatturazione`. `fatture.pagata`/`importo_pagato` diventano derivati via trigger Postgres (mai scritti manualmente). Tutta la logica di calcolo saldo/credito è estratta in funzioni pure testabili in isolamento (`src/lib/contabilita/*`), seguendo lo stesso pattern di B1 (`tracciaMaterialiLavoro(supabase, …)`): le route API restano wiring sottile, il calcolo si testa senza mock di Supabase. `EstrattoContoView.tsx` evolve in place (stessa route `/scadenzario/[cliente_id]`) in "Contabilità cliente", con estrazione mirata dei sotto-componenti già presenti nel file.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + RLS), Vitest.

**Spec di riferimento:** `docs/superpowers/specs/2026-07-02-contabilita-clienti-design.md`

## Global Constraints

- RLS: usare sempre `public.current_lab_id()` — MAI `auth.current_lab_id()` né il vecchio `public.get_lab_id()` (usato per errore nella `lavori_partitario` originale).
- Ogni route API usa `getServiceClient()` per le query (RLS è difesa in profondità, l'enforcement reale di ruolo/tenant è nell'handler — pattern consolidato in tutte le route esistenti).
- Nessuna route API esistente nel progetto mocka Supabase nei test Vitest (verificato: zero `vi.mock` in `tests/unit/`). Segui il pattern B1: la logica DB-touching prende `supabase`/`svc` come parametro e si testa con un fake che registra i filtri `.eq()` (vedi B1 Task 4 `createFakeSupabase`) — MAI introdurre un mock Supabase nuovo per questo piano. Il wiring HTTP (401/403/routing) resta verificato solo manualmente/e2e, come per tutto il resto del repo.
- Ogni importo monetario è `NUMERIC(10,2)` lato DB e arrotondato a 2 decimali lato TS (`Math.round(n * 100) / 100`) prima di ogni confronto o persistenza.
- Dopo la migration (Task 2): NON rigenerare `database.types.ts` subito — il pattern B1 usa tipi di dominio scritti a mano (`src/types/domain.ts`) con cast `as unknown as X`, non il client generico tipizzato. La rigenerazione avviene solo a fine piano (Task 16), per non bloccare i task intermedi.
- Zero `any` non giustificato — se necessario, `// eslint-disable-next-line @typescript-eslint/no-explicit-any` con motivazione.
- Verifica finale obbligatoria: `npx tsc --noEmit` + `npx vitest run` + `npx next build`, tutti e tre con output reale (FASE 7 CLAUDE.md).
- `DROP TABLE lavori_partitario` avviene SOLO in fondo al Task 9, DOPO che Task 1 (le 8 select con join `partitario:lavori_partitario(*)`) E Task 9 stesso (i 2 punti in `dashboard/queries.ts` con pattern `lavori_partitario(importo)`, diverso dall'alias, scoperti da review pre-Task-2) hanno rimosso ogni riferimento applicativo residuo — altrimenti quelle query falliscono a runtime (PostgREST non trova più la relazione). Task 2 crea solo lo schema nuovo; la tabella vecchia resta innocua (0 righe) fino al drop.

---

## Task 1: Bonifica riferimenti a `lavori_partitario` prima del drop

**Files:**
- Modify: `src/app/(app)/lavori/[id]/page.tsx:47`
- Modify: `src/app/(app)/lavori/[id]/consegna/page.tsx:42`
- Modify: `src/app/api/fatture/batch/route.ts:176`
- Modify: `src/app/api/fatture/[id]/xml/route.ts:154`
- Modify: `src/app/api/lavori/[id]/route.ts:48`
- Modify: `src/lib/pdf/generate-ricevuta-consegna.ts:24`
- Modify: `src/lib/pdf/generate-ifu.ts:24`
- Modify: `src/lib/pdf/generate-etichetta.ts:40`
- Modify: `src/types/domain.ts:334` (campo `partitario` su `LavoroDettaglio`), `:470-484` (tipi `ModalitaPagamento`/`LavoroPartitario`)

**Interfaces:** nessuna nuova — solo rimozione di codice morto. Nessun consumatore applicativo legge mai `.partitario` (verificato: `grep -rn "\.partitario\b"` non trova nulla oltre alle 8 righe di select sopra).

- [ ] **Step 1: Rimuovi la riga di join in ciascuno degli 8 file**

In ognuno degli 8 file sopra, la select contiene esattamente questa riga (stesso testo letterale in tutti):

```typescript
      partitario:lavori_partitario(*),
```

Cancellala (l'intera riga, incluso l'a-capo) in ciascuno degli 8 file. Non cambia nient'altro nella select — le righe sopra/sotto restano invariate.

- [ ] **Step 2: Rimuovi il tipo `LavoroPartitario`/`ModalitaPagamento` e il campo `partitario` da `domain.ts`**

In `src/types/domain.ts`, nell'interfaccia `LavoroDettaglio` (righe 325-337), rimuovi la riga:

```typescript
  partitario: LavoroPartitario[];
```

Poi rimuovi interamente il blocco (righe 470-484):

```typescript
// ============================================================
// PARTITARIO (pagamenti per lavoro)
// ============================================================
export type ModalitaPagamento = 'contante' | 'bonifico' | 'assegno' | 'pos' | 'altro';

export interface LavoroPartitario {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  data_pagamento: string;
  importo: number;
  modalita: ModalitaPagamento;
  riferimento: string | null;
  note: string | null;
}
```

- [ ] **Step 3: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori (nessun consumatore residuo di `LavoroPartitario`/`ModalitaPagamento`/`.partitario`, già verificato via grep prima di scrivere questo piano).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/lavori/\[id\]/page.tsx "src/app/(app)/lavori/[id]/consegna/page.tsx" src/app/api/fatture/batch/route.ts "src/app/api/fatture/[id]/xml/route.ts" "src/app/api/lavori/[id]/route.ts" src/lib/pdf/generate-ricevuta-consegna.ts src/lib/pdf/generate-ifu.ts src/lib/pdf/generate-etichetta.ts src/types/domain.ts
git commit -m "chore(db): B2 — rimuovi riferimenti a lavori_partitario prima del drop (tabella dismessa, 0 righe)"
```

---

## Task 2: Migration DB completa — decisione_fatturazione, pagamenti, credito_clienti_movimenti, trigger, drop lavori_partitario

**Files:**
- Create: `supabase/migrations/20260702010000_b2_contabilita_clienti.sql`

**Interfaces:**
- Produces: colonna `lavori.decisione_fatturazione` (`text`, default `'in_attesa'`); tabella `pagamenti`; tabella `credito_clienti_movimenti`; colonna `fatture.importo_pagato`; funzione `ricalcola_pagamento_fattura(uuid)`; trigger su `pagamenti`/`credito_clienti_movimenti` che la invoca. Usate da Task 3 (tipi TS) e da tutti i task successivi.

Questa migration è idempotente: ogni `CREATE TABLE`/`ALTER TABLE`/`CREATE OR REPLACE FUNCTION` usa forme sicure da rieseguire. Non contiene il `DROP TABLE lavori_partitario` — vedi nota sotto, spostato in fondo al Task 9.

- [ ] **Step 1: Scrivi la migration**

```sql
-- ============================================================
-- B2 — Contabilità Clienti: ledger pagamenti polimorfico,
-- decisione fatturazione, credito cliente, dismissione lavori_partitario.
-- Vedi docs/superpowers/specs/2026-07-02-contabilita-clienti-design.md
-- PREREQUISITO: Task 1 di questo piano già applicato (nessun riferimento
-- applicativo residuo a lavori_partitario).
-- ============================================================

-- ------------------------------------------------------------
-- 1. lavori.decisione_fatturazione
-- ------------------------------------------------------------
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS decisione_fatturazione TEXT NOT NULL DEFAULT 'in_attesa'
    CHECK (decisione_fatturazione IN ('in_attesa', 'fatturare', 'non_fatturare'));

COMMENT ON COLUMN lavori.decisione_fatturazione IS
  'Decisione se il lavoro va fatturato o saldato direttamente dal cliente. Immutabile una volta incluso_in_fattura=true — modificabile solo via PATCH /api/lavori/[id]/decisione-fatturazione.';

-- ------------------------------------------------------------
-- 2. pagamenti — ledger polimorfico (fattura XOR lavoro diretto)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagamenti (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id           UUID NOT NULL REFERENCES laboratori(id),
  fattura_id               UUID REFERENCES fatture(id),
  lavoro_id                UUID REFERENCES lavori(id),

  importo                  NUMERIC(10,2) NOT NULL CHECK (importo > 0),
  metodo                   TEXT NOT NULL CHECK (metodo IN ('contanti','bonifico','pos','assegno','altro')),
  metodo_nota              TEXT,
  data_pagamento           DATE NOT NULL,

  stato                    TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo','annullato')),
  motivo_annullamento      TEXT,
  sostituisce_pagamento_id UUID REFERENCES pagamenti(id),

  registrato_da            UUID NOT NULL REFERENCES utenti(id),
  annullato_da             UUID REFERENCES utenti(id),
  annullato_at             TIMESTAMPTZ,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (fattura_id IS NOT NULL AND lavoro_id IS NULL) OR
    (fattura_id IS NULL AND lavoro_id IS NOT NULL)
  )
);

ALTER TABLE pagamenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagamenti_laboratorio_select" ON pagamenti;
CREATE POLICY "pagamenti_laboratorio_select" ON pagamenti
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

DROP POLICY IF EXISTS "pagamenti_laboratorio_insert" ON pagamenti;
CREATE POLICY "pagamenti_laboratorio_insert" ON pagamenti
  FOR INSERT WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND (public.has_role('titolare') OR public.has_role('front_desk'))
  );

DROP POLICY IF EXISTS "pagamenti_laboratorio_update" ON pagamenti;
CREATE POLICY "pagamenti_laboratorio_update" ON pagamenti
  FOR UPDATE USING (laboratorio_id = public.current_lab_id())
  WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND (public.has_role('titolare') OR public.has_role('front_desk'))
  );

CREATE INDEX IF NOT EXISTS idx_pagamenti_fattura ON pagamenti(fattura_id) WHERE fattura_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagamenti_lavoro ON pagamenti(lavoro_id) WHERE lavoro_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagamenti_laboratorio ON pagamenti(laboratorio_id);

-- ------------------------------------------------------------
-- 3. credito_clienti_movimenti
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credito_clienti_movimenti (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id),
  cliente_id     UUID NOT NULL REFERENCES clienti(id),
  tipo           TEXT NOT NULL CHECK (tipo IN ('eccedenza','applicazione','rimborso')),

  pagamento_id   UUID REFERENCES pagamenti(id),
  fattura_id     UUID REFERENCES fatture(id),
  lavoro_id      UUID REFERENCES lavori(id),

  importo        NUMERIC(10,2) NOT NULL CHECK (importo > 0),
  metodo         TEXT CHECK (metodo IN ('contanti','bonifico','pos','assegno','altro')),
  metodo_nota    TEXT,
  note           TEXT,

  registrato_da  UUID NOT NULL REFERENCES utenti(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (tipo = 'eccedenza'    AND pagamento_id IS NOT NULL AND fattura_id IS NULL AND lavoro_id IS NULL) OR
    (tipo = 'applicazione' AND pagamento_id IS NULL AND (fattura_id IS NOT NULL) <> (lavoro_id IS NOT NULL)) OR
    (tipo = 'rimborso'     AND pagamento_id IS NULL AND fattura_id IS NULL AND lavoro_id IS NULL AND metodo IS NOT NULL)
  )
);

ALTER TABLE credito_clienti_movimenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credito_movimenti_laboratorio_select" ON credito_clienti_movimenti;
CREATE POLICY "credito_movimenti_laboratorio_select" ON credito_clienti_movimenti
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

DROP POLICY IF EXISTS "credito_movimenti_laboratorio_insert" ON credito_clienti_movimenti;
CREATE POLICY "credito_movimenti_laboratorio_insert" ON credito_clienti_movimenti
  FOR INSERT WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND (public.has_role('titolare') OR public.has_role('front_desk'))
  );

CREATE INDEX IF NOT EXISTS idx_credito_mov_cliente ON credito_clienti_movimenti(cliente_id);
CREATE INDEX IF NOT EXISTS idx_credito_mov_fattura ON credito_clienti_movimenti(fattura_id) WHERE fattura_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credito_mov_lavoro ON credito_clienti_movimenti(lavoro_id) WHERE lavoro_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credito_mov_laboratorio ON credito_clienti_movimenti(laboratorio_id);

-- ------------------------------------------------------------
-- 4. fatture.importo_pagato + trigger di ricalcolo pagata/importo_pagato
-- ------------------------------------------------------------
ALTER TABLE fatture ADD COLUMN IF NOT EXISTS importo_pagato NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN fatture.importo_pagato IS
  'Derivato via trigger da pagamenti attivi + applicazioni di credito collegate. Non impostare mai manualmente (vedi trg_ricalcola_pagamento_fattura).';

CREATE OR REPLACE FUNCTION ricalcola_pagamento_fattura(p_fattura_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_totale NUMERIC(10,2);
  v_pagato NUMERIC(10,2);
BEGIN
  -- FOR UPDATE: prende il lock sulla riga PRIMA di sommare i pagamenti.
  -- Senza questo lock, due pagamenti concorrenti sulla stessa fattura
  -- (es. titolare + front_desk quasi simultanei) possono sommare da uno
  -- snapshot che non vede ancora il commit dell'altro — lost update su
  -- importo_pagato (finding di review pre-esecuzione su Task 2).
  SELECT totale INTO v_totale FROM fatture WHERE id = p_fattura_id FOR UPDATE;
  IF v_totale IS NULL THEN
    RETURN; -- fattura non trovata (già cancellata) — nessun ricalcolo
  END IF;

  SELECT
    COALESCE((SELECT SUM(importo) FROM pagamenti WHERE fattura_id = p_fattura_id AND stato = 'attivo'), 0)
    + COALESCE((SELECT SUM(importo) FROM credito_clienti_movimenti WHERE fattura_id = p_fattura_id AND tipo = 'applicazione'), 0)
  INTO v_pagato;

  UPDATE fatture
  SET importo_pagato = v_pagato,
      pagata = (v_pagato >= v_totale),
      updated_at = now()
  WHERE id = p_fattura_id;
END;
$$;

-- Un'unica funzione trigger per entrambe le tabelle: sia `pagamenti` che
-- `credito_clienti_movimenti` hanno una colonna `fattura_id` con lo stesso
-- significato. Guardia esplicita: righe legate a un lavoro diretto
-- (fattura_id IS NULL) non toccano mai `fatture`.
CREATE OR REPLACE FUNCTION trg_ricalcola_pagamento_fattura()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.fattura_id IS NOT NULL THEN
      PERFORM ricalcola_pagamento_fattura(OLD.fattura_id);
    END IF;
    RETURN NULL;
  END IF;

  IF NEW.fattura_id IS NOT NULL THEN
    PERFORM ricalcola_pagamento_fattura(NEW.fattura_id);
  END IF;

  -- Se una UPDATE ha cambiato la fattura collegata (non dovrebbe succedere,
  -- ma per sicurezza) ricalcola anche la vecchia.
  IF TG_OP = 'UPDATE' AND OLD.fattura_id IS NOT NULL AND OLD.fattura_id IS DISTINCT FROM NEW.fattura_id THEN
    PERFORM ricalcola_pagamento_fattura(OLD.fattura_id);
  END IF;

  RETURN NULL;
END;
$$;

-- AFTER INSERT OR UPDATE OR DELETE: l'UPDATE copre il soft-cancel
-- (stato attivo→annullato) — il pagamento annullato smette di contare
-- perché la funzione sopra filtra sempre stato='attivo'.
DROP TRIGGER IF EXISTS trg_pagamenti_ricalcola_fattura ON pagamenti;
CREATE TRIGGER trg_pagamenti_ricalcola_fattura
  AFTER INSERT OR UPDATE OR DELETE ON pagamenti
  FOR EACH ROW EXECUTE FUNCTION trg_ricalcola_pagamento_fattura();

DROP TRIGGER IF EXISTS trg_credito_movimenti_ricalcola_fattura ON credito_clienti_movimenti;
CREATE TRIGGER trg_credito_movimenti_ricalcola_fattura
  AFTER INSERT OR UPDATE OR DELETE ON credito_clienti_movimenti
  FOR EACH ROW EXECUTE FUNCTION trg_ricalcola_pagamento_fattura();

-- ------------------------------------------------------------
-- 5. refresh_dashboard_cache() — KPI "pagamenti scaduti" (008),
--    sostituita la lettura di lavori_partitario (0 righe, mai scritta)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_dashboard_cache(p_lab_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mese_corrente      DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_mese_precedente    DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  v_mese_prec_fine     DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
  v_pagamenti_scad_tot NUMERIC(12,2) := 0;
  v_pagamenti_scad_ct  INTEGER := 0;
BEGIN
  -- B2: fatture non pagate (residuo = totale - importo_pagato, derivato via
  -- trigger) + lavori diretti (fatturare/non_fatturare) non ancora saldati,
  -- entrambi con oltre 30gg di ritardo. Sostituisce la vecchia sub-select su
  -- lavori_partitario (mai scritta in produzione).
  SELECT
    COALESCE(SUM(residuo), 0),
    COUNT(*)
  INTO v_pagamenti_scad_tot, v_pagamenti_scad_ct
  FROM (
    SELECT f.id, (f.totale - f.importo_pagato) AS residuo
    FROM fatture f
    WHERE f.laboratorio_id = p_lab_id
      AND f.deleted_at IS NULL
      AND f.pagata = FALSE
      AND f.stato_sdi != 'draft'
      AND f.data < CURRENT_DATE - INTERVAL '30 days'

    UNION ALL

    SELECT l.id,
      COALESCE(l.prezzo_unitario, 0)
        - COALESCE((SELECT SUM(p.importo) FROM pagamenti p WHERE p.lavoro_id = l.id AND p.stato = 'attivo'), 0)
        - COALESCE((SELECT SUM(m.importo) FROM credito_clienti_movimenti m WHERE m.lavoro_id = l.id AND m.tipo = 'applicazione'), 0)
      AS residuo
    FROM lavori l
    WHERE l.laboratorio_id = p_lab_id
      AND l.deleted_at IS NULL
      AND l.stato NOT IN ('annullato')
      AND l.incluso_in_fattura = FALSE
      AND l.decisione_fatturazione IN ('fatturare', 'non_fatturare')
      AND l.data_consegna_prevista < CURRENT_DATE - INTERVAL '30 days'
      AND COALESCE(l.prezzo_unitario, 0) > 0
  ) sub
  WHERE residuo > 0;

  INSERT INTO dashboard_kpi_cache (
    laboratorio_id,
    consegne_oggi,
    lavori_in_ritardo,
    pronti_non_fatturati,
    mdr_incompleti,
    spedizioni_in_ritardo,
    is_rifacimento_count,
    stl_non_assegnati,
    lavori_attivi,
    fatturato_mese,
    fatturato_mese_precedente,
    pagamenti_scaduti_totale,
    pagamenti_scaduti_clienti_count,
    materiali_esaurimento_count,
    in_prova_count,
    tecnico_saturo_id,
    tecnico_saturo_count,
    aggiornato_at
  )
  SELECT
    p_lab_id,
    COUNT(*) FILTER (
      WHERE stato NOT IN ('consegnato','annullato')
        AND data_consegna_prevista = CURRENT_DATE
    ),
    COUNT(*) FILTER (WHERE stato = 'in_ritardo'),
    COUNT(*) FILTER (
      WHERE stato = 'pronto' AND incluso_in_fattura = FALSE
    ),
    COUNT(*) FILTER (
      WHERE stato = 'consegnato' AND conformato = FALSE
    ),
    COUNT(*) FILTER (
      WHERE spedizione_stato = 'spedito'
        AND data_consegna_prevista < CURRENT_DATE - INTERVAL '2 days'
    ),
    COUNT(*) FILTER (
      WHERE is_rifacimento = TRUE
        AND data_ingresso >= v_mese_corrente
    ),
    COUNT(*) FILTER (
      WHERE impronta_digitale = TRUE
        AND tecnico_id IS NULL
        AND stato = 'ricevuto'
    ),
    COUNT(*) FILTER (
      WHERE stato NOT IN ('consegnato','annullato','ricevuto')
    ),
    COALESCE((
      SELECT SUM(f.totale)
      FROM fatture f
      WHERE f.laboratorio_id = p_lab_id
        AND f.deleted_at IS NULL
        AND f.data >= v_mese_corrente
        AND f.stato_sdi NOT IN ('draft','rifiutata','scaduta')
    ), 0),
    COALESCE((
      SELECT SUM(f.totale)
      FROM fatture f
      WHERE f.laboratorio_id = p_lab_id
        AND f.deleted_at IS NULL
        AND f.data >= v_mese_precedente
        AND f.data <= v_mese_prec_fine
        AND f.stato_sdi NOT IN ('draft','rifiutata','scaduta')
    ), 0),
    v_pagamenti_scad_tot,
    v_pagamenti_scad_ct,
    (
      SELECT COUNT(*)
      FROM magazzino m
      WHERE m.laboratorio_id = p_lab_id
        AND m.deleted_at IS NULL
        AND m.attivo = TRUE
        AND m.scorta_attuale <= m.scorta_minima
        AND m.scorta_minima > 0
    ),
    COUNT(*) FILTER (WHERE stato = 'in_prova'),
    NULL,
    0,
    NOW()
  FROM lavori
  WHERE laboratorio_id = p_lab_id AND deleted_at IS NULL
  ON CONFLICT (laboratorio_id) DO UPDATE SET
    consegne_oggi                    = EXCLUDED.consegne_oggi,
    lavori_in_ritardo                = EXCLUDED.lavori_in_ritardo,
    pronti_non_fatturati             = EXCLUDED.pronti_non_fatturati,
    mdr_incompleti                   = EXCLUDED.mdr_incompleti,
    spedizioni_in_ritardo            = EXCLUDED.spedizioni_in_ritardo,
    is_rifacimento_count             = EXCLUDED.is_rifacimento_count,
    stl_non_assegnati                = EXCLUDED.stl_non_assegnati,
    lavori_attivi                    = EXCLUDED.lavori_attivi,
    fatturato_mese                   = EXCLUDED.fatturato_mese,
    fatturato_mese_precedente        = EXCLUDED.fatturato_mese_precedente,
    pagamenti_scaduti_totale         = EXCLUDED.pagamenti_scaduti_totale,
    pagamenti_scaduti_clienti_count  = EXCLUDED.pagamenti_scaduti_clienti_count,
    materiali_esaurimento_count      = EXCLUDED.materiali_esaurimento_count,
    in_prova_count                   = EXCLUDED.in_prova_count,
    tecnico_saturo_id                = NULL,
    tecnico_saturo_count             = 0,
    aggiornato_at                    = NOW();
END;
$$;
```

**Nota (adjudicata in review pre-Task-2, dopo che il reviewer di Task 1 ha trovato una dipendenza runtime residua non prevista dal piano originale):** questa migration NON droppa `lavori_partitario`. Task 1 ha bonificato le 8 select con join `partitario:lavori_partitario(*)`, ma `src/lib/dashboard/queries.ts` (`getPagamentiScadutiTop`, `getFrontDeskDashboard`) referenzia ancora la tabella con un pattern diverso (`lavori_partitario(importo)`, senza alias `partitario:`) — questi due punti restano live sulla Dashboard/admin-live/KPI API fino a quando Task 9 non li riscrive. Il `DROP TABLE IF EXISTS lavori_partitario CASCADE` è quindi spostato in fondo al Task 9, subito dopo il rewiring di quei due punti, quando l'ultimo riferimento applicativo sparisce davvero. La tabella resta innocua (0 righe, nessun writer) durante l'attesa.

- [ ] **Step 2: Applica la migration al progetto Supabase collegato**

Applica secondo il processo già in uso nel progetto (`supabase db push` con progetto collegato, o Supabase MCP `apply_migration`) al progetto `iagibumwjstnveqpjbwq`. **Non procedere ai task successivi finché questa migration non è realmente applicata.**

- [ ] **Step 3: Verifica manuale del trigger e dei vincoli CHECK (nessun harness DB automatico nel repo)**

Esegui via Supabase MCP `execute_sql` (o SQL editor) sul progetto collegato:

```sql
-- 3a. CHECK polimorfico su pagamenti: deve fallire (nessuno dei due XOR null)
INSERT INTO pagamenti (laboratorio_id, importo, metodo, data_pagamento, registrato_da)
VALUES ('971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c', 10, 'contanti', CURRENT_DATE,
        (SELECT id FROM utenti WHERE laboratorio_id = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c' LIMIT 1));
-- Expected: ERROR — violates check constraint

-- 3b. Trigger su fattura: crea una fattura di test, un pagamento parziale, verifica importo_pagato/pagata
-- (sostituisci <cliente_id_test> con un cliente reale del lab Filippo)
INSERT INTO fatture (laboratorio_id, cliente_id, numero, anno, progressivo, data, tipo_documento,
                      stato_sdi, imponibile, iva_importo, bollo, totale, codice_iva, natura_iva,
                      cliente_denominazione, cliente_indirizzo)
VALUES ('971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c', '<cliente_id_test>', 'TEST-B2-001', 2026, 99999,
        CURRENT_DATE, 'TD01', 'draft', 100, 0, 0, 100, 'N4', 'N4', 'Test', 'Test')
RETURNING id; -- annota l'id come <fattura_test_id>

INSERT INTO pagamenti (laboratorio_id, fattura_id, importo, metodo, data_pagamento, registrato_da)
VALUES ('971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c', '<fattura_test_id>', 40, 'contanti', CURRENT_DATE,
        (SELECT id FROM utenti WHERE laboratorio_id = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c' LIMIT 1));

SELECT importo_pagato, pagata FROM fatture WHERE id = '<fattura_test_id>';
-- Expected: importo_pagato = 40.00, pagata = false

-- 3c. Verifica che un pagamento legato a un LAVORO non tocchi nessuna fattura
-- (usa un lavoro di test esistente del lab, <lavoro_test_id>)
INSERT INTO pagamenti (laboratorio_id, lavoro_id, importo, metodo, data_pagamento, registrato_da)
VALUES ('971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c', '<lavoro_test_id>', 50, 'contanti', CURRENT_DATE,
        (SELECT id FROM utenti WHERE laboratorio_id = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c' LIMIT 1));
SELECT pagata, importo_pagato FROM fatture WHERE id = '<fattura_test_id>';
-- Expected: invariato (40.00 / false) — il pagamento sul lavoro non ha toccato la fattura

-- Cleanup dati di test
DELETE FROM pagamenti WHERE fattura_id = '<fattura_test_id>' OR lavoro_id = '<lavoro_test_id>';
DELETE FROM fatture WHERE id = '<fattura_test_id>';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260702010000_b2_contabilita_clienti.sql
git commit -m "feat(db): B2 — pagamenti polimorfici, decisione_fatturazione, credito cliente, drop lavori_partitario"
```

---

## Task 3: Tipi TypeScript — `decisione_fatturazione`, `Pagamento`, `CreditoClienteMovimento`

**Files:**
- Modify: `src/types/domain.ts`

**Interfaces:**
- Produces: `DecisioneFatturazione`, campo `decisione_fatturazione: DecisioneFatturazione` su `Lavoro`; `MetodoPagamento`, `StatoPagamento`, `Pagamento`, `TipoMovimentoCredito`, `CreditoClienteMovimento` — usati da Task 4, 5, 7, 8, 9, 10, 11, 15.

- [ ] **Step 1: Aggiungi `decisione_fatturazione` all'interfaccia `Lavoro`**

In `src/types/domain.ts`, subito dopo la riga `incluso_in_fattura: boolean;` (riga 285, sezione "Prezzi"), aggiungi:

```typescript
  decisione_fatturazione: DecisioneFatturazione;
```

Poi, prima della dichiarazione di `export interface Lavoro {` (riga 221), aggiungi il tipo:

```typescript
export type DecisioneFatturazione = 'in_attesa' | 'fatturare' | 'non_fatturare';

```

- [ ] **Step 2: Aggiungi `Pagamento` e `CreditoClienteMovimento` al posto del vecchio blocco `LavoroPartitario` (già rimosso in Task 1)**

Nello stesso file, dove prima (Task 1) è stato rimosso il blocco "PARTITARIO (pagamenti per lavoro)", aggiungi:

```typescript
// ============================================================
// PAGAMENTI — ledger polimorfico (fattura XOR lavoro diretto) — B2
// ============================================================
export type MetodoPagamento = 'contanti' | 'bonifico' | 'pos' | 'assegno' | 'altro';
export type StatoPagamento = 'attivo' | 'annullato';

export interface Pagamento {
  id: string;
  laboratorio_id: string;
  fattura_id: string | null;
  lavoro_id: string | null;
  importo: number;
  metodo: MetodoPagamento;
  metodo_nota: string | null;
  data_pagamento: string;
  stato: StatoPagamento;
  motivo_annullamento: string | null;
  sostituisce_pagamento_id: string | null;
  registrato_da: string;
  annullato_da: string | null;
  annullato_at: string | null;
  created_at: string;
}

// ============================================================
// CREDITO CLIENTI — eccedenze, applicazioni, rimborsi — B2
// ============================================================
export type TipoMovimentoCredito = 'eccedenza' | 'applicazione' | 'rimborso';

export interface CreditoClienteMovimento {
  id: string;
  laboratorio_id: string;
  cliente_id: string;
  tipo: TipoMovimentoCredito;
  pagamento_id: string | null;
  fattura_id: string | null;
  lavoro_id: string | null;
  importo: number;
  metodo: MetodoPagamento | null;
  metodo_nota: string | null;
  note: string | null;
  registrato_da: string;
  created_at: string;
}
```

- [ ] **Step 3: Aggiungi `importo_pagato` a `Fattura`**

Nell'interfaccia `Fattura` (righe 596-624), subito dopo `totale: number;` (riga 611), aggiungi:

```typescript
  importo_pagato: number;
```

- [ ] **Step 4: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori (campi aggiunti, nessun consumatore esistente distrugge `Lavoro`/`Fattura` con spread esaustivo).

- [ ] **Step 5: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat(types): B2 — decisione_fatturazione, Pagamento, CreditoClienteMovimento, Fattura.importo_pagato"
```

---

## Task 4: Logica pura di calcolo saldo (`src/lib/contabilita/saldo.ts`)

**Files:**
- Create: `src/lib/contabilita/saldo.ts`
- Test: `tests/unit/contabilita-saldo.test.ts`

**Interfaces:**
- Produces: `calcolaResiduo(importoDovuto, pagamentiAttivi, applicazioniCredito)`, `calcolaStatoSaldo(importoDovuto, residuo)`, `calcolaEccedenza(importoPagamento, residuoPreEsistente)`, `calcolaCreditoDisponibile(movimenti)` — usate da Task 5, 7, 8, 9, 10, 11.
- Tipi esportati: `StatoSaldo`, `RigaImporto`, `MovimentoCreditoRiga`.

- [ ] **Step 1: Scrivi i test (falliranno — il modulo non esiste ancora)**

```typescript
// tests/unit/contabilita-saldo.test.ts
import { describe, it, expect } from 'vitest'
import {
  calcolaResiduo,
  calcolaStatoSaldo,
  calcolaEccedenza,
  calcolaCreditoDisponibile,
} from '@/lib/contabilita/saldo'

describe('calcolaResiduo — residuo = dovuto - pagamenti attivi - applicazioni credito', () => {
  it('nessun pagamento → residuo pari all\'intero dovuto', () => {
    expect(calcolaResiduo(100, [], [])).toBe(100)
  })

  it('pagamento parziale → residuo positivo', () => {
    expect(calcolaResiduo(100, [{ importo: 40 }], [])).toBe(60)
  })

  it('pagamento pieno → residuo zero', () => {
    expect(calcolaResiduo(100, [{ importo: 100 }], [])).toBe(0)
  })

  it('più pagamenti attivi si sommano', () => {
    expect(calcolaResiduo(100, [{ importo: 30 }, { importo: 30 }], [])).toBe(40)
  })

  it('applicazioni di credito riducono il residuo come i pagamenti', () => {
    expect(calcolaResiduo(100, [{ importo: 40 }], [{ importo: 20 }])).toBe(40)
  })

  it('eccedenza: pagamento superiore al dovuto → residuo negativo (l\'eccedenza si calcola altrove)', () => {
    expect(calcolaResiduo(100, [{ importo: 150 }], [])).toBe(-50)
  })

  it('arrotonda a 2 decimali per evitare drift float', () => {
    expect(calcolaResiduo(10.1, [{ importo: 3.33 }, { importo: 3.33 }, { importo: 3.34 }], [])).toBe(0.1)
  })
})

describe('calcolaStatoSaldo — classifica il residuo rispetto al dovuto', () => {
  it('residuo <= 0 → saldato', () => {
    expect(calcolaStatoSaldo(100, 0)).toBe('saldato')
    expect(calcolaStatoSaldo(100, -10)).toBe('saldato')
  })

  it('residuo pari all\'intero dovuto → insoluto (nessun pagamento ricevuto)', () => {
    expect(calcolaStatoSaldo(100, 100)).toBe('insoluto')
  })

  it('residuo tra 0 e il dovuto → parziale', () => {
    expect(calcolaStatoSaldo(100, 60)).toBe('parziale')
  })
})

describe('calcolaEccedenza — quanto un pagamento supera il residuo pre-esistente', () => {
  it('pagamento inferiore o pari al residuo → nessuna eccedenza', () => {
    expect(calcolaEccedenza(60, 60)).toBe(0)
    expect(calcolaEccedenza(40, 60)).toBe(0)
  })

  it('pagamento superiore al residuo → eccedenza pari alla differenza', () => {
    expect(calcolaEccedenza(80, 60)).toBe(20)
  })

  it('residuo pre-esistente già a zero (dovuto già saldato) → tutto il pagamento è eccedenza', () => {
    expect(calcolaEccedenza(50, 0)).toBe(50)
  })

  it('arrotonda a 2 decimali', () => {
    expect(calcolaEccedenza(10.333, 10)).toBe(0.33)
  })
})

describe('calcolaCreditoDisponibile — saldo = eccedenze - applicazioni - rimborsi', () => {
  it('nessun movimento → zero', () => {
    expect(calcolaCreditoDisponibile([])).toBe(0)
  })

  it('solo eccedenze → il loro totale', () => {
    expect(calcolaCreditoDisponibile([
      { tipo: 'eccedenza', importo: 30 },
      { tipo: 'eccedenza', importo: 20 },
    ])).toBe(50)
  })

  it('eccedenza parzialmente applicata → residuo disponibile', () => {
    expect(calcolaCreditoDisponibile([
      { tipo: 'eccedenza', importo: 50 },
      { tipo: 'applicazione', importo: 20 },
    ])).toBe(30)
  })

  it('eccedenza interamente rimborsata → zero', () => {
    expect(calcolaCreditoDisponibile([
      { tipo: 'eccedenza', importo: 50 },
      { tipo: 'rimborso', importo: 50 },
    ])).toBe(0)
  })
})
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `npx vitest run tests/unit/contabilita-saldo.test.ts`
Expected: FAIL — `Cannot find module '@/lib/contabilita/saldo'`

- [ ] **Step 3: Implementa il modulo**

```typescript
// src/lib/contabilita/saldo.ts

export type StatoSaldo = 'insoluto' | 'parziale' | 'saldato'

export interface RigaImporto {
  importo: number
}

export interface MovimentoCreditoRiga {
  tipo: 'eccedenza' | 'applicazione' | 'rimborso'
  importo: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Residuo = dovuto - pagamenti attivi - applicazioni di credito.
 * Le applicazioni di credito riducono il residuo esattamente come un
 * pagamento, ma NON generano una riga in `pagamenti` (evita il doppio
 * conteggio del contante — vedi spec B2 §"Punto critico").
 */
export function calcolaResiduo(
  importoDovuto: number,
  pagamentiAttivi: RigaImporto[],
  applicazioniCredito: RigaImporto[]
): number {
  const totalePagato = pagamentiAttivi.reduce((s, p) => s + p.importo, 0)
  const totaleApplicato = applicazioniCredito.reduce((s, a) => s + a.importo, 0)
  return round2(importoDovuto - totalePagato - totaleApplicato)
}

export function calcolaStatoSaldo(importoDovuto: number, residuo: number): StatoSaldo {
  if (residuo <= 0) return 'saldato'
  if (residuo < importoDovuto) return 'parziale'
  return 'insoluto'
}

/**
 * Quanto un pagamento supera il residuo che stava saldando — questa
 * eccedenza diventa credito cliente disponibile (spec B2 §4).
 */
export function calcolaEccedenza(importoPagamento: number, residuoPreEsistente: number): number {
  const eccedenza = importoPagamento - residuoPreEsistente
  return eccedenza > 0 ? round2(eccedenza) : 0
}

/** Saldo credito cliente = eccedenze - applicazioni - rimborsi. */
export function calcolaCreditoDisponibile(movimenti: MovimentoCreditoRiga[]): number {
  const somma = (tipo: MovimentoCreditoRiga['tipo']) =>
    movimenti.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.importo, 0)
  return round2(somma('eccedenza') - somma('applicazione') - somma('rimborso'))
}
```

- [ ] **Step 4: Esegui i test per verificare che passino**

Run: `npx vitest run tests/unit/contabilita-saldo.test.ts`
Expected: PASS — 18/18 test verdi

- [ ] **Step 5: Commit**

```bash
git add src/lib/contabilita/saldo.ts tests/unit/contabilita-saldo.test.ts
git commit -m "feat(contabilita): calcolo puro saldo/eccedenza/credito disponibile (B2)"
```

---

## Task 5: Logica pura del credito cliente unificato (`src/lib/contabilita/credito-cliente.ts`)

**Files:**
- Create: `src/lib/contabilita/credito-cliente.ts`
- Test: `tests/unit/contabilita-credito-cliente.test.ts`

**Interfaces:**
- Consumes: nessuna (puro aggregatore su righe già pre-calcolate).
- Produces: `calcolaCreditoCliente(input: CreditoClienteInput): CreditoClienteResult` — usata da Task 15 (`getContabilitaCliente`). Tipi esportati: `DovutoConfermato`, `CreditoClienteInput`, `CreditoClienteResult`.

- [ ] **Step 1: Scrivi i test (falliranno — il modulo non esiste ancora)**

```typescript
// tests/unit/contabilita-credito-cliente.test.ts
import { describe, it, expect } from 'vitest'
import { calcolaCreditoCliente, type CreditoClienteInput } from '@/lib/contabilita/credito-cliente'

function input(overrides: Partial<CreditoClienteInput> = {}): CreditoClienteInput {
  return {
    fattureNonSaldate: [],
    lavoriNonFatturareNonSaldati: [],
    lavoriFatturareNonInclusi: [],
    lavoriInAttesa: [],
    creditoDisponibile: 0,
    ...overrides,
  }
}

describe('calcolaCreditoCliente — 4 numeri distinti (spec B2 §5)', () => {
  it('nessun dovuto, nessun credito → tutti i bucket a zero', () => {
    const r = calcolaCreditoCliente(input())
    expect(r).toEqual({ confermato: 0, potenziale: 0, disponibile: 0, totale: 0 })
  })

  it('confermato somma fatture non saldate + lavori non_fatturare + lavori fatturare-non-inclusi', () => {
    const r = calcolaCreditoCliente(input({
      fattureNonSaldate: [{ residuo: 100 }],
      lavoriNonFatturareNonSaldati: [{ residuo: 50 }],
      lavoriFatturareNonInclusi: [{ residuo: 30 }],
    }))
    expect(r.confermato).toBe(180)
    expect(r.potenziale).toBe(0)
    expect(r.totale).toBe(180)
  })

  it('potenziale = solo lavori in_attesa, non entra nel confermato', () => {
    const r = calcolaCreditoCliente(input({ lavoriInAttesa: [{ residuo: 200 }] }))
    expect(r.confermato).toBe(0)
    expect(r.potenziale).toBe(200)
    expect(r.totale).toBe(200)
  })

  it('totale = confermato + potenziale', () => {
    const r = calcolaCreditoCliente(input({
      fattureNonSaldate: [{ residuo: 100 }],
      lavoriInAttesa: [{ residuo: 50 }],
    }))
    expect(r.totale).toBe(150)
  })

  it('disponibile è passato invariato (calcolato altrove da calcolaCreditoDisponibile)', () => {
    const r = calcolaCreditoCliente(input({ creditoDisponibile: 42.5 }))
    expect(r.disponibile).toBe(42.5)
  })

  it('regressione monotonicità (finding di review B2): il totale non deve MAI scendere durante ' +
     'la transizione in_attesa → fatturare (non incluso) → incluso_in_fattura=true', () => {
    // Stato 1: lavoro da 100 in_attesa
    const stato1 = calcolaCreditoCliente(input({ lavoriInAttesa: [{ residuo: 100 }] }))
    expect(stato1.totale).toBe(100)

    // Stato 2: titolare decide "fatturare", non ancora incluso in una fattura —
    // il lavoro esce da in_attesa ed entra nel terzo bucket "confermato"
    const stato2 = calcolaCreditoCliente(input({ lavoriFatturareNonInclusi: [{ residuo: 100 }] }))
    expect(stato2.totale).toBe(100)

    // Stato 3: il lavoro è stato incluso in una fattura — esce dal terzo bucket
    // ed entra nel primo (fattura non saldata), mai contato due volte
    const stato3 = calcolaCreditoCliente(input({ fattureNonSaldate: [{ residuo: 100 }] }))
    expect(stato3.totale).toBe(100)

    // In nessuno stato intermedio il totale è mai sceso a 0
    expect([stato1.totale, stato2.totale, stato3.totale].every((t) => t === 100)).toBe(true)
  })
})
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `npx vitest run tests/unit/contabilita-credito-cliente.test.ts`
Expected: FAIL — `Cannot find module '@/lib/contabilita/credito-cliente'`

- [ ] **Step 3: Implementa il modulo**

```typescript
// src/lib/contabilita/credito-cliente.ts

export interface DovutoConfermato {
  residuo: number
}

export interface CreditoClienteInput {
  /** Bucket 1a: fatture emesse non saldate (residuo = totale - importo_pagato). */
  fattureNonSaldate: DovutoConfermato[]
  /** Bucket 1b: lavori decisione_fatturazione='non_fatturare' non saldati sul ledger diretto. */
  lavoriNonFatturareNonSaldati: DovutoConfermato[]
  /**
   * Bucket 1c: lavori decisione_fatturazione='fatturare' con incluso_in_fattura=false —
   * deciso ma non ancora formalizzato in fattura. Appena incluso_in_fattura diventa
   * true il lavoro esce da qui ed entra in fattureNonSaldate (mai contato due volte).
   */
  lavoriFatturareNonInclusi: DovutoConfermato[]
  /** Bucket 2 (potenziale): lavori in_attesa di decisione — NON entra nello Scadenzario. */
  lavoriInAttesa: DovutoConfermato[]
  /** Saldo a favore del cliente, già calcolato da calcolaCreditoDisponibile. */
  creditoDisponibile: number
}

export interface CreditoClienteResult {
  confermato: number
  potenziale: number
  disponibile: number
  totale: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function sommaResidui(rows: DovutoConfermato[]): number {
  return rows.reduce((s, r) => s + r.residuo, 0)
}

/**
 * Aggrega i 4 numeri distinti richiesti dalla spec B2 §5 — mai fusi, per
 * non ricreare l'ambiguità originale di B2 (Dashboard vs Scadenzario).
 */
export function calcolaCreditoCliente(input: CreditoClienteInput): CreditoClienteResult {
  const confermato = round2(
    sommaResidui(input.fattureNonSaldate) +
      sommaResidui(input.lavoriNonFatturareNonSaldati) +
      sommaResidui(input.lavoriFatturareNonInclusi)
  )
  const potenziale = round2(sommaResidui(input.lavoriInAttesa))

  return {
    confermato,
    potenziale,
    disponibile: round2(input.creditoDisponibile),
    totale: round2(confermato + potenziale),
  }
}
```

- [ ] **Step 4: Esegui i test per verificare che passino**

Run: `npx vitest run tests/unit/contabilita-credito-cliente.test.ts`
Expected: PASS — 6/6 test verdi (incluso il test di non-regressione sulla monotonicità)

- [ ] **Step 5: Commit**

```bash
git add src/lib/contabilita/credito-cliente.ts tests/unit/contabilita-credito-cliente.test.ts
git commit -m "feat(contabilita): calcolaCreditoCliente — 4 bucket + regressione monotonicità (B2)"
```

---

## Task 6: Decisione fatturazione — validazione pura + route + lock sulla route generica

**Files:**
- Create: `src/lib/contabilita/decisione-fatturazione.ts`
- Test: `tests/unit/decisione-fatturazione.test.ts`
- Create: `src/app/api/lavori/[id]/decisione-fatturazione/route.ts`
- Modify: `src/app/api/lavori/[id]/route.ts:121-137` (aggiunta a `IMMUTABLE`)

**Interfaces:**
- Consumes: `DecisioneFatturazione` da `@/types/domain` (Task 3).
- Produces: `validaDecisioneFatturazione(decisione, stato, inclusoInFattura): EsitoValidazioneDecisione` — usata dalla route PATCH sotto.

- [ ] **Step 1: Scrivi i test (falliranno — il modulo non esiste ancora)**

```typescript
// tests/unit/decisione-fatturazione.test.ts
import { describe, it, expect } from 'vitest'
import { validaDecisioneFatturazione } from '@/lib/contabilita/decisione-fatturazione'

describe('validaDecisioneFatturazione — regole PATCH /api/lavori/[id]/decisione-fatturazione', () => {
  it('valore non tra i 3 ammessi → rifiutata', () => {
    const r = validaDecisioneFatturazione('boh', 'pronto', false)
    expect(r.ok).toBe(false)
    expect(r.errore).toMatch(/non valido/)
  })

  it('lavoro già incluso in fattura → immutabile, rifiutata anche con valore valido', () => {
    const r = validaDecisioneFatturazione('non_fatturare', 'consegnato', true)
    expect(r.ok).toBe(false)
    expect(r.errore).toMatch(/immutabile/i)
  })

  it('stato diverso da pronto/consegnato → rifiutata', () => {
    const r = validaDecisioneFatturazione('fatturare', 'in_lavorazione', false)
    expect(r.ok).toBe(false)
    expect(r.errore).toMatch(/pronto o consegnato/)
  })

  it('stato pronto, non incluso in fattura, valore valido → accettata', () => {
    expect(validaDecisioneFatturazione('fatturare', 'pronto', false).ok).toBe(true)
    expect(validaDecisioneFatturazione('non_fatturare', 'pronto', false).ok).toBe(true)
    expect(validaDecisioneFatturazione('in_attesa', 'consegnato', false).ok).toBe(true)
  })
})
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `npx vitest run tests/unit/decisione-fatturazione.test.ts`
Expected: FAIL — `Cannot find module '@/lib/contabilita/decisione-fatturazione'`

- [ ] **Step 3: Implementa il modulo di validazione**

```typescript
// src/lib/contabilita/decisione-fatturazione.ts

const DECISIONI_VALIDE = ['in_attesa', 'fatturare', 'non_fatturare'] as const

export interface EsitoValidazioneDecisione {
  ok: boolean
  errore?: string
}

/**
 * Regole PATCH /api/lavori/[id]/decisione-fatturazione (spec B2 §"Flusso operativo").
 * Immutabile una volta incluso_in_fattura=true, consentita solo su pronto/consegnato.
 */
export function validaDecisioneFatturazione(
  decisione: string,
  stato: string,
  inclusoInFattura: boolean
): EsitoValidazioneDecisione {
  if (!DECISIONI_VALIDE.includes(decisione as (typeof DECISIONI_VALIDE)[number])) {
    return { ok: false, errore: 'Campo `decisione` non valido' }
  }
  if (inclusoInFattura) {
    return { ok: false, errore: 'Decisione immutabile: lavoro già incluso in fattura' }
  }
  if (stato !== 'pronto' && stato !== 'consegnato') {
    return { ok: false, errore: 'Decisione fatturazione consentita solo su lavori pronto o consegnato' }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Esegui i test per verificare che passino**

Run: `npx vitest run tests/unit/decisione-fatturazione.test.ts`
Expected: PASS — 4/4 test verdi (7 assert totali)

- [ ] **Step 5: Crea la route API**

```typescript
// src/app/api/lavori/[id]/decisione-fatturazione/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { validaDecisioneFatturazione } from '@/lib/contabilita/decisione-fatturazione'

type RouteContext = { params: Promise<{ id: string }> }

// ─── PATCH /api/lavori/[id]/decisione-fatturazione ────────────────────────────
// Body: { decisione: 'in_attesa' | 'fatturare' | 'non_fatturare' }
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
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const decisione = typeof body.decisione === 'string' ? body.decisione : ''

  const { data: existing } = await svc
    .from('lavori')
    .select('stato, incluso_in_fattura')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  const validazione = validaDecisioneFatturazione(decisione, existing.stato, existing.incluso_in_fattura)
  if (!validazione.ok) {
    const status = validazione.errore?.match(/immutabile/i) ? 409 : 400
    return NextResponse.json({ error: validazione.errore }, { status })
  }

  const { data: lavoro, error } = await svc
    .from('lavori')
    .update({ decisione_fatturazione: decisione, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .select('id, decisione_fatturazione')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lavoro })
}
```

- [ ] **Step 6: Blocca `decisione_fatturazione` sulla route PATCH generica di `/api/lavori/[id]`**

In `src/app/api/lavori/[id]/route.ts`, nell'array `IMMUTABLE` (righe 121-137), aggiungi `'decisione_fatturazione'` subito dopo `'stato',` (riga 129):

```typescript
  const IMMUTABLE = [
    'id',
    'laboratorio_id',
    'numero_lavoro',
    'anno_lavoro',
    'created_at',
    'deleted_at',
    // State machine — modificati esclusivamente da orchestraConsegna
    'stato',
    'decisione_fatturazione', // modificabile solo via PATCH /api/lavori/[id]/decisione-fatturazione (B2)
    'conformato',
    'data_conformazione',
    'consegna_completata_at',
    'consegna_tap_at',
    'consegna_in_corso',
    'post_consegna_correzioni',
    'consegna_precheck_passato_al_primo_tentativo',
  ]
```

- [ ] **Step 7: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 8: Commit**

```bash
git add src/lib/contabilita/decisione-fatturazione.ts tests/unit/decisione-fatturazione.test.ts "src/app/api/lavori/[id]/decisione-fatturazione/route.ts" "src/app/api/lavori/[id]/route.ts"
git commit -m "feat(api): PATCH decisione-fatturazione + lock su route generica lavori/[id] (B2)"
```

---

## Task 7: `eseguiRegistrazionePagamento` (condivisa da POST e PATCH pagamenti) + `POST /api/pagamenti`

**Files:**
- Create: `src/lib/contabilita/registra-pagamento.ts`
- Test: `tests/unit/registra-pagamento.test.ts`
- Create: `src/app/api/pagamenti/route.ts`

**Interfaces:**
- Consumes: `calcolaResiduo`, `calcolaEccedenza` da `./saldo` (Task 4).
- Produces: `eseguiRegistrazionePagamento(supabase, input): Promise<RegistraPagamentoResult>` — usata anche da Task 8 (PATCH sostituzione). Tipi: `RegistraPagamentoInput`, `RegistraPagamentoResult`.

Segue il pattern B1 (`tracciaMaterialiLavoro(supabase, …)`): la funzione prende `supabase` come parametro e si testa con un fake che registra insert/filtri, senza introdurre `vi.mock`.

- [ ] **Step 1: Scrivi i test (falliranno — il modulo non esiste ancora)**

```typescript
// tests/unit/registra-pagamento.test.ts
import { describe, it, expect } from 'vitest'
import { eseguiRegistrazionePagamento, type RegistraPagamentoInput } from '@/lib/contabilita/registra-pagamento'

interface FakeData {
  fatture?: Record<string, { id: string; totale: number; cliente_id: string }>
  lavori?: Record<string, { id: string; prezzo_unitario: number; cliente_id: string }>
  pagamentiAttivi?: Array<{ importo: number }>
  applicazioni?: Array<{ importo: number }>
}

function createFakeSupabase(data: FakeData) {
  const inserted = {
    pagamenti: [] as Record<string, unknown>[],
    credito_clienti_movimenti: [] as Record<string, unknown>[],
  }

  const fake = {
    _inserted: inserted,
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const builder = {
        select() { return builder },
        eq(col: string, val: unknown) { filters[col] = val; return builder },
        is() { return builder },
        single() {
          if (table === 'fatture') {
            const row = data.fatture?.[filters.id as string]
            return Promise.resolve({ data: row ?? null, error: row ? null : { message: 'not found' } })
          }
          if (table === 'lavori') {
            const row = data.lavori?.[filters.id as string]
            return Promise.resolve({ data: row ?? null, error: row ? null : { message: 'not found' } })
          }
          if (table === 'pagamenti') {
            const last = inserted.pagamenti[inserted.pagamenti.length - 1]
            return Promise.resolve({ data: last ?? null, error: null })
          }
          return Promise.resolve({ data: null, error: { message: `single non gestito per ${table}` } })
        },
        insert(row: Record<string, unknown>) {
          if (table === 'pagamenti') {
            const withId = { id: `pag-${inserted.pagamenti.length + 1}`, ...row }
            inserted.pagamenti.push(withId)
            return builder
          }
          if (table === 'credito_clienti_movimenti') {
            inserted.credito_clienti_movimenti.push(row)
            return Promise.resolve({ data: row, error: null })
          }
          return Promise.resolve({ data: null, error: { message: `insert non gestito per ${table}` } })
        },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          if (table === 'pagamenti') {
            resolve({ data: data.pagamentiAttivi ?? [], error: null })
            return
          }
          if (table === 'credito_clienti_movimenti') {
            resolve({ data: data.applicazioni ?? [], error: null })
            return
          }
          resolve({ data: [], error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return fake
}

function baseInput(overrides: Partial<RegistraPagamentoInput> = {}): RegistraPagamentoInput {
  return {
    laboratorio_id: 'lab-1',
    fattura_id: null,
    lavoro_id: null,
    importo: 100,
    metodo: 'contanti',
    metodo_nota: null,
    data_pagamento: '2026-07-02',
    registrato_da: 'user-1',
    sostituisce_pagamento_id: null,
    ...overrides,
  }
}

describe('eseguiRegistrazionePagamento', () => {
  it('pagamento pieno su fattura senza pagamenti precedenti → nessuna eccedenza', async () => {
    const supabase = createFakeSupabase({
      fatture: { 'fatt-1': { id: 'fatt-1', totale: 100, cliente_id: 'cli-1' } },
    })

    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', importo: 100 }))

    expect(r.ok).toBe(true)
    expect(r.eccedenza).toBe(0)
    expect(supabase._inserted.pagamenti).toHaveLength(1)
    expect(supabase._inserted.pagamenti[0]).toMatchObject({ fattura_id: 'fatt-1', lavoro_id: null, importo: 100 })
    expect(supabase._inserted.credito_clienti_movimenti).toHaveLength(0)
  })

  it('pagamento che supera il residuo → genera automaticamente un movimento eccedenza collegato al pagamento', async () => {
    const supabase = createFakeSupabase({
      fatture: { 'fatt-1': { id: 'fatt-1', totale: 100, cliente_id: 'cli-1' } },
      pagamentiAttivi: [{ importo: 60 }], // residuo pre-esistente = 40
    })

    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', importo: 70 }))

    expect(r.ok).toBe(true)
    expect(r.eccedenza).toBe(30)
    expect(supabase._inserted.credito_clienti_movimenti).toHaveLength(1)
    expect(supabase._inserted.credito_clienti_movimenti[0]).toMatchObject({
      tipo: 'eccedenza',
      cliente_id: 'cli-1',
      importo: 30,
      pagamento_id: 'pag-1',
    })
  })

  it('pagamento su lavoro diretto usa prezzo_unitario come dovuto, non tocca fatture', async () => {
    const supabase = createFakeSupabase({
      lavori: { 'lav-1': { id: 'lav-1', prezzo_unitario: 50, cliente_id: 'cli-2' } },
    })

    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ lavoro_id: 'lav-1', importo: 50 }))

    expect(r.ok).toBe(true)
    expect(r.eccedenza).toBe(0)
    expect(supabase._inserted.pagamenti[0]).toMatchObject({ fattura_id: null, lavoro_id: 'lav-1', importo: 50 })
  })

  it('errore se non è specificato esattamente uno tra fattura_id e lavoro_id', async () => {
    const supabase = createFakeSupabase({})
    const nessuno = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: null, lavoro_id: null }))
    expect(nessuno.ok).toBe(false)
    expect(nessuno.errore).toMatch(/esattamente uno/)

    const entrambi = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', lavoro_id: 'lav-1' }))
    expect(entrambi.ok).toBe(false)
  })

  it('errore se importo non positivo', async () => {
    const supabase = createFakeSupabase({ fatture: { 'fatt-1': { id: 'fatt-1', totale: 100, cliente_id: 'cli-1' } } })
    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', importo: 0 }))
    expect(r.ok).toBe(false)
    expect(r.errore).toMatch(/positivo/)
  })

  it('fattura non trovata (cross-tenant o inesistente) → errore, nessun insert', async () => {
    const supabase = createFakeSupabase({ fatture: {} })
    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-inesistente' }))
    expect(r.ok).toBe(false)
    expect(r.errore).toBe('Fattura non trovata')
    expect(supabase._inserted.pagamenti).toHaveLength(0)
  })

  it('sostituisce_pagamento_id viene passato al nuovo pagamento quando presente', async () => {
    const supabase = createFakeSupabase({ fatture: { 'fatt-1': { id: 'fatt-1', totale: 100, cliente_id: 'cli-1' } } })
    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', importo: 100, sostituisce_pagamento_id: 'pag-vecchio' }))
    expect(r.ok).toBe(true)
    expect(supabase._inserted.pagamenti[0]).toMatchObject({ sostituisce_pagamento_id: 'pag-vecchio' })
  })
})
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `npx vitest run tests/unit/registra-pagamento.test.ts`
Expected: FAIL — `Cannot find module '@/lib/contabilita/registra-pagamento'`

- [ ] **Step 3: Implementa il modulo**

```typescript
// src/lib/contabilita/registra-pagamento.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { calcolaResiduo, calcolaEccedenza } from './saldo'

export interface RegistraPagamentoInput {
  laboratorio_id: string
  fattura_id: string | null
  lavoro_id: string | null
  importo: number
  metodo: string
  metodo_nota: string | null
  data_pagamento: string
  registrato_da: string
  sostituisce_pagamento_id?: string | null
}

export interface RegistraPagamentoResult {
  ok: boolean
  errore?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pagamento?: any
  eccedenza?: number
  /** Presente se il pagamento è stato registrato ma la riga di eccedenza NON è
   * stata scritta (le due insert non sono in una transazione — vedi Step 3
   * sotto) — richiede riconciliazione manuale, non silenziare. */
  avviso?: string
}

/**
 * Registra un pagamento (fattura XOR lavoro diretto) e genera automaticamente
 * un movimento 'eccedenza' se l'importo supera il residuo pre-esistente
 * (spec B2 §"Flusso operativo"). Condivisa da POST /api/pagamenti e dal
 * ramo "nuovo pagamento" di PATCH /api/pagamenti/[id] (modifica-come-sostituzione).
 */
export async function eseguiRegistrazionePagamento(
  supabase: SupabaseClient,
  input: RegistraPagamentoInput
): Promise<RegistraPagamentoResult> {
  const { laboratorio_id, fattura_id, lavoro_id, importo, metodo, metodo_nota, data_pagamento, registrato_da, sostituisce_pagamento_id } = input

  if ((fattura_id == null) === (lavoro_id == null)) {
    return { ok: false, errore: 'Specificare esattamente uno tra fattura_id e lavoro_id' }
  }
  if (!(importo > 0)) {
    return { ok: false, errore: 'Importo deve essere positivo' }
  }

  let importoDovuto: number
  let clienteId: string

  if (fattura_id) {
    const { data: fattura, error } = await supabase
      .from('fatture')
      .select('id, totale, cliente_id')
      .eq('id', fattura_id)
      .eq('laboratorio_id', laboratorio_id)
      .is('deleted_at', null)
      .single()
    if (error || !fattura) return { ok: false, errore: 'Fattura non trovata' }
    importoDovuto = Number((fattura as { totale: number }).totale)
    clienteId = (fattura as { cliente_id: string }).cliente_id
  } else {
    const { data: lavoro, error } = await supabase
      .from('lavori')
      .select('id, prezzo_unitario, cliente_id')
      .eq('id', lavoro_id as string)
      .eq('laboratorio_id', laboratorio_id)
      .is('deleted_at', null)
      .single()
    if (error || !lavoro) return { ok: false, errore: 'Lavoro non trovato' }
    importoDovuto = Number((lavoro as { prezzo_unitario: number | null }).prezzo_unitario ?? 0)
    clienteId = (lavoro as { cliente_id: string }).cliente_id
  }

  const filtroCol = fattura_id ? 'fattura_id' : 'lavoro_id'
  const filtroVal = (fattura_id ?? lavoro_id) as string

  const { data: pagamentiAttiviRaw } = await supabase
    .from('pagamenti')
    .select('importo')
    .eq(filtroCol, filtroVal)
    .eq('stato', 'attivo')

  const { data: applicazioniRaw } = await supabase
    .from('credito_clienti_movimenti')
    .select('importo')
    .eq(filtroCol, filtroVal)
    .eq('tipo', 'applicazione')

  const pagamentiAttivi = (pagamentiAttiviRaw ?? []) as Array<{ importo: number }>
  const applicazioni = (applicazioniRaw ?? []) as Array<{ importo: number }>

  // Clamp a 0: se il target è già in overpayment (residuo negativo da un
  // pagamento precedente, la cui eccedenza è già stata estratta come riga
  // separata in credito_clienti_movimenti), un nuovo pagamento su questo
  // stesso target NON deve "riassorbire" quel negativo — altrimenti l'intero
  // importo precedente verrebbe ricontato come eccedenza una seconda volta
  // (finding di review su Task 4: calcolaEccedenza assume residuoPreEsistente >= 0).
  const residuoPreEsistente = Math.max(0, calcolaResiduo(importoDovuto, pagamentiAttivi, applicazioni))
  const eccedenza = calcolaEccedenza(importo, residuoPreEsistente)

  const { data: pagamento, error: insErr } = await supabase
    .from('pagamenti')
    .insert({
      laboratorio_id,
      fattura_id,
      lavoro_id,
      importo,
      metodo,
      metodo_nota,
      data_pagamento,
      registrato_da,
      sostituisce_pagamento_id: sostituisce_pagamento_id ?? null,
    })
    .select()
    .single()

  if (insErr || !pagamento) {
    return { ok: false, errore: insErr?.message ?? 'Errore inserimento pagamento' }
  }

  if (eccedenza > 0) {
    // Non è una transazione con l'insert sopra: se questa fallisce, il
    // pagamento resta comunque registrato (è la fonte di verità del denaro
    // incassato) ma l'eccedenza andrebbe persa silenziosamente. Fix (review
    // Task 7): controlla l'errore e restituiscilo come avviso esplicito,
    // MAI ok:false — il pagamento è comunque riuscito.
    const { error: eccErr } = await supabase.from('credito_clienti_movimenti').insert({
      laboratorio_id,
      cliente_id: clienteId,
      tipo: 'eccedenza',
      pagamento_id: (pagamento as { id: string }).id,
      importo: eccedenza,
      registrato_da,
    })

    if (eccErr) {
      return {
        ok: true,
        pagamento,
        eccedenza,
        avviso: `Pagamento registrato ma la registrazione del credito di ${eccedenza} è fallita (${eccErr.message}) — richiede riconciliazione manuale.`,
      }
    }
  }

  return { ok: true, pagamento, eccedenza }
}
```

- [ ] **Step 4: Esegui i test per verificare che passino**

Run: `npx vitest run tests/unit/registra-pagamento.test.ts`
Expected: PASS — 7/7 test verdi

- [ ] **Step 5: Crea `POST /api/pagamenti`**

```typescript
// src/app/api/pagamenti/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { eseguiRegistrazionePagamento } from '@/lib/contabilita/registra-pagamento'

const METODI_VALIDI = ['contanti', 'bonifico', 'pos', 'assegno', 'altro']

// ─── POST /api/pagamenti ───────────────────────────────────────────────────
// Body: { fattura_id? | lavoro_id?, importo, metodo, metodo_nota?, data_pagamento }
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const fattura_id = typeof body.fattura_id === 'string' ? body.fattura_id : null
  const lavoro_id = typeof body.lavoro_id === 'string' ? body.lavoro_id : null
  const importo = typeof body.importo === 'number' ? body.importo : NaN
  const metodo = typeof body.metodo === 'string' ? body.metodo : ''
  const metodo_nota = typeof body.metodo_nota === 'string' ? body.metodo_nota : null
  const data_pagamento = typeof body.data_pagamento === 'string' ? body.data_pagamento : ''

  if (!METODI_VALIDI.includes(metodo)) {
    return NextResponse.json({ error: 'Campo `metodo` non valido' }, { status: 400 })
  }
  if (!data_pagamento) {
    return NextResponse.json({ error: 'Campo `data_pagamento` richiesto' }, { status: 400 })
  }

  const risultato = await eseguiRegistrazionePagamento(svc, {
    laboratorio_id: utente.laboratorio_id,
    fattura_id,
    lavoro_id,
    importo,
    metodo,
    metodo_nota,
    data_pagamento,
    registrato_da: user.id,
  })

  if (!risultato.ok) {
    const status = risultato.errore?.match(/non trovat[ao]/) ? 404 : 400
    return NextResponse.json({ error: risultato.errore }, { status })
  }

  return NextResponse.json({ pagamento: risultato.pagamento, eccedenza: risultato.eccedenza, avviso: risultato.avviso })
}
```

- [ ] **Step 6: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 7: Commit**

```bash
git add src/lib/contabilita/registra-pagamento.ts tests/unit/registra-pagamento.test.ts src/app/api/pagamenti/route.ts
git commit -m "feat(api): POST /api/pagamenti — eseguiRegistrazionePagamento con eccedenza automatica (B2)"
```

---

## Task 8: `PATCH`/`DELETE /api/pagamenti/[id]` — modifica-come-sostituzione + soft-cancel

**Files:**
- Create: `src/app/api/pagamenti/[id]/route.ts`

**Interfaces:**
- Consumes: `eseguiRegistrazionePagamento` da `@/lib/contabilita/registra-pagamento` (Task 7).

Nota sui test: questa route è wiring HTTP sottile sopra `eseguiRegistrazionePagamento` (già coperta da test unitari in Task 7) e un claim atomico via filtro `.eq('stato','attivo')` — stesso idioma già usato in `fatture/batch/route.ts:76-85`. Coerente con il resto del repo (zero route testate via mock Supabase in Vitest), il path 409 si verifica manualmente nella checklist finale (Task 16).

- [ ] **Step 1: Implementa la route**

```typescript
// src/app/api/pagamenti/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { eseguiRegistrazionePagamento } from '@/lib/contabilita/registra-pagamento'

const METODI_VALIDI = ['contanti', 'bonifico', 'pos', 'assegno', 'altro']

type RouteContext = { params: Promise<{ id: string }> }

// ─── PATCH /api/pagamenti/[id] ─────────────────────────────────────────────
// Modifica-come-sostituzione: annulla il pagamento esistente e ne crea uno
// nuovo con sostituisce_pagamento_id. Body: { importo, metodo, metodo_nota?, data_pagamento }
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
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const importo = typeof body.importo === 'number' ? body.importo : NaN
  const metodo = typeof body.metodo === 'string' ? body.metodo : ''
  const metodo_nota = typeof body.metodo_nota === 'string' ? body.metodo_nota : null
  const data_pagamento = typeof body.data_pagamento === 'string' ? body.data_pagamento : ''

  if (!METODI_VALIDI.includes(metodo)) {
    return NextResponse.json({ error: 'Campo `metodo` non valido' }, { status: 400 })
  }
  if (!data_pagamento) {
    return NextResponse.json({ error: 'Campo `data_pagamento` richiesto' }, { status: 400 })
  }

  // Il pagamento deve esistere nel laboratorio dell'utente (404 se non esiste affatto)
  const { data: esistente } = await svc
    .from('pagamenti')
    .select('id, fattura_id, lavoro_id, stato')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()

  if (!esistente) {
    return NextResponse.json({ error: 'Pagamento non trovato' }, { status: 404 })
  }

  // Claim atomico: annulla solo se ancora attivo — previene la race con una
  // seconda richiesta concorrente sullo stesso pagamento (spec B2 §"Edge case")
  const { data: claimed } = await svc
    .from('pagamenti')
    .update({
      stato: 'annullato',
      motivo_annullamento: 'Sostituito da modifica',
      annullato_da: user.id,
      annullato_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .eq('stato', 'attivo')
    .select('id')
    .single()

  if (!claimed) {
    return NextResponse.json({ error: 'Il pagamento non è più attivo — ricarica e riprova' }, { status: 409 })
  }

  const risultato = await eseguiRegistrazionePagamento(svc, {
    laboratorio_id: utente.laboratorio_id,
    fattura_id: esistente.fattura_id,
    lavoro_id: esistente.lavoro_id,
    importo,
    metodo,
    metodo_nota,
    data_pagamento,
    registrato_da: user.id,
    sostituisce_pagamento_id: id,
  })

  if (!risultato.ok) {
    // Rollback del claim: il vecchio pagamento torna attivo per permettere un retry
    await svc
      .from('pagamenti')
      .update({ stato: 'attivo', motivo_annullamento: null, annullato_da: null, annullato_at: null })
      .eq('id', id)
      .eq('laboratorio_id', utente.laboratorio_id)

    return NextResponse.json({ error: risultato.errore }, { status: 400 })
  }

  return NextResponse.json({ pagamento: risultato.pagamento, eccedenza: risultato.eccedenza, avviso: risultato.avviso })
}

// ─── DELETE /api/pagamenti/[id] ─────────────────────────────────────────────
// Soft-cancel: richiede motivo_annullamento. Body: { motivo_annullamento }
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
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const motivo_annullamento = typeof body.motivo_annullamento === 'string' ? body.motivo_annullamento.trim() : ''
  if (!motivo_annullamento) {
    return NextResponse.json({ error: 'Campo `motivo_annullamento` richiesto' }, { status: 400 })
  }

  const { data: esistente } = await svc
    .from('pagamenti')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()

  if (!esistente) {
    return NextResponse.json({ error: 'Pagamento non trovato' }, { status: 404 })
  }

  // Solo `data` distrutto (non `error`): TypeScript 5.x fa control-flow
  // narrowing sull'union discriminata restituita da `.single()` — dopo
  // `if (!claimed) return`, un successivo `if (error)` risulterebbe su tipo
  // `never` (codice provatamente irraggiungibile anche a runtime, dato che
  // PostgREST garantisce data non-null se e solo se error è null). Finding
  // emerso durante l'esecuzione di questo task — vedi anche PATCH sopra,
  // che già distrugge solo `data: claimed` per lo stesso motivo.
  const { data: claimed } = await svc
    .from('pagamenti')
    .update({
      stato: 'annullato',
      motivo_annullamento,
      annullato_da: user.id,
      annullato_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .eq('stato', 'attivo')
    .select('id')
    .single()

  if (!claimed) {
    return NextResponse.json({ error: 'Il pagamento non è più attivo' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pagamenti/\[id\]/route.ts
git commit -m "feat(api): PATCH/DELETE /api/pagamenti/[id] — sostituzione + soft-cancel (B2)"
```

---

## Task 9: Fix B2 — query unificata "credito scaduto per cliente" + `fetchMovimentiCreditoValidi` + rewiring `dashboard/queries.ts`

**Files:**
- Create: `src/lib/contabilita/queries.ts`
- Test: `tests/unit/contabilita-queries.test.ts`
- Modify: `src/lib/dashboard/queries.ts:231-273` (`getPagamentiScadutiTop`)
- Modify: `src/lib/dashboard/queries.ts:612-654` (dentro `getFrontDeskDashboard`)
- Create: `supabase/migrations/20260702020000_b2_drop_lavori_partitario.sql` (Step 7 — drop finale, dopo aver rimosso qui gli ultimi 2 consumer applicativi)

**Interfaces:**
- Consumes: `calcolaResiduo` da `@/lib/contabilita/saldo` (Task 4).
- Produces: `getCreditoScadutoPerCliente(svc, labId, giorniSoglia?): Promise<CreditoScadutoPerCliente[]>` — usata da entrambe le funzioni di `dashboard/queries.ts` sotto, garantendo che Dashboard Titolare, `admin/labs/[id]/live` e widget Front Desk mostrino lo stesso numero (regressione B2, verificata in Task 16). Produces anche `fetchMovimentiCreditoValidi(svc, labId, clienteId): Promise<Array<{tipo, importo}>>` — usata da Task 10 (applica/rimborsa) e Task 15 (`getContabilitaCliente`), evitando di duplicare in 3 punti la stessa logica anti-credito-fantasma (decisione presa in review pre-esecuzione, vedi nota sotto).

Questa funzione sostituisce la lettura di `lavori_partitario` (bonificata parzialmente in Task 1, con gli ultimi 2 punti rimasti qui — vedi Step 6 e nota pre-Task-2) unificando fatture non pagate + lavori diretti (`fatturare`/`non_fatturare`, non ancora inclusi in fattura) scaduti da oltre `giorniSoglia` giorni.

**Nota (adjudicata in review pre-esecuzione, dopo il reviewer di Task 1):** il reviewer di Task 1 ha trovato che `src/lib/dashboard/queries.ts:243,258,260,615,636,638` (`getPagamentiScadutiTop`, `getFrontDeskDashboard`) referenziano ancora `lavori_partitario` con il pattern `lavori_partitario(importo)` — diverso dall'alias `partitario:lavori_partitario(*)` bonificato in Task 1, quindi invisibile al grep usato in quel task. Questo task li riscrive comunque per intero (Step 5/6 sotto), quindi il gap si chiude qui. Il `DROP TABLE lavori_partitario` è stato spostato dal Task 2 a questo task (Step 7, dopo Step 6) — vedi Global Constraints aggiornate.

**Decisione di design (emersa in review pre-esecuzione): credito "fantasma" su annullamento pagamento.** Task 7 genera un movimento `eccedenza` collegato a un pagamento specifico (`pagamento_id`). Task 8 (PATCH/DELETE `/api/pagamenti/[id]`) annulla un pagamento (sostituzione o soft-cancel) senza mai toccare `credito_clienti_movimenti` — se il credito disponibile continuasse a contare quell'eccedenza, annullare un pagamento da 120€ su un dovuto da 100€ lascerebbe 20€ di credito "fantasma" mai realmente incassato. Fix: `fetchMovimentiCreditoValidi` fa il join `credito_clienti_movimenti → pagamenti` e scarta le righe `eccedenza` il cui pagamento sorgente non è più `attivo` — l'eccedenza "sparisce" automaticamente quando il pagamento che l'ha generata viene annullato, senza bisogno di mutare `credito_clienti_movimenti` (che resta uno storico immutabile, coerente col resto dello schema). **Limite noto, accettato per questo sotto-progetto:** se quell'eccedenza è già stata *applicata* altrove prima dell'annullamento del pagamento sorgente, il credito disponibile calcolato può risultare negativo (segnala un'incoerenza reale da riconciliare manualmente — non gestita automaticamente qui, correttamente riflette un doppio impiego di credito che non dovrebbe accadere nel flusso normale titolare/front-desk).

- [ ] **Step 1: Scrivi i test (falliranno — il modulo non esiste ancora)**

```typescript
// tests/unit/contabilita-queries.test.ts
import { describe, it, expect } from 'vitest'
import { getCreditoScadutoPerCliente, fetchMovimentiCreditoValidi } from '@/lib/contabilita/queries'

function createFakeSupabase(data: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fatture?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lavori?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movimenti?: any[]
}) {
  const fake = {
    from(table: string) {
      const builder = {
        select() { return builder },
        eq() { return builder },
        neq() { return builder },
        is() { return builder },
        not() { return builder },
        in() { return builder },
        lt() { return builder },
        gt() { return builder },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          if (table === 'fatture') { resolve({ data: data.fatture ?? [], error: null }); return }
          if (table === 'lavori') { resolve({ data: data.lavori ?? [], error: null }); return }
          if (table === 'credito_clienti_movimenti') { resolve({ data: data.movimenti ?? [], error: null }); return }
          resolve({ data: [], error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return fake
}

const CLIENTE_1 = { id: 'cli-1', nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi', telefono: '333' }
const DATA_LONTANA = '2020-01-01' // sempre > 30gg fa

describe('getCreditoScadutoPerCliente — unifica fatture + lavori diretti scaduti per cliente', () => {
  it('fattura non pagata scaduta con residuo positivo → inclusa', async () => {
    const supabase = createFakeSupabase({
      fatture: [{ id: 'f1', totale: 100, importo_pagato: 40, data: DATA_LONTANA, clienti: CLIENTE_1 }],
      lavori: [],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ cliente_id: 'cli-1', residuo_totale: 60, lavori_count: 1 })
  })

  it('fattura con importo_pagato pari al totale (residuo zero) → esclusa', async () => {
    const supabase = createFakeSupabase({
      fatture: [{ id: 'f1', totale: 100, importo_pagato: 100, data: DATA_LONTANA, clienti: CLIENTE_1 }],
      lavori: [],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(0)
  })

  it('lavoro diretto scaduto con pagamento parziale → residuo netto incluso', async () => {
    const supabase = createFakeSupabase({
      fatture: [],
      lavori: [{
        id: 'l1',
        prezzo_unitario: 80,
        data_consegna_prevista: DATA_LONTANA,
        clienti: CLIENTE_1,
        pagamenti: [{ importo: 30, stato: 'attivo' }, { importo: 20, stato: 'annullato' }],
        credito_clienti_movimenti: [],
      }],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(1)
    // il pagamento annullato (stato != 'attivo') non riduce il residuo
    expect(r[0].residuo_totale).toBe(50)
    expect(r[0].giorni_scaduto).toBeGreaterThan(30)
  })

  it('fattura e lavoro diretto dello stesso cliente si sommano in una riga sola', async () => {
    const supabase = createFakeSupabase({
      fatture: [{ id: 'f1', totale: 100, importo_pagato: 0, data: DATA_LONTANA, clienti: CLIENTE_1 }],
      lavori: [{
        id: 'l1', prezzo_unitario: 50, data_consegna_prevista: DATA_LONTANA,
        clienti: CLIENTE_1, pagamenti: [], credito_clienti_movimenti: [],
      }],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(1)
    expect(r[0].residuo_totale).toBe(150)
    expect(r[0].lavori_count).toBe(2)
  })

  it('ordina per residuo_totale decrescente', async () => {
    const CLIENTE_2 = { id: 'cli-2', nome: 'Luca', cognome: 'Bianchi', studio_nome: null, telefono: null }
    const supabase = createFakeSupabase({
      fatture: [
        { id: 'f1', totale: 30, importo_pagato: 0, data: DATA_LONTANA, clienti: CLIENTE_1 },
        { id: 'f2', totale: 200, importo_pagato: 0, data: DATA_LONTANA, clienti: CLIENTE_2 },
      ],
      lavori: [],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r.map((x) => x.cliente_id)).toEqual(['cli-2', 'cli-1'])
  })
})

describe('fetchMovimentiCreditoValidi — scarta eccedenze il cui pagamento sorgente non è più attivo', () => {
  it('eccedenza con pagamento ancora attivo → inclusa', async () => {
    const supabase = createFakeSupabase({
      movimenti: [{ tipo: 'eccedenza', importo: 30, pagamento_id: 'p1', pagamenti: { stato: 'attivo' } }],
    })
    const r = await fetchMovimentiCreditoValidi(supabase, 'lab-1', 'cli-1')
    expect(r).toEqual([{ tipo: 'eccedenza', importo: 30 }])
  })

  it('eccedenza il cui pagamento è stato annullato → esclusa (anti-credito-fantasma)', async () => {
    const supabase = createFakeSupabase({
      movimenti: [{ tipo: 'eccedenza', importo: 30, pagamento_id: 'p1', pagamenti: { stato: 'annullato' } }],
    })
    const r = await fetchMovimentiCreditoValidi(supabase, 'lab-1', 'cli-1')
    expect(r).toEqual([])
  })

  it('applicazione e rimborso sono sempre inclusi (non dipendono da un pagamento)', async () => {
    const supabase = createFakeSupabase({
      movimenti: [
        { tipo: 'applicazione', importo: 10, pagamento_id: null, pagamenti: null },
        { tipo: 'rimborso', importo: 5, pagamento_id: null, pagamenti: null },
      ],
    })
    const r = await fetchMovimentiCreditoValidi(supabase, 'lab-1', 'cli-1')
    expect(r).toEqual([{ tipo: 'applicazione', importo: 10 }, { tipo: 'rimborso', importo: 5 }])
  })
})
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `npx vitest run tests/unit/contabilita-queries.test.ts`
Expected: FAIL — `Cannot find module '@/lib/contabilita/queries'`

- [ ] **Step 3: Implementa il modulo**

```typescript
// src/lib/contabilita/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { calcolaResiduo } from './saldo'

export interface CreditoScadutoPerCliente {
  cliente_id: string
  cliente_display: string
  cliente_telefono: string | null
  residuo_totale: number
  giorni_scaduto: number
  lavori_count: number
}

interface ClienteSnap {
  id: string
  nome: string
  cognome: string
  studio_nome: string | null
  telefono: string | null
}

function clienteDisplay(c: ClienteSnap): string {
  return c.studio_nome ?? `${c.nome} ${c.cognome}`
}

function accumula(
  map: Map<string, CreditoScadutoPerCliente>,
  cliente: ClienteSnap,
  residuo: number,
  dataRiferimento: string
): void {
  const giorni = Math.floor((Date.now() - new Date(dataRiferimento).getTime()) / 86_400_000)
  const existing = map.get(cliente.id)
  map.set(cliente.id, {
    cliente_id: cliente.id,
    cliente_display: clienteDisplay(cliente),
    cliente_telefono: cliente.telefono,
    residuo_totale: Math.round(((existing?.residuo_totale ?? 0) + residuo) * 100) / 100,
    giorni_scaduto: Math.max(existing?.giorni_scaduto ?? 0, giorni),
    lavori_count: (existing?.lavori_count ?? 0) + 1,
  })
}

/**
 * Unifica fatture non pagate + lavori diretti (fatturare/non_fatturare, non
 * ancora inclusi in fattura) scaduti da oltre `giorniSoglia` giorni, per
 * cliente. Sostituisce la lettura di `lavori_partitario` (0 righe, mai
 * scritta) in Dashboard Titolare, admin/labs/[id]/live e widget Front Desk —
 * garantendo lo stesso numero su tutte e tre le superfici (regressione B2).
 */
export async function getCreditoScadutoPerCliente(
  svc: SupabaseClient,
  labId: string,
  giorniSoglia = 30
): Promise<CreditoScadutoPerCliente[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - giorniSoglia)
  const cutoffISO = cutoff.toISOString().split('T')[0]

  const map = new Map<string, CreditoScadutoPerCliente>()

  const { data: fattureData } = await svc
    .from('fatture')
    .select('id, totale, importo_pagato, data, clienti!inner(id, nome, cognome, studio_nome, telefono)')
    .eq('laboratorio_id', labId)
    .eq('pagata', false)
    .neq('stato_sdi', 'draft')
    .is('deleted_at', null)
    .lt('data', cutoffISO)

  for (const f of (fattureData ?? []) as unknown as Array<{
    id: string; totale: number; importo_pagato: number; data: string; clienti: ClienteSnap
  }>) {
    const residuo = Math.round((Number(f.totale) - Number(f.importo_pagato ?? 0)) * 100) / 100
    if (residuo <= 0) continue
    accumula(map, f.clienti, residuo, f.data)
  }

  const { data: lavoriData } = await svc
    .from('lavori')
    .select(`
      id, prezzo_unitario, data_consegna_prevista,
      clienti:clienti!inner(id, nome, cognome, studio_nome, telefono),
      pagamenti(importo, stato),
      credito_clienti_movimenti(importo, tipo)
    `)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .not('stato', 'in', '("annullato")')
    .eq('incluso_in_fattura', false)
    .in('decisione_fatturazione', ['non_fatturare', 'fatturare'])
    .lt('data_consegna_prevista', cutoffISO)
    .gt('prezzo_unitario', 0)

  for (const l of (lavoriData ?? []) as unknown as Array<{
    id: string; prezzo_unitario: number | null; data_consegna_prevista: string
    clienti: ClienteSnap
    pagamenti: Array<{ importo: number; stato: string }>
    credito_clienti_movimenti: Array<{ importo: number; tipo: string }>
  }>) {
    const pagamentiAttivi = (l.pagamenti ?? []).filter((p) => p.stato === 'attivo')
    const applicazioni = (l.credito_clienti_movimenti ?? []).filter((m) => m.tipo === 'applicazione')
    const residuo = calcolaResiduo(Number(l.prezzo_unitario ?? 0), pagamentiAttivi, applicazioni)
    if (residuo <= 0) continue
    accumula(map, l.clienti, residuo, l.data_consegna_prevista)
  }

  return [...map.values()].sort((a, b) => b.residuo_totale - a.residuo_totale)
}

/**
 * Restituisce i movimenti di credito di un cliente al netto delle eccedenze
 * "fantasma" — quelle il cui pagamento sorgente è stato annullato/sostituito
 * (Task 8 non tocca mai credito_clienti_movimenti: la correzione vive qui,
 * lato lettura, unica fonte usata da Task 10 e Task 15 per calcolaCreditoDisponibile).
 */
export async function fetchMovimentiCreditoValidi(
  svc: SupabaseClient,
  labId: string,
  clienteId: string
): Promise<Array<{ tipo: 'eccedenza' | 'applicazione' | 'rimborso'; importo: number }>> {
  const { data: movimentiRaw } = await svc
    .from('credito_clienti_movimenti')
    .select('tipo, importo, pagamento_id, pagamenti(stato)')
    .eq('cliente_id', clienteId)
    .eq('laboratorio_id', labId)

  return ((movimentiRaw ?? []) as unknown as Array<{
    tipo: 'eccedenza' | 'applicazione' | 'rimborso'; importo: number
    pagamento_id: string | null; pagamenti: { stato: string } | null
  }>)
    .filter((m) => m.tipo !== 'eccedenza' || m.pagamenti?.stato === 'attivo')
    .map((m) => ({ tipo: m.tipo, importo: m.importo }))
}
```

- [ ] **Step 4: Esegui i test per verificare che passino**

Run: `npx vitest run tests/unit/contabilita-queries.test.ts`
Expected: PASS — 8/8 test verdi

- [ ] **Step 5: Rewiring `getPagamentiScadutiTop` (`src/lib/dashboard/queries.ts:231-273`)**

Sostituisci l'intera funzione con:

```typescript
export async function getPagamentiScadutiTop(
  svc: SupabaseClient,
  labId: string,
  limit = 3
): Promise<Array<{ cliente_id: string; cliente_display: string; residuo: number; telefono: string | null; giorni_ritardo: number }>> {
  const { getCreditoScadutoPerCliente } = await import('@/lib/contabilita/queries')
  const rows = await getCreditoScadutoPerCliente(svc, labId, 30)
  return rows.slice(0, limit).map((r) => ({
    cliente_id: r.cliente_id,
    cliente_display: r.cliente_display,
    residuo: r.residuo_totale,
    telefono: r.cliente_telefono,
    giorni_ritardo: r.giorni_scaduto,
  }))
}
```

Nota: questo popola anche `telefono`/`giorni_ritardo` sul tipo `PagamentoTop` consumato da `DashboardTitolare.tsx` (`CreditiSection`, righe 61-67) — prima erano sempre `undefined` perché la vecchia funzione non li calcolava. Nessuna modifica richiesta lato componente: i campi erano già opzionali nel tipo.

- [ ] **Step 6: Rewiring del widget Front Desk dentro `getFrontDeskDashboard` (`src/lib/dashboard/queries.ts:612-654`)**

Nella stessa funzione `getFrontDeskDashboard` (righe 570-664), sostituisci la quarta query del `Promise.all` (righe 612-621, quella su `insolutoData`) e il blocco `pagMap`/`for` che la elabora (righe 624-654) con:

```typescript
  const [{ data: consegneData }, { data: rititiData }, { data: provaData }] =
    await Promise.all([
      svc
        .from('lavori')
        .select(selectCampi)
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .eq('data_consegna_prevista', oggi)
        .not('stato', 'in', '("consegnato","annullato")')
        .order('ora_consegna', { ascending: true, nullsFirst: false })
        .limit(30),

      svc
        .from('lavori')
        .select(selectCampi)
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .eq('data_ingresso', oggi)
        .order('created_at', { ascending: true })
        .limit(20),

      svc
        .from('lavori')
        .select(selectCampi)
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .eq('stato', 'in_prova')
        .lte('data_prima_prova', oggi)
        .order('data_prima_prova', { ascending: true })
        .limit(10),
    ])

  const { getCreditoScadutoPerCliente } = await import('@/lib/contabilita/queries')
  const daContattare = await getCreditoScadutoPerCliente(svc, labId, 30)

  return {
    consegne_oggi: mapFrontDeskConsegneRows(consegneData as RawFrontDeskRow[] | null),
    ritiri_attesi_oggi: mapFrontDeskConsegneRows(rititiData as RawFrontDeskRow[] | null),
    in_prova_rientro_oggi: mapFrontDeskConsegneRows(provaData as RawFrontDeskRow[] | null),
    da_contattare: daContattare.slice(0, 5),
  }
}
```

Il tipo `CreditoScadutoPerCliente` restituito da `getCreditoScadutoPerCliente` ha esattamente gli stessi nomi di campo di `FrontDeskPagamentoScaduto` (`cliente_id`, `cliente_display`, `cliente_telefono`, `residuo_totale`, `giorni_scaduto`, `lavori_count`) — nessuna trasformazione necessaria, `.slice(0, 5)` è assegnabile direttamente.

Rimuovi anche la variabile `cutoff30`/`cutoff30ISO` (righe 575-577) se non più usata altrove nella funzione — verifica con `grep -n "cutoff30" src/lib/dashboard/queries.ts` dopo la modifica.

- [ ] **Step 7: Migration — drop finale di `lavori_partitario` (ultimo consumer applicativo appena rimosso sopra)**

**Adjudicata in review pre-esecuzione (dopo che il reviewer di Task 1 ha trovato che `dashboard/queries.ts` referenziava ancora la tabella con un pattern — `lavori_partitario(importo)`, senza l'alias `partitario:` — diverso dalle 8 select bonificate in Task 1, quindi invisibile al grep usato in quel task).** Questo è ora l'ultimo punto applicativo rimasto: dopo lo Step 6 sopra, `lavori_partitario` non è più letta da nessun file sotto `src/`. Sicuro droppare.

Create: `supabase/migrations/20260702020000_b2_drop_lavori_partitario.sql`

```sql
-- ============================================================
-- B2 — Dismissione finale lavori_partitario (0 righe, nessun writer).
-- Sicura solo ora: Task 1 ha rimosso le 8 select con join
-- `partitario:lavori_partitario(*)`; lo Step 6 di questo task ha appena
-- riscritto gli ultimi 2 punti applicativi (getPagamentiScadutiTop,
-- getFrontDeskDashboard) che referenziavano la tabella con il pattern
-- `lavori_partitario(importo)`, invisibile al grep usato in Task 1.
-- ============================================================
DROP TABLE IF EXISTS lavori_partitario CASCADE;
```

Prima di applicare, verifica che non resti nessun riferimento residuo:

Run: `grep -rn "lavori_partitario" src/`
Expected: nessun risultato (0 righe)

Applica poi la migration al progetto Supabase `iagibumwjstnveqpjbwq` con lo stesso processo del Task 2 Step 2.

- [ ] **Step 8: Verifica compilazione e suite completa**

Run: `npx tsc --noEmit`
Expected: 0 errori

Run: `npx vitest run`
Expected: tutti i test verdi, inclusi quelli nuovi di Task 4/5/6/7/9

- [ ] **Step 9: Commit**

```bash
git add src/lib/contabilita/queries.ts tests/unit/contabilita-queries.test.ts src/lib/dashboard/queries.ts supabase/migrations/20260702020000_b2_drop_lavori_partitario.sql
git commit -m "fix(dashboard): B2 — getPagamentiScadutiTop, widget Front Desk, fetchMovimentiCreditoValidi condivisa, drop finale lavori_partitario"
```

---

## Task 10: `POST /api/clienti/[id]/credito/applica` e `/rimborsa`

**Files:**
- Create: `src/app/api/clienti/[id]/credito/applica/route.ts`
- Create: `src/app/api/clienti/[id]/credito/rimborsa/route.ts`

**Interfaces:**
- Consumes: `fetchMovimentiCreditoValidi` da `@/lib/contabilita/queries` (Task 9, già testata — filtra automaticamente le eccedenze "fantasma" da pagamenti annullati) e `calcolaCreditoDisponibile` da `@/lib/contabilita/saldo` (Task 4).

Il vincolo "saldo cliente sempre ≥ 0" è verificato in applicazione (non a livello DB — spec B2 §"credito_clienti_movimenti"): entrambe le route ricalcolano `calcolaCreditoDisponibile` sui movimenti validi prima di autorizzare un nuovo movimento.

- [ ] **Step 1: Implementa `POST /api/clienti/[id]/credito/applica`**

```typescript
// src/app/api/clienti/[id]/credito/applica/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { calcolaCreditoDisponibile } from '@/lib/contabilita/saldo'
import { fetchMovimentiCreditoValidi } from '@/lib/contabilita/queries'

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST /api/clienti/[id]/credito/applica ────────────────────────────────
// Body: { fattura_id? | lavoro_id?, importo }
// Crea un movimento 'applicazione' — NON genera una riga in `pagamenti`
// (evita il doppio conteggio del contante, spec B2 §"Punto critico").
export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: cliente_id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  const { data: cliente } = await svc
    .from('clienti')
    .select('id')
    .eq('id', cliente_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const fattura_id = typeof body.fattura_id === 'string' ? body.fattura_id : null
  const lavoro_id = typeof body.lavoro_id === 'string' ? body.lavoro_id : null
  const importo = typeof body.importo === 'number' ? body.importo : NaN

  if ((fattura_id == null) === (lavoro_id == null)) {
    return NextResponse.json({ error: 'Specificare esattamente uno tra fattura_id e lavoro_id' }, { status: 400 })
  }
  if (!(importo > 0)) {
    return NextResponse.json({ error: 'Importo deve essere positivo' }, { status: 400 })
  }

  // Verifica che il dovuto target appartenga a QUESTO cliente e laboratorio
  if (fattura_id) {
    const { data: fattura } = await svc
      .from('fatture')
      .select('id')
      .eq('id', fattura_id)
      .eq('cliente_id', cliente_id)
      .eq('laboratorio_id', utente.laboratorio_id)
      .is('deleted_at', null)
      .single()
    if (!fattura) {
      return NextResponse.json({ error: 'Fattura non trovata per questo cliente' }, { status: 404 })
    }
  } else {
    const { data: lavoro } = await svc
      .from('lavori')
      .select('id')
      .eq('id', lavoro_id as string)
      .eq('cliente_id', cliente_id)
      .eq('laboratorio_id', utente.laboratorio_id)
      .is('deleted_at', null)
      .single()
    if (!lavoro) {
      return NextResponse.json({ error: 'Lavoro non trovato per questo cliente' }, { status: 404 })
    }
  }

  const movimentiValidi = await fetchMovimentiCreditoValidi(svc, utente.laboratorio_id, cliente_id)
  const disponibile = calcolaCreditoDisponibile(movimentiValidi)

  if (importo > disponibile) {
    return NextResponse.json({ error: `Credito disponibile insufficiente (disponibile: ${disponibile})` }, { status: 400 })
  }

  const { data: movimento, error } = await svc
    .from('credito_clienti_movimenti')
    .insert({
      laboratorio_id: utente.laboratorio_id,
      cliente_id,
      tipo: 'applicazione',
      fattura_id,
      lavoro_id,
      importo,
      registrato_da: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ movimento })
}
```

- [ ] **Step 2: Implementa `POST /api/clienti/[id]/credito/rimborsa`**

```typescript
// src/app/api/clienti/[id]/credito/rimborsa/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { calcolaCreditoDisponibile } from '@/lib/contabilita/saldo'
import { fetchMovimentiCreditoValidi } from '@/lib/contabilita/queries'

const METODI_VALIDI = ['contanti', 'bonifico', 'pos', 'assegno', 'altro']

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST /api/clienti/[id]/credito/rimborsa ───────────────────────────────
// Body: { importo, metodo, metodo_nota? }
export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: cliente_id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  const { data: cliente } = await svc
    .from('clienti')
    .select('id')
    .eq('id', cliente_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const importo = typeof body.importo === 'number' ? body.importo : NaN
  const metodo = typeof body.metodo === 'string' ? body.metodo : ''
  const metodo_nota = typeof body.metodo_nota === 'string' ? body.metodo_nota : null

  if (!(importo > 0)) {
    return NextResponse.json({ error: 'Importo deve essere positivo' }, { status: 400 })
  }
  if (!METODI_VALIDI.includes(metodo)) {
    return NextResponse.json({ error: 'Campo `metodo` non valido' }, { status: 400 })
  }

  const movimentiValidi = await fetchMovimentiCreditoValidi(svc, utente.laboratorio_id, cliente_id)
  const disponibile = calcolaCreditoDisponibile(movimentiValidi)

  if (importo > disponibile) {
    return NextResponse.json({ error: `Credito disponibile insufficiente (disponibile: ${disponibile})` }, { status: 400 })
  }

  const { data: movimento, error } = await svc
    .from('credito_clienti_movimenti')
    .insert({
      laboratorio_id: utente.laboratorio_id,
      cliente_id,
      tipo: 'rimborso',
      importo,
      metodo,
      metodo_nota,
      registrato_da: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ movimento })
}
```

- [ ] **Step 3: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/clienti/[id]/credito/applica/route.ts" "src/app/api/clienti/[id]/credito/rimborsa/route.ts"
git commit -m "feat(api): applica/rimborsa credito cliente via fetchMovimentiCreditoValidi condivisa (B2)"
```

---

## Task 11: Fix B2 — Scadenzario ampliato ai lavori diretti (`src/app/api/scadenzario/route.ts`)

**Files:**
- Modify: `src/app/api/scadenzario/route.ts` (riscrittura completa del file, 122 righe)

**Interfaces:**
- Consumes: `calcolaResiduo` da `@/lib/contabilita/saldo` (Task 4).

Lo Scadenzario mostra TUTTI i non saldati (nessuna soglia di 30gg, a differenza della KPI "scaduto" di Task 10) — fatture non pagate + lavori `non_fatturare` non saldati, in un'unica lista per cliente, ciascuna riga taggata con l'origine. Il "credito potenziale" (lavori `in_attesa`) resta escluso, come da spec B2 §5.

- [ ] **Step 1: Riscrivi il file**

```typescript
// src/app/api/scadenzario/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { calcolaResiduo } from '@/lib/contabilita/saldo'

// ─── GET /api/scadenzario ─────────────────────────────────────────────────────
// Fatture non pagate (stato_sdi != 'draft') + lavori diretti non_fatturare non
// saldati, raggruppati per cliente, ordinati per anzianità decrescente.
// Il "credito potenziale" (lavori in_attesa) NON entra in questa lista (B2 §5).
export async function GET() {
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
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

  type ClienteSnap = {
    id: string
    nome: string
    cognome: string
    studio_nome: string | null
    telefono: string | null
  }

  interface DovutoRow {
    id: string
    origine: 'fattura' | 'lavoro_diretto'
    numero: string
    data: string
    importo: number
    stato_sdi: string | null
  }

  const { data: fattureData, error: fattureError } = await svc
    .from('fatture')
    .select('id, numero, data, totale, importo_pagato, stato_sdi, pagata, cliente:clienti(id, nome, cognome, studio_nome, telefono)')
    .eq('laboratorio_id', labId)
    .eq('pagata', false)
    .neq('stato_sdi', 'draft')
    .is('deleted_at', null)
    .order('data', { ascending: true })

  if (fattureError) {
    return NextResponse.json({ error: fattureError.message }, { status: 500 })
  }

  const { data: lavoriData, error: lavoriError } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, prezzo_unitario, data_consegna_prevista,
      cliente:clienti(id, nome, cognome, studio_nome, telefono),
      pagamenti(importo, stato),
      credito_clienti_movimenti(importo, tipo)
    `)
    .eq('laboratorio_id', labId)
    .in('decisione_fatturazione', ['non_fatturare', 'fatturare'])
    .eq('incluso_in_fattura', false)
    .not('stato', 'in', '("annullato")')
    .is('deleted_at', null)
    .gt('prezzo_unitario', 0)

  if (lavoriError) {
    return NextResponse.json({ error: lavoriError.message }, { status: 500 })
  }

  // NOTA (finding Task 16, review finale): `pagata=false` include le fatture
  // parzialmente pagate — senza nettare `importo_pagato` questo endpoint
  // mostrerebbe l'importo pieno invece del residuo reale, disaccordando con
  // Dashboard/Contabilità cliente (esattamente il sintomo originale di B2).
  //
  // NOTA (finding review finale whole-branch, dopo Task 16): il filtro sui
  // lavori includeva SOLO `non_fatturare`, escludendo `fatturare` con
  // `incluso_in_fattura=false` — il bucket "confermato" definito nello spec
  // B2 §5 include invece entrambi (un lavoro deciso "fatturare" ma non ancora
  // formalizzato in fattura è comunque un dovuto reale). Con solo
  // `non_fatturare`, un cliente con l'unico scaduto in questo stato compariva
  // nel widget morosi Dashboard e nella sua Contabilità cliente ma spariva
  // dallo Scadenzario — lo stesso sintomo di disaccordo tra superfici che B2
  // esiste per eliminare. Allineato a `.in(...)`, stesso filtro già usato da
  // `getCreditoScadutoPerCliente` (Task 9) e `getContabilitaCliente` (Task 15).

  const byCliente: Record<
    string,
    { cliente: ClienteSnap; dovuti: DovutoRow[]; totale_insoluto: number; giorni_max_ritardo: number }
  > = {}

  function upsertCliente(cliente: ClienteSnap): void {
    if (!byCliente[cliente.id]) {
      byCliente[cliente.id] = { cliente, dovuti: [], totale_insoluto: 0, giorni_max_ritardo: 0 }
    }
  }

  function aggiornaGiorniMax(clienteId: string, dataRiferimento: string): void {
    const giorni = Math.floor((Date.now() - new Date(dataRiferimento).getTime()) / 86_400_000)
    if (giorni > byCliente[clienteId].giorni_max_ritardo) {
      byCliente[clienteId].giorni_max_ritardo = giorni
    }
  }

  for (const f of (fattureData ?? []) as unknown as Array<{
    id: string; numero: string; data: string; totale: number; importo_pagato: number
    stato_sdi: string; pagata: boolean
    cliente: ClienteSnap | null
  }>) {
    if (!f.cliente) continue
    const residuo = Math.round((Number(f.totale) - Number(f.importo_pagato ?? 0)) * 100) / 100
    if (residuo <= 0) continue

    upsertCliente(f.cliente)
    byCliente[f.cliente.id].dovuti.push({
      id: f.id,
      origine: 'fattura',
      numero: f.numero,
      data: f.data,
      importo: residuo,
      stato_sdi: f.stato_sdi,
    })
    byCliente[f.cliente.id].totale_insoluto += residuo
    aggiornaGiorniMax(f.cliente.id, f.data)
  }

  for (const l of (lavoriData ?? []) as unknown as Array<{
    id: string; numero_lavoro: string; prezzo_unitario: number | null; data_consegna_prevista: string
    cliente: ClienteSnap | null
    pagamenti: Array<{ importo: number; stato: string }>
    credito_clienti_movimenti: Array<{ importo: number; tipo: string }>
  }>) {
    if (!l.cliente) continue
    const pagamentiAttivi = (l.pagamenti ?? []).filter((p) => p.stato === 'attivo')
    const applicazioni = (l.credito_clienti_movimenti ?? []).filter((m) => m.tipo === 'applicazione')
    const residuo = calcolaResiduo(Number(l.prezzo_unitario ?? 0), pagamentiAttivi, applicazioni)
    if (residuo <= 0) continue

    upsertCliente(l.cliente)
    byCliente[l.cliente.id].dovuti.push({
      id: l.id,
      origine: 'lavoro_diretto',
      numero: l.numero_lavoro,
      data: l.data_consegna_prevista,
      importo: residuo,
      stato_sdi: null,
    })
    byCliente[l.cliente.id].totale_insoluto += residuo
    aggiornaGiorniMax(l.cliente.id, l.data_consegna_prevista)
  }

  const result = Object.values(byCliente).sort(
    (a, b) => b.giorni_max_ritardo - a.giorni_max_ritardo
  )

  return NextResponse.json(result)
}
```

- [ ] **Step 2: Aggiorna `ScadenzarioList.tsx` (unico consumer di questo endpoint) alla nuova forma della risposta**

**Trovato in review pre-esecuzione (dopo l'esecuzione di questo task): senza questo step, la pagina `/scadenzario` va in crash a runtime.** Il file cambia forma della risposta (`fatture: FatturaRow[]` → `dovuti: DovutoRow[]`, `totale` → `importo`), ma `src/components/features/scadenzario/ScadenzarioList.tsx` è l'unico consumatore lato client di `GET /api/scadenzario` e usa ancora `item.fatture`/`f.totale` con un proprio tipo locale — `tsc` non lo rileva perché la risposta arriva via `res.json() as Promise<InsolutoCliente[]>` (asserzione, non verifica).

Modifica `src/components/features/scadenzario/ScadenzarioList.tsx`:

Sostituisci il blocco tipi (righe 19-33):

```typescript
interface FatturaInsoluta {
  id: string
  numero: string
  data: string
  totale: number
  stato_sdi: string
  pagata: boolean
}

interface InsolutoCliente {
  cliente: ClienteSnap
  fatture: FatturaInsoluta[]
  totale_insoluto: number
  giorni_max_ritardo: number
}
```

con:

```typescript
interface DovutoRow {
  id: string
  origine: 'fattura' | 'lavoro_diretto'
  numero: string
  data: string
  importo: number
  stato_sdi: string | null
}

interface InsolutoCliente {
  cliente: ClienteSnap
  dovuti: DovutoRow[]
  totale_insoluto: number
  giorni_max_ritardo: number
}
```

Dentro `InsolutoCard`, sostituisci il blocco `fattureConGiorni` (righe 70-79):

```typescript
  const fattureConGiorni = useMemo(
    () =>
      item.fatture.map((f) => ({
        ...f,
        giorniRitardo: Math.floor(
          (now - new Date(f.data).getTime()) / 86_400_000
        ),
      })),
    [item.fatture, now]
  )
```

con:

```typescript
  const dovutiConGiorni = useMemo(
    () =>
      item.dovuti.map((d) => ({
        ...d,
        giorniRitardo: Math.floor(
          (now - new Date(d.data).getTime()) / 86_400_000
        ),
      })),
    [item.dovuti, now]
  )
```

Sostituisci la riga di conteggio (riga 149):

```tsx
              {item.fatture.length} {item.fatture.length === 1 ? 'fattura' : 'fatture'} non pagate
```

con:

```tsx
              {item.dovuti.length} {item.dovuti.length === 1 ? 'voce non saldata' : 'voci non saldate'}
```

Sostituisci il blocco di mapping della lista espansa (righe 234-281, usa `fattureConGiorni`/`f.totale`) con la versione su `dovutiConGiorni`/`d.importo`, aggiungendo un'icona per l'origine:

```tsx
                {dovutiConGiorni.map((d) => (
                  <li
                    key={d.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        color: 'var(--t1, #1C1916)',
                      }}
                    >
                      {d.origine === 'fattura' ? '🧾' : '🔧'} {d.numero}
                    </span>
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '13px',
                        color: 'var(--t2, #4A3D33)',
                      }}
                    >
                      {new Date(d.data).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {d.giorniRitardo}gg
                    </span>
                    <span
                      suppressHydrationWarning
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: urgencyColor(d.giorniRitardo),
                        marginLeft: 'auto',
                      }}
                    >
                      {fmt.format(d.importo)}
                    </span>
                  </li>
                ))}
```

Nessun'altra riga del file cambia (WhatsApp, link estratto conto, summary banner, empty state restano invariati — usano `totale_insoluto`/`giorni_max_ritardo`/`cliente`, non toccati da questo cambio di forma).

- [ ] **Step 3: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Verifica manuale sui 3 viewport**

Avvia `npm run dev`, apri `/scadenzario` con almeno un cliente che abbia sia una fattura non pagata sia un lavoro `non_fatturare` non saldato. Verifica su 390/768/1280px, light/dark, che la card espansa mostri entrambe le voci con l'icona di origine corretta (🧾/🔧) e l'importo giusto, senza errori in console.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/scadenzario/route.ts src/components/features/scadenzario/ScadenzarioList.tsx
git commit -m "fix(scadenzario): B2 — ampliato ai lavori diretti non_fatturare, taggati per origine (+ fix consumer ScadenzarioList)"
```

---

## Task 12: Fix pipeline fatturazione — rispetta `decisione_fatturazione`

**Files:**
- Modify: `src/app/api/fatture/batch/route.ts:82` e `:182` (dopo la rimozione del join in Task 1, `incluso_in_fattura` è rispettivamente riga 82 e riga ~181)
- Modify: `src/app/api/lavori/pronti-da-fatturare/route.ts:56`
- Modify: `src/app/(app)/fatture/page.tsx:119`

**Interfaces:** nessuna nuova — filtro aggiuntivo su query esistenti.

Senza questo fix, un lavoro marcato `non_fatturare` verrebbe comunque incluso nel prossimo batch di fatturazione (spec B2 §"Fix di B2").

- [ ] **Step 1: `fatture/batch/route.ts` — claim atomico**

Trova (riga 76-84):

```typescript
    const { data: claimed } = await svc
      .from('lavori')
      .update({ incluso_in_fattura: true })
      .eq('id', lavoro_id)
      .eq('laboratorio_id', labId)
      .eq('stato', 'consegnato')
      .eq('incluso_in_fattura', false)
      .is('deleted_at', null)
      .select('id')
      .single()
```

Sostituisci con:

```typescript
    const { data: claimed } = await svc
      .from('lavori')
      .update({ incluso_in_fattura: true })
      .eq('id', lavoro_id)
      .eq('laboratorio_id', labId)
      .eq('stato', 'consegnato')
      .eq('incluso_in_fattura', false)
      .eq('decisione_fatturazione', 'fatturare')
      .is('deleted_at', null)
      .select('id')
      .single()
```

- [ ] **Step 2: `fatture/batch/route.ts` — fetch completo del lavoro**

Trova, nella select completa del lavoro (dopo la rimozione del join `partitario` in Task 1), le righe:

```typescript
      .eq('id', lavoro_id)
      .eq('laboratorio_id', labId)
      .eq('stato', 'consegnato')
      .eq('incluso_in_fattura', false)
      .is('deleted_at', null)
      .single()
```

Sostituisci con:

```typescript
      .eq('id', lavoro_id)
      .eq('laboratorio_id', labId)
      .eq('stato', 'consegnato')
      .eq('incluso_in_fattura', false)
      .eq('decisione_fatturazione', 'fatturare')
      .is('deleted_at', null)
      .single()
```

- [ ] **Step 3: `lavori/pronti-da-fatturare/route.ts`**

Trova (righe 45-59):

```typescript
  const { data, error } = await svc
    .from('lavori')
    .select(`
      id,
      numero_lavoro,
      prezzo_unitario,
      data_consegna_effettiva,
      cliente:clienti(id, nome, cognome, studio_nome)
    `)
    .eq('laboratorio_id', labId)
    .eq('stato', 'consegnato')
    .eq('incluso_in_fattura', false)
    .is('deleted_at', null)
    .order('data_consegna_effettiva', { ascending: false })
    .limit(50)
```

Sostituisci con:

```typescript
  const { data, error } = await svc
    .from('lavori')
    .select(`
      id,
      numero_lavoro,
      prezzo_unitario,
      data_consegna_effettiva,
      cliente:clienti(id, nome, cognome, studio_nome)
    `)
    .eq('laboratorio_id', labId)
    .eq('stato', 'consegnato')
    .eq('incluso_in_fattura', false)
    .eq('decisione_fatturazione', 'fatturare')
    .is('deleted_at', null)
    .order('data_consegna_effettiva', { ascending: false })
    .limit(50)
```

- [ ] **Step 4: `fatture/page.tsx:119`**

Trova (righe 114-122):

```typescript
      svc
        .from('lavori')
        .select('id, numero_lavoro, prezzo_unitario, data_consegna_effettiva, cliente:clienti(id, nome, cognome, studio_nome)')
        .eq('laboratorio_id', labId)
        .eq('stato', 'consegnato')
        .eq('incluso_in_fattura', false)
        .is('deleted_at', null)
        .order('data_consegna_effettiva', { ascending: false })
        .limit(50),
```

Sostituisci con:

```typescript
      svc
        .from('lavori')
        .select('id, numero_lavoro, prezzo_unitario, data_consegna_effettiva, cliente:clienti(id, nome, cognome, studio_nome)')
        .eq('laboratorio_id', labId)
        .eq('stato', 'consegnato')
        .eq('incluso_in_fattura', false)
        .eq('decisione_fatturazione', 'fatturare')
        .is('deleted_at', null)
        .order('data_consegna_effettiva', { ascending: false })
        .limit(50),
```

- [ ] **Step 5: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 6: Commit**

```bash
git add src/app/api/fatture/batch/route.ts "src/app/api/lavori/pronti-da-fatturare/route.ts" "src/app/(app)/fatture/page.tsx"
git commit -m "fix(fatturazione): B2 — batch e liste candidate rispettano decisione_fatturazione='fatturare'"
```

---

## Task 13: Rimuovi la scrittura manuale di `fatture.pagata` — nuovo `RegistraPagamentoSheet`

**Files:**
- Modify: `src/app/api/fatture/[id]/route.ts` (rimozione handler PATCH — riscrittura completa del file, 83 righe)
- Create: `src/components/features/scadenzario/RegistraPagamentoSheet.tsx`
- Modify: `src/components/features/scadenzario/EstrattoContoView.tsx` (dentro `FatturaBottomSheet`, righe 102-126 e 274-301)

**Interfaces:**
- Consumes: `POST /api/pagamenti` (Task 7).

`fatture.pagata`/`importo_pagato` sono ora derivati via trigger (Task 2) — se questa route continuasse ad accettare `{pagata: true}` manuale, avremmo due scrittori concorrenti sullo stesso campo (un bug nuovo della stessa classe di B2). Verificato: `PATCH /api/fatture/[id]` è chiamata SOLO da `FatturaBottomSheet` (grep `api/fatture/\${` in `src/` — nessun altro chiamante).

- [ ] **Step 1: Rimuovi l'intero handler PATCH da `src/app/api/fatture/[id]/route.ts`**

Il file oggi contiene solo l'handler PATCH (83 righe). Svuotalo lasciando un file vuoto di export (nessuna route esposta su questo path — Next.js risponde 405 automaticamente se non ci sono handler esportati):

```typescript
// src/app/api/fatture/[id]/route.ts
// PATCH rimosso — B2: fatture.pagata/importo_pagato sono derivati via trigger
// (vedi supabase/migrations/20260702185348_b2_contabilita_clienti.sql).
// Registrare un pagamento: POST /api/pagamenti con { fattura_id, importo, ... }.
export {}
```

- [ ] **Step 2: Crea `RegistraPagamentoSheet.tsx`**

```tsx
// src/components/features/scadenzario/RegistraPagamentoSheet.tsx
'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticSuccess } from '@/lib/feedback/haptic'
import { soundPaymentSuccess } from '@/lib/feedback/sounds'

const DS = {
  sfc: 'var(--sfc, #E4DFD9)',
  elv: 'var(--elv, #EDEDEA)',
  prs: 'var(--prs, #D4CFC9)',
  t1: 'var(--t1, #1C1916)',
  t2: 'var(--t2, #4A3D33)',
  t3: 'var(--t3, #6B5C51)',
  primary: 'var(--primary, #D90012)',
  green: 'var(--success, #16A34A)',
  shB: 'var(--sh-b)',
} as const

const METODI: Array<{ value: string; label: string }> = [
  { value: 'contanti', label: 'Contanti' },
  { value: 'bonifico', label: 'Bonifico' },
  { value: 'pos', label: 'POS' },
  { value: 'assegno', label: 'Assegno' },
  { value: 'altro', label: 'Altro' },
]

export interface TargetPagamento {
  tipo: 'fattura' | 'lavoro'
  id: string
  residuo: number
  etichetta: string // es. "Fattura 2026-0042" o "Lavoro 2026/0113"
}

interface Props {
  target: TargetPagamento | null
  onClose: () => void
  onRegistrato: (eccedenza: number) => void
}

export function RegistraPagamentoSheet({ target, onClose, onRegistrato }: Props) {
  const reducedMotion = useReducedMotion()
  const [importo, setImporto] = useState<string>('')
  const [metodo, setMetodo] = useState<string>('contanti')
  const [metodoNota, setMetodoNota] = useState<string>('')
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const importoDefault = target ? String(target.residuo) : ''

  const handleSubmit = useCallback(async () => {
    if (!target || loading) return
    const importoNum = Number(importo || importoDefault)
    if (!(importoNum > 0)) {
      setErrore('Inserisci un importo valido')
      return
    }

    setLoading(true)
    setErrore(null)
    try {
      const res = await fetch('/api/pagamenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [target.tipo === 'fattura' ? 'fattura_id' : 'lavoro_id']: target.id,
          importo: importoNum,
          metodo,
          metodo_nota: metodoNota || null,
          data_pagamento: dataPagamento,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrore(json.error ?? 'Errore registrazione pagamento')
        return
      }
      hapticSuccess()
      soundPaymentSuccess()
      onRegistrato(json.eccedenza ?? 0)
      setImporto('')
      setMetodoNota('')
      onClose()
    } catch {
      setErrore('Errore di rete — riprova')
    } finally {
      setLoading(false)
    }
  }, [target, loading, importo, importoDefault, metodo, metodoNota, dataPagamento, onRegistrato, onClose])

  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            key="registra-pagamento-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.32)' }}
          />
          <motion.div
            key="registra-pagamento-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 81,
              background: DS.sfc,
              borderRadius: '28px 28px 0 0',
              maxWidth: 600, margin: '0 auto',
              maxHeight: '92dvh',
              display: 'flex', flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Registra pagamento"
          >
            <div style={{ width: 36, height: 4, background: DS.t3, borderRadius: 99, margin: '12px auto 16px' }} />

            <div style={{ padding: '0 20px 16px', flex: 1, overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 4px', fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: DS.t1 }}>
                Registra pagamento
              </h2>
              <p style={{ margin: '0 0 20px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.t2 }}>
                {target.etichetta} — residuo {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(target.residuo)}
              </p>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Importo (€)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder={importoDefault}
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                    background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Metodo
                </span>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                    background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                  }}
                >
                  {METODI.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Nota metodo (opzionale)
                </span>
                <input
                  type="text"
                  placeholder="es. ultime 4 cifre assegno"
                  value={metodoNota}
                  onChange={(e) => setMetodoNota(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                    background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Data pagamento
                </span>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                    background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                  }}
                />
              </label>

              {errore && (
                <p role="alert" style={{ margin: '8px 0 0', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.primary }}>
                  {errore}
                </p>
              )}
            </div>

            <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: '100%', minHeight: 52, borderRadius: 100, border: 'none',
                  background: DS.green, color: '#fff',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 15,
                  cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Registrazione…' : '✓ Registra pagamento'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Sostituisci "Segna come pagata" con l'apertura del nuovo sheet in `EstrattoContoView.tsx`**

Nel file `src/components/features/scadenzario/EstrattoContoView.tsx`, aggiungi l'import subito dopo la riga 9:

```typescript
import { RegistraPagamentoSheet, type TargetPagamento } from './RegistraPagamentoSheet'
```

Nell'interfaccia `BottomSheetProps` (righe 94-100), sostituisci `onPagata: (id: string) => void` con:

```typescript
  onRegistraPagamento: (target: TargetPagamento) => void
```

Nella funzione `FatturaBottomSheet` (righe 102-126), rimuovi interamente `handleSegnaComePagata` (righe 106-126) e la sua dipendenza dalla prop `onPagata`; aggiorna la firma:

```typescript
function FatturaBottomSheet({ fattura, telefono, studioNome, onClose, onRegistraPagamento }: BottomSheetProps) {
  const reducedMotion = useReducedMotion()
```

Nel blocco azioni (righe 274-301), sostituisci il bottone "Segna come pagata" con:

```tsx
              {/* Registra pagamento */}
              {!fattura.pagata && (
                <button
                  type="button"
                  onClick={() => {
                    onRegistraPagamento({
                      tipo: 'fattura',
                      id: fattura.id,
                      residuo: fattura.totale,
                      etichetta: `Fattura ${fattura.numero}`,
                    })
                    onClose()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 52,
                    padding: '12px 20px',
                    background: 'transparent',
                    color: DS.green,
                    border: `2px solid ${DS.green}`,
                    borderRadius: 100,
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  💳 Registra pagamento
                </button>
              )}
```

Nel componente `EstrattoContoView` (entry point, righe 837-1058), sostituisci lo stato `selectedFattura`/`handlePagata` per pilotare anche il nuovo sheet. Aggiungi, subito dopo `const [selectedFattura, setSelectedFattura] = useState<FatturaEstratto | null>(dati.fatture ? null : null)` (riga 839 originale — la dichiarazione esistente resta invariata), un nuovo stato:

```typescript
  const [targetPagamento, setTargetPagamento] = useState<TargetPagamento | null>(null)

  const handleRegistrato = useCallback((_eccedenza: number) => {
    // Il residuo/stato effettivo arriva al prossimo refresh server (router.refresh
    // non è invocato qui: la lista fatture di questa vista non mostra ancora un
    // residuo parziale — lo farà Task 15 evolvendo FatturaCard/TabellaFatture).
  }, [])
```

Sostituisci ogni uso di `onPagata={handlePagata}` con `onRegistraPagamento={setTargetPagamento}`, e aggiungi il nuovo sheet subito dopo `<FatturaBottomSheet ... />` nel JSX finale:

```tsx
      <RegistraPagamentoSheet
        target={targetPagamento}
        onClose={() => setTargetPagamento(null)}
        onRegistrato={handleRegistrato}
      />
```

Rimuovi la funzione `handlePagata` (non più usata) e il suo `useCallback` — verifica con `grep -n "handlePagata" src/components/features/scadenzario/EstrattoContoView.tsx` che non resti alcun riferimento.

- [ ] **Step 4: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/fatture/[id]/route.ts" src/components/features/scadenzario/RegistraPagamentoSheet.tsx src/components/features/scadenzario/EstrattoContoView.tsx
git commit -m "feat(ui): B2 — RegistraPagamentoSheet sostituisce la scrittura manuale di fatture.pagata"
```

---

## Task 14: Estrazione sotto-componenti da `EstrattoContoView.tsx` (mechanical, nessun cambio di comportamento)

**Files:**
- Create: `src/components/features/scadenzario/estratto-conto-shared.ts`
- Create: `src/components/features/scadenzario/FatturaCard.tsx`
- Create: `src/components/features/scadenzario/KpiBar.tsx`
- Create: `src/components/features/scadenzario/TabellaFatture.tsx`
- Create: `src/components/features/scadenzario/ClienteInfoCard.tsx`
- Modify: `src/components/features/scadenzario/EstrattoContoView.tsx`

**Interfaces:**
- Produces: `DS`, `fmt`, `formatData`, `urgencyColor`, `urgencyEmoji`, `urgencyLabel`, `urgencyPillBg`, `urgencyPillBorder`, `labelStatoSDI` da `estratto-conto-shared.ts` — usati da tutti i file sotto e da `EstrattoContoView.tsx`.

Il file è già sovradimensionato (1075 righe) — questa è la "miglioria mirata mentre lo si tocca comunque" richiesta dalla spec B2 (non un refactor a sé). Nessun test esistente copre `EstrattoContoView.tsx`: l'unica rete è la parità visiva (3 viewport × light/dark) verificata manualmente in Task 16.

- [ ] **Step 1: Crea il modulo condiviso di helper**

```typescript
// src/components/features/scadenzario/estratto-conto-shared.ts
import type { FatturaEstratto } from '@/app/api/scadenzario/[cliente_id]/route'

export const DS = {
  bg:      'var(--bg, #DDD8D3)',
  sfc:     'var(--sfc, #E4DFD9)',
  elv:     'var(--elv, #EDEDEA)',
  prs:     'var(--prs, #D4CFC9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #4A3D33)',
  t3:      'var(--t3, #6B5C51)',
  red:     'var(--primary, #D90012)',
  gold:    'var(--c-amber, #F59E0B)',
  green:   'var(--success, #16A34A)',
  shB: 'var(--sh-b)',
  shI: 'var(--sh-i)',
} as const

export const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export function formatData(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Coerente con ScadenzarioList.tsx: rosso per > 60, oro per >= 30, t2 per < 30 non pagate
export function urgencyColor(f: FatturaEstratto): string {
  if (f.pagata) return DS.green
  if (f.giorni_ritardo > 60) return DS.red
  if (f.giorni_ritardo >= 30) return DS.gold
  return DS.t2
}

export function urgencyEmoji(f: FatturaEstratto): string {
  if (f.pagata) return '✅'
  if (f.giorni_ritardo > 60) return '⏰'
  if (f.giorni_ritardo >= 30) return '⏳'
  return '🧾'
}

export function urgencyLabel(f: FatturaEstratto): string {
  if (f.pagata) return 'Pagata'
  if (f.giorni_ritardo > 60) return 'Urgente'
  if (f.giorni_ritardo >= 30) return 'In ritardo'
  return 'In sospeso'
}

export function urgencyPillBg(f: FatturaEstratto): string {
  return `${urgencyColor(f)}22`
}

export function urgencyPillBorder(f: FatturaEstratto): string {
  return `1px solid ${urgencyColor(f)}44`
}

const STATO_SDI_LABEL: Record<string, string> = {
  draft:          'Bozza',
  generata:       'XML Pronto',
  smtp_inviata:   'Inviata',
  pec_consegnata: 'Consegnata',
  ricevuta_sdi:   'Ricevuta SDI',
  accettata:      'Accettata',
  rifiutata:      'Rifiutata',
  scaduta:        'Scaduta',
}

export function labelStatoSDI(stato: string): string {
  return STATO_SDI_LABEL[stato] ?? stato
}
```

- [ ] **Step 2: Crea `FatturaCard.tsx`** (contenuto identico alle righe 368-475 originali di `EstrattoContoView.tsx`, import aggiornati)

```tsx
// src/components/features/scadenzario/FatturaCard.tsx
'use client'

import { motion } from 'motion/react'
import { t, staggerDelay } from '@/design-system/motion'
import type { FatturaEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData, urgencyColor, urgencyEmoji, urgencyLabel, urgencyPillBg, urgencyPillBorder } from './estratto-conto-shared'

interface FatturaCardProps {
  fattura: FatturaEstratto
  index: number
  onTap: (f: FatturaEstratto) => void
  reducedMotion: boolean
}

export function FatturaCard({ fattura, index, onTap, reducedMotion }: FatturaCardProps) {
  const color = urgencyColor(fattura)
  const delay = Math.min(index * staggerDelay(8), 0.25)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={reducedMotion ? { duration: 0 } : { ...t('normal', 'enter'), delay }}
    >
      <button
        type="button"
        onClick={() => onTap(fattura)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '14px 16px',
          background: DS.sfc,
          borderRadius: 16,
          boxShadow: DS.shB,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'DM Sans, sans-serif',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={`Fattura ${fattura.numero} — ${fmt.format(fattura.totale)} — ${urgencyLabel(fattura)}`}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 56,
          padding: '6px 8px',
          background: urgencyPillBg(fattura),
          border: urgencyPillBorder(fattura),
          borderRadius: 12,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{urgencyEmoji(fattura)}</span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 9,
            fontWeight: 700,
            color,
            marginTop: 3,
            textAlign: 'center',
            letterSpacing: '0.03em',
          }}>
            {urgencyLabel(fattura)}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            color: DS.t1,
            marginBottom: 2,
          }}>
            N. {fattura.numero}
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: DS.t2,
          }}>
            {formatData(fattura.data)}
            {!fattura.pagata && (
              <span style={{ marginLeft: 4, color }}>
                · {fattura.giorni_ritardo}gg
              </span>
            )}
          </div>
        </div>

        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          fontWeight: 700,
          color,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>
          {fmt.format(fattura.totale)}
        </div>
      </button>
    </motion.div>
  )
}
```

- [ ] **Step 3: Crea `KpiBar.tsx`** (contenuto identico alle righe 477-564 originali)

```tsx
// src/components/features/scadenzario/KpiBar.tsx
'use client'

import { motion } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { DS, fmt } from './estratto-conto-shared'

interface KpiBarProps {
  saldo_insoluto: number
  totale_fatture: number
  fatture_pagate_count: number
}

export function KpiBar({ saldo_insoluto, totale_fatture, fatture_pagate_count }: KpiBarProps) {
  const reducedMotion = useReducedMotion()
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      margin: '0 16px 20px',
    }}>
      <KpiCard
        label="Insoluto"
        value={fmt.format(saldo_insoluto)}
        color={saldo_insoluto > 0 ? DS.red : DS.green}
        sub={saldo_insoluto > 0 ? 'da incassare' : 'tutto pagato'}
        reducedMotion={reducedMotion}
      />
      <KpiCard
        label="Fatture"
        value={String(totale_fatture)}
        color={DS.t1}
        sub="totali"
        reducedMotion={reducedMotion}
      />
      <KpiCard
        label="Pagate"
        value={String(fatture_pagate_count)}
        color={DS.green}
        sub={`su ${totale_fatture}`}
        reducedMotion={reducedMotion}
      />
    </div>
  )
}

function KpiCard({ label, value, color, sub, reducedMotion }: { label: string; value: string; color: string; sub: string; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : motionTokens.spring.gentle}
      style={{
        background: DS.sfc,
        borderRadius: 16,
        padding: '12px 10px',
        boxShadow: DS.shB,
        textAlign: 'center',
      }}
    >
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        fontWeight: 700,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 17,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
        marginBottom: 2,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        color: DS.t2,
      }}>
        {sub}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Crea `TabellaFatture.tsx`** (contenuto identico alle righe 586-737 originali)

```tsx
// src/components/features/scadenzario/TabellaFatture.tsx
'use client'

import { useState } from 'react'
import type { FatturaEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData, urgencyColor, urgencyPillBg, urgencyPillBorder, urgencyEmoji, labelStatoSDI } from './estratto-conto-shared'

type SortKey = 'data' | 'totale' | 'stato_sdi' | 'giorni_ritardo'
type SortDir = 'asc' | 'desc'

export function TabellaFatture({
  fatture,
  onTap,
}: {
  fatture: FatturaEstratto[]
  onTap: (f: FatturaEstratto) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('giorni_ritardo')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...fatture].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'data') cmp = new Date(a.data).getTime() - new Date(b.data).getTime()
    else if (sortKey === 'totale') cmp = a.totale - b.totale
    else if (sortKey === 'stato_sdi') cmp = a.stato_sdi.localeCompare(b.stato_sdi)
    else if (sortKey === 'giorni_ritardo') cmp = a.giorni_ritardo - b.giorni_ritardo
    return sortDir === 'asc' ? cmp : -cmp
  })

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '10px 12px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: sortKey === key ? DS.t1 : DS.t3,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: `1px solid rgba(0,0,0,.06)`,
    background: DS.elv,
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{ margin: '0 16px', overflowX: 'auto', borderRadius: 16, boxShadow: DS.shB }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: DS.sfc }}>
        <thead>
          <tr>
            <th style={thStyle('data')} onClick={() => handleSort('data')}>
              Data {sortKey === 'data' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={{ ...thStyle('totale'), textAlign: 'right' }} onClick={() => handleSort('totale')}>
              Importo {sortKey === 'totale' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={thStyle('stato_sdi')} onClick={() => handleSort('stato_sdi')}>
              Stato SDI {sortKey === 'stato_sdi' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={thStyle('giorni_ritardo')} onClick={() => handleSort('giorni_ritardo')}>
              Giorni {sortKey === 'giorni_ritardo' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.06)', background: DS.elv, borderRadius: '0 16px 0 0' }}>
              <span style={{ display: 'none' }}>Azioni</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f, i) => {
            const color = urgencyColor(f)
            return (
              <tr
                key={f.id}
                style={{
                  borderBottom: i < sorted.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => onTap(f)}
              >
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: DS.t1,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>N. {f.numero}</div>
                  <div style={{ fontSize: 11, color: DS.t2, marginTop: 2 }}>{formatData(f.data)}</div>
                </td>
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  color,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmt.format(f.totale)}
                </td>
                <td style={{ padding: '12px 12px' }}>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 11,
                    fontWeight: 700,
                    color,
                    background: urgencyPillBg(f),
                    border: urgencyPillBorder(f),
                    borderRadius: 8,
                    padding: '3px 8px',
                  }}>
                    {urgencyEmoji(f)} {labelStatoSDI(f.stato_sdi)}
                  </span>
                </td>
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: f.pagata ? DS.t3 : color,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {f.pagata ? '—' : `${f.giorni_ritardo}gg`}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onTap(f) }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: DS.elv,
                      color: DS.t2,
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '-2px -2px 6px rgba(255,255,255,.72), 3px 4px 10px -2px rgba(148,128,118,.40)',
                    }}
                  >
                    Dettagli →
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Crea `ClienteInfoCard.tsx`** (contenuto identico alle righe 741-833 originali)

```tsx
// src/components/features/scadenzario/ClienteInfoCard.tsx
'use client'

import type { EstrattoContoResponse } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt } from './estratto-conto-shared'

export function ClienteInfoCard({ cliente, saldo_insoluto }: {
  cliente: EstrattoContoResponse['cliente']
  saldo_insoluto: number
}) {
  const hasAddress = cliente.indirizzo || cliente.citta

  return (
    <div style={{
      background: DS.sfc,
      borderRadius: 16,
      padding: '20px',
      boxShadow: DS.shB,
    }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 11,
        fontWeight: 700,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 14,
      }}>
        Info cliente
      </div>

      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 16,
        fontWeight: 700,
        color: DS.t1,
        marginBottom: 4,
      }}>
        {cliente.studio_nome ?? `${cliente.nome} ${cliente.cognome}`}
      </div>

      {hasAddress && (
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          color: DS.t2,
          marginBottom: 4,
        }}>
          {[cliente.indirizzo, cliente.citta, cliente.cap].filter(Boolean).join(', ')}
        </div>
      )}

      {cliente.telefono && (
        <a
          href={`tel:${cliente.telefono}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: DS.t1,
            textDecoration: 'none',
          }}
        >
          📞 {cliente.telefono}
        </a>
      )}

      <div style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid rgba(0,0,0,.06)',
      }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 11,
          color: DS.t3,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 4,
        }}>
          Saldo insoluto
        </div>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 22,
          fontWeight: 700,
          color: saldo_insoluto > 0 ? DS.red : DS.green,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmt.format(saldo_insoluto)}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Aggiorna `EstrattoContoView.tsx` — rimuovi il codice spostato, importa dai nuovi file**

Rimuovi da `EstrattoContoView.tsx`: il blocco "Design tokens" (`const DS = {...}`), "Formatter" (`fmt`, `formatData`), "Urgency helpers" (le 5 funzioni `urgency*`), "Stato SDI label" (`STATO_SDI_LABEL`, `labelStatoSDI`) — tutto ciò che ora vive in `estratto-conto-shared.ts`. Rimuovi interamente le funzioni `FatturaCard`, `KpiBar`/`KpiCard`, `TabellaFatture`, `ClienteInfoCard`.

Sostituisci il blocco import in cima al file con:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticSuccess } from '@/lib/feedback/haptic'
import { soundPaymentSuccess } from '@/lib/feedback/sounds'
import { buildWhatsappSollecito, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'
import type { EstrattoContoResponse, FatturaEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { RegistraPagamentoSheet, type TargetPagamento } from './RegistraPagamentoSheet'
import { FatturaCard } from './FatturaCard'
import { KpiBar } from './KpiBar'
import { TabellaFatture } from './TabellaFatture'
import { ClienteInfoCard } from './ClienteInfoCard'
import { DS, fmt, formatData, urgencyColor, urgencyEmoji, urgencyPillBg, urgencyPillBorder, labelStatoSDI } from './estratto-conto-shared'

// ─── Sezione header ───────────────────────────────────────────────────────────

function SezioneHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '0 16px 8px',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 11,
      fontWeight: 700,
      color: DS.t3,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}>
      {label}
    </div>
  )
}
```

`urgencyLabel` resta usata solo dentro `FatturaBottomSheet` (per il badge di stato) e da `estratto-conto-shared.ts` — se non più referenziata direttamente in `EstrattoContoView.tsx` dopo la rimozione di `FatturaCard`/`TabellaFatture`, rimuovila dall'import sopra (verifica con `grep -n "urgencyLabel" src/components/features/scadenzario/EstrattoContoView.tsx` — deve comparire ancora nel blocco `FatturaBottomSheet`, quindi va importata).

`staggerDelay` non è più usata in questo file dopo la rimozione di `FatturaCard` (era usata solo lì) — rimuovila dall'import di `@/design-system/motion` se `grep -n "staggerDelay" src/components/features/scadenzario/EstrattoContoView.tsx` non restituisce altri risultati.

`WhatsAppIcon` (righe 1062-1075 originali) resta invariato in fondo al file, usato sia da `FatturaBottomSheet` sia dal blocco WhatsApp globale nell'entry point.

- [ ] **Step 7: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori — nessun consumatore rotto, `KpiBarProps`/`FatturaCardProps` restano con la stessa forma di prima.

- [ ] **Step 8: Verifica parità visiva manuale (nessun test automatico su questo file)**

Avvia `npm run dev`, apri `/scadenzario/[cliente_id]` per un cliente con almeno una fattura pagata e una insoluta, sui 3 viewport (390/768/1280px) e in entrambi i temi (light/dark). Verifica che l'aspetto sia IDENTICO a prima dell'estrazione (nessun cambio di stile, solo spostamento di codice).

- [ ] **Step 9: Commit**

```bash
git add src/components/features/scadenzario/estratto-conto-shared.ts src/components/features/scadenzario/FatturaCard.tsx src/components/features/scadenzario/KpiBar.tsx src/components/features/scadenzario/TabellaFatture.tsx src/components/features/scadenzario/ClienteInfoCard.tsx src/components/features/scadenzario/EstrattoContoView.tsx
git commit -m "refactor(ui): estrai FatturaCard/KpiBar/TabellaFatture/ClienteInfoCard da EstrattoContoView (B2, nessun cambio comportamento)"
```

---

## Task 15: Evoluzione "Contabilità cliente" — KPI a 4 metriche, lista unificata, decisione fatturazione, credito disponibile

**Files:**
- Modify: `src/lib/contabilita/queries.ts` (aggiunta `getContabilitaCliente`)
- Test: `tests/unit/contabilita-cliente-query.test.ts`
- Modify: `src/app/api/scadenzario/[cliente_id]/route.ts` (riscrittura risposta)
- Modify: `src/app/(app)/scadenzario/[cliente_id]/page.tsx` (usa `getContabilitaCliente`)
- Modify: `src/components/features/scadenzario/estratto-conto-shared.ts` (generalizza le firme `urgency*`)
- Modify: `src/components/features/scadenzario/FatturaCard.tsx`, `TabellaFatture.tsx`, `KpiBar.tsx`
- Modify: `src/components/features/scadenzario/EstrattoContoView.tsx`
- Create: `src/components/features/scadenzario/LavoriInAttesaSection.tsx`
- Create: `src/components/features/scadenzario/CreditoDisponibileSection.tsx`
- Create: `src/components/features/scadenzario/CreditoSheet.tsx`

**Interfaces:**
- Consumes: `calcolaResiduo`, `calcolaCreditoDisponibile` da `@/lib/contabilita/saldo` (Task 4); `calcolaCreditoCliente` da `@/lib/contabilita/credito-cliente` (Task 5); `fetchMovimentiCreditoValidi` da `@/lib/contabilita/queries` (Task 9, stesso file di `getContabilitaCliente` — nessun import esplicito necessario, sono nello stesso modulo); `RegistraPagamentoSheet`/`TargetPagamento` da Task 13.
- Produces: `DovutoEstratto`, `LavoroInAttesa`, `getContabilitaCliente(svc, labId, clienteId)` — sostituisce la logica ad-hoc duplicata in route + page.

- [ ] **Step 1: Scrivi i test per `getContabilitaCliente` (falliranno — non esiste ancora)**

```typescript
// tests/unit/contabilita-cliente-query.test.ts
import { describe, it, expect } from 'vitest'
import { getContabilitaCliente } from '@/lib/contabilita/queries'

function createFakeSupabase(data: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fatture?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lavori?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movimenti?: any[]
}) {
  const fake = {
    from(table: string) {
      const builder = {
        select() { return builder },
        eq() { return builder },
        is() { return builder },
        not() { return builder },
        gt() { return builder },
        order() { return builder },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          if (table === 'fatture') { resolve({ data: data.fatture ?? [], error: null }); return }
          if (table === 'lavori') { resolve({ data: data.lavori ?? [], error: null }); return }
          if (table === 'credito_clienti_movimenti') { resolve({ data: data.movimenti ?? [], error: null }); return }
          resolve({ data: [], error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return fake
}

const DATA_LONTANA = '2020-01-01'

describe('getContabilitaCliente', () => {
  it('lavoro in_attesa entra in lavoriInAttesa e nel bucket potenziale, non nei dovuti', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0001', prezzo_unitario: 200, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'in_attesa', incluso_in_fattura: false, pagamenti: [], credito_clienti_movimenti: [],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(0)
    expect(r.lavoriInAttesa).toHaveLength(1)
    expect(r.creditoCliente.potenziale).toBe(200)
    expect(r.creditoCliente.confermato).toBe(0)
  })

  it('lavoro fatturare con incluso_in_fattura=true è escluso ovunque (già confluito nella fattura)', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0002', prezzo_unitario: 150, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'fatturare', incluso_in_fattura: true, pagamenti: [], credito_clienti_movimenti: [],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(0)
    expect(r.lavoriInAttesa).toHaveLength(0)
    expect(r.creditoCliente.confermato).toBe(0)
  })

  it('lavoro non_fatturare non saldato entra nei dovuti (origine lavoro_diretto) e nel confermato', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0003', prezzo_unitario: 90, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'non_fatturare', incluso_in_fattura: false,
        pagamenti: [{ importo: 30, stato: 'attivo' }], credito_clienti_movimenti: [],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(1)
    expect(r.dovuti[0]).toMatchObject({ origine: 'lavoro_diretto', residuo: 60 })
    expect(r.creditoCliente.confermato).toBe(60)
  })

  it('fattura non pagata entra nei dovuti con residuo netto da importo_pagato', async () => {
    const supabase = createFakeSupabase({
      fatture: [{ id: 'f1', numero: '2026-0010', data: DATA_LONTANA, totale: 100, importo_pagato: 40, stato_sdi: 'accettata', pagata: false }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(1)
    expect(r.dovuti[0]).toMatchObject({ origine: 'fattura', residuo: 60, pagata: false })
  })

  it('credito disponibile riflette i movimenti del cliente (via fetchMovimentiCreditoValidi, Task 9)', async () => {
    const supabase = createFakeSupabase({
      movimenti: [
        { tipo: 'eccedenza', importo: 50, pagamento_id: 'p1', pagamenti: { stato: 'attivo' } },
        { tipo: 'applicazione', importo: 20, pagamento_id: null, pagamenti: null },
      ],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.creditoCliente.disponibile).toBe(30)
  })
})
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `npx vitest run tests/unit/contabilita-cliente-query.test.ts`
Expected: FAIL — `getContabilitaCliente is not a function` (o modulo senza quell'export)

- [ ] **Step 3: Aggiungi `getContabilitaCliente` a `src/lib/contabilita/queries.ts`**

In cima al file, aggiorna l'import esistente e aggiungine uno nuovo:

```typescript
import { calcolaResiduo, calcolaCreditoDisponibile } from './saldo'
import { calcolaCreditoCliente, type CreditoClienteResult } from './credito-cliente'
```

In coda al file (dopo `fetchMovimentiCreditoValidi`, aggiunta in Task 9), aggiungi:

```typescript
export interface DovutoEstratto {
  id: string
  origine: 'fattura' | 'lavoro_diretto'
  numero: string
  data: string
  totale: number
  residuo: number
  pagata: boolean
  giorni_ritardo: number
  stato_sdi: string | null
}

export interface LavoroInAttesa {
  id: string
  numero_lavoro: string
  prezzo_unitario: number
  data_consegna_prevista: string
}

export interface ContabilitaCliente {
  dovuti: DovutoEstratto[]
  lavoriInAttesa: LavoroInAttesa[]
  creditoCliente: CreditoClienteResult
}

/**
 * Vista "Contabilità cliente" completa (spec B2 §UI): lista unificata dei
 * dovuti (fatture + lavori diretti, taggati per origine), lavori in attesa
 * di decisione, e i 4 numeri di credito cliente (mai fusi — spec B2 §5).
 */
export async function getContabilitaCliente(
  svc: SupabaseClient,
  labId: string,
  clienteId: string
): Promise<ContabilitaCliente> {
  const now = Date.now()

  // NOTA (finding review finale whole-branch, dopo Task 16): manca il filtro
  // `stato_sdi != 'draft'` — senza, una fattura bozza (mai inviata) con un
  // saldo comparirebbe qui come dovuto confermato, mentre Dashboard/Scadenzario
  // (Task 9/11) la escludono sempre. Allineato agli altri due path.
  const { data: fattureRaw } = await svc
    .from('fatture')
    .select('id, numero, data, totale, importo_pagato, stato_sdi, pagata')
    .eq('cliente_id', clienteId)
    .eq('laboratorio_id', labId)
    .neq('stato_sdi', 'draft')
    .is('deleted_at', null)
    .order('data', { ascending: false })

  const fattureDovuti: DovutoEstratto[] = ((fattureRaw ?? []) as Array<{
    id: string; numero: string; data: string; totale: number; importo_pagato: number
    stato_sdi: string; pagata: boolean
  }>).map((f) => {
    const residuo = Math.max(0, Math.round((Number(f.totale) - Number(f.importo_pagato ?? 0)) * 100) / 100)
    return {
      id: f.id,
      origine: 'fattura' as const,
      numero: f.numero,
      data: f.data,
      totale: f.totale ?? 0,
      residuo: f.pagata ? 0 : residuo,
      pagata: f.pagata ?? false,
      giorni_ritardo: Math.floor((now - new Date(f.data).getTime()) / 86_400_000),
      stato_sdi: f.stato_sdi ?? 'draft',
    }
  })

  const { data: lavoriRaw } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, prezzo_unitario, data_consegna_prevista, decisione_fatturazione, incluso_in_fattura,
      pagamenti(importo, stato),
      credito_clienti_movimenti(importo, tipo)
    `)
    .eq('cliente_id', clienteId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .not('stato', 'in', '("annullato")')
    .gt('prezzo_unitario', 0)

  const lavoriConfermati: DovutoEstratto[] = []
  const lavoriInAttesa: LavoroInAttesa[] = []
  // Bucket separati per decisione_fatturazione (finding review finale: prima
  // venivano mischiati tutti in lavoriFatturareNonInclusi — la somma finale
  // era comunque corretta perché calcolaCreditoCliente li somma entrambi in
  // "confermato", ma l'etichettatura era fuorviante per chi legge il codice).
  const residuiNonFatturare: Array<{ residuo: number }> = []
  const residuiFatturareNonInclusi: Array<{ residuo: number }> = []

  for (const l of (lavoriRaw ?? []) as unknown as Array<{
    id: string; numero_lavoro: string; prezzo_unitario: number | null; data_consegna_prevista: string
    decisione_fatturazione: string; incluso_in_fattura: boolean
    pagamenti: Array<{ importo: number; stato: string }>
    credito_clienti_movimenti: Array<{ importo: number; tipo: string }>
  }>) {
    if (l.decisione_fatturazione === 'in_attesa') {
      lavoriInAttesa.push({
        id: l.id,
        numero_lavoro: l.numero_lavoro,
        prezzo_unitario: Number(l.prezzo_unitario ?? 0),
        data_consegna_prevista: l.data_consegna_prevista,
      })
      continue
    }

    // Già confluito nel bucket fatture sopra il giorno in cui è stato incluso — mai due volte.
    if (l.incluso_in_fattura) continue

    const pagamentiAttivi = (l.pagamenti ?? []).filter((p) => p.stato === 'attivo')
    const applicazioni = (l.credito_clienti_movimenti ?? []).filter((m) => m.tipo === 'applicazione')
    const residuo = calcolaResiduo(Number(l.prezzo_unitario ?? 0), pagamentiAttivi, applicazioni)

    if (residuo <= 0) continue // saldato — non è più un dovuto

    lavoriConfermati.push({
      id: l.id,
      origine: 'lavoro_diretto',
      numero: l.numero_lavoro,
      data: l.data_consegna_prevista,
      totale: Number(l.prezzo_unitario ?? 0),
      residuo,
      pagata: false,
      giorni_ritardo: Math.floor((now - new Date(l.data_consegna_prevista).getTime()) / 86_400_000),
      stato_sdi: null,
    })

    if (l.decisione_fatturazione === 'non_fatturare') {
      residuiNonFatturare.push({ residuo })
    } else {
      residuiFatturareNonInclusi.push({ residuo })
    }
  }

  const nonSaldati = [...fattureDovuti.filter((f) => !f.pagata), ...lavoriConfermati]
    .sort((a, b) => b.giorni_ritardo - a.giorni_ritardo)
  const saldati = fattureDovuti
    .filter((f) => f.pagata)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  // fetchMovimentiCreditoValidi (Task 9) applica già il filtro anti-credito-
  // fantasma: un'eccedenza il cui pagamento sorgente è stato annullato/
  // sostituito non conta più.
  const movimentiValidi = await fetchMovimentiCreditoValidi(svc, labId, clienteId)
  const creditoDisponibile = calcolaCreditoDisponibile(movimentiValidi)

  const creditoCliente = calcolaCreditoCliente({
    fattureNonSaldate: fattureDovuti.filter((f) => !f.pagata).map((f) => ({ residuo: f.residuo })),
    lavoriNonFatturareNonSaldati: residuiNonFatturare,
    lavoriFatturareNonInclusi: residuiFatturareNonInclusi,
    lavoriInAttesa: lavoriInAttesa.map((l) => ({ residuo: l.prezzo_unitario })),
    creditoDisponibile,
  })

  return { dovuti: [...nonSaldati, ...saldati], lavoriInAttesa, creditoCliente }
}
```

- [ ] **Step 4: Esegui i test per verificare che passino**

Run: `npx vitest run tests/unit/contabilita-cliente-query.test.ts`
Expected: PASS — 5/5 test verdi

- [ ] **Step 5: Riscrivi `src/app/api/scadenzario/[cliente_id]/route.ts`**

```typescript
// src/app/api/scadenzario/[cliente_id]/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getContabilitaCliente, type DovutoEstratto, type LavoroInAttesa } from '@/lib/contabilita/queries'

export type { DovutoEstratto, LavoroInAttesa }

export interface EstrattoContoResponse {
  cliente: {
    id: string
    nome: string
    cognome: string
    studio_nome: string | null
    telefono: string | null
    indirizzo: string | null
    cap: string | null
    citta: string | null
  }
  dovuti: DovutoEstratto[]
  lavoriInAttesa: LavoroInAttesa[]
  creditoCliente: { confermato: number; potenziale: number; disponibile: number; totale: number }
}

// ─── GET /api/scadenzario/[cliente_id] ───────────────────────────────────────
// Vista "Contabilità cliente" completa (B2): dovuti unificati, lavori in
// attesa di decisione, credito cliente (confermato/potenziale/disponibile/totale).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cliente_id: string }> }
) {
  const { cliente_id } = await params

  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
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

  const { data: clienteRow, error: clienteError } = await svc
    .from('clienti')
    .select('id, nome, cognome, studio_nome, telefono, indirizzo, cap, citta')
    .eq('id', cliente_id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (clienteError || !clienteRow) {
    return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  }

  const { dovuti, lavoriInAttesa, creditoCliente } = await getContabilitaCliente(svc, labId, cliente_id)

  const response: EstrattoContoResponse = {
    cliente: {
      id: clienteRow.id,
      nome: clienteRow.nome,
      cognome: clienteRow.cognome,
      studio_nome: clienteRow.studio_nome,
      telefono: clienteRow.telefono,
      indirizzo: clienteRow.indirizzo,
      cap: clienteRow.cap,
      citta: clienteRow.citta,
    },
    dovuti,
    lavoriInAttesa,
    creditoCliente,
  }

  return NextResponse.json(response)
}
```

- [ ] **Step 6: Riscrivi `src/app/(app)/scadenzario/[cliente_id]/page.tsx`**

```typescript
// src/app/(app)/scadenzario/[cliente_id]/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EstrattoContoView } from '@/components/features/scadenzario/EstrattoContoView'
import { getContabilitaCliente } from '@/lib/contabilita/queries'
import type { EstrattoContoResponse } from '@/app/api/scadenzario/[cliente_id]/route'

interface Props {
  params: Promise<{ cliente_id: string }>
}

export async function generateMetadata() {
  return { title: 'Contabilità cliente | UÀ' }
}

export default async function EstrattoContoPage({ params }: Props) {
  const { cliente_id } = await params

  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) redirect('/login')

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const labId: string = utente.laboratorio_id

  const { data: clienteRow } = await svc
    .from('clienti')
    .select('id, nome, cognome, studio_nome, telefono, indirizzo, cap, citta')
    .eq('id', cliente_id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!clienteRow) redirect('/scadenzario')

  const { dovuti, lavoriInAttesa, creditoCliente } = await getContabilitaCliente(svc, labId, cliente_id)

  const dati: EstrattoContoResponse = {
    cliente: {
      id: clienteRow.id,
      nome: clienteRow.nome,
      cognome: clienteRow.cognome,
      studio_nome: clienteRow.studio_nome,
      telefono: clienteRow.telefono,
      indirizzo: clienteRow.indirizzo,
      cap: clienteRow.cap,
      citta: clienteRow.citta,
    },
    dovuti,
    lavoriInAttesa,
    creditoCliente,
  }

  const nomeDisplay = clienteRow.studio_nome ?? `${clienteRow.nome} ${clienteRow.cognome}`

  return (
    <PageWrapper>
      <AppHeader
        title={nomeDisplay}
        subtitle="Contabilità cliente"
        backHref="/scadenzario"
      />
      <EstrattoContoView dati={dati} />
    </PageWrapper>
  )
}
```

- [ ] **Step 7: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: errori attesi in `EstrattoContoView.tsx` e nei componenti Task 14 (riferiscono ancora `FatturaEstratto`/`dati.fatture`) — verranno risolti dagli step successivi di questo stesso task. Procedi comunque, è uno stato intermedio previsto.

- [ ] **Step 8: Commit intermedio (backend)**

```bash
git add src/lib/contabilita/queries.ts tests/unit/contabilita-cliente-query.test.ts "src/app/api/scadenzario/[cliente_id]/route.ts" "src/app/(app)/scadenzario/[cliente_id]/page.tsx"
git commit -m "feat(api): B2 — getContabilitaCliente, endpoint e pagina restituiscono dovuti unificati + credito cliente"
```

- [ ] **Step 9: Generalizza `estratto-conto-shared.ts` (i 5 helper `urgency*` accettano qualunque riga con `pagata`/`giorni_ritardo`, non solo `FatturaEstratto`)**

Sostituisci l'intero file con:

```typescript
// src/components/features/scadenzario/estratto-conto-shared.ts

interface RigaUrgenza {
  pagata: boolean
  giorni_ritardo: number
}

export const DS = {
  bg:      'var(--bg, #DDD8D3)',
  sfc:     'var(--sfc, #E4DFD9)',
  elv:     'var(--elv, #EDEDEA)',
  prs:     'var(--prs, #D4CFC9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #4A3D33)',
  t3:      'var(--t3, #6B5C51)',
  red:     'var(--primary, #D90012)',
  gold:    'var(--c-amber, #F59E0B)',
  green:   'var(--success, #16A34A)',
  shB: 'var(--sh-b)',
  shI: 'var(--sh-i)',
} as const

export const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export function formatData(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function urgencyColor(f: RigaUrgenza): string {
  if (f.pagata) return DS.green
  if (f.giorni_ritardo > 60) return DS.red
  if (f.giorni_ritardo >= 30) return DS.gold
  return DS.t2
}

export function urgencyEmoji(f: RigaUrgenza): string {
  if (f.pagata) return '✅'
  if (f.giorni_ritardo > 60) return '⏰'
  if (f.giorni_ritardo >= 30) return '⏳'
  return '🧾'
}

export function urgencyLabel(f: RigaUrgenza): string {
  if (f.pagata) return 'Pagata'
  if (f.giorni_ritardo > 60) return 'Urgente'
  if (f.giorni_ritardo >= 30) return 'In ritardo'
  return 'In sospeso'
}

export function urgencyPillBg(f: RigaUrgenza): string {
  return `${urgencyColor(f)}22`
}

export function urgencyPillBorder(f: RigaUrgenza): string {
  return `1px solid ${urgencyColor(f)}44`
}

const STATO_SDI_LABEL: Record<string, string> = {
  draft:          'Bozza',
  generata:       'XML Pronto',
  smtp_inviata:   'Inviata',
  pec_consegnata: 'Consegnata',
  ricevuta_sdi:   'Ricevuta SDI',
  accettata:      'Accettata',
  rifiutata:      'Rifiutata',
  scaduta:        'Scaduta',
}

export function labelStatoSDI(stato: string): string {
  return STATO_SDI_LABEL[stato] ?? stato
}

export function labelOrigine(origine: 'fattura' | 'lavoro_diretto'): string {
  return origine === 'fattura' ? 'Fattura' : 'Lavoro diretto'
}
```

- [ ] **Step 10: Generalizza `FatturaCard.tsx` per `DovutoEstratto`**

Sostituisci il contenuto con:

```tsx
// src/components/features/scadenzario/FatturaCard.tsx
'use client'

import { motion } from 'motion/react'
import { t, staggerDelay } from '@/design-system/motion'
import type { DovutoEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData, urgencyColor, urgencyEmoji, urgencyLabel, urgencyPillBg, urgencyPillBorder, labelOrigine } from './estratto-conto-shared'

interface FatturaCardProps {
  dovuto: DovutoEstratto
  index: number
  onTap: (d: DovutoEstratto) => void
  reducedMotion: boolean
}

export function FatturaCard({ dovuto, index, onTap, reducedMotion }: FatturaCardProps) {
  const color = urgencyColor(dovuto)
  const delay = Math.min(index * staggerDelay(8), 0.25)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={reducedMotion ? { duration: 0 } : { ...t('normal', 'enter'), delay }}
    >
      <button
        type="button"
        onClick={() => onTap(dovuto)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '14px 16px',
          background: DS.sfc,
          borderRadius: 16,
          boxShadow: DS.shB,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'DM Sans, sans-serif',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={`${labelOrigine(dovuto.origine)} ${dovuto.numero} — ${fmt.format(dovuto.residuo)} — ${urgencyLabel(dovuto)}`}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 56,
          padding: '6px 8px',
          background: urgencyPillBg(dovuto),
          border: urgencyPillBorder(dovuto),
          borderRadius: 12,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{urgencyEmoji(dovuto)}</span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 9,
            fontWeight: 700,
            color,
            marginTop: 3,
            textAlign: 'center',
            letterSpacing: '0.03em',
          }}>
            {urgencyLabel(dovuto)}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            color: DS.t1,
            marginBottom: 2,
          }}>
            N. {dovuto.numero}
            <span style={{
              marginLeft: 6, fontSize: 10, fontWeight: 700, color: DS.t3,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {labelOrigine(dovuto.origine)}
            </span>
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: DS.t2,
          }}>
            {formatData(dovuto.data)}
            {!dovuto.pagata && (
              <span style={{ marginLeft: 4, color }}>
                · {dovuto.giorni_ritardo}gg
              </span>
            )}
          </div>
        </div>

        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          fontWeight: 700,
          color,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>
          {fmt.format(dovuto.pagata ? dovuto.totale : dovuto.residuo)}
        </div>
      </button>
    </motion.div>
  )
}
```

- [ ] **Step 11: Generalizza `TabellaFatture.tsx` per `DovutoEstratto` (aggiunge colonna Origine)**

Sostituisci il contenuto con:

```tsx
// src/components/features/scadenzario/TabellaFatture.tsx
'use client'

import { useState } from 'react'
import type { DovutoEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData, urgencyColor, urgencyPillBg, urgencyPillBorder, urgencyEmoji, labelStatoSDI, labelOrigine } from './estratto-conto-shared'

type SortKey = 'data' | 'totale' | 'origine' | 'giorni_ritardo'
type SortDir = 'asc' | 'desc'

export function TabellaFatture({
  dovuti,
  onTap,
}: {
  dovuti: DovutoEstratto[]
  onTap: (d: DovutoEstratto) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('giorni_ritardo')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...dovuti].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'data') cmp = new Date(a.data).getTime() - new Date(b.data).getTime()
    else if (sortKey === 'totale') cmp = (a.pagata ? a.totale : a.residuo) - (b.pagata ? b.totale : b.residuo)
    else if (sortKey === 'origine') cmp = a.origine.localeCompare(b.origine)
    else if (sortKey === 'giorni_ritardo') cmp = a.giorni_ritardo - b.giorni_ritardo
    return sortDir === 'asc' ? cmp : -cmp
  })

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '10px 12px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: sortKey === key ? DS.t1 : DS.t3,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: `1px solid rgba(0,0,0,.06)`,
    background: DS.elv,
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{ margin: '0 16px', overflowX: 'auto', borderRadius: 16, boxShadow: DS.shB }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: DS.sfc }}>
        <thead>
          <tr>
            <th style={thStyle('data')} onClick={() => handleSort('data')}>
              Data {sortKey === 'data' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={thStyle('origine')} onClick={() => handleSort('origine')}>
              Origine {sortKey === 'origine' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={{ ...thStyle('totale'), textAlign: 'right' }} onClick={() => handleSort('totale')}>
              Residuo {sortKey === 'totale' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={thStyle('giorni_ritardo')} onClick={() => handleSort('giorni_ritardo')}>
              Giorni {sortKey === 'giorni_ritardo' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.06)', background: DS.elv, borderRadius: '0 16px 0 0' }}>
              <span style={{ display: 'none' }}>Azioni</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => {
            const color = urgencyColor(d)
            return (
              <tr
                key={d.id}
                style={{
                  borderBottom: i < sorted.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => onTap(d)}
              >
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: DS.t1,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>N. {d.numero}</div>
                  <div style={{ fontSize: 11, color: DS.t2, marginTop: 2 }}>{formatData(d.data)}</div>
                </td>
                <td style={{ padding: '12px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: DS.t2 }}>
                  {labelOrigine(d.origine)}
                  {d.origine === 'fattura' && (
                    <div style={{ fontSize: 11, marginTop: 2 }}>{labelStatoSDI(d.stato_sdi ?? 'draft')}</div>
                  )}
                </td>
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  color,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmt.format(d.pagata ? d.totale : d.residuo)}
                </td>
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: d.pagata ? DS.t3 : color,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {d.pagata ? '—' : `${d.giorni_ritardo}gg`}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onTap(d) }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: DS.elv,
                      color: DS.t2,
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '-2px -2px 6px rgba(255,255,255,.72), 3px 4px 10px -2px rgba(148,128,118,.40)',
                    }}
                  >
                    Dettagli →
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 12: Riscrivi `KpiBar.tsx` con le 4 metriche del credito cliente**

```tsx
// src/components/features/scadenzario/KpiBar.tsx
'use client'

import { motion } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { DS, fmt } from './estratto-conto-shared'

interface KpiBarProps {
  confermato: number
  potenziale: number
  disponibile: number
  totale: number
}

export function KpiBar({ confermato, potenziale, disponibile, totale }: KpiBarProps) {
  const reducedMotion = useReducedMotion()
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      margin: '0 16px 20px',
    }}>
      <KpiCard label="Totale dovuto" value={fmt.format(totale)} color={totale > 0 ? DS.red : DS.green} sub="confermato + potenziale" reducedMotion={reducedMotion} />
      <KpiCard label="Credito confermato" value={fmt.format(confermato)} color={DS.t1} sub="fatture + lavori decisi" reducedMotion={reducedMotion} />
      <KpiCard label="Credito potenziale" value={fmt.format(potenziale)} color={DS.gold} sub="lavori in attesa" reducedMotion={reducedMotion} />
      <KpiCard label="Credito disponibile" value={fmt.format(disponibile)} color={disponibile > 0 ? DS.green : DS.t3} sub="a favore del cliente" reducedMotion={reducedMotion} />
    </div>
  )
}

function KpiCard({ label, value, color, sub, reducedMotion }: { label: string; value: string; color: string; sub: string; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : motionTokens.spring.gentle}
      style={{
        background: DS.sfc,
        borderRadius: 16,
        padding: '14px 12px',
        boxShadow: DS.shB,
        textAlign: 'left',
      }}
    >
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        fontWeight: 700,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 18,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
        marginBottom: 2,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        color: DS.t2,
      }}>
        {sub}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 13: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: errori residui solo in `EstrattoContoView.tsx` (non ancora aggiornato — risolto negli step successivi)

- [ ] **Step 14: Commit intermedio (componenti generalizzati)**

```bash
git add src/components/features/scadenzario/estratto-conto-shared.ts src/components/features/scadenzario/FatturaCard.tsx src/components/features/scadenzario/TabellaFatture.tsx src/components/features/scadenzario/KpiBar.tsx
git commit -m "refactor(ui): B2 — FatturaCard/TabellaFatture/KpiBar generalizzati su DovutoEstratto"
```

- [ ] **Step 15: Crea `LavoriInAttesaSection.tsx`**

```tsx
// src/components/features/scadenzario/LavoriInAttesaSection.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { LavoroInAttesa } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData } from './estratto-conto-shared'

interface Props {
  lavori: LavoroInAttesa[]
}

export function LavoriInAttesaSection({ lavori }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const decidi = useCallback(async (id: string, decisione: 'fatturare' | 'non_fatturare') => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/lavori/${id}/decisione-fatturazione`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisione }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoadingId(null)
    }
  }, [router])

  if (lavori.length === 0) return null

  return (
    <section style={{ margin: '0 16px 24px' }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color: DS.t3,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
      }}>
        Lavori in attesa di decisione ({lavori.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lavori.map((l) => (
          <div key={l.id} style={{
            background: DS.sfc, borderRadius: 16, padding: '14px 16px', boxShadow: DS.shB,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: DS.t1 }}>
                N. {l.numero_lavoro}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: DS.t2 }}>
                {formatData(l.data_consegna_prevista)} · {fmt.format(l.prezzo_unitario)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                disabled={loadingId === l.id}
                onClick={() => decidi(l.id, 'fatturare')}
                style={{
                  padding: '8px 12px', borderRadius: 100, border: 'none',
                  background: DS.elv, color: DS.t1, fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Fatturare
              </button>
              <button
                type="button"
                disabled={loadingId === l.id}
                onClick={() => decidi(l.id, 'non_fatturare')}
                style={{
                  padding: '8px 12px', borderRadius: 100, border: 'none',
                  background: DS.elv, color: DS.t2, fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Non fatturare
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 16: Crea `CreditoSheet.tsx`**

```tsx
// src/components/features/scadenzario/CreditoSheet.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticSuccess } from '@/lib/feedback/haptic'
import type { DovutoEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, labelOrigine } from './estratto-conto-shared'

const METODI: Array<{ value: string; label: string }> = [
  { value: 'contanti', label: 'Contanti' },
  { value: 'bonifico', label: 'Bonifico' },
  { value: 'pos', label: 'POS' },
  { value: 'assegno', label: 'Assegno' },
  { value: 'altro', label: 'Altro' },
]

interface Props {
  mode: 'applica' | 'rimborsa' | null
  clienteId: string
  disponibile: number
  dovutiApplicabili: DovutoEstratto[]
  onClose: () => void
}

export function CreditoSheet({ mode, clienteId, disponibile, dovutiApplicabili, onClose }: Props) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [dovutoId, setDovutoId] = useState<string>(dovutiApplicabili[0]?.id ?? '')
  const [importo, setImporto] = useState<string>('')
  const [metodo, setMetodo] = useState<string>('contanti')
  const [metodoNota, setMetodoNota] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!mode || loading) return
    const importoNum = Number(importo)
    if (!(importoNum > 0)) {
      setErrore('Inserisci un importo valido')
      return
    }
    if (importoNum > disponibile) {
      setErrore(`Importo superiore al credito disponibile (${fmt.format(disponibile)})`)
      return
    }

    setLoading(true)
    setErrore(null)
    try {
      const url = mode === 'applica'
        ? `/api/clienti/${clienteId}/credito/applica`
        : `/api/clienti/${clienteId}/credito/rimborsa`

      const dovuto = dovutiApplicabili.find((d) => d.id === dovutoId)
      const body = mode === 'applica'
        ? {
            importo: importoNum,
            ...(dovuto?.origine === 'fattura' ? { fattura_id: dovuto.id } : { lavoro_id: dovuto?.id }),
          }
        : { importo: importoNum, metodo, metodo_nota: metodoNota || null }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrore(json.error ?? 'Errore')
        return
      }
      hapticSuccess()
      setImporto('')
      setMetodoNota('')
      router.refresh()
      onClose()
    } catch {
      setErrore('Errore di rete — riprova')
    } finally {
      setLoading(false)
    }
  }, [mode, loading, importo, disponibile, dovutiApplicabili, dovutoId, metodo, metodoNota, clienteId, router, onClose])

  return (
    <AnimatePresence>
      {mode && (
        <>
          <motion.div
            key="credito-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.32)' }}
          />
          <motion.div
            key="credito-sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 81,
              background: DS.sfc, borderRadius: '28px 28px 0 0',
              maxWidth: 600, margin: '0 auto', maxHeight: '92dvh',
              display: 'flex', flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'applica' ? 'Applica credito' : 'Rimborsa credito'}
          >
            <div style={{ width: 36, height: 4, background: DS.t3, borderRadius: 99, margin: '12px auto 16px' }} />

            <div style={{ padding: '0 20px 16px', flex: 1, overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 4px', fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: DS.t1 }}>
                {mode === 'applica' ? 'Applica credito a un dovuto' : 'Rimborsa credito'}
              </h2>
              <p style={{ margin: '0 0 20px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.t2 }}>
                Credito disponibile: {fmt.format(disponibile)}
              </p>

              {mode === 'applica' && (
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                    Dovuto target
                  </span>
                  <select
                    value={dovutoId}
                    onChange={(e) => setDovutoId(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`, background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: DS.t1 }}
                  >
                    {dovutiApplicabili.map((d) => (
                      <option key={d.id} value={d.id}>
                        {labelOrigine(d.origine)} N. {d.numero} — residuo {fmt.format(d.residuo)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Importo (€)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`, background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1 }}
                />
              </label>

              {mode === 'rimborsa' && (
                <>
                  <label style={{ display: 'block', marginBottom: 14 }}>
                    <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                      Metodo
                    </span>
                    <select
                      value={metodo}
                      onChange={(e) => setMetodo(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`, background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1 }}
                    >
                      {METODI.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                    </select>
                  </label>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                      Nota (opzionale)
                    </span>
                    <input
                      type="text"
                      value={metodoNota}
                      onChange={(e) => setMetodoNota(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`, background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1 }}
                    />
                  </label>
                </>
              )}

              {errore && (
                <p role="alert" style={{ margin: '8px 0 0', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.red }}>
                  {errore}
                </p>
              )}
            </div>

            <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (mode === 'applica' && dovutiApplicabili.length === 0)}
                style={{
                  width: '100%', minHeight: 52, borderRadius: 100, border: 'none',
                  background: DS.green, color: '#fff', fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Invio…' : mode === 'applica' ? '✓ Applica credito' : '✓ Registra rimborso'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 17: Crea `CreditoDisponibileSection.tsx`**

```tsx
// src/components/features/scadenzario/CreditoDisponibileSection.tsx
'use client'

import { useState } from 'react'
import type { DovutoEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt } from './estratto-conto-shared'
import { CreditoSheet } from './CreditoSheet'

interface Props {
  disponibile: number
  clienteId: string
  dovutiApplicabili: DovutoEstratto[]
}

export function CreditoDisponibileSection({ disponibile, clienteId, dovutiApplicabili }: Props) {
  const [mode, setMode] = useState<'applica' | 'rimborsa' | null>(null)

  if (disponibile <= 0) return null

  return (
    <section style={{ margin: '0 16px 24px' }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color: DS.t3,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
      }}>
        Credito disponibile
      </div>
      <div style={{ background: DS.sfc, borderRadius: 16, padding: '16px', boxShadow: DS.shB }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 24, fontWeight: 700, color: DS.green,
          fontVariantNumeric: 'tabular-nums', marginBottom: 12,
        }}>
          {fmt.format(disponibile)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={dovutiApplicabili.length === 0}
            onClick={() => setMode('applica')}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 100, border: `1px solid ${DS.prs}`,
              background: DS.elv, color: DS.t1, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              cursor: dovutiApplicabili.length === 0 ? 'not-allowed' : 'pointer',
              opacity: dovutiApplicabili.length === 0 ? 0.5 : 1,
            }}
          >
            Applica a un dovuto
          </button>
          <button
            type="button"
            onClick={() => setMode('rimborsa')}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 100, border: 'none',
              background: DS.elv, color: DS.t1, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Rimborsa
          </button>
        </div>
      </div>

      <CreditoSheet
        mode={mode}
        clienteId={clienteId}
        disponibile={disponibile}
        dovutiApplicabili={dovutiApplicabili}
        onClose={() => setMode(null)}
      />
    </section>
  )
}
```

- [ ] **Step 18: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: errori residui solo in `EstrattoContoView.tsx` (aggiornato nello step finale)

- [ ] **Step 19: Commit intermedio (nuove sezioni)**

```bash
git add src/components/features/scadenzario/LavoriInAttesaSection.tsx src/components/features/scadenzario/CreditoSheet.tsx src/components/features/scadenzario/CreditoDisponibileSection.tsx
git commit -m "feat(ui): B2 — sezioni Lavori in attesa e Credito disponibile"
```

- [ ] **Step 20: Sostituisci interamente il contenuto di `EstrattoContoView.tsx`**

Questo step sovrascrive l'intero file — supersede ogni modifica parziale fatta ai Task 13/14 su questo stesso file, incorporandole nella versione finale:

```tsx
// src/components/features/scadenzario/EstrattoContoView.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { buildWhatsappSollecito, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'
import type { EstrattoContoResponse, DovutoEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { RegistraPagamentoSheet, type TargetPagamento } from './RegistraPagamentoSheet'
import { FatturaCard } from './FatturaCard'
import { KpiBar } from './KpiBar'
import { TabellaFatture } from './TabellaFatture'
import { ClienteInfoCard } from './ClienteInfoCard'
import { LavoriInAttesaSection } from './LavoriInAttesaSection'
import { CreditoDisponibileSection } from './CreditoDisponibileSection'
import {
  DS, fmt, urgencyColor, urgencyEmoji, urgencyLabel, urgencyPillBg, urgencyPillBorder,
  labelStatoSDI, labelOrigine,
} from './estratto-conto-shared'

// ─── DovutoBottomSheet ────────────────────────────────────────────────────────

interface BottomSheetProps {
  dovuto: DovutoEstratto | null
  telefono: string | null
  studioNome: string
  onClose: () => void
  onRegistraPagamento: (target: TargetPagamento) => void
}

function DovutoBottomSheet({ dovuto, telefono, studioNome, onClose, onRegistraPagamento }: BottomSheetProps) {
  const reducedMotion = useReducedMotion()
  const color = dovuto ? urgencyColor(dovuto) : DS.t2

  const whatsappMsg = dovuto ? buildWhatsappSollecito({ studioNome, totaleInsoluto: dovuto.residuo }) : ''
  const whatsappUrl = (dovuto && telefono && !dovuto.pagata) ? buildWhatsappUrl(whatsappMsg, telefono) : ''

  return (
    <AnimatePresence>
      {dovuto && (
        <>
          <motion.div
            key="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : t('fast', 'exit')}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 70,
              background: 'rgba(0,0,0,.32)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />

          <motion.div
            key="sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 71,
              background: DS.sfc,
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
              paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
              maxHeight: '80dvh',
              overflowY: 'auto',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Dettaglio ${labelOrigine(dovuto.origine)} ${dovuto.numero}`}
          >
            <div style={{ width: 36, height: 4, background: DS.t3, borderRadius: 99, margin: '12px auto 20px' }} />

            <div style={{ padding: '0 20px 16px', borderBottom: `1px solid rgba(0,0,0,.06)` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h2 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 700, color: DS.t1, letterSpacing: '-0.02em' }}>
                  {labelOrigine(dovuto.origine)} {dovuto.numero}
                </h2>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color,
                  background: urgencyPillBg(dovuto), border: urgencyPillBorder(dovuto),
                  borderRadius: 8, padding: '3px 8px', flexShrink: 0,
                }}>
                  {urgencyEmoji(dovuto)} {urgencyLabel(dovuto)}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '16px 20px' }}>
              <KpiMini label={dovuto.pagata ? 'Importo' : 'Residuo'} value={fmt.format(dovuto.pagata ? dovuto.totale : dovuto.residuo)} color={color} />
              <KpiMini label="Giorni" value={dovuto.pagata ? '—' : `${dovuto.giorni_ritardo}gg`} color={DS.t1} />
              {dovuto.origine === 'fattura' ? (
                <KpiMini label="Stato SDI" value={labelStatoSDI(dovuto.stato_sdi ?? 'draft')} color={DS.t2} />
              ) : (
                <KpiMini label="Origine" value="Lavoro diretto" color={DS.t2} />
              )}
            </div>

            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {telefono && !dovuto.pagata && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    minHeight: 52, padding: '12px 20px', background: '#25D366', color: '#fff',
                    borderRadius: 100, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 15,
                    textDecoration: 'none', boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
                  }}
                >
                  <WhatsAppIcon />
                  Invia sollecito WhatsApp
                </a>
              )}

              {!dovuto.pagata && (
                <button
                  type="button"
                  onClick={() => {
                    onRegistraPagamento({
                      tipo: dovuto.origine === 'fattura' ? 'fattura' : 'lavoro',
                      id: dovuto.id,
                      residuo: dovuto.residuo,
                      etichetta: `${labelOrigine(dovuto.origine)} ${dovuto.numero}`,
                    })
                    onClose()
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    minHeight: 52, padding: '12px 20px', background: 'transparent', color: DS.green,
                    border: `2px solid ${DS.green}`, borderRadius: 100, fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600, fontSize: 15, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  💳 Registra pagamento
                </button>
              )}

              {dovuto.origine === 'fattura' && (
                <Link
                  href={`/fatture/${dovuto.id}`}
                  onClick={onClose}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    minHeight: 52, padding: '12px 20px', background: DS.elv, color: DS.t1,
                    borderRadius: 100, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 15,
                    textDecoration: 'none', boxShadow: DS.shB,
                  }}
                >
                  📄 Apri fattura
                </Link>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: DS.elv, borderRadius: 14, padding: '10px 12px', boxShadow: DS.shB, textAlign: 'center' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: DS.t3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word' }}>
        {value}
      </div>
    </div>
  )
}

// ─── Sezione header ───────────────────────────────────────────────────────────

function SezioneHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '0 16px 8px', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
      color: DS.t3, textTransform: 'uppercase', letterSpacing: '0.1em',
    }}>
      {label}
    </div>
  )
}

// ─── Entry point ────────────────────────────────────────────────────────────

interface Props {
  dati: EstrattoContoResponse
}

export function EstrattoContoView({ dati }: Props) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [selectedDovuto, setSelectedDovuto] = useState<DovutoEstratto | null>(null)
  const [targetPagamento, setTargetPagamento] = useState<TargetPagamento | null>(null)

  const nonSaldati = dati.dovuti.filter((d) => !d.pagata)
  const saldati = dati.dovuti.filter((d) => d.pagata)

  const openSheet = useCallback((d: DovutoEstratto) => setSelectedDovuto(d), [])
  const closeSheet = useCallback(() => setSelectedDovuto(null), [])

  const handleRegistrato = useCallback(() => {
    router.refresh()
  }, [router])

  const whatsappMsgGlobale = buildWhatsappSollecito({
    studioNome: dati.cliente.studio_nome ?? `${dati.cliente.nome} ${dati.cliente.cognome}`,
    totaleInsoluto: dati.creditoCliente.confermato,
  })
  const whatsappUrlGlobale = dati.cliente.telefono
    ? buildWhatsappUrl(whatsappMsgGlobale, dati.cliente.telefono)
    : null

  const selectedDovutoAggiornato = selectedDovuto
    ? (dati.dovuti.find((d) => d.id === selectedDovuto.id) ?? selectedDovuto)
    : null

  return (
    <>
      <style>{`
        .estratto-col-sidebar { display: none; }
        @media (min-width: 768px) {
          .estratto-layout {
            display: grid !important;
            grid-template-columns: 1fr 340px;
            gap: 24px;
            padding: 0 24px;
            align-items: start;
          }
          .estratto-col-main { min-width: 0; }
          .estratto-col-sidebar { display: block; position: sticky; top: 80px; }
        }
        @media (min-width: 1280px) {
          .estratto-card-list { display: none !important; }
          .estratto-table-view { display: block !important; }
        }
        @media (max-width: 1279px) {
          .estratto-table-view { display: none !important; }
        }
      `}</style>

      <KpiBar
        confermato={dati.creditoCliente.confermato}
        potenziale={dati.creditoCliente.potenziale}
        disponibile={dati.creditoCliente.disponibile}
        totale={dati.creditoCliente.totale}
      />

      <div className="estratto-layout">
        <div className="estratto-col-main">
          <div className="estratto-card-list">
            {nonSaldati.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SezioneHeader label={`Da incassare (${nonSaldati.length})`} />
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {nonSaldati.map((d, i) => (
                      <FatturaCard key={d.id} dovuto={d} index={i} onTap={openSheet} reducedMotion={reducedMotion} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
            {saldati.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SezioneHeader label={`Storico pagamenti (${saldati.length})`} />
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {saldati.map((d, i) => (
                      <FatturaCard key={d.id} dovuto={d} index={i} onTap={openSheet} reducedMotion={reducedMotion} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
            {dati.dovuti.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t2 }}>
                Nessun dovuto per questo cliente.
              </div>
            )}
          </div>

          <div className="estratto-table-view">
            {dati.dovuti.length > 0 ? (
              <TabellaFatture dovuti={dati.dovuti} onTap={openSheet} />
            ) : (
              <div style={{ padding: '40px 24px', textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t2 }}>
                Nessun dovuto per questo cliente.
              </div>
            )}
          </div>

          <LavoriInAttesaSection lavori={dati.lavoriInAttesa} />

          <CreditoDisponibileSection
            disponibile={dati.creditoCliente.disponibile}
            clienteId={dati.cliente.id}
            dovutiApplicabili={nonSaldati}
          />

          {dati.creditoCliente.confermato > 0 && whatsappUrlGlobale && (
            <div style={{ padding: '0 16px 24px' }} className="estratto-card-list">
              <a href={whatsappUrlGlobale} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                minHeight: 52, padding: '12px 20px', background: '#25D366', color: '#fff',
                borderRadius: 100, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 15,
                textDecoration: 'none', boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
              }}>
                <WhatsAppIcon />
                Sollecito totale — {fmt.format(dati.creditoCliente.confermato)}
              </a>
            </div>
          )}
        </div>

        <div className="estratto-col-sidebar">
          <ClienteInfoCard cliente={dati.cliente} saldo_insoluto={dati.creditoCliente.confermato} />
          {dati.creditoCliente.confermato > 0 && whatsappUrlGlobale && (
            <div style={{ marginTop: 12 }}>
              <a href={whatsappUrlGlobale} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                minHeight: 52, padding: '12px 20px', background: '#25D366', color: '#fff',
                borderRadius: 100, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 15,
                textDecoration: 'none', boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
              }}>
                <WhatsAppIcon />
                Invia sollecito WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      <DovutoBottomSheet
        dovuto={selectedDovutoAggiornato}
        telefono={dati.cliente.telefono}
        studioNome={dati.cliente.studio_nome ?? `${dati.cliente.nome} ${dati.cliente.cognome}`}
        onClose={closeSheet}
        onRegistraPagamento={setTargetPagamento}
      />

      <RegistraPagamentoSheet
        target={targetPagamento}
        onClose={() => setTargetPagamento(null)}
        onRegistrato={handleRegistrato}
      />
    </>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.87 9.87 0 0 0 12.04 2Z" />
    </svg>
  )
}
```

- [ ] **Step 21: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 22: Verifica manuale sui 3 viewport, entrambi i temi**

Avvia `npm run dev`, apri `/scadenzario/[cliente_id]` per un cliente di test con: almeno una fattura non pagata, un lavoro `non_fatturare` con pagamento parziale, un lavoro `in_attesa`, e un credito disponibile > 0 (registra un pagamento in eccedenza per generarlo). Verifica su 390/768/1280px, light/dark:
- KPI bar mostra le 4 metriche corrette
- Lista dovuti mostra sia la fattura sia il lavoro diretto, taggati per origine
- Sezione "Lavori in attesa di decisione" mostra il lavoro `in_attesa` con i due bottoni funzionanti
- Sezione "Credito disponibile" mostra il saldo e permette applica/rimborsa

- [ ] **Step 23: Esegui l'intera suite**

Run: `npx vitest run`
Expected: tutti i test verdi

- [ ] **Step 24: Commit finale del task**

```bash
git add src/components/features/scadenzario/EstrattoContoView.tsx
git commit -m "feat(ui): B2 — EstrattoContoView evoluto in Contabilità cliente completa (KPI 4 metriche, dovuti unificati, decisione fatturazione, credito)"
```

---

## Task 16: Rigenerazione tipi database + verifica finale completa + chiusura B2

**Files:**
- Modify: `src/types/database.types.ts` (rigenerato, non a mano)

**Interfaces:** nessuna nuova — verifica di chiusura.

- [ ] **Step 1: Rigenera i tipi dal database**

Run: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`

Rimuovi manualmente eventuale messaggio CLI residuo in fondo al file generato (pattern noto, CLAUDE.md §9 "Supabase types").

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Suite di test completa**

Run: `npx vitest run`
Expected: tutti i test verdi, inclusi tutti i nuovi file dei Task 4-5-6-7-10-15

- [ ] **Step 4: Build di produzione**

Run: `npx next build`
Expected: build completata senza errori

- [ ] **Step 5: Verifica manuale end-to-end — regressione B2 (il sintomo originale del blocker)**

Su un cliente di test del lab Filippo (`971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c`) con almeno una fattura non pagata e un lavoro `non_fatturare` con pagamento parziale:

**Prerequisito — la Dashboard legge una cache aggiornata ogni 15 minuti via pg_cron (`refresh_dashboard_cache`, Task 2 §5), mentre Scadenzario/Contabilità cliente/Front Desk leggono dati live.** Subito dopo aver registrato un pagamento i 4 numeri NON coincideranno finché la cache non si aggiorna — questo NON è una regressione. Prima di confrontare i numeri, forza il refresh via Supabase MCP `execute_sql`:

```sql
SELECT refresh_dashboard_cache('971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c');
```

1. Apri `/dashboard` (ruolo titolare) → annota il valore del widget "Pagamenti scaduti" / crediti top.
2. Apri `/scadenzario` → verifica che lo stesso cliente compaia con lo stesso `totale_insoluto` (fatture + lavoro diretto sommati).
3. Apri `/scadenzario/[cliente_id]` per quel cliente → verifica che "Credito confermato" nella KPI bar corrisponda alla somma vista sopra.
4. Se disponibile un account front_desk: apri la dashboard Front Desk → verifica che il widget "da contattare" mostri lo stesso cliente con lo stesso residuo.
5. Se disponibile un account admin_sistema: apri `/admin/labs/971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c/live` → verifica lo stesso numero nel widget pagamenti scaduti.

**Tutti e 4 i punti (Dashboard, Scadenzario, Contabilità cliente, Front Desk/admin-live) devono mostrare lo stesso numero coerente sullo stesso cliente — questo è il criterio di chiusura di B2.**

- [ ] **Step 6: Verifica manuale — flusso completo pagamenti/credito**

1. Su un lavoro `pronto` o `consegnato`, imposta `decisione_fatturazione` = `non_fatturare` dalla sezione "Lavori in attesa di decisione".
2. Registra un pagamento superiore al residuo (es. residuo 50, pagamento 80) → verifica che compaia un credito disponibile di 30 nella sezione "Credito disponibile".
3. Applica quel credito a un'altra fattura non saldata dello stesso cliente → verifica che il residuo di quella fattura si riduca di 30 e che il credito disponibile torni a 0.
4. Prova a fatturare in batch (`/fatture` → seleziona lavori → genera) un lavoro con `decisione_fatturazione = 'non_fatturare'` → verifica che NON compaia tra i candidati.
5. Modifica un pagamento esistente (PATCH) e verifica che il vecchio risulti `annullato` nello storico e il nuovo abbia `sostituisce_pagamento_id` valorizzato (via Supabase MCP `execute_sql` su `pagamenti`).
6. **Verifica anti-credito-fantasma (Task 9, fix pre-esecuzione):** registra un pagamento di 120€ su un dovuto da 100€ → verifica 20€ di credito disponibile. Prima di applicarlo o rimborsarlo, **annulla** quel pagamento (`DELETE /api/pagamenti/[id]`) → ricarica la pagina Contabilità cliente → verifica che il credito disponibile sia tornato a **0€** (non più 20€ fantasma).

- [ ] **Step 7: Aggiorna `MEMORY.md` e `ROADMAP-UFFICIALE.md` (BP-1, obbligatorio)**

Segui `CLAUDE.md` §0A: aggiorna la sezione "0. STATO DEL PROGETTO" di `ua-app/memory/MEMORY.md` segnando B2 come risolto (commit di riferimento, sintesi della causa e del fix, follow-up aperti se presenti), e sposta la voce corrispondente in `docs/roadmap/ROADMAP-UFFICIALE.md` da "in corso" a "completato".

- [ ] **Step 8: Commit finale**

```bash
git add src/types/database.types.ts ua-app/memory/MEMORY.md docs/roadmap/ROADMAP-UFFICIALE.md
git commit -m "chore(types): rigenera database.types.ts dopo migration B2; chiusura blocker B2 in memoria/roadmap"
```

---

## Self-Review

**Copertura spec:** causa radice (`lavori_partitario` mai scritta) → Task 1/2/9; ledger polimorfico `pagamenti` → Task 2/3/7/8; `decisione_fatturazione` + immutabilità → Task 2/3/6; correzioni soft-delete/modifica-come-sostituzione → Task 8; credito cliente (eccedenze/rimborsi) → Task 2/4/7/10; i 4 numeri distinti mai fusi + regressione monotonicità → Task 5 (test dedicato); trigger `fatture.pagata`/`importo_pagato` → Task 2; fix B2 nei 3 punti Dashboard/queries.ts → Task 9; Scadenzario ampliato → Task 11; pipeline fatturazione rispetta la decisione → Task 12; rimozione doppio scrittore su `fatture.pagata` → Task 13; UI "Contabilità cliente" con estrazione componenti → Task 14/15; piano di test (unit/DB/API/regressione) → Task 4/5/7/9/15 (unit), Task 2 Step 3 (DB manuale), Task 16 Step 5-6 (regressione/integrazione manuale). Nessuna sezione della spec priva di un task corrispondente. Le 8 letture morte di `lavori_partitario` non menzionate esplicitamente nella spec (scoperte durante la ricerca) sono coperte da Task 1; altri 2 punti live con un pattern di join diverso (`lavori_partitario(importo)`, senza alias — scoperti dalla review del Task 1 dopo l'esecuzione) sono coperti da Task 9, che ora ospita anche il `DROP TABLE` finale (spostato da Task 2, vedi Global Constraints e nota nel Task 9).

**Placeholder scan:** nessun TBD/TODO residuo; ogni step di codice ha contenuto completo (migration SQL integrale, funzioni TS complete, componenti React completi); ogni step di verifica ha comando + output atteso reali; le verifiche DB manuali (Task 2 Step 3, Task 16 Step 5-6) sostituiscono un harness Vitest inesistente nel repo per questo genere di test, coerente con `rls-cross-tenant.test.ts` (unico precedente, anch'esso solo statico).

**Coerenza tipi:** `RigaImporto`/`MovimentoCreditoRiga`/`StatoSaldo` (Task 4) usati identici in Task 5/7/9/10/11/15; `DovutoConfermato`/`CreditoClienteInput`/`CreditoClienteResult` (Task 5) usati identici in Task 15 (`getContabilitaCliente`); `RegistraPagamentoInput`/`RegistraPagamentoResult` (Task 7) usati identici in Task 8 (PATCH sostituzione); `DecisioneFatturazione`/`Pagamento`/`CreditoClienteMovimento` (Task 3) coerenti con le colonne create in Task 2; `CreditoScadutoPerCliente` (Task 9) ha campi identici a `FrontDeskPagamentoScaduto` già esistente, verificato assegnabile senza trasformazione; `fetchMovimentiCreditoValidi` (Task 9) usata identica in Task 10 (applica/rimborsa) e Task 15 (`getContabilitaCliente`), un'unica implementazione invece di 3 copie duplicate; `DovutoEstratto`/`LavoroInAttesa` (Task 15) sostituiscono `FatturaEstratto` in tutti e 4 i file che lo referenziavano (Task 14 componenti + `EstrattoContoView.tsx`), nessun residuo del vecchio tipo.

**Findings da review pre-esecuzione (advisor), incorporati prima dell'handoff:** (1) credito "fantasma" su annullamento pagamento — fix centralizzato in `fetchMovimentiCreditoValidi` (Task 9, join `credito_clienti_movimenti → pagamenti`, scarta eccedenze il cui pagamento sorgente non è più attivo), consumato da Task 10 e Task 15 senza duplicazione (vedi anche il finding di scansione pre-flight qui sotto), limite noto documentato (doppio impiego pre-annullamento → disponibile negativo, riconciliazione manuale) invece di essere un'omissione silenziosa; verifica manuale aggiunta a Task 16 Step 6.6. (2) Lag della cache Dashboard (pg_cron, 15 min) vs superfici live — Task 16 Step 5 ora forza `refresh_dashboard_cache()` prima del confronto cross-superficie, altrimenti il criterio di chiusura B2 testerebbe il timing invece della correttezza.

**Finding di scansione pre-flight (subagent-driven-development), incorporato prima dell'esecuzione:** la logica anti-credito-fantasma sopra era inizialmente duplicata verbatim in 3 punti (Task 9 originale = route applica, Task 9 originale = route rimborsa, Task 15 `getContabilitaCliente`) perché il modulo condiviso `contabilita/queries.ts` nasceva solo al Task 10 originale, dopo le route che ne avrebbero avuto bisogno. Risolto riordinando il piano: il vecchio Task 10 (query dashboard, crea `contabilita/queries.ts`) è diventato Task 9; il vecchio Task 9 (route applica/rimborsa) è diventato Task 10 e ora importa `fetchMovimentiCreditoValidi` da Task 9 invece di duplicarla; Task 15 fa lo stesso. Nessun altro task ha cambiato numero.

