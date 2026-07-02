# B1 — Tracciabilità MDR Materiali/Lotti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ogni Dichiarazione di Conformità generata alla consegna riporta davvero i materiali e i numeri di lotto usati, risolvendo il blocker B1 (rischio Allegato XIII MDR).

**Architecture:** Nuovo step sincrono in `orchestraConsegna`, eseguito **prima** della generazione della DdC, che per ogni lavorazione risolve la distinta base (BOM) in `lotti_magazzino` con criterio FEFO e scrive in `lavori_materiali` (unica tabella letta da DdC/IFU/etichetta/fattura). Materiali non soggetti a tracciabilità di lotto (`magazzino.traccia_lotto = false`) continuano a passare dal meccanismo esistente (`scarichi_magazzino` + RPC `decrementa_scorta`), solo spostato prima nel flusso. Se un materiale MDR-rilevante non ha un lotto disponibile, o una lavorazione non ha alcuna BOM definita, il lavoro viene flaggato "tracciabilità incompleta" (soft-block: la consegna procede comunque).

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + RLS), Vitest.

**Spec di riferimento:** `docs/superpowers/specs/2026-07-02-b1-tracciabilita-materiali-design.md`

## Global Constraints

- RLS: usare sempre `public.current_lab_id()` — MAI `auth.current_lab_id()`.
- Dopo la migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` poi `npx tsc --noEmit` (obbligatorio, FASE 6b CLAUDE.md).
- Nessun colore/shadow/font/animazione inline che non sia già un pattern esistente nel codebase (il banner riusa lo stile letterale di `AnnullaConsegnaBanner.tsx`, unico precedente ammesso).
- Zero `any` non giustificato — se necessario, `// eslint-disable-next-line @typescript-eslint/no-explicit-any` con motivazione, pattern già usato in `orchestrate.ts`.
- Verifica finale obbligatoria: `npx tsc --noEmit` + `npx vitest run` + `npx next build`, tutti e tre con output reale (FASE 7).

---

## Task 1: Migrazione DB — cattura `lavori_materiali` + guardia trigger + colonne flag

**Files:**
- Create: `supabase/migrations/20260702000000_b1_tracciabilita_materiali.sql`

**Interfaces:**
- Produces: tabella `lavori_materiali` (se non già presente), colonne `lavori.tracciabilita_materiali_ok` (`boolean`, default `true`) e `lavori.materiali_incompleti_dettaglio` (`jsonb`, nullable) — usate da Task 3 (tipi TS) e Task 4/5 (scrittura).

Questa migration è **idempotente**: in produzione `lavori_materiali` esiste già (creata fuori dal tracking delle migration — vedi spec §1), quindi ogni statement usa forme sicure da rieseguire (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS` + `CREATE`).

- [ ] **Step 1: Scrivi la migration**

```sql
-- ============================================================
-- B1 — Tracciabilità MDR materiali/lotti
-- Cattura lavori_materiali nelle migration tracciate (era solo
-- in supabase/schema.sql, creata fuori dal flusso migration).
-- Idempotente: sicura da rieseguire su un DB dove la tabella esiste già.
-- ============================================================

CREATE TABLE IF NOT EXISTS lavori_materiali (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id         UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  lotto_id          UUID NOT NULL REFERENCES lotti_magazzino(id),
  magazzino_id      UUID NOT NULL REFERENCES magazzino(id),

  quantita_usata    NUMERIC(12,4) NOT NULL,
  unita_misura      TEXT NOT NULL,
  data_uso          TIMESTAMPTZ NOT NULL DEFAULT now(),

  numero_lotto_snapshot TEXT NOT NULL,
  nome_materiale_snapshot TEXT NOT NULL,
  produttore_snapshot TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE lavori_materiali ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lavori_mat_laboratorio" ON lavori_materiali;
CREATE POLICY "lavori_mat_laboratorio" ON lavori_materiali
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "lavori_mat_insert" ON lavori_materiali;
CREATE POLICY "lavori_mat_insert" ON lavori_materiali
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX IF NOT EXISTS idx_lavori_mat_lavoro ON lavori_materiali(lavoro_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lavori_mat_lotto ON lavori_materiali(lotto_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lavori_mat_laboratorio ON lavori_materiali(laboratorio_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- Trigger decremento scorte — CORRETTO con guardia GREATEST(0, ...)
-- Prima non aveva guardia su lotti_magazzino.quantita_residua
-- (a differenza di decrementa_scorta su magazzino, che ce l'ha già):
-- un lotto poteva andare negativo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION aggiorna_scorta_lotto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lotti_magazzino
    SET quantita_residua = GREATEST(0, quantita_residua - NEW.quantita_usata),
        updated_at = now()
    WHERE id = NEW.lotto_id;

    UPDATE magazzino
    SET scorta_attuale = GREATEST(0, scorta_attuale - NEW.quantita_usata),
        updated_at = now()
    WHERE id = NEW.magazzino_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE lotti_magazzino
    SET quantita_residua = quantita_residua + OLD.quantita_usata,
        updated_at = now()
    WHERE id = OLD.lotto_id;

    UPDATE magazzino
    SET scorta_attuale = scorta_attuale + OLD.quantita_usata,
        updated_at = now()
    WHERE id = OLD.magazzino_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_lavori_materiali_scorta ON lavori_materiali;
CREATE TRIGGER trg_lavori_materiali_scorta
  AFTER INSERT OR DELETE ON lavori_materiali
  FOR EACH ROW EXECUTE FUNCTION aggiorna_scorta_lotto();

-- ------------------------------------------------------------
-- Flag "tracciabilità incompleta" su lavori
-- ------------------------------------------------------------
ALTER TABLE lavori ADD COLUMN IF NOT EXISTS tracciabilita_materiali_ok BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE lavori ADD COLUMN IF NOT EXISTS materiali_incompleti_dettaglio JSONB;

COMMENT ON COLUMN lavori.tracciabilita_materiali_ok IS
  'FALSE se almeno un materiale MDR-rilevante (traccia_lotto=true) non ha trovato un lotto disponibile, o una lavorazione non ha BOM definita in listino_materiali_auto. Vedi materiali_incompleti_dettaglio per il dettaglio.';
COMMENT ON COLUMN lavori.materiali_incompleti_dettaglio IS
  'Array JSON di {magazzino_id, nome_materiale, motivo} con motivo in (lotto_assente, bom_mancante). NULL se tracciabilita_materiali_ok = true.';
```

- [ ] **Step 2: Applica la migration al database di sviluppo/produzione collegato**

Esegui secondo il processo già in uso nel progetto per applicare migration Supabase (`supabase db push` con progetto collegato, o applicazione manuale via Supabase MCP/dashboard — questo repo non ha `supabase/config.toml` con un link locale salvato). **Non procedere al Task 7 (rigenerazione tipi) finché questa migration non è realmente applicata al progetto `iagibumwjstnveqpjbwq`.**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260702000000_b1_tracciabilita_materiali.sql
git commit -m "feat(db): B1 — cattura lavori_materiali in migration, guardia trigger, flag tracciabilità"
```

---

## Task 2: Logica pura di selezione lotti FEFO

**Files:**
- Create: `src/lib/consegna/materiali-fefo.ts`
- Test: `tests/unit/materiali-fefo.test.ts`

**Interfaces:**
- Produces: `selezionaLottiFefo(lottiDisponibili: LottoDisponibile[], quantitaNecessaria: number): RisultatoFefo` — usata da Task 4.
- Tipi esportati: `LottoDisponibile`, `ConsumoLotto`, `RisultatoFefo`.

- [ ] **Step 1: Scrivi i test (falliranno — il modulo non esiste ancora)**

```typescript
// tests/unit/materiali-fefo.test.ts
import { describe, it, expect } from 'vitest'
import { selezionaLottiFefo, type LottoDisponibile } from '@/lib/consegna/materiali-fefo'

describe('selezionaLottiFefo', () => {
  it('un solo lotto sufficiente copre l\'intera quantità richiesta', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'l1', numero_lotto: 'LOT-001', quantita_residua: 100, data_scadenza: '2027-01-01', data_acquisto: '2026-01-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 40)
    expect(risultato.consumi).toEqual([{ lotto_id: 'l1', numero_lotto: 'LOT-001', quantita: 40 }])
    expect(risultato.quantitaMancante).toBe(0)
  })

  it('sceglie il lotto con scadenza più vicina prima (FEFO)', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'lontano', numero_lotto: 'LOT-FAR', quantita_residua: 100, data_scadenza: '2028-06-01', data_acquisto: '2026-01-01' },
      { id: 'vicino', numero_lotto: 'LOT-NEAR', quantita_residua: 100, data_scadenza: '2026-08-01', data_acquisto: '2026-02-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 10)
    expect(risultato.consumi).toEqual([{ lotto_id: 'vicino', numero_lotto: 'LOT-NEAR', quantita: 10 }])
  })

  it('divide il consumo su più lotti quando il primo non basta', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'l1', numero_lotto: 'LOT-001', quantita_residua: 5, data_scadenza: '2026-08-01', data_acquisto: '2026-01-01' },
      { id: 'l2', numero_lotto: 'LOT-002', quantita_residua: 20, data_scadenza: '2027-01-01', data_acquisto: '2026-01-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 12)
    expect(risultato.consumi).toEqual([
      { lotto_id: 'l1', numero_lotto: 'LOT-001', quantita: 5 },
      { lotto_id: 'l2', numero_lotto: 'LOT-002', quantita: 7 },
    ])
    expect(risultato.quantitaMancante).toBe(0)
  })

  it('nessun lotto disponibile → quantitaMancante uguale al fabbisogno, nessun consumo', () => {
    const risultato = selezionaLottiFefo([], 15)
    expect(risultato.consumi).toEqual([])
    expect(risultato.quantitaMancante).toBe(15)
  })

  it('lotti insufficienti in totale → consuma tutto il disponibile, segnala il residuo mancante', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'l1', numero_lotto: 'LOT-001', quantita_residua: 3, data_scadenza: '2026-08-01', data_acquisto: '2026-01-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 10)
    expect(risultato.consumi).toEqual([{ lotto_id: 'l1', numero_lotto: 'LOT-001', quantita: 3 }])
    expect(risultato.quantitaMancante).toBe(7)
  })

  it('lotti senza data_scadenza vanno dopo quelli con scadenza nota, spareggio su data_acquisto', () => {
    const lotti: LottoDisponibile[] = [
      { id: 'senza-scadenza', numero_lotto: 'LOT-NS', quantita_residua: 100, data_scadenza: null, data_acquisto: '2025-01-01' },
      { id: 'con-scadenza', numero_lotto: 'LOT-CS', quantita_residua: 100, data_scadenza: '2026-12-01', data_acquisto: '2026-06-01' },
    ]
    const risultato = selezionaLottiFefo(lotti, 5)
    expect(risultato.consumi).toEqual([{ lotto_id: 'con-scadenza', numero_lotto: 'LOT-CS', quantita: 5 }])
  })
})
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `npx vitest run tests/unit/materiali-fefo.test.ts`
Expected: FAIL — `Cannot find module '@/lib/consegna/materiali-fefo'`

- [ ] **Step 3: Implementa il modulo**

```typescript
// src/lib/consegna/materiali-fefo.ts

export interface LottoDisponibile {
  id: string
  numero_lotto: string
  quantita_residua: number
  data_scadenza: string | null
  data_acquisto: string | null
}

export interface ConsumoLotto {
  lotto_id: string
  numero_lotto: string
  quantita: number
}

export interface RisultatoFefo {
  consumi: ConsumoLotto[]
  quantitaMancante: number
}

/**
 * FEFO (First-Expired-First-Out): consuma prima i lotti con scadenza più
 * vicina. Spareggio su data_acquisto più vecchia (FIFO). Lotti senza
 * data_scadenza sono trattati come "scadenza remota" — vanno consumati
 * per ultimi.
 */
export function selezionaLottiFefo(
  lottiDisponibili: LottoDisponibile[],
  quantitaNecessaria: number
): RisultatoFefo {
  const DATA_REMOTA = '9999-12-31'

  const ordinati = [...lottiDisponibili].sort((a, b) => {
    const scadenzaA = a.data_scadenza ?? DATA_REMOTA
    const scadenzaB = b.data_scadenza ?? DATA_REMOTA
    if (scadenzaA !== scadenzaB) return scadenzaA < scadenzaB ? -1 : 1

    const acquistoA = a.data_acquisto ?? DATA_REMOTA
    const acquistoB = b.data_acquisto ?? DATA_REMOTA
    if (acquistoA !== acquistoB) return acquistoA < acquistoB ? -1 : 1

    return 0
  })

  const consumi: ConsumoLotto[] = []
  let residuo = quantitaNecessaria

  for (const lotto of ordinati) {
    if (residuo <= 0) break
    if (lotto.quantita_residua <= 0) continue

    const quantita = Math.min(residuo, lotto.quantita_residua)
    consumi.push({ lotto_id: lotto.id, numero_lotto: lotto.numero_lotto, quantita })
    residuo -= quantita
  }

  return {
    consumi,
    quantitaMancante: Math.max(0, Math.round(residuo * 10000) / 10000),
  }
}
```

- [ ] **Step 4: Esegui i test per verificare che passino**

Run: `npx vitest run tests/unit/materiali-fefo.test.ts`
Expected: PASS — 6/6 test verdi

- [ ] **Step 5: Commit**

```bash
git add src/lib/consegna/materiali-fefo.ts tests/unit/materiali-fefo.test.ts
git commit -m "feat(consegna): selezione lotti FEFO per tracciabilità materiali (B1)"
```

---

## Task 3: Tipi TypeScript — flag tracciabilità su `Lavoro`

**Files:**
- Modify: `src/types/domain.ts`

**Interfaces:**
- Produces: `MaterialeIncompletoDettaglio` (usato da Task 4, 5, 6), campi `tracciabilita_materiali_ok: boolean` e `materiali_incompleti_dettaglio: MaterialeIncompletoDettaglio[] | null` su `Lavoro` (quindi ereditati da `LavoroDettaglio`).

- [ ] **Step 1: Aggiungi il tipo `MaterialeIncompletoDettaglio` e i due campi su `Lavoro`**

Individua il blocco `LavoroMateriale` in `src/types/domain.ts` (righe 443-456) e aggiungi subito dopo:

```typescript
export interface MaterialeIncompletoDettaglio {
  magazzino_id: string | null;
  nome_materiale: string;
  motivo: 'lotto_assente' | 'bom_mancante';
}
```

Poi, dentro `export interface Lavoro { ... }`, subito dopo il campo `disinfettante_usato`/`materiali_allegati` (sezione "Accettazione ingresso — MDR Allegato XIII"), aggiungi:

```typescript
  // Tracciabilità materiali/lotti — B1 (Allegato XIII MDR)
  tracciabilita_materiali_ok: boolean;
  materiali_incompleti_dettaglio: MaterialeIncompletoDettaglio[] | null;
```

- [ ] **Step 2: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: nessun nuovo errore introdotto da questa modifica (i campi sono opzionali dal punto di vista dei consumatori esistenti — nessun consumatore attuale distrugge `Lavoro` con spread esaustivo che romperebbe l'aggiunta di campi).

- [ ] **Step 3: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat(types): aggiungi tracciabilita_materiali_ok e MaterialeIncompletoDettaglio (B1)"
```

---

## Task 4: Orchestrazione tracciamento materiali (`tracciaMaterialiLavoro`)

**Files:**
- Create: `src/lib/consegna/traccia-materiali.ts`
- Test: `tests/unit/traccia-materiali.test.ts`

**Interfaces:**
- Consumes: `selezionaLottiFefo` da `./materiali-fefo` (Task 2); `LavoroDettaglio`, `LavoroMateriale`, `MaterialeIncompletoDettaglio` da `@/types/domain` (Task 3).
- Produces: `tracciaMaterialiLavoro(supabase: SupabaseClient, lavoro: LavoroDettaglio, laboratorio_id: string): Promise<RisultatoTracciamento>` — usata da Task 5. `RisultatoTracciamento = { tracciabilitaOk: boolean; dettaglio: MaterialeIncompletoDettaglio[]; materialiTracciati: LavoroMateriale[] }`.

- [ ] **Step 1: Scrivi i test (falliranno — il modulo non esiste ancora)**

```typescript
// tests/unit/traccia-materiali.test.ts
import { describe, it, expect } from 'vitest'
import { tracciaMaterialiLavoro } from '@/lib/consegna/traccia-materiali'
import type { LavoroDettaglio } from '@/types/domain'

type FakeMagazzino = { nome: string; produttore: string | null; traccia_lotto: boolean }
type FakeLotto = { id: string; numero_lotto: string; quantita_residua: number; data_scadenza: string | null; data_acquisto: string | null }
type FakeBomRow = { magazzino_id: string; quantita_per_unita: number; unita_misura: string }

interface FakeData {
  bom: Record<string, FakeBomRow[]>
  magazzino: Record<string, FakeMagazzino>
  lotti: Record<string, FakeLotto[]>
}

function createFakeSupabase(data: FakeData) {
  const inserted = {
    lavori_materiali: [] as Record<string, unknown>[],
    scarichi_magazzino: [] as Record<string, unknown>[],
  }
  const rpcCalls: Array<{ name: string; args: unknown }> = []

  const fake = {
    _inserted: inserted,
    _rpcCalls: rpcCalls,
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const builder = {
        select() { return builder },
        eq(col: string, val: unknown) { filters[col] = val; return builder },
        gt() { return builder },
        single() {
          if (table === 'magazzino') {
            const row = data.magazzino[filters.id as string]
            return Promise.resolve({ data: row ?? null, error: row ? null : { message: 'not found' } })
          }
          return Promise.resolve({ data: null, error: { message: `single non gestito per ${table}` } })
        },
        insert(row: Record<string, unknown>) {
          if (table === 'lavori_materiali') {
            const withId = { id: `mat-${inserted.lavori_materiali.length + 1}`, ...row }
            inserted.lavori_materiali.push(withId)
            return { select: () => ({ single: () => Promise.resolve({ data: withId, error: null }) }) }
          }
          if (table === 'scarichi_magazzino') {
            inserted.scarichi_magazzino.push(row)
            return Promise.resolve({ data: row, error: null })
          }
          return Promise.resolve({ data: null, error: { message: `insert non gestito per ${table}` } })
        },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          if (table === 'listino_materiali_auto') {
            resolve({ data: data.bom[filters.listino_id as string] ?? [], error: null })
            return
          }
          if (table === 'lotti_magazzino') {
            resolve({ data: data.lotti[filters.magazzino_id as string] ?? [], error: null })
            return
          }
          resolve({ data: [], error: null })
        },
      }
      return builder
    },
    rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args })
      return Promise.resolve({ data: null, error: null })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return fake
}

function lavoroFixture(overrides: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav-1',
    materiali: [],
    lavorazioni: [
      {
        id: 'lin-1',
        laboratorio_id: 'lab-1',
        lavoro_id: 'lav-1',
        listino_id: 'list-1',
        codice: 'COD1',
        descrizione: 'Corona ceramica',
        quantita: 2,
        unita_misura: 'pz',
        prezzo_unitario: 100,
        sconto_percentuale: 0,
        maggiorazione: 0,
        importo: 200,
        calo: null,
        codice_iva: '22',
        natura_iva: '',
        esterna: false,
        lab_esterno: null,
        ordine: 1,
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as LavoroDettaglio
}

describe('tracciaMaterialiLavoro', () => {
  it('materiale MDR-rilevante con lotto disponibile → insert in lavori_materiali, nessun flag', async () => {
    const supabase = createFakeSupabase({
      bom: { 'list-1': [{ magazzino_id: 'mag-1', quantita_per_unita: 1, unita_misura: 'g' }] },
      magazzino: { 'mag-1': { nome: 'Zirconia', produttore: 'Vita', traccia_lotto: true } },
      lotti: { 'mag-1': [{ id: 'lot-1', numero_lotto: 'LOT-A', quantita_residua: 50, data_scadenza: '2027-01-01', data_acquisto: '2026-01-01' }] },
    })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroFixture(), 'lab-1')

    expect(risultato.tracciabilitaOk).toBe(true)
    expect(risultato.dettaglio).toEqual([])
    expect(supabase._inserted.lavori_materiali).toHaveLength(1)
    expect(supabase._inserted.lavori_materiali[0]).toMatchObject({
      lavoro_id: 'lav-1',
      magazzino_id: 'mag-1',
      lotto_id: 'lot-1',
      quantita_usata: 2,
      numero_lotto_snapshot: 'LOT-A',
      nome_materiale_snapshot: 'Zirconia',
      produttore_snapshot: 'Vita',
    })
  })

  it('materiale MDR-rilevante senza lotti disponibili → flag lotto_assente, nessun insert', async () => {
    const supabase = createFakeSupabase({
      bom: { 'list-1': [{ magazzino_id: 'mag-1', quantita_per_unita: 1, unita_misura: 'g' }] },
      magazzino: { 'mag-1': { nome: 'Zirconia', produttore: 'Vita', traccia_lotto: true } },
      lotti: { 'mag-1': [] },
    })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroFixture(), 'lab-1')

    expect(risultato.tracciabilitaOk).toBe(false)
    expect(risultato.dettaglio).toEqual([{ magazzino_id: 'mag-1', nome_materiale: 'Zirconia', motivo: 'lotto_assente' }])
    expect(supabase._inserted.lavori_materiali).toHaveLength(0)
  })

  it('lavorazione senza BOM definita → flag bom_mancante', async () => {
    const supabase = createFakeSupabase({ bom: {}, magazzino: {}, lotti: {} })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroFixture(), 'lab-1')

    expect(risultato.tracciabilitaOk).toBe(false)
    expect(risultato.dettaglio).toEqual([{ magazzino_id: null, nome_materiale: 'Corona ceramica', motivo: 'bom_mancante' }])
  })

  it('materiale con traccia_lotto=false → nessun flag, decremento via scarichi_magazzino + RPC', async () => {
    const supabase = createFakeSupabase({
      bom: { 'list-1': [{ magazzino_id: 'mag-2', quantita_per_unita: 1, unita_misura: 'pz' }] },
      magazzino: { 'mag-2': { nome: 'Guanti monouso', produttore: null, traccia_lotto: false } },
      lotti: {},
    })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroFixture(), 'lab-1')

    expect(risultato.tracciabilitaOk).toBe(true)
    expect(risultato.dettaglio).toEqual([])
    expect(supabase._inserted.lavori_materiali).toHaveLength(0)
    expect(supabase._inserted.scarichi_magazzino).toHaveLength(1)
    expect(supabase._rpcCalls).toEqual([{ name: 'decrementa_scorta', args: { p_magazzino_id: 'mag-2', p_laboratorio_id: 'lab-1', p_quantita: 2 } }])
  })

  it('idempotenza: se il magazzino_id è già tracciato in lavoro.materiali, salta senza reinserire', async () => {
    const supabase = createFakeSupabase({
      bom: { 'list-1': [{ magazzino_id: 'mag-1', quantita_per_unita: 1, unita_misura: 'g' }] },
      magazzino: { 'mag-1': { nome: 'Zirconia', produttore: 'Vita', traccia_lotto: true } },
      lotti: { 'mag-1': [{ id: 'lot-1', numero_lotto: 'LOT-A', quantita_residua: 50, data_scadenza: '2027-01-01', data_acquisto: '2026-01-01' }] },
    })

    const lavoroConMaterialeEsistente = lavoroFixture({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      materiali: [{ id: 'mat-esistente', magazzino_id: 'mag-1' } as any],
    })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroConMaterialeEsistente, 'lab-1')

    expect(supabase._inserted.lavori_materiali).toHaveLength(0)
    expect(risultato.materialiTracciati).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Esegui i test per verificare che falliscano**

Run: `npx vitest run tests/unit/traccia-materiali.test.ts`
Expected: FAIL — `Cannot find module '@/lib/consegna/traccia-materiali'`

- [ ] **Step 3: Implementa il modulo**

```typescript
// src/lib/consegna/traccia-materiali.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LavoroDettaglio, LavoroMateriale, MaterialeIncompletoDettaglio } from '@/types/domain'
import { selezionaLottiFefo, type LottoDisponibile } from './materiali-fefo'

export interface RisultatoTracciamento {
  tracciabilitaOk: boolean
  dettaglio: MaterialeIncompletoDettaglio[]
  materialiTracciati: LavoroMateriale[]
}

/**
 * Risolve la tracciabilità materiali/lotti per un lavoro, PRIMA della
 * generazione della DdC (B1 — Allegato XIII MDR).
 *
 * Per ogni lavorazione con BOM (listino_materiali_auto):
 * - traccia_lotto=true  → risolve lotto via FEFO, insert in lavori_materiali
 *   (alimenta la DdC). Nessun lotto disponibile → flag 'lotto_assente'.
 * - traccia_lotto=false → decremento diretto via scarichi_magazzino +
 *   decrementa_scorta (comportamento pre-esistente, invariato). Nessun flag.
 *
 * Nessuna BOM definita per la lavorazione → flag 'bom_mancante'.
 * Errori DB imprevisti non bloccano mai la consegna (soft-block):
 * vengono loggati e trattati come riga flaggata.
 */
export async function tracciaMaterialiLavoro(
  supabase: SupabaseClient,
  lavoro: LavoroDettaglio,
  laboratorio_id: string
): Promise<RisultatoTracciamento> {
  const dettaglio: MaterialeIncompletoDettaglio[] = []
  const materialiEsistenti = lavoro.materiali ?? []
  const magazziniGiaTracciati = new Set(materialiEsistenti.map((m) => m.magazzino_id))
  const nuoviMateriali: LavoroMateriale[] = []

  for (const lav of lavoro.lavorazioni ?? []) {
    if (!lav.listino_id) continue

    const { data: bomItems, error: bomError } = await supabase
      .from('listino_materiali_auto')
      .select('magazzino_id, quantita_per_unita, unita_misura')
      .eq('listino_id', lav.listino_id)
      .eq('laboratorio_id', laboratorio_id)

    if (bomError) {
      console.error('[TRACCIA-MATERIALI] Errore caricamento BOM:', bomError.message)
      dettaglio.push({ magazzino_id: null, nome_materiale: lav.descrizione, motivo: 'bom_mancante' })
      continue
    }

    if (!bomItems || bomItems.length === 0) {
      dettaglio.push({ magazzino_id: null, nome_materiale: lav.descrizione, motivo: 'bom_mancante' })
      continue
    }

    for (const bom of bomItems as Array<{ magazzino_id: string; quantita_per_unita: number; unita_misura: string }>) {
      try {
        const quantitaNecessaria = Number(bom.quantita_per_unita) * Number(lav.quantita)

        const { data: articolo, error: artErr } = await supabase
          .from('magazzino')
          .select('nome, produttore, traccia_lotto')
          .eq('id', bom.magazzino_id)
          .eq('laboratorio_id', laboratorio_id)
          .single()

        if (artErr || !articolo) {
          throw new Error(artErr?.message ?? 'Articolo magazzino non trovato')
        }

        const art = articolo as { nome: string; produttore: string | null; traccia_lotto: boolean }

        if (!art.traccia_lotto) {
          // Ramo B — non MDR-rilevante: meccanismo esistente invariato
          const { error: scarErr } = await supabase
            .from('scarichi_magazzino')
            .insert({
              laboratorio_id,
              lavoro_id: lavoro.id,
              magazzino_id: bom.magazzino_id,
              quantita: quantitaNecessaria,
              unita_misura: bom.unita_misura,
            })

          if (scarErr && (scarErr as { code?: string }).code === '23505') continue // già scaricato in un ciclo precedente
          if (scarErr) throw new Error(scarErr.message)

          const { error: decreErr } = await supabase.rpc('decrementa_scorta', {
            p_magazzino_id: bom.magazzino_id,
            p_laboratorio_id: laboratorio_id,
            p_quantita: quantitaNecessaria,
          })
          if (decreErr) console.error('[TRACCIA-MATERIALI] decrementa_scorta failed:', decreErr.message)
          continue
        }

        // Ramo A — MDR-rilevante
        if (magazziniGiaTracciati.has(bom.magazzino_id)) continue // idempotenza su retry consegna

        const { data: lotti } = await supabase
          .from('lotti_magazzino')
          .select('id, numero_lotto, quantita_residua, data_scadenza, data_acquisto')
          .eq('magazzino_id', bom.magazzino_id)
          .eq('laboratorio_id', laboratorio_id)
          .eq('attivo', true)
          .gt('quantita_residua', 0)

        const lottiDisponibili: LottoDisponibile[] = ((lotti ?? []) as Array<{
          id: string
          numero_lotto: string
          quantita_residua: number
          data_scadenza: string | null
          data_acquisto: string | null
        }>).map((l) => ({
          id: l.id,
          numero_lotto: l.numero_lotto,
          quantita_residua: Number(l.quantita_residua),
          data_scadenza: l.data_scadenza,
          data_acquisto: l.data_acquisto,
        }))

        const { consumi, quantitaMancante } = selezionaLottiFefo(lottiDisponibili, quantitaNecessaria)

        for (const consumo of consumi) {
          const { data: inserted, error: insErr } = await supabase
            .from('lavori_materiali')
            .insert({
              laboratorio_id,
              lavoro_id: lavoro.id,
              lotto_id: consumo.lotto_id,
              magazzino_id: bom.magazzino_id,
              quantita_usata: consumo.quantita,
              unita_misura: bom.unita_misura,
              numero_lotto_snapshot: consumo.numero_lotto,
              nome_materiale_snapshot: art.nome,
              produttore_snapshot: art.produttore,
            })
            .select()
            .single()

          if (insErr) {
            console.error('[TRACCIA-MATERIALI] Errore insert lavori_materiali:', insErr.message)
            continue
          }
          if (inserted) nuoviMateriali.push(inserted as LavoroMateriale)
        }

        if (quantitaMancante > 0) {
          dettaglio.push({ magazzino_id: bom.magazzino_id, nome_materiale: art.nome, motivo: 'lotto_assente' })
        }
      } catch (err) {
        console.error('[TRACCIA-MATERIALI] Errore su riga BOM', bom.magazzino_id, err)
        dettaglio.push({ magazzino_id: bom.magazzino_id, nome_materiale: 'sconosciuto', motivo: 'lotto_assente' })
      }
    }
  }

  return {
    tracciabilitaOk: dettaglio.length === 0,
    dettaglio,
    materialiTracciati: [...materialiEsistenti, ...nuoviMateriali],
  }
}
```

- [ ] **Step 4: Esegui i test per verificare che passino**

Run: `npx vitest run tests/unit/traccia-materiali.test.ts`
Expected: PASS — 5/5 test verdi

- [ ] **Step 5: Commit**

```bash
git add src/lib/consegna/traccia-materiali.ts tests/unit/traccia-materiali.test.ts
git commit -m "feat(consegna): tracciaMaterialiLavoro — risolve BOM→lotto FEFO prima della DdC (B1)"
```

---

## Task 5: Wiring in `orchestraConsegna` — sposta il tracciamento prima della DdC

**Files:**
- Modify: `src/lib/consegna/orchestrate.ts:140-171` (inserimento nuovo Step 2.5)
- Modify: `src/lib/consegna/orchestrate.ts:307-369` (rimozione vecchio Step 8)

**Interfaces:**
- Consumes: `tracciaMaterialiLavoro` da `./traccia-materiali` (Task 4).

- [ ] **Step 1: Inserisci lo Step 2.5 dopo il precheck MDR, prima della generazione DdC**

Trova in `src/lib/consegna/orchestrate.ts` questo blocco (Step 2, righe ~140-153):

```typescript
    // ----------------------------------------------------------------
    // Step 2 — Precheck MDR
    // ----------------------------------------------------------------
    const precheck = precheckMDR(lavoro as LavoroDettaglio)

    if (!precheck.ok) {
      await rilasciaLock()
      return {
        ok: false,
        tipo: 'precheck_fallito',
        messaggio: 'Dati MDR incompleti — correggi i campi segnalati.',
        errori_precheck: precheck.errori,
      }
    }

    // ----------------------------------------------------------------
    // Step 3 — Genera DdC
    // ----------------------------------------------------------------
```

Sostituiscilo con (aggiunge lo Step 2.5 tra il precheck e la generazione DdC):

```typescript
    // ----------------------------------------------------------------
    // Step 2 — Precheck MDR
    // ----------------------------------------------------------------
    const precheck = precheckMDR(lavoro as LavoroDettaglio)

    if (!precheck.ok) {
      await rilasciaLock()
      return {
        ok: false,
        tipo: 'precheck_fallito',
        messaggio: 'Dati MDR incompleti — correggi i campi segnalati.',
        errori_precheck: precheck.errori,
      }
    }

    // ----------------------------------------------------------------
    // Step 2.5 — Traccia materiali (BOM → lotti FEFO, MDR Allegato XIII)
    // ----------------------------------------------------------------
    // Deve avvenire PRIMA della generazione DdC: la DdC legge lavoro.materiali,
    // quindi la tracciabilità va risolta e scritta qui, non dopo la consegna
    // (bug originale B1 — vedi docs/superpowers/specs/2026-07-02-b1-tracciabilita-materiali-design.md)
    const { tracciaMaterialiLavoro } = await import('./traccia-materiali')
    const tracciamento = await tracciaMaterialiLavoro(supabase, lavoro as LavoroDettaglio, laboratorio_id)

    await supabase
      .from('lavori')
      .update({
        tracciabilita_materiali_ok: tracciamento.tracciabilitaOk,
        materiali_incompleti_dettaglio: tracciamento.dettaglio.length ? tracciamento.dettaglio : null,
      })
      .eq('id', lavoro_id)
      .eq('laboratorio_id', laboratorio_id)

    lavoro.materiali = tracciamento.materialiTracciati

    // ----------------------------------------------------------------
    // Step 3 — Genera DdC
    // ----------------------------------------------------------------
```

- [ ] **Step 2: Rimuovi il vecchio Step 8 (auto-scarico BOM dopo consegna, ora sostituito dallo Step 2.5)**

Trova questo blocco (righe ~307-369) e cancellalo interamente, incluso il commento header:

```typescript
    // ----------------------------------------------------------------
    // Step 8 — Auto-scarico materiali BOM (non-critical, fire-and-forget)
    // ----------------------------------------------------------------
    // Se errore → LOG ma NON blocca la consegna
    ;(async () => {
      try {
        const lavorazioniForScarico = lavoro.lavorazioni as Array<{
          id: string
          listino_id: string | null
          quantita: number
        }> | undefined

        if (!lavorazioniForScarico || lavorazioniForScarico.length === 0) return

        for (const lav of lavorazioniForScarico) {
          if (!lav.listino_id) continue

          // Carica BOM per questa lavorazione
          const { data: bomItems } = await supabase
            .from('listino_materiali_auto')
            .select('magazzino_id, listino_id, quantita_per_unita, unita_misura')
            .eq('listino_id', lav.listino_id)
            .eq('laboratorio_id', laboratorio_id)

          if (!bomItems || bomItems.length === 0) continue

          for (const bom of bomItems) {
            const quantita = Number(bom.quantita_per_unita) * Number(lav.quantita)

            // INSERT idempotente: ON CONFLICT DO NOTHING evita doppio scarico su retry consegna
            // Il unique constraint (lavoro_id, magazzino_id) garantisce una sola riga per coppia
            const { error: scarErr } = await supabase
              .from('scarichi_magazzino')
              .insert({
                laboratorio_id: laboratorio_id,
                lavoro_id: lavoro_id,
                magazzino_id: bom.magazzino_id,
                listino_id: bom.listino_id,
                quantita,
                unita_misura: bom.unita_misura,
              })

            if (scarErr) {
              // codice 23505 = unique violation → già scaricato in un ciclo precedente, skip
              if ((scarErr as { code?: string }).code === '23505') continue
              throw scarErr
            }

            // Decremento atomico via RPC — evita read-modify-write race condition
            const { error: decreErr } = await supabase.rpc('decrementa_scorta', {
              p_magazzino_id: bom.magazzino_id,
              p_laboratorio_id: laboratorio_id,
              p_quantita: quantita,
            })
            if (decreErr) {
              console.error('[CONSEGNA] decrementa_scorta failed:', decreErr.message)
            }
          }
        }
      } catch (err) {
        console.error('[CONSEGNA] Auto-scarico materiali failed (non-blocking):', err)
      }
    })()

    // ----------------------------------------------------------------
    // Step 9 — Restituisci ConsegnaResult
    // ----------------------------------------------------------------
```

Sostituiscilo con solo il commento del passo finale (rinumerato Step 8, dato che lo Step 8 originale è stato eliminato):

```typescript
    // ----------------------------------------------------------------
    // Step 8 — Restituisci ConsegnaResult
    // ----------------------------------------------------------------
```

- [ ] **Step 3: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Esegui l'intera suite per verificare nessuna regressione**

Run: `npx vitest run`
Expected: tutti i test verdi (inclusi quelli nuovi di Task 2 e 4)

- [ ] **Step 5: Commit**

```bash
git add src/lib/consegna/orchestrate.ts
git commit -m "fix(consegna): B1 — traccia materiali/lotti PRIMA della DdC, rimuovi vecchio auto-scarico post-consegna"
```

---

## Task 6: Banner UI "tracciabilità incompleta"

**Files:**
- Create: `src/components/features/lavori/TracciabilitaMaterialiBanner.tsx`
- Modify: `src/app/(app)/lavori/[id]/page.tsx`

**Interfaces:**
- Consumes: `MaterialeIncompletoDettaglio` da `@/types/domain` (Task 3); `lavoroDettaglio.tracciabilita_materiali_ok` / `.materiali_incompleti_dettaglio` (popolati dal DB dopo Task 1+5).

- [ ] **Step 1: Crea il componente banner**

```tsx
// src/components/features/lavori/TracciabilitaMaterialiBanner.tsx
import type { MaterialeIncompletoDettaglio } from '@/types/domain'

interface Props {
  dettaglio: MaterialeIncompletoDettaglio[]
}

const MOTIVO_LABEL: Record<MaterialeIncompletoDettaglio['motivo'], string> = {
  lotto_assente: 'nessun lotto disponibile in magazzino',
  bom_mancante: 'distinta base (BOM) non definita nel listino',
}

export function TracciabilitaMaterialiBanner({ dettaglio }: Props) {
  if (dettaglio.length === 0) return null

  return (
    <div
      role="alert"
      style={{
        margin: '0 20px 16px',
        borderRadius: '14px',
        padding: '14px 16px',
        background: 'rgba(212, 168, 67, 0.10)',
        border: '1px solid rgba(212, 168, 67, 0.35)',
      }}
    >
      <p style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--t1, #1C1916)',
        margin: '0 0 6px',
      }}>
        Tracciabilità materiali incompleta
      </p>
      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        {dettaglio.map((item, i) => (
          <li
            key={`${item.magazzino_id ?? 'bom'}-${i}`}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--t2, #4A3D33)',
            }}
          >
            {item.nome_materiale} — {MOTIVO_LABEL[item.motivo]}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Collega il banner nella pagina di dettaglio lavoro**

In `src/app/(app)/lavori/[id]/page.tsx`, aggiungi l'import subito dopo quello di `AnnullaConsegnaBanner` (riga 9):

```typescript
import { TracciabilitaMaterialiBanner } from '@/components/features/lavori/TracciabilitaMaterialiBanner'
```

Poi, subito dopo il blocco del banner `AnnullaConsegnaBanner` (righe 73-79), aggiungi:

```tsx
      {!lavoroDettaglio.tracciabilita_materiali_ok && lavoroDettaglio.materiali_incompleti_dettaglio && (
        <TracciabilitaMaterialiBanner dettaglio={lavoroDettaglio.materiali_incompleti_dettaglio} />
      )}
```

- [ ] **Step 3: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/components/features/lavori/TracciabilitaMaterialiBanner.tsx "src/app/(app)/lavori/[id]/page.tsx"
git commit -m "feat(ui): banner tracciabilità materiali incompleta su pagina lavoro (B1)"
```

---

## Task 7: Rigenerazione tipi database + verifica finale completa

**Files:**
- Modify: `src/types/database.types.ts` (rigenerato, non a mano)

**Interfaces:** nessuna nuova — verifica di chiusura.

- [ ] **Step 1: Rigenera i tipi dal database (richiede che la migration del Task 1 sia già stata applicata)**

Run: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`

Rimuovi manualmente eventuale messaggio CLI residuo in fondo al file generato (pattern già noto nel progetto, vedi CLAUDE.md §9 "Supabase types").

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Suite di test completa**

Run: `npx vitest run`
Expected: tutti i test verdi, inclusi i nuovi file di Task 2 e Task 4

- [ ] **Step 4: Build di produzione**

Run: `npx next build`
Expected: build completata senza errori

- [ ] **Step 5: Verifica manuale end-to-end (un lavoro reale)**

Su un lavoro di test con lavorazioni che hanno una BOM (`listino_materiali_auto`) collegata a un articolo `traccia_lotto=true` con almeno un lotto attivo in `lotti_magazzino`:
1. Consegna il lavoro dall'app.
2. Apri la DdC generata → verifica che la sezione "Materiali / Lotti" riporti nome materiale + numero lotto + produttore (non vuota).
3. Verifica in DB che `lavori_materiali` abbia una riga per quel lavoro e che `lotti_magazzino.quantita_residua` sia stata decrementata.
4. Ripeti il test su un lavoro la cui lavorazione non ha alcuna BOM definita → verifica che sulla pagina `/lavori/[id]` compaia il banner "Tracciabilità materiali incompleta" con motivo "distinta base (BOM) non definita nel listino".

- [ ] **Step 6: Commit finale (se Step 1 ha prodotto un diff su database.types.ts)**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): rigenera database.types.ts dopo migration B1"
```

---

## Self-Review

**Copertura spec:** causa radice (ordine temporale write/DdC) → Task 5; fonte di verità `lavori_materiali` → Task 1/4; FEFO → Task 2; soft-block lotto_assente/bom_mancante → Task 4; biforcazione `traccia_lotto` → Task 4; guardia trigger negativo → Task 1; gap migration mancante → Task 1; UI minima → Task 6; rigenerazione tipi + verifica → Task 7. Nessuna sezione della spec senza task corrispondente.

**Placeholder scan:** nessun TBD/TODO; ogni step ha codice completo o comando+output atteso reali.

**Coerenza tipi:** `RisultatoFefo`/`ConsumoLotto`/`LottoDisponibile` (Task 2) usati identici in Task 4; `MaterialeIncompletoDettaglio` (Task 3) usato identico in Task 4/5/6; `RisultatoTracciamento` (Task 4) consumato in Task 5 con gli stessi nomi di campo (`tracciabilitaOk`, `dettaglio`, `materialiTracciati`).
