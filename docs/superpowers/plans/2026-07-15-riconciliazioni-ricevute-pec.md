# Riconciliazioni pendenti + ricevute PEC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere visibili e risolvibili i tre stati-limite fiscali silenziosi (saldo credito negativo, collisione storno/ri-fatturazione, ricevute PEC mai riconciliate + claim orfano) con pipeline «parser-first»: upload ricevuta XML → verifica firma → writer unico forward-only.

**Architettura:** Fase R1a = debito contabile (tabella eventi, trigger TD04 a contro-movimento delta, lettori saldo, alert UI). Fase R1b = pipeline ricevute (spike XAdES, parser puro, RPC `applica_ricevuta_sdi`, 4 endpoint, pagina `/fatture/riconciliazioni`). Spec: `docs/superpowers/specs/2026-07-15-riconciliazioni-ricevute-pec-design.md` (rev.2 — fonte di verità: in ogni conflitto vince la spec).

**Tech Stack:** Next.js 16 App Router (route handlers runtime nodejs), Supabase (Postgres + RLS + Vault + Storage), vitest, fast-xml-parser (parser), libreria XAdES da spike (Task 6).

## Global Constraints

- **Dominio FatturaPA** → ogni task fiscale ha test-first; MAI dichiarare done senza output reale di `npx tsc --noEmit` + `npx vitest run` (FASE 7 a fine fase).
- **Baseline test:** 1795 pass | 19 skipped. Nessun test esistente può rompersi.
- **RLS:** sempre `public.current_lab_id()` (MAI `auth.`); SECURITY DEFINER = hardening tripartito: `REVOKE FROM PUBLIC, anon, authenticated` + `GRANT service_role` + `SET search_path = public, pg_temp`.
- **Migration:** SOLO additive (eccetto DROP+ADD dei 2 CHECK, spec §3.3); dopo ogni migration applicata: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` (rimuovere eventuale riga CLI in coda) + `npx tsc --noEmit` (FASE 6b). **Apply al DB live = GATE esplicito di Francesco.**
- **Ordine di deploy:** codice lettori PRIMA della migration `annullo_storno` (spec §3.5) — l'ordine dei task lo rispetta.
- **UI:** token da `src/design-system/tokens.ts`, animazioni SOLO da `src/design-system/motion.ts` (mai `duration:` inline), DM Sans, touch ≥ 44 px, mobile 390 card+bottom sheet (mai modal centrato, mai tabella full-width), 3 viewport × light+dark. Mockup HTML multi-variante in `docs/design/mockups/` + screenshot PRIMA del React (**GATE §0B Francesco**). Gate estetico L2 a fine ondata.
- **QA:** lab E2E `00000000-0000-0000-0000-000000000001`, MAI lab Filippo, MAI caselle PEC reali (fixture).
- **Contratto N10 intoccabile:** `send-pec.ts` non deve MAI lanciare dopo `sendMail` riuscito (`tests/unit/send-pec-invariante.test.ts`).
- **Commit format:** `feat(fatture): …` / `fix(db): …` / `test(fatture): …`.
- 🛑 Merge/push = gate esplicito di Francesco.

---

# FASE R1a — Debito contabile

### Task 1: Estensione lettori credito a `annullo_storno` (codice prima della migration)

**Files:**
- Modify: `src/lib/contabilita/saldo.ts:7-10,53-57`
- Modify: `src/lib/contabilita/queries.ts:133,143-146`
- Modify: `src/types/domain.ts:631,637,645`
- Test: `tests/unit/contabilita-annullo-storno.test.ts` (create)

**Interfaces:**
- Consumes: `calcolaCreditoDisponibile(movimenti: MovimentoCreditoRiga[])` esistente.
- Produces: `MovimentoCreditoRiga.tipo` esteso a `'eccedenza' | 'storno' | 'applicazione' | 'rimborso' | 'annullo_storno'`; `TipoMovimentoCredito` in domain.ts allineato al DB (`+ 'storno' + 'annullo_storno'`); `CreditoClienteMovimento.registrato_da: string | null`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/contabilita-annullo-storno.test.ts
import { describe, it, expect } from 'vitest'
import { calcolaCreditoDisponibile, type MovimentoCreditoRiga } from '@/lib/contabilita/saldo'

describe('calcolaCreditoDisponibile — annullo_storno (spec R1 §6)', () => {
  it('sottrae annullo_storno dal saldo (rifiuto TD04 post-applicazione → saldo negativo visibile)', () => {
    const movimenti: MovimentoCreditoRiga[] = [
      { tipo: 'storno', importo: 100 },        // TD04 emesso su fattura pagata
      { tipo: 'applicazione', importo: 60 },   // credito già speso
      { tipo: 'annullo_storno', importo: 100 }, // TD04 rifiutato da SdI
    ]
    expect(calcolaCreditoDisponibile(movimenti)).toBe(-60)
  })

  it('ciclo doppio storno→rifiuto con importi diversi: saldo netto 0', () => {
    const movimenti: MovimentoCreditoRiga[] = [
      { tipo: 'storno', importo: 100 }, { tipo: 'annullo_storno', importo: 100 },
      { tipo: 'storno', importo: 80 }, { tipo: 'annullo_storno', importo: 80 },
    ]
    expect(calcolaCreditoDisponibile(movimenti)).toBe(0)
  })

  it('annullo_storno assente = comportamento attuale invariato', () => {
    const movimenti: MovimentoCreditoRiga[] = [
      { tipo: 'eccedenza', importo: 50 }, { tipo: 'storno', importo: 30 },
      { tipo: 'applicazione', importo: 20 }, { tipo: 'rimborso', importo: 10 },
    ]
    expect(calcolaCreditoDisponibile(movimenti)).toBe(50)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/contabilita-annullo-storno.test.ts`
Expected: FAIL — TS error `'annullo_storno'` non assegnabile a `MovimentoCreditoRiga['tipo']` (o assertion -60 vs 40).

- [ ] **Step 3: Write minimal implementation**

In `src/lib/contabilita/saldo.ts` (riga 7-10 e 53-57):

```typescript
export interface MovimentoCreditoRiga {
  tipo: 'eccedenza' | 'storno' | 'applicazione' | 'rimborso' | 'annullo_storno'
  importo: number
}
```

```typescript
/**
 * Saldo credito cliente = eccedenze + storni - applicazioni - rimborsi - annulli storno.
 * 'annullo_storno' (spec R1 §6, D-2) neutralizza uno 'storno' quando il TD04 viene
 * RIFIUTATO da SdI: ledger append-only, mai DELETE. Il saldo PUÒ andare negativo
 * (credito già applicato) — la UI lo mostra come alert, non lo nasconde.
 */
export function calcolaCreditoDisponibile(movimenti: MovimentoCreditoRiga[]): number {
  const somma = (tipo: MovimentoCreditoRiga['tipo']) =>
    movimenti.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.importo, 0)
  return round2(
    somma('eccedenza') + somma('storno') - somma('applicazione') - somma('rimborso') - somma('annullo_storno')
  )
}
```

In `src/lib/contabilita/queries.ts` — le DUE union inline di `fetchMovimentiCreditoValidi` (riga 133 e 143-146) diventano:

```typescript
): Promise<Array<{ tipo: 'eccedenza' | 'storno' | 'applicazione' | 'rimborso' | 'annullo_storno'; importo: number }>> {
```

```typescript
  return ((movimentiRaw ?? []) as unknown as Array<{
    tipo: 'eccedenza' | 'storno' | 'applicazione' | 'rimborso' | 'annullo_storno'; importo: number
    pagamento_id: string | null; pagamenti: { stato: string } | null
  }>)
```

(il filtro anti-fantasma a riga 147 gatea solo `eccedenza` → `annullo_storno` passa, corretto.)

In `src/types/domain.ts` (sana anche il drift pre-esistente, spec §6):

```typescript
export type TipoMovimentoCredito = 'eccedenza' | 'applicazione' | 'rimborso' | 'storno' | 'annullo_storno';
```

e a riga 645: `registrato_da: string | null;`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/contabilita-annullo-storno.test.ts && npx tsc --noEmit`
Expected: 3 PASS, tsc 0 errori. Poi `npx vitest run` completo: nessuna regressione sulla baseline.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contabilita/saldo.ts src/lib/contabilita/queries.ts src/types/domain.ts tests/unit/contabilita-annullo-storno.test.ts
git commit -m "feat(contabilita): tipo movimento annullo_storno nei lettori credito"
```

---

### Task 2: Migration `fatture_sdi_eventi` (tabella audit append-only)

**Files:**
- Create: `supabase/migrations/20260716090000_fatture_sdi_eventi.sql`

**Interfaces:**
- Produces: tabella `public.fatture_sdi_eventi` (colonne esatte spec §3.2) usata da Task 3 (trigger), Task 9 (RPC), Task 10-12 (endpoint). Trigger `trg_sdi_eventi_append_only`.

- [ ] **Step 1: Scrivi la migration**

```sql
-- Spec R1 §3.2: audit append-only di ogni transizione stato_sdi post-invio +
-- store ricevute (proposta all'upload, completata dalla RPC all'applica).
CREATE TABLE public.fatture_sdi_eventi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id uuid NOT NULL REFERENCES public.laboratori(id),
  fattura_id uuid NULL REFERENCES public.fatture(id),
  origine text NOT NULL CHECK (origine IN ('upload_verificato','override_manuale','sblocco_claim','trigger_td04','imap')),
  tipo_ricevuta text NULL CHECK (tipo_ricevuta IN ('RC','NS','MC','NE','DT','AT')),
  stato_da text NULL,
  stato_a text NULL,
  nome_file_fattura text NULL,
  nome_file_ricevuta text NULL,     -- SOLO metadato informativo, mai chiave (spec §3.2)
  identificativo_sdi text NULL,
  esito_committente text NULL CHECK (esito_committente IN ('EC01','EC02')),
  lista_errori jsonb NULL,
  esito_verifica_firma text NULL CHECK (esito_verifica_firma IN ('valida','fallita','non_applicabile')),
  ricevuta_storage_path text NULL,
  content_sha256 text NULL,
  registrato_da uuid NULL,          -- NULL = sistema (trigger)
  motivo text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (origine NOT IN ('override_manuale','sblocco_claim') OR motivo IS NOT NULL),
  CHECK (origine <> 'upload_verificato' OR esito_verifica_firma IN ('valida','fallita'))
);

-- Idempotenza dura: SOLO sha256 (nessun vincolo sul nome file — falsi positivi
-- e squatting, spec §3.2 / riserve panel).
CREATE UNIQUE INDEX fatture_sdi_eventi_sha_unique
  ON public.fatture_sdi_eventi (laboratorio_id, content_sha256)
  WHERE content_sha256 IS NOT NULL;

CREATE INDEX fatture_sdi_eventi_fattura_idx ON public.fatture_sdi_eventi (laboratorio_id, fattura_id);
CREATE INDEX fatture_sdi_eventi_parcheggiate_idx
  ON public.fatture_sdi_eventi (laboratorio_id, created_at)
  WHERE fattura_id IS NULL AND stato_a IS NULL;

-- RLS: SOLA policy SELECT lab-scoped. Nessuna policy INSERT/UPDATE/DELETE
-- (scrive solo service_role via RPC/route) + REVOKE esplicito (difesa in
-- profondità sui default grant di Supabase).
ALTER TABLE public.fatture_sdi_eventi ENABLE ROW LEVEL SECURITY;
CREATE POLICY fatture_sdi_eventi_select ON public.fatture_sdi_eventi
  FOR SELECT TO authenticated
  USING (laboratorio_id = public.current_lab_id());
REVOKE INSERT, UPDATE, DELETE ON public.fatture_sdi_eventi FROM anon, authenticated;

-- Append-only REALE anche per service_role (spec §3.2): l'unico UPDATE ammesso
-- è il completamento della transizione (riga «proposta», stato_a IS NULL) sui
-- soli campi stato_da/stato_a/fattura_id/identificativo_sdi. DELETE mai.
CREATE OR REPLACE FUNCTION public.sdi_eventi_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'fatture_sdi_eventi è append-only: DELETE vietato';
  END IF;
  IF OLD.stato_a IS NOT NULL THEN
    RAISE EXCEPTION 'fatture_sdi_eventi: evento già completato, immutabile';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.laboratorio_id IS DISTINCT FROM OLD.laboratorio_id
     OR NEW.origine IS DISTINCT FROM OLD.origine
     OR NEW.tipo_ricevuta IS DISTINCT FROM OLD.tipo_ricevuta
     OR NEW.nome_file_fattura IS DISTINCT FROM OLD.nome_file_fattura
     OR NEW.nome_file_ricevuta IS DISTINCT FROM OLD.nome_file_ricevuta
     OR NEW.esito_committente IS DISTINCT FROM OLD.esito_committente
     OR NEW.lista_errori IS DISTINCT FROM OLD.lista_errori
     OR NEW.ricevuta_storage_path IS DISTINCT FROM OLD.ricevuta_storage_path
     OR NEW.content_sha256 IS DISTINCT FROM OLD.content_sha256
     OR NEW.registrato_da IS DISTINCT FROM OLD.registrato_da
     OR NEW.motivo IS DISTINCT FROM OLD.motivo
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'fatture_sdi_eventi: solo stato_da/stato_a/fattura_id/identificativo_sdi/esito_verifica_firma sono aggiornabili sulla riga proposta';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sdi_eventi_append_only
  BEFORE UPDATE OR DELETE ON public.fatture_sdi_eventi
  FOR EACH ROW EXECUTE FUNCTION public.sdi_eventi_guard();

REVOKE ALL ON FUNCTION public.sdi_eventi_guard() FROM PUBLIC, anon, authenticated;
```

Nota: `esito_verifica_firma` È aggiornabile sulla riga proposta (serve alla riverifica post-quarantena, spec §4.4) — per questo non è nella lista dei campi bloccati.

- [ ] **Step 2: 🛑 GATE Francesco — apply migration al DB live**

Presenta la migration; dopo OK: apply (Management API `/database/query` o `db push`), poi FASE 6b:

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```
Expected: types generati con `fatture_sdi_eventi`, tsc 0 errori. Verifica RLS: `SELECT` da utente E2E vede solo il proprio lab; INSERT da `authenticated` → permission denied.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260716090000_fatture_sdi_eventi.sql src/types/database.types.ts
git commit -m "feat(db): tabella fatture_sdi_eventi append-only con RLS e guard trigger"
```

---

### Task 3: Migration `annullo_storno` + trigger TD04 a delta

**Files:**
- Create: `supabase/migrations/20260716091000_annullo_storno_trigger_delta.sql`

**Interfaces:**
- Consumes: `fatture_sdi_eventi` (Task 2); lettori TS già estesi (Task 1 — ordine deploy spec §3.5 rispettato).
- Produces: tipo movimento `annullo_storno` nel DB; `annulla_effetti_storno_td04()` riscritta (delta + eventi, niente DELETE).

- [ ] **Step 1: Scrivi la migration**

```sql
-- Spec R1 §3.3 + §6 (D-2): contro-movimento a DELTA al posto del DELETE.
-- I lettori TS sono già deployati (Task 1) — ordine spec §3.5.

-- 1. CHECK tipo (DROP+ADD: lock + revalidation, tabella piccola — spec §3.3)
ALTER TABLE public.credito_clienti_movimenti
  DROP CONSTRAINT credito_clienti_movimenti_tipo_check;
ALTER TABLE public.credito_clienti_movimenti
  ADD CONSTRAINT credito_clienti_movimenti_tipo_check
  CHECK (tipo IN ('eccedenza','applicazione','rimborso','storno','annullo_storno'));

-- 2. CHECK shape: ramo annullo_storno (stessa shape di storno)
ALTER TABLE public.credito_clienti_movimenti
  DROP CONSTRAINT credito_clienti_movimenti_check;
ALTER TABLE public.credito_clienti_movimenti
  ADD CONSTRAINT credito_clienti_movimenti_check CHECK (
    (tipo = 'eccedenza'      AND pagamento_id IS NOT NULL AND fattura_id IS NULL AND lavoro_id IS NULL) OR
    (tipo = 'applicazione'   AND pagamento_id IS NULL AND (fattura_id IS NOT NULL) <> (lavoro_id IS NOT NULL)) OR
    (tipo = 'rimborso'       AND pagamento_id IS NULL AND fattura_id IS NULL AND lavoro_id IS NULL AND metodo IS NOT NULL) OR
    (tipo = 'storno'         AND pagamento_id IS NULL AND fattura_id IS NOT NULL AND lavoro_id IS NULL) OR
    (tipo = 'annullo_storno' AND pagamento_id IS NULL AND fattura_id IS NOT NULL AND lavoro_id IS NULL)
  );

-- 3. Trigger function riscritta: identica alla 20260715140000 salvo il punto 2
--    (delta invece di DELETE) e la scrittura eventi. Rollback = ri-eseguire la
--    versione della migration 20260715140000.
CREATE OR REPLACE FUNCTION public.annulla_effetti_storno_td04()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_lavoro_id uuid;
  v_rows int;
  v_delta numeric;
  v_cliente_id uuid;
BEGIN
  -- 1. Ri-abilita lo storno dell'originale (INVARIATO dalla 20260715140000,
  --    guardia anti-collisione con fatture_lavoro_attiva_unique inclusa) —
  --    MA il caso collisione ora scrive un evento (spec §6.1).
  UPDATE public.fatture o SET stornata_at = NULL
   WHERE o.id = NEW.fattura_collegata_id
     AND o.laboratorio_id = NEW.laboratorio_id
     AND NOT EXISTS (
       SELECT 1 FROM public.fatture c
        WHERE c.laboratorio_id = o.laboratorio_id
          AND c.lavoro_id IS NOT NULL
          AND c.lavoro_id = o.lavoro_id
          AND c.id <> o.id
          AND c.stato_sdi <> 'rifiutata'
          AND c.stornata_at IS NULL
     );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    INSERT INTO public.fatture_sdi_eventi
      (laboratorio_id, fattura_id, origine, motivo)
    VALUES
      (NEW.laboratorio_id, NEW.fattura_collegata_id, 'trigger_td04', 'collisione_rifatturazione');
  END IF;

  -- 2. Contro-movimento a DELTA (spec §6.2 — bloccante panel: il NOT EXISTS
  --    lascerebbe credito fantasma dal secondo ciclo storno→rifiuto in poi).
  SELECT COALESCE(SUM(CASE tipo WHEN 'storno' THEN importo WHEN 'annullo_storno' THEN -importo END), 0),
         MIN(cliente_id)
    INTO v_delta, v_cliente_id
    FROM public.credito_clienti_movimenti
   WHERE laboratorio_id = NEW.laboratorio_id
     AND tipo IN ('storno','annullo_storno')
     AND fattura_id = NEW.fattura_collegata_id;

  IF v_delta > 0 THEN
    INSERT INTO public.credito_clienti_movimenti
      (laboratorio_id, cliente_id, tipo, fattura_id, importo, note, registrato_da)
    VALUES
      (NEW.laboratorio_id, v_cliente_id, 'annullo_storno', NEW.fattura_collegata_id, v_delta,
       'Annullo credito storno: TD04 ' || NEW.numero || ' rifiutato da SdI', NULL);

    INSERT INTO public.fatture_sdi_eventi
      (laboratorio_id, fattura_id, origine, motivo, lista_errori)
    VALUES
      (NEW.laboratorio_id, NEW.fattura_collegata_id, 'trigger_td04', 'annullo_credito_storno',
       jsonb_build_object('importo', v_delta, 'td04_id', NEW.id));
  END IF;

  -- 3. Ripristina lo stato fiscale del lavoro (INVARIATO).
  SELECT o.lavoro_id INTO v_lavoro_id
    FROM public.fatture o
   WHERE o.id = NEW.fattura_collegata_id
     AND o.laboratorio_id = NEW.laboratorio_id;

  IF v_lavoro_id IS NOT NULL THEN
    UPDATE public.lavori
       SET incluso_in_fattura = true, decisione_fatturazione = 'fatturare'
     WHERE id = v_lavoro_id AND laboratorio_id = NEW.laboratorio_id;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.annulla_effetti_storno_td04() FROM PUBLIC, anon, authenticated;
-- Il trigger trg_fatture_td04_rifiutata esistente punta già a questa funzione:
-- CREATE OR REPLACE non richiede DROP/CREATE TRIGGER (nessuna finestra).
```

Nota su `cliente_id`: `credito_clienti_movimenti.cliente_id` è NOT NULL; `MIN(cliente_id)` dai movimenti storno esistenti dello stesso originale è sempre valorizzato quando `v_delta > 0` (esiste almeno uno storno).

- [ ] **Step 2: 🛑 GATE Francesco — apply migration al DB live + FASE 6b**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```
Expected: tsc 0 errori. Verifica manuale su DB (lab E2E): sequenza SQL storno→rifiuto→ri-storno→rifiuto produce 2 `annullo_storno` con importi corretti e delta finale 0; terza esecuzione del trigger non inserisce nulla.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260716091000_annullo_storno_trigger_delta.sql src/types/database.types.ts
git commit -m "feat(db): trigger TD04 a contro-movimento delta + eventi audit (mai DELETE)"
```

---

### Task 4: Mockup §0B — alert saldo credito negativo (🛑 GATE Francesco)

**Files:**
- Create: `docs/design/mockups/2026-07-16-alert-saldo-negativo.html`
- Create: `docs/design/mockups/screenshots/2026-07-16-alert-saldo-negativo-*.png`
- Create (dopo scelta): `docs/design/decisions/2026-07-16-alert-saldo-negativo.md`

- [ ] **Step 1:** Ricerca best practice: alert contabili in fintech (pattern «negative balance banner»), colori semantici DS v2.3 (MAI `--gold` come testo, colore mai unica fonte di stato).
- [ ] **Step 2:** Mockup HTML con dati reali simulati (saldo −60,00 €, cliente «Studio Rossi», causa «TD04 2026/0004 rifiutato da SdI») — **minimo 2 varianti × light+dark**: (A) card alert con icona ⚠ + spiegazione + CTA «Vai alla riconciliazione»; (B) banner compatto sopra la sezione con importo rosso semantico + link. Entrambe sostituiscono il `return null` di `CreditoDisponibileSection` SOLO per `disponibile < 0`.
- [ ] **Step 3:** Screenshot Playwright 390/768/1280 × light/dark in `docs/design/mockups/screenshots/`.
- [ ] **Step 4:** 🛑 Presentare a Francesco, attendere scelta variante. Scrivere la decisione in `docs/design/decisions/2026-07-16-alert-saldo-negativo.md`.
- [ ] **Step 5: Commit** — `git add docs/design/ && git commit -m "docs(design): mockup alert saldo negativo + decisione"`

---

### Task 5: React — alert saldo negativo in `CreditoDisponibileSection`

**Files:**
- Modify: `src/components/features/scadenzario/CreditoDisponibileSection.tsx:18`
- Test: `tests/unit/credito-disponibile-section.test.tsx` (create)

**Interfaces:**
- Consumes: prop esistente `disponibile: number` (già negativo-capace dopo Task 1-3). Variante approvata al Task 4.
- Produces: comportamento — `disponibile < 0` → alert; `= 0` → null (invariato); `> 0` → sezione attuale invariata.

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/unit/credito-disponibile-section.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreditoDisponibileSection } from '@/components/features/scadenzario/CreditoDisponibileSection'

const base = { clienteId: 'c1', dovutiApplicabili: [] }

describe('CreditoDisponibileSection — saldo negativo (spec R1 §7)', () => {
  it('saldo negativo → alert visibile con importo e link riconciliazione', () => {
    render(<CreditoDisponibileSection {...base} disponibile={-60} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/-60/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /riconciliazion/i })).toBeTruthy()
  })
  it('saldo zero → nessuna sezione (comportamento attuale)', () => {
    const { container } = render(<CreditoDisponibileSection {...base} disponibile={0} />)
    expect(container.innerHTML).toBe('')
  })
  it('saldo positivo → sezione azioni attuale', () => {
    render(<CreditoDisponibileSection {...base} disponibile={50} />)
    expect(screen.getByText('Applica a un dovuto')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
```

- [ ] **Step 2:** Run: `npx vitest run tests/unit/credito-disponibile-section.test.tsx` — Expected: FAIL (alert assente: oggi `<= 0` → null).
- [ ] **Step 3:** Implementa fedele alla variante approvata (Task 4). Struttura obbligatoria: early-return solo per `disponibile === 0`; ramo `disponibile < 0` renderizza il blocco alert con `role="alert"`, icona + testo «Saldo credito negativo: un TD04 è stato rifiutato da SdI dopo che il credito era già stato applicato», importo `fmt.format(disponibile)` in colore semantico rosso (`DS`), link `<a href="/fatture/riconciliazioni">Vai alla riconciliazione ›</a>`; touch ≥ 44px; nessuna animazione inline.
- [ ] **Step 4:** Run: `npx vitest run tests/unit/credito-disponibile-section.test.tsx && npx tsc --noEmit` — Expected: 3 PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(scadenzario): alert saldo credito negativo (variante approvata §0B)"`

**Chiusura FASE R1a:** `npx tsc --noEmit && npx vitest run && npx next build` (output reale) — baseline +nuovi, zero regressioni.

---

# FASE R1b — Pipeline ricevute SdI

### Task 6: Spike XAdES (timeboxed, primo task R1b — spec D-4)

**Files:**
- Create: `docs/superpowers/specs/2026-07-16-spike-xades-esito.md` (esito + decisione libreria)
- Create: `tests/fixtures/ricevute-sdi/README.md` + fixture iniziali

**Vincoli (spec D-4, non negoziabili):** trust anchor = certificato SdI/Sogei pinnato (mai truststore di sistema); qualsiasi errore → `fallita`; difesa signature wrapping (l'elemento firmato deve essere la radice; parser e verifier sugli stessi byte).

- [ ] **Step 1:** Procurare fixture reali: scaricare esempi ufficiali di messaggi SdI da fatturapa.gov.it («File fatture e messaggi») — RC/NS/MC/NE. Se gli esempi ufficiali non sono firmati, generare in fixture una coppia (XML firmato con chiave di test autofirmata + certificato di test) usando xmldsig, per testare il motore di verifica con trust anchor iniettabile.
- [ ] **Step 2:** Valutare in ordine: `xml-crypto` (verifica XML-DSig, base di XAdES-BES), `xadesjs`. Criteri: verifica enveloped su documento radice, possibilità di pinnare il certificato (ignorare KeyInfo non fidato), manutenzione libreria, zero dipendenze native.
- [ ] **Step 3:** Scrivere PoC `scripts/tmp/spike-xades.ts`: `verificaFirmaXml(xml: Buffer, trustAnchorPem: string) => boolean` che (a) verifica la firma sulla radice, (b) rifiuta wrapping (reference URI diversa dalla radice), (c) fallisce su qualunque eccezione.
- [ ] **Step 4:** Esito nel doc: libreria scelta + limiti; **se nessuna libreria regge nei tempi → FALLBACK dichiarato (spec D-4): `verificaFirma` ritorna sempre `fallita`, tutte le ricevute in quarantena, transizioni solo via override titolare — la pipeline resta completa e sicura.** 🛑 Esito presentato a Francesco prima di proseguire.
- [ ] **Step 5: Commit** — `git commit -m "docs(fatture): esito spike XAdES + fixture ricevute SdI"`

---

### Task 7: Parser ricevute SdI (pure function)

**Files:**
- Create: `src/lib/fattura/ricevute/parse-ricevuta-sdi.ts`
- Create: `tests/fixtures/ricevute-sdi/` — `rc-valida.xml`, `ns-valida.xml` (con ListaErrori 2 voci), `mc-valida.xml`, `ne-ec01.xml`, `ne-ec02.xml`, `malformata.xml`, `xxe-payload.xml`, `oversize.xml` (>1MB generata nel test), `non-ricevuta.xml`
- Test: `tests/unit/parse-ricevuta-sdi.test.ts`

**Interfaces:**
- Produces:
```typescript
export type TipoRicevutaSdI = 'RC' | 'NS' | 'MC' | 'NE' | 'DT' | 'AT'
export interface RicevutaSdIParsed {
  tipo: TipoRicevutaSdI
  nomeFileFattura: string          // <NomeFile> dentro l'XML — chiave di match
  identificativoSdI: string
  dataOraRicezione: string | null
  esitoCommittente: 'EC01' | 'EC02' | null   // solo NE
  listaErrori: Array<{ codice: string; descrizione: string }>  // solo NS
}
export class RicevutaNonValidaError extends Error {}
export function parseRicevutaSdI(xml: Buffer): RicevutaSdIParsed  // throws RicevutaNonValidaError
```
- Consumata da Task 9 (RPC via route), Task 10 (upload).

- [ ] **Step 1: Write the failing tests** — un `it` per fixture: RC/NS/MC/NE parse corretti (tipo, nomeFileFattura, identificativoSdI, listaErrori integrale per NS, esitoCommittente per NE); `malformata.xml`/`non-ricevuta.xml`/`xxe-payload.xml` → `RicevutaNonValidaError`; buffer > 1_048_576 byte → `RicevutaNonValidaError('oversize')`. Il test XXE asserisce che l'entità NON viene risolta (il parser rigetta o il valore resta letterale).

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseRicevutaSdI, RicevutaNonValidaError } from '@/lib/fattura/ricevute/parse-ricevuta-sdi'

const fx = (n: string) => readFileSync(`tests/fixtures/ricevute-sdi/${n}`)

describe('parseRicevutaSdI', () => {
  it('RC: tipo, NomeFile, IdentificativoSdI', () => {
    const r = parseRicevutaSdI(fx('rc-valida.xml'))
    expect(r.tipo).toBe('RC')
    expect(r.nomeFileFattura).toMatch(/^IT.*\.xml$/)
    expect(r.identificativoSdI.length).toBeGreaterThan(0)
  })
  it('NS: ListaErrori integrale', () => {
    const r = parseRicevutaSdI(fx('ns-valida.xml'))
    expect(r.tipo).toBe('NS')
    expect(r.listaErrori).toHaveLength(2)
    expect(r.listaErrori[0]).toHaveProperty('codice')
  })
  it('NE EC02: esitoCommittente', () => {
    expect(parseRicevutaSdI(fx('ne-ec02.xml')).esitoCommittente).toBe('EC02')
  })
  it('malformata/non-ricevuta/XXE → RicevutaNonValidaError', () => {
    for (const f of ['malformata.xml', 'non-ricevuta.xml', 'xxe-payload.xml'])
      expect(() => parseRicevutaSdI(fx(f))).toThrow(RicevutaNonValidaError)
  })
  it('oversize → RicevutaNonValidaError', () => {
    expect(() => parseRicevutaSdI(Buffer.alloc(1_048_577, 0x20))).toThrow(RicevutaNonValidaError)
  })
})
```

- [ ] **Step 2:** Run — Expected: FAIL (modulo inesistente).
- [ ] **Step 3:** Implementa con `fast-xml-parser` (`XMLParser` con `processEntities: false`, `ignoreDeclaration: true`): size cap PRIMA del parse; riconoscimento tipo dal root element (`RicevutaConsegna`→RC, `NotificaScarto`→NS, `NotificaMancataConsegna`→MC, `NotificaEsito`→NE, `NotificaDecorrenzaTermini`→DT, `AttestazioneTrasmissioneFattura`→AT — nomi da MessaggiTypes_v1.1.xsd, verificare sulle fixture ufficiali); estrazione `NomeFile`, `IdentificativoSdI`, `DataOraRicezione`, `Esito` (NE), `ListaErrori/Errore[]` (NS); qualsiasi campo chiave mancante → `RicevutaNonValidaError`. `npm i fast-xml-parser` se assente (verificare package.json prima).
- [ ] **Step 4:** Run — Expected: PASS. `npx tsc --noEmit` pulito.
- [ ] **Step 5: Commit** — `git commit -m "feat(fatture): parser ricevute SdI XXE-safe con fixture ufficiali"`

---

### Task 8: Verifica firma (`verifica-firma.ts`)

**Files:**
- Create: `src/lib/fattura/ricevute/verifica-firma.ts`
- Create: `tests/fixtures/ricevute-sdi/firmata-valida.xml`, `firmata-manomessa.xml`, `firmata-wrapping.xml`, `cert-test.pem` (dallo spike Task 6)
- Test: `tests/unit/verifica-firma-ricevuta.test.ts`

**Interfaces:**
- Produces: `export async function verificaFirmaRicevuta(xml: Buffer, trustAnchorPem?: string): Promise<'valida' | 'fallita'>` — trust anchor di default = certificato SdI pinnato in `src/lib/fattura/ricevute/sdi-trust-anchor.ts` (costante PEM, con commento sulla procedura di rotazione); parametro iniettabile SOLO per i test.
- Fail-closed: qualsiasi eccezione/algoritmo non atteso/assenza firma → `'fallita'`. MAI throw.

- [ ] **Step 1: Write the failing tests** — `firmata-valida.xml` + cert-test → `'valida'`; `firmata-manomessa.xml` (un byte cambiato nel payload) → `'fallita'`; `firmata-wrapping.xml` (firma su nodo non-radice) → `'fallita'`; XML senza firma → `'fallita'`; buffer spazzatura → `'fallita'` (mai throw).
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implementa con la libreria scelta nello spike (o fallback `return 'fallita'` documentato se lo spike ha concluso per il fallback — in quel caso i test si adattano: tutto `'fallita'` tranne nessuno, e il task si chiude con la nota).
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(fatture): verifica firma XAdES fail-closed con trust anchor pinnato"`

---

### Task 9: Migration colonne + RPC `applica_ricevuta_sdi` + rank

**Files:**
- Create: `supabase/migrations/20260716100000_ricevute_sdi_rpc.sql`

**Interfaces:**
- Consumes: `fatture_sdi_eventi` (Task 2).
- Produces: `fatture.identificativo_sdi`, `laboratori.pec_sdi_address`, `public.rank_stato_sdi(text) → int`, `public.applica_ricevuta_sdi(p_evento_id uuid, p_laboratorio_id uuid) → json` con esiti `{esito: 'applicata'|'duplicata'|'stato_incompatibile'|'non_matchata'|'quarantena'|'non_trovato', stato_da?, stato_a?}`.

- [ ] **Step 1: Scrivi la migration**

```sql
-- Spec R1 §3.1 + §4.4
ALTER TABLE public.fatture ADD COLUMN IF NOT EXISTS identificativo_sdi text;
CREATE INDEX IF NOT EXISTS fatture_identificativo_sdi_idx
  ON public.fatture (laboratorio_id, identificativo_sdi)
  WHERE identificativo_sdi IS NOT NULL;

ALTER TABLE public.laboratori ADD COLUMN IF NOT EXISTS pec_sdi_address text;
COMMENT ON COLUMN public.laboratori.pec_sdi_address IS
  'Indirizzo PEC sdiNN comunicato da SdI dopo il primo invio (spec R1 D-6). NULL = usare sdi01@pec.fatturapa.it.';

-- Rank macchina a stati (spec §4.4) — monotonia STRETTA, 8 stati del CHECK live.
CREATE OR REPLACE FUNCTION public.rank_stato_sdi(p_stato text)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_stato
    WHEN 'draft' THEN 0 WHEN 'generata' THEN 1 WHEN 'smtp_inviata' THEN 2
    WHEN 'pec_consegnata' THEN 3 WHEN 'ricevuta_sdi' THEN 4 WHEN 'scaduta' THEN 5
    WHEN 'accettata' THEN 6 WHEN 'rifiutata' THEN 6 ELSE -1 END
$$;

-- Writer unico post-invio (spec §4.4). Nessun altro percorso applicativo
-- scrive stato_sdi oltre smtp_inviata.
CREATE OR REPLACE FUNCTION public.applica_ricevuta_sdi(
  p_evento_id uuid, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_ev public.fatture_sdi_eventi%ROWTYPE;
  v_fatt public.fatture%ROWTYPE;
  v_stato_a text;
  v_rows int;
BEGIN
  SELECT * INTO v_ev FROM public.fatture_sdi_eventi
   WHERE id = p_evento_id AND laboratorio_id = p_laboratorio_id
   FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','non_trovato'); END IF;

  IF v_ev.stato_a IS NOT NULL THEN
    RETURN json_build_object('esito','duplicata','stato_da',v_ev.stato_da,'stato_a',v_ev.stato_a);
  END IF;
  IF v_ev.origine <> 'upload_verificato' OR v_ev.esito_verifica_firma IS DISTINCT FROM 'valida' THEN
    RETURN json_build_object('esito','quarantena');
  END IF;
  IF v_ev.fattura_id IS NULL THEN RETURN json_build_object('esito','non_matchata'); END IF;

  SELECT * INTO v_fatt FROM public.fatture
   WHERE id = v_ev.fattura_id AND laboratorio_id = p_laboratorio_id
   FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','non_matchata'); END IF;

  -- Conferma identificativo (spec §4.3): mismatch = fail-closed.
  IF v_fatt.identificativo_sdi IS NOT NULL
     AND v_ev.identificativo_sdi IS NOT NULL
     AND v_fatt.identificativo_sdi <> v_ev.identificativo_sdi THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;

  -- Transizione RICALCOLATA dallo stato corrente (mai dal payload — spec §4.4).
  v_stato_a := CASE v_ev.tipo_ricevuta
    WHEN 'RC' THEN 'accettata'
    WHEN 'MC' THEN 'accettata'
    WHEN 'NS' THEN 'rifiutata'
    WHEN 'NE' THEN CASE v_ev.esito_committente WHEN 'EC01' THEN 'accettata' ELSE NULL END
    ELSE NULL END;               -- EC02 / DT / AT: mai transizione automatica (D-5)
  IF v_stato_a IS NULL THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;

  -- Monotonia STRETTA + gate «mai inviata»: una ricevuta può esistere solo se
  -- la mail è partita. generata + smtp_inviata_at NOT NULL = claim orfano →
  -- avanzabile (prova d'invio, D-3); generata + NULL = mai inviata → rifiuta.
  IF v_fatt.stato_sdi = 'generata' AND v_fatt.smtp_inviata_at IS NULL THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;
  IF public.rank_stato_sdi(v_stato_a) <= public.rank_stato_sdi(v_fatt.stato_sdi) THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;

  -- UPDATE guardato sullo stato letto (FOR UPDATE tiene il lock; la guardia è
  -- difesa in profondità + ROW_COUNT verificato — spec §4.4).
  UPDATE public.fatture SET
    stato_sdi = v_stato_a,
    identificativo_sdi = COALESCE(identificativo_sdi, v_ev.identificativo_sdi),
    ricevuta_sdi_at = CASE WHEN v_ev.tipo_ricevuta IN ('RC','MC','NE') THEN COALESCE(ricevuta_sdi_at, now()) ELSE ricevuta_sdi_at END,
    sdi_risposta_at = now(),
    codice_esito_sdi = CASE WHEN v_ev.tipo_ricevuta = 'NE' THEN v_ev.esito_committente ELSE v_ev.tipo_ricevuta END,
    messaggio_esito_sdi = CASE WHEN v_ev.tipo_ricevuta = 'NS'
      THEN 'Scartata da SdI — vedi dettaglio errori' ELSE messaggio_esito_sdi END,
    xml_errori_sdi = CASE WHEN v_ev.tipo_ricevuta = 'NS' THEN v_ev.lista_errori::text ELSE xml_errori_sdi END,
    -- riparazione claim orfano (D-3): la ricevuta è prova d'invio
    inviata_via = COALESCE(inviata_via, 'pec'),
    inviata_at = COALESCE(inviata_at, now())
  WHERE id = v_fatt.id AND laboratorio_id = p_laboratorio_id
    AND stato_sdi = v_fatt.stato_sdi;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;

  -- Completa l'evento (unico UPDATE ammesso dal guard trigger Task 2).
  UPDATE public.fatture_sdi_eventi
     SET stato_da = v_fatt.stato_sdi, stato_a = v_stato_a
   WHERE id = p_evento_id;

  RETURN json_build_object('esito','applicata','stato_da',v_fatt.stato_sdi,'stato_a',v_stato_a);
END;
$$;

REVOKE ALL ON FUNCTION public.applica_ricevuta_sdi(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.applica_ricevuta_sdi(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.rank_stato_sdi(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rank_stato_sdi(text) TO service_role;
```

- [ ] **Step 2: 🛑 GATE Francesco — apply + FASE 6b** (`gen types` + `tsc --noEmit`). Verifica manuale su lab E2E: NS su fattura `smtp_inviata` → `rifiutata` + evento completato; seconda chiamata → `duplicata`; NS su fattura `accettata` → `stato_incompatibile`.
- [ ] **Step 3: Commit** — `git commit -m "feat(db): RPC applica_ricevuta_sdi con macchina a stati forward-only"`

---

### Task 10: Endpoint upload `POST /api/pec/ricevute`

**Files:**
- Create: `src/app/api/pec/ricevute/route.ts`
- Create: `src/lib/fattura/ricevute/ingest-ricevuta.ts` (logica testabile: match + insert evento)
- Test: `tests/unit/pec-ricevute-upload.test.ts`

**Interfaces:**
- Consumes: `parseRicevutaSdI` (Task 7), `verificaFirmaRicevuta` (Task 8), tabella eventi (Task 2), `RUOLI_INVIO_PEC` da `@/lib/fattura/invio-claim`.
- Produces: `ingestRicevuta(svc, labId, userId, file: {buffer: Buffer, filename: string}) => Promise<{esito: 'proposta'|'duplicata'|'non_valida'|'cap_superato', ricevutaId?, tipo?, fattura?: {id, numero, stato_sdi}, transizioneProposta?: string|null, esitoVerificaFirma?}>`. Response JSON = stesso shape.

- [ ] **Step 1: Write the failing tests** (mock supabase client come nei test route esistenti — vedi `tests/unit/fatture-xml-gate-stato-sdi.test.ts` per il pattern di mock):
  - upload RC valida matchata → `{esito:'proposta', transizioneProposta:'accettata', esitoVerificaFirma:'valida'}`, evento inserito con `origine='upload_verificato'`, `content_sha256` valorizzato, storage path = `<lab>/ricevute-sdi/<sha256>.xml`;
  - stesso file due volte → seconda risposta `{esito:'duplicata', ricevutaId: <id esistente>}` (spec §4.4);
  - firma `fallita` → `{esito:'proposta', esitoVerificaFirma:'fallita', transizioneProposta:null}` (quarantena: l'evento si inserisce comunque, `fattura_id` valorizzato se matcha, ma la proposta è nulla);
  - `nomeFileFattura` che non matcha nessuna fattura del lab → `{esito:'proposta', fattura:undefined, transizioneProposta:null}` (parcheggiata, `fattura_id NULL`);
  - `nomeFileFattura` di un ALTRO lab → parcheggiata (mai match cross-tenant — il match filtra `laboratorio_id`);
  - mismatch `identificativo_sdi` vs fattura → parcheggiata con proposta nulla (spec §4.3);
  - XML non valido → 422 `{esito:'non_valida'}`, nessun insert;
  - cap: >20 upload nelle 24h per lab (COUNT eventi `origine='upload_verificato'`) → 429 `{esito:'cap_superato'}`;
  - ruolo `tecnico` → 403.

- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implementa. Route: CSRF `isSameOrigin` → auth → ruolo `RUOLI_INVIO_PEC` → `request.formData()` (`file` field, size cap 1 MB pre-parse, content-type `text/xml`/`application/xml` O estensione `.xml` — il contenuto fa fede) → `ingestRicevuta`. In `ingestRicevuta`: sha256 (`node:crypto`) → SELECT evento esistente per `(labId, sha)` → se esiste `duplicata`; parse (`RicevutaNonValidaError` → `non_valida`); `verificaFirmaRicevuta`; match `fatture` per `(laboratorio_id, nome_file_xml = nomeFileFattura)` + check mismatch identificativo; upload storage `svc.storage.from('fatture-pdf').upload(\`${labId}/ricevute-sdi/${sha}.xml\`, buffer, {contentType: 'application/xml'})` (nome oggetto server-generated, filename client SOLO nel metadato); INSERT evento; `transizioneProposta` calcolata con la stessa mappa della RPC (RC/MC→accettata, NS→rifiutata, NE EC01→accettata, EC02/DT/AT→null) SOLO se firma `valida` e fattura matchata — è una preview, la RPC ricalcola.
- [ ] **Step 4:** Run — Expected: PASS. `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git commit -m "feat(fatture): endpoint upload ricevute SdI con match e quarantena"`

---

### Task 11: Endpoint `POST /api/pec/ricevute/[id]/applica`

**Files:**
- Create: `src/app/api/pec/ricevute/[id]/applica/route.ts`
- Test: `tests/unit/pec-ricevute-applica.test.ts`

**Interfaces:**
- Consumes: RPC `applica_ricevuta_sdi` (Task 9), `verificaFirmaRicevuta` (Task 8).
- Produces: 200 `{esito, stato_da?, stato_a?}` | 409 (quarantena/stato_incompatibile) | 404.

- [ ] **Step 1: Write the failing tests**: evento valido → 200 `applicata` (la route invoca `svc.rpc('applica_ricevuta_sdi', {p_evento_id, p_laboratorio_id})`); evento in quarantena → la route ri-scarica l'XML dallo storage, ri-esegue `verificaFirmaRicevuta` (spec §4.4 riverifica): se ora `valida` aggiorna `esito_verifica_firma` e procede con la RPC, se ancora `fallita` → 409; esito RPC `duplicata` → 200 con esito passthrough; `stato_incompatibile` → 409; evento di altro lab → 404; ruolo `tecnico` → 403.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implementa (pattern route `invia-pec`: CSRF, auth, ruolo `RUOLI_INVIO_PEC`, fetch evento per id+lab, ramo riverifica, RPC, mapping esiti→status).
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(fatture): endpoint applica ricevuta con riverifica quarantena"`

---

### Task 12: Endpoint override titolare + sblocca claim

**Files:**
- Create: `src/app/api/fatture/[id]/stato-sdi-override/route.ts`
- Create: `src/app/api/fatture/[id]/sblocca-claim/route.ts`
- Test: `tests/unit/fatture-stato-sdi-override.test.ts`, `tests/unit/fatture-sblocca-claim.test.ts`

**Interfaces:**
- Consumes: tabella eventi (Task 2), `rank_stato_sdi` (client-side replica), tipi StatoSDI.
- Produces:
  - override — body `{stato_sdi_atteso: StatoSDI, nuovo_stato: 'pec_consegnata'|'accettata'|'rifiutata', motivo: string, conferma_effetti_storno?: boolean, importo_storno_visto?: number}`; allowlist esplicita dei `nuovo_stato` (MAI `ricevuta_sdi`/`scaduta`/altro); monotonia stretta client+DB.
  - sblocca-claim — body `{motivo: string, verificata_cartella_inviata: true}`.

- [ ] **Step 1: Write the failing tests**
  - override: solo `titolare` (front_desk → 403); `motivo` vuoto → 422; `nuovo_stato` fuori allowlist → 422; `stato_sdi_atteso` diverso dallo stato corrente → 409 (anti-stale-read, UPDATE guardato `WHERE stato_sdi = :atteso`); rank non crescente → 409; TD04→`rifiutata` senza `conferma_effetti_storno:true` → 422; caso valido → 200 + UPDATE + INSERT evento `origine='override_manuale'` con `stato_da`/`stato_a`/`motivo`/`registrato_da` valorizzati;
  - sblocca-claim: solo `titolare`; senza `verificata_cartella_inviata:true` → 422; fattura non in claim orfano (`stato_sdi<>'generata'` o `smtp_inviata_at IS NULL`) → 409; caso valido → UPDATE `smtp_inviata_at=NULL` guardato (`.eq('stato_sdi','generata')`, `.not('smtp_inviata_at','is',null)`) + evento `origine='sblocco_claim'` + 200.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implementa (pattern `invia-pec`; INSERT eventi via `svc`; log audit operatore come in `invia-pec` righe 94-100).
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(fatture): override stato SdI titolare + sblocco claim con audit"`

---

### Task 13: send-pec D-6 (destinatario dinamico) + D-7 (guardia stato) + allowlist impostazioni

**Files:**
- Modify: `src/lib/fattura/send-pec.ts:40-48,124,143-152`
- Modify: `src/app/api/impostazioni/pec/route.ts` (allowlist PATCH: + `pec_sdi_address`)
- Modify: `src/components/features/pec/PecSetupWidget.tsx` (campo «Indirizzo PEC SdI (opzionale)» con hint)
- Test: `tests/unit/send-pec-destinatario.test.ts` (create); `tests/unit/send-pec-invariante.test.ts` (esistente — DEVE restare verde)

**Interfaces:**
- Consumes: colonna `laboratori.pec_sdi_address` (Task 9).
- Produces: destinatario = `lab.pec_sdi_address ?? 'sdi01@pec.fatturapa.it'`; UPDATE post-invio guardato con `.eq('stato_sdi', 'generata')`.

- [ ] **Step 1: Write the failing tests** (mock nodemailer + supabase come in `send-pec-invariante.test.ts`):
  - lab con `pec_sdi_address='sdi43@pec.fatturapa.it'` → `sendMail` chiamata con `to:'sdi43@pec.fatturapa.it'`;
  - lab con `pec_sdi_address` NULL → `to:'sdi01@pec.fatturapa.it'` (fallback identico all'attuale);
  - **D-7**: mock UPDATE che matcha 0 righe (fattura non più `generata`) → nessun throw (contratto N10), `console.error` loggato, nessuna scrittura di stato.
- [ ] **Step 2:** Run — Expected: FAIL (select non include `pec_sdi_address`; `to` hardcoded).
- [ ] **Step 3:** Implementa: aggiungi `pec_sdi_address` a `LabPecRow` + alla select del join (righe 40-48); riga 124 → ``to: lab.pec_sdi_address ?? 'sdi01@pec.fatturapa.it',``; UPDATE righe 143-152: aggiungi `.eq('stato_sdi', 'generata')` dopo `.eq('id', fattura_id)` e nel ramo `updateErr`/0-righe mantieni SOLO log (commento: «guardia D-7: mai regredire uno stato avanzato da una ricevuta; 0 righe = riconciliazione già avvenuta, non è un errore»). Nota: supabase-js non espone rowCount su update senza select → aggiungi `.select('id')` e logga se `data.length === 0`. In `impostazioni/pec/route.ts`: aggiungi `pec_sdi_address` all'allowlist PATCH (validazione: stringa `^sdi\d{2}@pec\.fatturapa\.it$` o vuota→null). Nel widget: input testo con placeholder `sdi01@pec.fatturapa.it` e hint «Comunicato da SdI con la prima ricevuta. Lascia vuoto se non ancora ricevuto.»
- [ ] **Step 4:** Run: `npx vitest run tests/unit/send-pec-destinatario.test.ts tests/unit/send-pec-invariante.test.ts` — Expected: tutti PASS (invariante N10 intatta).
- [ ] **Step 5: Commit** — `git commit -m "feat(fatture): destinatario SdI dinamico (D-6) + guardia anti-regressione su send-pec (D-7)"`

---

### Task 14: Query riconciliazioni + saldi negativi aggregati

**Files:**
- Create: `src/lib/fattura/ricevute/queries-riconciliazioni.ts`
- Test: `tests/unit/queries-riconciliazioni.test.ts`

**Interfaces:**
- Produces:
```typescript
export interface PendenzeRiconciliazione {
  claimOrfani: Array<{ id: string; numero: string; smtp_inviata_at: string }>
  smtpStagnanti: Array<{ id: string; numero: string; smtp_inviata_at: string }>   // > 7 giorni
  stornateConTd04Rifiutato: Array<{ id: string; numero: string; td04_numero: string }>
  saldiNegativi: Array<{ cliente_id: string; cliente_nome: string; saldo: number }>
  eventiParcheggiati: Array<{ id: string; nome_file_ricevuta: string | null; esito_verifica_firma: string | null; esito_committente: string | null; created_at: string }>
}
export async function fetchPendenzeRiconciliazione(svc: SupabaseClient, labId: string): Promise<PendenzeRiconciliazione>
```
- Consumata dalla pagina (Task 16).

- [ ] **Step 1: Write the failing tests** (mock svc): claim orfano = `stato_sdi='generata' AND smtp_inviata_at NOT NULL`; stagnanti = `stato_sdi='smtp_inviata' AND smtp_inviata_at < now()-7d`; stornate = `stornata_at NOT NULL` con join TD04 collegato `stato_sdi='rifiutata'`; saldi negativi: aggregazione per cliente in UNA query (`credito_clienti_movimenti` groupBy cliente con la formula di Task 1, join `pagamenti(stato)` per il filtro anti-fantasma eccedenze — replica della formula di `calcolaCreditoDisponibile`, solo clienti con saldo < 0); parcheggiati = `fattura_id IS NULL AND stato_a IS NULL` OPPURE (`esito_verifica_firma='fallita'` e non completato) OPPURE `esito_committente='EC02'` non completato. Errore di lettura → throw (fail-closed, pattern `fetchMovimentiCreditoValidi`).
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implementa (query separate, nessun N+1: i movimenti si aggregano in memoria da UNA select con join clienti).
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(fatture): query pendenze riconciliazione + saldi negativi aggregati"`

---

### Task 15: Mockup §0B — pagina `/fatture/riconciliazioni` (🛑 GATE Francesco)

**Files:**
- Create: `docs/design/mockups/2026-07-16-riconciliazioni.html` + screenshot in `docs/design/mockups/screenshots/`
- Create (dopo scelta): `docs/design/decisions/2026-07-16-riconciliazioni.md`

- [ ] **Step 1:** Ricerca best practice: inbox di riconciliazione fintech (Stripe reconciliation, pattern «exception queue»), raggruppamento per tipo con conteggi, empty state positivo («Tutto riconciliato ✓»).
- [ ] **Step 2:** Mockup con dati reali simulati per TUTTI i 5 gruppi (claim orfano, stagnanti, stornate/TD04, saldi negativi, parcheggiate incl. quarantena con avviso «firma non verificata — contenuto potenzialmente contraffatto») + flusso upload→proposta→conferma (bottom sheet mobile) + doppia conferma override (elenco effetti trigger TD04 con importo). **Minimo 2 varianti × light+dark**, mobile 390 card-first + desktop 1280.
- [ ] **Step 3:** Screenshot Playwright 390/768/1280 × light/dark.
- [ ] **Step 4:** 🛑 Scelta di Francesco → `docs/design/decisions/2026-07-16-riconciliazioni.md`.
- [ ] **Step 5: Commit.**

---

### Task 16: React — pagina `/fatture/riconciliazioni` + badge

**Files:**
- Create: `src/app/(app)/fatture/riconciliazioni/page.tsx` (Server Component: auth + `fetchPendenzeRiconciliazione`)
- Create: `src/components/features/fatture/RiconciliazioniClient.tsx` (+ eventuali sotto-componenti: `UploadRicevutaSheet.tsx`, `OverrideStatoSheet.tsx`, `SbloccaClaimSheet.tsx`)
- Modify: `src/app/(app)/fatture/page.tsx` (badge conteggio pendenze → link alla pagina)
- Modify: `src/app/(app)/fatture/[id]/page.tsx:256-257` (label: mostrare lo stato reale da `STATO_SDI_LABEL` invece di «Non inviata» quando lo stato è ≥ `accettata` — fix cosmetico spec §5)
- Test: `tests/unit/riconciliazioni-page.test.tsx`

**Interfaces:**
- Consumes: `fetchPendenzeRiconciliazione` (Task 14), endpoint Task 10-12, variante mockup approvata (Task 15), `STATO_SDI_LABEL` da `@/lib/fattura/stato-sdi-label` (modulo condiviso — MAI `'use client'` su quel file).
- Produces: pagina con 5 gruppi, azioni per-ruolo (upload/applica per titolare+front_desk; override/sblocca SOLO titolare — la UI nasconde, il server gatea), payload anti-stale-read (`stato_sdi_atteso`, `importo_storno_visto`).

- [ ] **Step 1: Write the failing tests**: rendering dei 5 gruppi con conteggi; empty state; ruolo front_desk → azioni override/sblocca assenti; sheet override invia `stato_sdi_atteso` = stato mostrato; sheet TD04→rifiutata mostra l'elenco effetti e richiede la spunta prima di abilitare il submit.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implementa fedele al mockup approvato: token da `tokens.ts`, motion da `motion.ts`, bottom sheet mobile, `role="alert"` sulla quarantena, touch ≥ 44px, `prefers-reduced-motion`.
- [ ] **Step 4:** Run + `npx tsc --noEmit` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(fatture): pagina riconciliazioni pendenti (variante approvata §0B)"`

---

### Task 17: Chiusura ondata — FASE 7 + QA + gate L2

- [ ] **Step 1: FASE 7 (output reale):** `npx tsc --noEmit` (0 errori) && `npx vitest run` (baseline 1795+nuovi, 0 fail) && `npx next build` (route nuove presenti). **Assert storage (spec §5/§9):** verificare che NON esistano policy client su `storage.objects` per il bucket `fatture-pdf` (dashboard Supabase); se ne esistono, escludere il prefisso `ricevute-sdi/` prima del merge.
- [ ] **Step 2: QA browser (FASE 9, lab E2E `00000000-…-0001`):** upload fixture RC su fattura E2E `smtp_inviata` → `accettata` in UI; upload duplicato → messaggio «già caricata»; fixture con firma invalida → quarantena visibile con avviso; override titolare con stato stantio → errore 409 mostrato; sblocca claim su fattura E2E in claim orfano simulato → torna inviabile; alert saldo negativo visibile su cliente E2E con TD04 rifiutato simulato; ruolo tecnico → nessuna azione. **Cleanup a baseline esatto** (eventi QA rimossi, fatture E2E ripristinate, storage ricevute-sdi/ svuotato).
- [ ] **Step 3: 🛑 GATE ESTETICO L2 (FASE 9b):** micro-audit della sola superficie dell'ondata contro `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` (12 sezioni × 390/768/1280 × light/dark); screenshot before/after in `docs/design/screenshots/2026-07-16-riconciliazioni/`.
- [ ] **Step 4: Review finale whole-branch** (`/code-review` + requesting-code-review) → 🛑 gate merge/push di Francesco.
- [ ] **Step 5: BP-1:** aggiornare `memory/MEMORY.md` + `docs/roadmap/ROADMAP-UFFICIALE.md` (+ `memory/domains/fatturazione-sdi.md`: nuovi writer stato_sdi, macchina a stati, tabella eventi).
