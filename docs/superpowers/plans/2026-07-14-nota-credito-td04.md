# Nota di Credito TD04 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emettere una nota di credito FatturaPA **TD04** che storna integralmente una fattura già inviata a SdI, riportando il lavoro a ri-fatturabile e generando (se pagata) credito cliente — senza rompere contabilità, fatturato, o lo stato clinico MDR.

**Architecture:** Migration (colonne collegamento + riscrittura indice parziale + backstop + CHECK) → percorso TD04 dedicato in `generaFatturaPA` (snapshot congelato, mai dal lavoro vivo) → RPC atomica `emetti_nota_credito_atomica` (claim-first, effetti fiscali, reset lavoro SOLO fiscale) → nuovo tipo movimento credito `storno` → audit di TUTTE le superfici di lettura → API route → UI su `/fatture/[id]`.

**Tech Stack:** Next.js 16 route handlers, Supabase Postgres (migration + PL/pgSQL RPC SECURITY DEFINER), Vitest, TypeScript, React/Motion.

**Spec di riferimento (LEGGERE):** `docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md` (v2, post-review 3 advisor).

## Global Constraints

- Dominio **FatturaPA** → percorso GRANDE (BP-2): TDD puro, review fiscale rafforzata, output reale FASE 7.
- **Importi sempre POSITIVI** nel TD04 (il segno è implicito in `<TipoDocumento>`). Mai importi negativi.
- **Natura IVA = N4** anche sul TD04; `RiferimentoNormativo = "Art. 10 n.18 DPR 633/72"` invariato.
- Il TD04 porta **`lavoro_id = NULL`**. Snapshot congelati (numero/data/cliente/imponibile) **dall'originale**, MAI ri-derivati dal lavoro vivo (trappola classe-N7).
- **Gate storno (deciso):** `stato_sdi IN ('smtp_inviata','pec_consegnata','ricevuta_sdi','accettata','scaduta')` AND `tipo_documento='TD01'` AND `stornata_at IS NULL`. Vietato draft/generata/rifiutata.
- **Reset lavoro SOLO fiscale:** `incluso_in_fattura=false`, `decisione_fatturazione='in_attesa'`. MAI toccare `stato`/`conformato`/`data_consegna_effettiva`/`dichiarazioni_conformita` (MDR).
- **Credito da storno = tipo movimento dedicato `storno`** (NON `eccedenza`), senza dipendenza da `pagamento_id`.
- **Serie numerazione:** unica condivisa (`generaProgressivo('fattura')`).
- **RPC:** `SECURITY DEFINER SET search_path = public, pg_temp`, `REVOKE ALL FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE TO service_role`, `p_laboratorio_id` esplicito filtrato in ogni statement.
- **Dopo la migration:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` + `npx tsc --noEmit` (FASE 6b).
- Commit format: `feat(fattura): …` / `feat(db): …`. Ogni commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Bollo TD04:** default = rispecchia la regola dell'originale (imponibile>77,47€ → €2). **Flag commercialista** (annotare nel codice, non bloccante).

---

### Task 1: Migration — colonne collegamento, indice, backstop, CHECK

**Files:**
- Create: `supabase/migrations/<timestamp>_nota_credito_td04.sql`
- Modify (rigenerato): `src/types/database.types.ts`

**Interfaces:**
- Produces: colonne `fatture.fattura_collegata_id`, `collegata_numero`, `collegata_data`, `causale_storno`, `stornata_at`; indice `fatture_lavoro_attiva_unique` riscritto; indice `fatture_td04_collegata_unique`; constraint `fatture_td04_shape`.

- [ ] **Step 1: Scrivi la migration**

Crea `supabase/migrations/<timestamp>_nota_credito_td04.sql` (usa un timestamp coerente col formato esistente, es. `20260715090000`):

```sql
-- Nota di Credito TD04 — colonne collegamento + indice + backstop + shape check.
-- Spec: docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md

-- 1. Colonne (tutte NULL: nessun impatto sugli insert TD01 esistenti)
ALTER TABLE public.fatture
  ADD COLUMN fattura_collegata_id uuid NULL REFERENCES public.fatture(id),
  ADD COLUMN collegata_numero text NULL,
  ADD COLUMN collegata_data date NULL,
  ADD COLUMN causale_storno text NULL,
  ADD COLUMN stornata_at timestamptz NULL;

-- 2. Riscrittura indice unico lavoro: la stornata esce dal predicato -> lavoro ri-fatturabile
DROP INDEX IF EXISTS public.fatture_lavoro_attiva_unique;
CREATE UNIQUE INDEX fatture_lavoro_attiva_unique
  ON public.fatture (laboratorio_id, lavoro_id)
  WHERE lavoro_id IS NOT NULL AND stato_sdi <> 'rifiutata' AND stornata_at IS NULL;

-- 3. Backstop: un solo TD04 attivo per fattura originale
CREATE UNIQUE INDEX fatture_td04_collegata_unique
  ON public.fatture (laboratorio_id, fattura_collegata_id)
  WHERE fattura_collegata_id IS NOT NULL AND stato_sdi <> 'rifiutata';

-- 4. Shape: TD04 ben formato XOR TD01 senza collegamento (NOT VALID -> VALIDATE per evitare lock lungo)
ALTER TABLE public.fatture ADD CONSTRAINT fatture_td04_shape CHECK (
  (tipo_documento = 'TD04'
     AND fattura_collegata_id IS NOT NULL AND lavoro_id IS NULL
     AND collegata_numero IS NOT NULL AND collegata_data IS NOT NULL AND causale_storno IS NOT NULL)
  OR (tipo_documento <> 'TD04' AND fattura_collegata_id IS NULL)
) NOT VALID;
ALTER TABLE public.fatture VALIDATE CONSTRAINT fatture_td04_shape;
```

- [ ] **Step 2: Applica la migration in locale e rigenera i tipi**

Run: `npx supabase db push` (o il flusso migration del progetto), poi
`npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
Rimuovi eventuale messaggio CLI in fondo al file generato.

- [ ] **Step 3: Verifica tsc**

Run: `npx tsc --noEmit`
Expected: 0 errori. Le nuove colonne sono opzionali negli Insert → gli insert TD01 esistenti (`generate-xml.ts`) non si rompono.

- [ ] **Step 4: Test — le nuove colonne esistono nei tipi**

Crea `tests/unit/nota-credito-schema.test.ts`:

```typescript
// I tipi generati espongono le nuove colonne fatture per TD04.
import { describe, it, expect } from 'vitest'
import type { Database } from '@/types/database.types'

describe('schema TD04', () => {
  it('fatture Row espone i campi di collegamento nota di credito', () => {
    type Row = Database['public']['Tables']['fatture']['Row']
    const sample: Pick<Row, 'fattura_collegata_id' | 'collegata_numero' | 'collegata_data' | 'causale_storno' | 'stornata_at'> = {
      fattura_collegata_id: null, collegata_numero: null, collegata_data: null,
      causale_storno: null, stornata_at: null,
    }
    expect(sample).toBeTruthy()
  })
})
```

Run: `npx vitest run tests/unit/nota-credito-schema.test.ts` → PASS (compila = i campi esistono).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ src/types/database.types.ts tests/unit/nota-credito-schema.test.ts
git commit -m "feat(db): colonne + indici + shape check per nota di credito TD04"
```

---

### Task 2: `generaFatturaPA` — percorso TD04 dedicato (XML completo)

**Files:**
- Modify: `src/lib/fattura/generate-xml.ts`
- Test: `tests/unit/generate-xml-td04.test.ts`

**Interfaces:**
- Consumes: draft TD04 (riga `fatture` con `tipo_documento='TD04'`, `imponibile`, `collegata_numero`, `collegata_data`, `causale_storno`, snapshot cliente `cliente_denominazione`/`cliente_piva`/`cliente_cf`/`cliente_indirizzo`/`cliente_codice_sdi`/`cliente_pec`).
- Produces: quando il draft è TD04, `generaFatturaPA(lavoro=null?, fatturaId)` genera XML TD04 leggendo SOLO dallo snapshot. **Decisione di firma:** aggiungere un ramo che, se il draft ha `tipo_documento='TD04'`, NON richiede/usa `lavoro`. Vedi Step 3.

- [ ] **Step 1: Scrivi il test (RED)**

Crea `tests/unit/generate-xml-td04.test.ts` — mock su `getServiceClient` con una riga fatture TD04 (stesso pattern di `generate-xml-prezzo.test.ts`). Il draft TD04 fornisce: `imponibile: 100`, `collegata_numero: '2026-0012'`, `collegata_data: '2026-07-01'`, `causale_storno: 'Storno per errore di fatturazione'`, snapshot cliente. Asserzioni sull'XML caricato:

```typescript
// generaFatturaPA su un draft TD04 produce un XML nota di credito completo,
// leggendo SOLO dallo snapshot congelato (mai dal lavoro vivo).
expect(xmlContent).toContain('<TipoDocumento>TD04</TipoDocumento>')
// DatiFattureCollegate DOPO DatiGeneraliDocumento, DENTRO DatiGenerali
expect(xmlContent).toMatch(/<\/DatiGeneraliDocumento>\s*<DatiFattureCollegate>/)
expect(xmlContent).toContain('<IdDocumento>2026-0012</IdDocumento>')
expect(xmlContent).toContain('<Data>2026-07-01</Data>') // dentro DatiFattureCollegate
expect(xmlContent).toContain('<Causale>Storno per errore di fatturazione</Causale>')
expect(xmlContent).toContain('<ImportoTotaleDocumento>102.00</ImportoTotaleDocumento>') // imponibile+bollo (>77.47)
expect(xmlContent).toContain('<ImponibileImporto>100.00</ImponibileImporto>')
expect(xmlContent).toContain('<Natura>N4</Natura>')
expect(xmlContent).toContain('Storno integrale fattura n. 2026-0012 del 2026-07-01')
// nessun importo negativo
expect(xmlContent).not.toMatch(/>-\d/)
```

Aggiungi un test che il ramo TD04 **non** legge il lavoro: passare `lavoro` con `lavorazioni` diverse non deve alterare l'imponibile (resta 100 dallo snapshot); idealmente il ramo TD04 lancia se si prova a derivare dal lavoro.

- [ ] **Step 2: Esegui il test (RED)**

Run: `npx vitest run tests/unit/generate-xml-td04.test.ts`
Expected: FAIL (oggi `generaFatturaPA` hardcoda TD01 e non emette DatiFattureCollegate).

- [ ] **Step 3: Implementa il ramo TD04 in `generate-xml.ts`**

All'inizio di `generaFatturaPA`, dopo aver caricato il draft (quando `fatturaId` presente), leggere anche `tipo_documento, imponibile, collegata_numero, collegata_data, causale_storno` e gli snapshot cliente dalla riga fatture. Se `tipo_documento === 'TD04'`:
- Bypassare la derivazione da `lavoro`: `imponibile = draft.imponibile`; `bolloApplicato = imponibile > 77.47 ? 2.00 : 0`; `totale = imponibile + bolloApplicato`.
- Cedente = laboratorio (come oggi). Cessionario = snapshot cliente del draft (`draft.cliente_denominazione`, `draft.cliente_piva ?? draft.cliente_cf`, indirizzo snapshot, `draft.cliente_codice_sdi`, `draft.cliente_pec`) — **non** `lavoro.cliente`.
- `<TipoDocumento>TD04</TipoDocumento>` (parametrizzare la stringa hardcoded a :235).
- Emettere il blocco `DatiFattureCollegate` **subito dopo** `</DatiGeneraliDocumento>` e **prima** di `</DatiGenerali>`:
  ```
  <DatiFattureCollegate>
    <IdDocumento>${xe(draft.collegata_numero)}</IdDocumento>
    <Data>${draft.collegata_data}</Data>
  </DatiFattureCollegate>
  ```
- `<Causale>`: splittare in chunk da 200 char (helper `chunk200(causale).map(c => `<Causale>${xe(c)}</Causale>`).join('')`).
- Riga sintetica unica: descrizione `Storno integrale fattura n. ${draft.collegata_numero} del ${draft.collegata_data}`, quantità 1, prezzo/importo = imponibile, Natura N4.
- `DatiRiepilogo`: ImponibileImporto = imponibile (snapshot), come oggi.
- Cortesia PDF: `tipo_documento: 'TD04'` nelle props (il template già gestisce il titolo).
- **Assertion difensiva:** se `tipo_documento==='TD04'` e per qualunque motivo si accede a `lavoro.lavorazioni`, throw `'[TD04] imponibile deve venire dallo snapshot fattura, mai dal lavoro'`. In pratica: nel ramo TD04 non referenziare `lavoro`.
- Aggiungere un commento `// BOLLO TD04: rispecchia la regola dell'originale — flag commercialista (spec §7.1)`.

- [ ] **Step 4: Esegui il test (GREEN)**

Run: `npx vitest run tests/unit/generate-xml-td04.test.ts` → PASS.

- [ ] **Step 5: Regressione + tsc**

Run: `npx vitest run tests/unit/generate-xml-prezzo.test.ts tests/unit/generate-xml-pdf-cortesia.test.ts tests/unit/fattura-cortesia-template.test.ts tests/unit/generate-xml-td04.test.ts && npx tsc --noEmit`
Expected: tutti verdi (il ramo TD01 invariato), 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fattura/generate-xml.ts tests/unit/generate-xml-td04.test.ts
git commit -m "feat(fattura): percorso TD04 in generaFatturaPA (DatiFattureCollegate, snapshot congelato)"
```

---

### Task 3: RPC atomica `emetti_nota_credito_atomica` (claim-first + reset fiscale)

**Files:**
- Create: `supabase/migrations/<timestamp>_emetti_nota_credito_rpc.sql`
- Modify (rigenerato): `src/types/database.types.ts`

**Interfaces:**
- Produces: RPC `emetti_nota_credito_atomica(p_originale_id uuid, p_causale text, p_laboratorio_id uuid) returns json`. Ritorna `{esito, td04_id?}` con esiti: `ok`, `non_stornabile` (gate/claim fallito), `non_trovato`.

- [ ] **Step 1: Scrivi la migration RPC**

La RPC fa: claim-first → progressivo → insert draft TD04 → (credito in Task 4, qui lasciare TODO chiaro o già cablato se Task 4 fatto prima) → reset lavoro fiscale. **NON** genera XML (fuori RPC, Task 6). Scheletro:

```sql
CREATE OR REPLACE FUNCTION public.emetti_nota_credito_atomica(
  p_originale_id uuid, p_causale text, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_orig public.fatture%ROWTYPE;
  v_rows int;
  v_prog int; v_anno int; v_numero text; v_td04_id uuid;
BEGIN
  -- 0. Claim winner-takes-all: gate stato_sdi pragmatico (spec §7.3)
  UPDATE public.fatture SET stornata_at = now()
   WHERE id = p_originale_id AND laboratorio_id = p_laboratorio_id
     AND stornata_at IS NULL AND tipo_documento = 'TD01'
     AND stato_sdi IN ('smtp_inviata','pec_consegnata','ricevuta_sdi','accettata','scaduta');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN json_build_object('esito','non_stornabile'); END IF;

  SELECT * INTO v_orig FROM public.fatture WHERE id = p_originale_id;
  v_anno := EXTRACT(YEAR FROM now())::int;

  -- 1. Progressivo (RPC esistente del progetto — usare la stessa usata per le fatture)
  SELECT public.genera_progressivo(p_laboratorio_id, 'fattura', v_anno) INTO v_prog;
  v_numero := v_anno::text || '-' || lpad(v_prog::text, 4, '0');

  -- 2. Insert draft TD04 (snapshot dall'originale; lavoro_id NULL)
  INSERT INTO public.fatture (
    laboratorio_id, cliente_id, numero, anno, progressivo, data, tipo_documento,
    stato_sdi, imponibile, iva_percentuale, iva_importo, bollo, totale,
    codice_iva, natura_iva,
    fattura_collegata_id, collegata_numero, collegata_data, causale_storno,
    cliente_denominazione, cliente_piva, cliente_cf, cliente_indirizzo,
    cliente_codice_sdi, cliente_pec, lavoro_id
  ) VALUES (
    p_laboratorio_id, v_orig.cliente_id, v_numero, v_anno, v_prog, current_date, 'TD04',
    'draft', v_orig.imponibile, 0, 0,
    (CASE WHEN v_orig.imponibile > 77.47 THEN 2.00 ELSE 0 END),
    v_orig.imponibile + (CASE WHEN v_orig.imponibile > 77.47 THEN 2.00 ELSE 0 END),
    'N4', 'N4',
    p_originale_id, v_orig.numero, v_orig.data, p_causale,
    v_orig.cliente_denominazione, v_orig.cliente_piva, v_orig.cliente_cf, v_orig.cliente_indirizzo,
    v_orig.cliente_codice_sdi, v_orig.cliente_pec, NULL
  ) RETURNING id INTO v_td04_id;

  -- 3. Credito cliente se pagata (Task 4 riempie questo blocco)
  -- (placeholder: vedi Task 4 — inserisce movimento tipo 'storno' importo v_orig.importo_pagato)

  -- 4. Reset lavoro SOLO fiscale (se l'originale aveva un lavoro)
  IF v_orig.lavoro_id IS NOT NULL THEN
    UPDATE public.lavori
       SET incluso_in_fattura = false, decisione_fatturazione = 'in_attesa'
     WHERE id = v_orig.lavoro_id AND laboratorio_id = p_laboratorio_id;
  END IF;

  RETURN json_build_object('esito','ok','td04_id', v_td04_id);
END;
$$;

REVOKE ALL ON FUNCTION public.emetti_nota_credito_atomica(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emetti_nota_credito_atomica(uuid, text, uuid) TO service_role;
```

> NOTA implementatore: verificare il nome/firma reale di `genera_progressivo` nel DB (grep nelle migration) e la colonna `importo_pagato` su fatture. Adattare i nomi se divergono. Verificare che `decisione_fatturazione` accetti `'in_attesa'` (enum/check).

- [ ] **Step 2: Applica + rigenera tipi + tsc**

Run: `npx supabase db push` → gen types → `npx tsc --noEmit` (0 errori).

- [ ] **Step 3: Test RPC (integrazione, se il progetto ha un runner DB) o unit sul contratto**

Se esiste un pattern di test RPC nel progetto (cerca `.rpc('annulla_consegna_atomica'` nei test), replicarlo. Altrimenti, test del contratto lato route in Task 6. Minimo: un test che, dato un mock che simula la RPC, la route mappa gli esiti. Documentare in `tests/unit/` un test che verifica il gate (esito `non_stornabile` per stato non ammesso) tramite mock del client.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/ src/types/database.types.ts
git commit -m "feat(db): RPC emetti_nota_credito_atomica (claim-first, reset lavoro fiscale)"
```

---

### Task 4: Modello credito `storno` (movimento dedicato)

**Files:**
- Modify: `src/lib/contabilita/saldo.ts` (tipo `MovimentoCreditoRiga` + `calcolaCreditoDisponibile`)
- Modify: `src/lib/contabilita/queries.ts` (`fetchMovimentiCreditoValidi` — includere `storno`)
- Modify: `supabase/migrations/<timestamp>_emetti_nota_credito_rpc.sql` (blocco 3: insert movimento `storno`) — oppure una migration additiva se Task 3 già committato
- Test: `tests/unit/contabilita-storno-credito.test.ts`

**Interfaces:**
- Consumes: `credito_clienti_movimenti.tipo` accetta `'storno'` (verificare CHECK/enum sulla colonna `tipo`; se è un CHECK, la migration deve estenderlo).
- Produces: `calcolaCreditoDisponibile` conta `+ storni`; `fetchMovimentiCreditoValidi` non gatea `storno` su pagamento.

- [ ] **Step 1: Test (RED)**

Crea `tests/unit/contabilita-storno-credito.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calcolaCreditoDisponibile } from '@/lib/contabilita/saldo'

describe('credito da storno (nota di credito)', () => {
  it('un movimento storno aumenta il credito disponibile', () => {
    expect(calcolaCreditoDisponibile([{ tipo: 'storno', importo: 122 }])).toBe(122)
  })
  it('storno si somma a eccedenze, al netto di applicazioni e rimborsi', () => {
    expect(calcolaCreditoDisponibile([
      { tipo: 'eccedenza', importo: 10 },
      { tipo: 'storno', importo: 122 },
      { tipo: 'applicazione', importo: 20 },
      { tipo: 'rimborso', importo: 5 },
    ])).toBe(107) // 10 + 122 - 20 - 5
  })
})
```

- [ ] **Step 2: RED**

Run: `npx vitest run tests/unit/contabilita-storno-credito.test.ts` → FAIL (tipo `'storno'` non nel type union).

- [ ] **Step 3: Implementa**

In `saldo.ts`:
- `MovimentoCreditoRiga.tipo`: aggiungi `'storno'` all'union.
- `calcolaCreditoDisponibile`: `round2(somma('eccedenza') + somma('storno') - somma('applicazione') - somma('rimborso'))`.

In `queries.ts` `fetchMovimentiCreditoValidi`: il filtro attuale scarta `eccedenza` senza pagamento attivo; `storno` deve passare sempre → aggiornare il tipo di ritorno per includere `'storno'` e assicurarsi che il filtro `.filter((m) => m.tipo !== 'eccedenza' || m.pagamenti?.stato === 'attivo')` lasci passare `storno` (già vero: il predicato gatea solo `eccedenza`). Aggiornare i cast di tipo per includere `'storno'`.

Migration (blocco 3 della RPC, o additiva): se `credito_clienti_movimenti.tipo` ha un CHECK constraint, estenderlo per accettare `'storno'`. Poi nella RPC:
```sql
IF v_orig.importo_pagato > 0 THEN
  INSERT INTO public.credito_clienti_movimenti (laboratorio_id, cliente_id, tipo, importo, pagamento_id, registrato_da)
  VALUES (p_laboratorio_id, v_orig.cliente_id, 'storno', v_orig.importo_pagato, NULL, NULL);
END IF;
```
> Verificare le colonne reali di `credito_clienti_movimenti` (registrato_da nullable? serve `nota`/`fattura_id`?). Adattare.

- [ ] **Step 4: GREEN + regressione**

Run: `npx vitest run tests/unit/contabilita-storno-credito.test.ts tests/unit/contabilita-saldo.test.ts tests/unit/contabilita-credito-cliente.test.ts tests/unit/contabilita-queries.test.ts && npx tsc --noEmit`
Expected: verdi, 0 errori.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contabilita/saldo.ts src/lib/contabilita/queries.ts supabase/migrations/ tests/unit/contabilita-storno-credito.test.ts
git commit -m "feat(fattura): tipo movimento credito 'storno' per note di credito"
```

---

### Task 5: AUDIT superfici di lettura (dovuti / ricavo / portale / rendiconto)

**Files (Gruppo A — dovuti/scadenzario/credito → `stornata_at IS NULL` E `tipo_documento != 'TD04'`):**
- Modify: `src/lib/contabilita/queries.ts` (`getContabilitaCliente` :189-196; `getCreditoScadutoPerCliente` :63-70)
- Modify: `src/app/api/scadenzario/route.ts` (:52-59)

**Files (Gruppo B — ricavo/fatturato/export → TD04 negativo nel mese, NO `stornata_at`):**
- Modify: `supabase/migrations/<timestamp>_dashboard_esclude_td04.sql` (aggiorna `refresh_dashboard_cache`)
- Modify: `src/lib/dashboard/queries.ts` (`getTrendMensile` :375)
- Modify: `src/app/api/fatture/export/route.ts`

**Files (Gruppo C — re-fatturabilità portale → `AND stornata_at IS NULL`):**
- Modify: `src/app/api/portale/[token]/fatturazione/route.ts` (:60-70)
- Modify: `src/app/api/portale/[token]/fatturazione/[lavoro_id]/route.ts` (:39-52)

**Files (Gruppo E — opzionale):** `src/lib/contabilita/queries.ts` (`getPagamentiCliente` :349)

**Interfaces:** nessuna nuova firma; solo predicati di query.

- [ ] **Step 1: Test (RED) — la fattura stornata e il TD04 non compaiono nei dovuti**

Estendere/creare test in `tests/unit/contabilita-cliente-query.test.ts` (o nuovo file) con un mock che restituisce: una TD01 stornata (`stornata_at` valorizzato, `pagata=false`) e un TD04 (`tipo_documento='TD04'`, `pagata=false`). Assertare che `getContabilitaCliente` NON li includa nei `dovuti`.

```typescript
it('esclude la fattura stornata e il TD04 dai dovuti', async () => {
  // mock fatture: [{stornata_at: '...', pagata:false,...}, {tipo_documento:'TD04', pagata:false,...}]
  const res = await getContabilitaCliente(svc, 'lab-1', 'cli-1')
  expect(res.dovuti.find(d => d.origine === 'fattura')).toBeUndefined()
})
```

- [ ] **Step 2: RED** — Run il test → FAIL (oggi le query non filtrano stornata/TD04).

- [ ] **Step 3: Implementa i predicati**

- Gruppo A: aggiungere `.is('stornata_at', null).neq('tipo_documento', 'TD04')` alle 3 query.
- Gruppo C: aggiungere `.is('stornata_at', null)` ai 2 filtri `fatture.lavoro_id` del portale.
- Gruppo B (revenue): nella funzione SQL `refresh_dashboard_cache` e in `getTrendMensile`, il TD04 va **sottratto** nel mese di emissione: sommare `totale * CASE WHEN tipo_documento='TD04' THEN -1 ELSE 1 END` (e mantenere l'originale nel suo mese → NON filtrare `stornata_at`). Per l'export CSV: emettere il TD04 come riga con importo negativo o colonna dedicata.
- Gruppo E (opzionale): `getPagamentiCliente` → `.is('fatture.stornata_at', null)` sul join, o etichettare.

- [ ] **Step 4: GREEN + regressione ampia**

Run: `npx vitest run tests/unit/contabilita-cliente-query.test.ts tests/unit/contabilita-queries.test.ts tests/unit/contabilita-prezzo-effettivo.test.ts && npx tsc --noEmit`
Expected: verdi, 0 errori.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contabilita/queries.ts src/app/api/scadenzario/route.ts src/lib/dashboard/queries.ts src/app/api/fatture/export/route.ts src/app/api/portale/ supabase/migrations/ tests/
git commit -m "feat(fattura): audit letture contabili per storno TD04 (dovuti/ricavo/portale)"
```

---

### Task 6: API route + orchestrazione a due fasi (RPC → XML) con resume

**Files:**
- Create: `src/app/api/fatture/[id]/nota-credito/route.ts`
- Test: `tests/unit/nota-credito-route.test.ts`

**Interfaces:**
- Consumes: RPC `emetti_nota_credito_atomica` (Task 3), `generaFatturaPA` (Task 2).
- Produces: `POST /api/fatture/[id]/nota-credito` body `{ causale: string }` → chiama RPC → se `ok`, chiama `generaFatturaPA(td04_id)` (fase 2). Esiti: 200 `{td04_id, numero}`, 409 se `non_stornabile`, 404 se non trovata.

- [ ] **Step 1: Test (RED)** — pattern di `fatture-xml-gate-stato-sdi.test.ts`. Casi: causale mancante → 400; RPC `non_stornabile` → 409, `generaFatturaPA` NON chiamata; RPC `ok` → `generaFatturaPA(td04_id)` chiamata, 200; resume: se esiste già un TD04 draft/generata per l'originale (RPC ritorna il suo id o la route lo rileva), non crea un secondo TD04.

- [ ] **Step 2: RED** — Run → FAIL (route inesistente).

- [ ] **Step 3: Implementa la route** — CSRF + auth (pattern `annulla-consegna/route.ts`), carica `utenti.laboratorio_id`, valida `body.causale` (non vuota, trim), chiama `svc.rpc('emetti_nota_credito_atomica', {...})`, mappa esiti; su `ok` chiama `await generaFatturaPA(td04 as LavoroDettaglio?, td04_id)` — **adattare la firma**: `generaFatturaPA` ora deve poter essere invocata con solo `fatturaId` per un TD04 (il ramo TD04 non usa `lavoro`). Se la firma richiede `lavoro`, refactorare per renderlo opzionale quando il draft è TD04. Gestire errore di generazione: il TD04 draft resta, esito `{td04_id, xml_pending:true}` (retry idempotente).

- [ ] **Step 4: GREEN + regressione + tsc** — Run i test nuovi + `fatture-xml-*` + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/fatture/[id]/nota-credito/ tests/unit/nota-credito-route.test.ts src/lib/fattura/generate-xml.ts
git commit -m "feat(fattura): POST /api/fatture/[id]/nota-credito (RPC + XML a due fasi)"
```

---

### Task 7: UI su `/fatture/[id]` — azione «Emetti nota di credito» + gate estetico L2

**Files:**
- Modify: `src/app/(app)/fatture/[id]/page.tsx` (e/o un nuovo componente `src/components/features/fatture/NotaCreditoButton.tsx` + sheet)
- Create mockup: `docs/design/mockups/2026-07-15-nota-credito-td04.html` (light+dark, 390/768/1280) → screenshot → **approvazione Francesco** PRIMA del React
- Test: `tests/unit/nota-credito-button.test.tsx`

**Interfaces:** chiama `POST /api/fatture/[id]/nota-credito`.

- [ ] **Step 1: Mockup + approvazione** — Seguire §0B del CLAUDE.md: mockup HTML in `docs/design/mockups/`, screenshot Playwright light+dark, mostrare varianti, attendere «ok procedi» di Francesco, scrivere la decisione in `docs/design/decisions/`. Bottom sheet mobile con causale obbligatoria + conferma esplicita (azione irreversibile).
- [ ] **Step 2: Test componente (RED)** — render del bottone visibile solo su fatture stornabili (stato ammesso, TD01, non già stornata); click apre sheet; submit senza causale bloccato; submit valido chiama fetch.
- [ ] **Step 3: RED** — Run → FAIL.
- [ ] **Step 4: Implementa React** — fedele al mockup; animazioni da `src/design-system/motion.ts`; feedback da `src/lib/feedback/*`; 3 viewport; `prefers-reduced-motion`; touch target ≥44px. Il bottone appare solo se `stato_sdi ∈ gate` e `tipo_documento==='TD01'` e `!stornata_at`.
- [ ] **Step 5: GREEN + tsc + build** — Run test + `npx tsc --noEmit` + `npx next build`.
- [ ] **Step 6: GATE ESTETICO L2 (FASE 9b)** — micro-audit UI/UX della sola superficie contro `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` (390/768/1280 × light/dark); screenshot before/after in `docs/design/screenshots/`.
- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/fatture/[id]/ src/components/features/fatture/ docs/design/ tests/
git commit -m "feat(fattura): UI emetti nota di credito su /fatture/[id]"
```

---

### Task 8: Idempotenza/resume + gestione TD04 rifiutato da SdI

**Files:**
- Modify: `src/app/api/fatture/[id]/nota-credito/route.ts` (resume) e/o RPC
- Modify: dove SdI rifiuta una fattura (cercare chi setta `stato_sdi='rifiutata'`) → se il rifiutato è un TD04, azzerare `stornata_at` sull'originale (riabilitare ri-storno)
- Test: `tests/unit/nota-credito-resume.test.ts`

**Interfaces:** nessuna nuova firma.

- [ ] **Step 1: Test (RED)** — (a) retry dopo XML fallito: seconda POST non crea un secondo TD04 (backstop unique + lookup per `fattura_collegata_id`); (b) se il TD04 diventa `rifiutata`, l'originale ha `stornata_at` azzerato → ri-storno possibile.
- [ ] **Step 2: RED** — Run → FAIL.
- [ ] **Step 3: Implementa** — resume: prima di chiamare la RPC, la route (o la RPC stessa) cerca un TD04 esistente `WHERE fattura_collegata_id = originale AND stato_sdi IN ('draft','generata')` → se esiste, salta la creazione e riprende solo `generaFatturaPA(td04_id)`. Rifiuto: nel punto che imposta `stato_sdi='rifiutata'` su un TD04, `UPDATE fatture SET stornata_at = NULL WHERE id = <collegata>` (l'originale torna stornabile; il backstop unique esclude già `rifiutata`).
- [ ] **Step 4: GREEN + regressione + tsc** — Run.
- [ ] **Step 5: Commit**

```bash
git add src/app/api/fatture/[id]/nota-credito/ supabase/migrations/ tests/
git commit -m "feat(fattura): resume idempotente TD04 + ri-storno su TD04 rifiutato"
```

---

## FASE 7 — Verifica finale (dopo tutti i task)
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npx vitest run` → suite intera verde
- [ ] `npx next build` → verde (con `.env.local` presente)

## FASE 8-9 — Review + QA
- [ ] Review indipendente rafforzata (fiscale): tracciato XML TD04, atomicità RPC, audit letture completo, credito.
- [ ] QA lab E2E `00000000-0000-0000-0000-000000000001`: storno di fattura (a) non pagata, (b) parzialmente pagata, (c) pagata cash, (d) pagata con credito → verificare: contabilità (no fatturato fantasma, no doppio debitore, TD04 non è un dovuto), credito cliente corretto, lavoro ri-fatturabile (lab **e** portale), no 23505 in ri-fatturazione, doppio-tap → un solo TD04.
- [ ] Gate estetico L2 sulla UI (Task 7 Step 6).

## FASE 10-11 — Merge (gate Francesco) + BP-1
- [ ] Merge/push solo dopo OK esplicito; CI verde + verifica uachelab.com.
- [ ] BP-1: MEMORY.md + ROADMAP + BACKLOG (N5 → risolto via feature TD04) + SESSION_ACTIVE.

---

## Self-Review (svolto)
- **Spec coverage:** migration+indice+backstop+CHECK → T1; XML TD04 completo → T2; RPC claim-first+reset fiscale → T3; credito `storno` → T4; audit letture Gruppi A/B/C/E → T5; API due-fasi → T6; UI+gate L2 → T7; resume+rifiutato → T8. Punti aperti (bollo flag, gate deciso) → Global Constraints. ✓
- **Placeholder scan:** i "verificare nome reale di X" sono note di adattamento su nomi DB reali (genera_progressivo, colonne credito_clienti_movimenti, enum decisione_fatturazione) che l'implementer DEVE confermare col DB — non placeholder di logica. Ogni step ha codice/comando reale. ✓
- **Type consistency:** `emetti_nota_credito_atomica(p_originale_id,p_causale,p_laboratorio_id)`, tipo movimento `'storno'`, colonne `stornata_at`/`fattura_collegata_id`/`collegata_numero`/`collegata_data`/`causale_storno` coerenti tra T1/T3/T4/T5. ✓
- **Ordine dipendenze:** T1(schema)→T2(XML)/T3(RPC)→T4(credito, tocca RPC)→T5(audit)→T6(route usa T2+T3)→T7(UI usa T6)→T8(resume). T4 modifica la RPC di T3: se eseguiti separati, T4 fa una migration additiva. Nota per l'esecutore.
