# Registro delle emissioni del contratto ai dentisti — piano di esecuzione

> **Per chi esegue:** SOTTO-SKILL RICHIESTA — `superpowers:subagent-driven-development`, un task alla volta a
> un **esecutore fresco** (**R-E1**), con revisione indipendente in mezzo. Nel brief di ogni task va
> l'istruzione esplicita di **cercare dove questo piano sbaglia**. Un difetto trovato **fuori** dal proprio
> mandato si **riferisce**, non si corregge di nascosto (**R-E2**).

**Obiettivo:** ogni volta che il contratto sul trattamento dei dati esce **davvero nuovo**, UÀ lo conserva,
gli dà un numero progressivo vero, ne salva l'impronta e la versione del modello — così si può dire **quale
testo ha in mano ogni dentista**.

**Architettura:** migration **additiva** su `data_processing_agreements` (nessuna colonna esistente
modificata); l'impronta si calcola sui **soli dati sostanziali** (laboratorio + cliente) e si confronta
insieme alla **versione del modello**; `generateDpa()` diventa un'**emissione** — guard, generazione,
caricamento su Storage privato, progressivo, riga di registro — sul modello di `generate-ddc.ts`. La rotta e
il contratto verso il browser **non cambiano**: risponde sempre un PDF.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Storage) · `@react-pdf/renderer` · vitest ·
`pdf-parse`.

**Spec:** `docs/superpowers/specs/2026-08-03-dpa-registro-emissioni-design.md`
**Decisioni:** D126 · D127 · D128 · D129 · D130 · D131 —
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`

---

## Vincoli globali

- **Ruoli: sono CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. Mai `admin` nudo.
- **RLS:** `public.current_lab_id()`, mai `auth.current_lab_id()`. La rotta usa il **client di servizio**, che
  la RLS la aggira: **ogni** lettura e scrittura porta il filtro `laboratorio_id` **esplicito**.
- **Contenitore `documenti` è PRIVATO** (`provato:` §Registro delle prove, P5). **Mai `getPublicUrl`**: si
  conserva il **percorso**, e chi mostra firma con `getSignedUrl`.
- **Animazioni/token:** la pagina `src/app/(app)/clienti/[id]/page.tsx` è **legacy v2.3** — si resta su v2.3,
  mai v3 per singolo componente (DS v3 §14).
- **Anno:** sempre `annoRoma()` (`src/lib/utils/data-roma.ts:20`), mai `new Date().getFullYear()`.
- **FASE 7 completa a fine piano:** `npx tsc --noEmit` · `npx vitest run` · `npx next build`, tutti e tre,
  output incollato. **Riferimento di partenza, misurato il 03/08:** `tsc` **0** · `vitest` **371 | 3** file e
  **4292 | 19** prove · `next build` **0**.
- **FASE 6b dopo la migration:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq >
  src/types/database.types.ts` + `npx tsc --noEmit`.
- **Salvataggio:** mai `git add -A`; `git commit -F <file>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.** Branch nel repo principale: `git checkout -b dpa-registro`.

---

## Registro delle prove (R-P1)

**Fail-closed: un blocco senza marchio è NON provato.** Qui sotto ciò che è stato **provato prima** di
scrivere il piano. Tutto il codice dei task nasce `non eseguito`, **col comando che lo verificherà accanto**.

| # | Assunzione | Comando | Esito reale |
|---|---|---|---|
| **P1** | `genera_progressivo` **non valida** `p_tipo`: aggiungere `'dpa'` non richiede migration | lettura `supabase/schema.sql:95-126` | Corpo = `INSERT … ON CONFLICT (laboratorio_id, tipo, anno) DO UPDATE … RETURNING`. **Nessun CHECK, nessuna enum.** `progressivi_anno.tipo` è `TEXT NOT NULL` senza vincolo (`:131-137`) |
| **P2** | `improntaPayload` è esportata e riusabile | `grep -n "export function improntaPayload" src/lib/pdf/generate-ddc.ts` | `86:export function improntaPayload(payload: unknown): string {` |
| **P3** | La tabella è **vuota**: nessun dato preesistente da migrare | `GET /rest/v1/data_processing_agreements` con `Prefer: count=exact` | `content-range: */0` · corpo `[]` |
| **P4** | Il contenitore `documenti` è **privato** | `GET /storage/v1/bucket` (chiave di servizio) | `"id":"documenti","public":false` (come `fatture-pdf`; solo `brand` è pubblico) |
| **P5** | Un indirizzo **pubblico** su quel contenitore **non funziona** | `GET /storage/v1/object/public/documenti/<lab>/ddc/2026` | **HTTP 400** · `{"error":"Bucket not found"}` |
| **P6** | Firme delle funzioni condivise | lettura dei file | `getSignedUrl(supabase, bucket, path, expiresInSeconds) → Promise<string \| null>` (`src/lib/storage/signed-url.ts:7-16`) · `renderPdfDocument(element) → Promise<Buffer>` (`:9`) · `annoRoma(d?) → number` (`:20`) · `generaProgressivo(supabase, laboratorio_id, tipo, anno) → Promise<number>` |
| **P7** | La tabella **NON ha** il trigger `updated_at` | `grep -c "apply_updated_at_trigger('data_processing_agreements')" supabase/schema.sql` | **0** — quindi `updated_at` non si aggiornerebbe mai da solo (Task 1 lo aggiunge) |
| **P8** | La CLI Supabase c'è | `npx supabase --version` | `2.111.0` · esiste `supabase/.temp` |
| **P9** | `createChain` **non ha** `insert`: le prove devono aggiungerlo, come fa la DdC | lettura `tests/unit/helpers/supabase-chain-mock.ts` (44 righe) | metodi passthrough: `select, eq, neq, in, is, or, order, limit, not, gte, lt, lte, like, ilike, overrideTypes`; risolventi: `single, maybeSingle`. **Nessun `insert`** — `generate-ddc.test.ts:38` fa `{ ...readChain, insert: mockInsert }` |

⚠️ **Non provato, e dichiarato:** che `npx supabase db push` funzioni da questa macchina (richiede la password
del database — **non si tenta**, v. Task 1 Step 6).

---

## Registro delle letture (R-P2)

L'innesco **non** è «i file che il piano nomina»: è **l'esito del censimento**. Ogni percorso porta
`letto: righe X-Y` oppure **`NON letto`**.

| File | Esito |
|---|---|
| `src/lib/pdf/generate-dpa.ts` | **letto: 1-69** (tutto) |
| `src/components/features/pdf/DpaTemplate.tsx` | **letto: 1-233** (tutto, riscritto oggi con D126) |
| `src/app/api/clienti/[id]/dpa/route.ts` | **letto: 1-35** — mancano le ultime righe (chiusura degli header e `catch`): **le apre il Task 7 prima di toccarlo** |
| `src/lib/pdf/generate-ddc.ts` | **letto: 78-115, 178-200** (guard di idempotenza, `improntaPayload`, upload e percorso) · resto **NON letto**, non serve |
| `src/lib/db/progressivi.ts` | **letto: 1-40** (tutto) |
| `src/lib/storage/signed-url.ts` | **letto: 1-17** (tutto) |
| `src/lib/pdf/typed-service-client.ts` | **letto: 1-13** (tutto) |
| `supabase/schema.sql` | **letto: 95-145** (progressivi) · **2850-2879** (tabella + RLS) |
| `src/app/(app)/clienti/[id]/page.tsx` | **letto: 1-40, 240-280** — il resto **NON letto**: il Task 8 apre il file per intero prima di modificarlo |
| `tests/unit/generate-dpa.test.ts` | **letto: 1-46** (tutto) |
| `tests/unit/dpa-pdf-content.test.ts` | **letto: 1-180** (tutto, scritto oggi) |
| `tests/unit/helpers/supabase-chain-mock.ts` | **letto: 1-44** (tutto) |
| `tests/unit/generate-ddc.test.ts` | **letto per campione: 6-40** (forma dei mock) · resto **NON letto** |
| `tests/unit/helpers/pdf-fixtures.ts` | **NON letto** — il Task 4 lo apre prima di riusare `LAB_FIXTURE`/`CLIENTE_FIXTURE` |
| `src/lib/utils/data-roma.ts` | **letto: 20** (sola firma di `annoRoma`) |

---

## Censimento degli identificatori (R-P6)

Non solo le colonne: **ogni** identificatore che il cambiamento tocca.

**Colonne nuove su `data_processing_agreements`:** `numero_dpa` · `anno_dpa` · `progressivo_dpa` ·
`storage_path_pdf` · `pdf_sha256` · `payload_sha256` · `emesso_at`.

**Colonne esistenti che il codice comincia a scrivere:** `laboratorio_id` · `tipo_controparte` (valore
`'dentista'`) · `dentista_id` · `template_versione` (valore `'dpa-v2'`) · `stato` (valore `'da_firmare'`).

**Colonne esistenti che questa ondata NON tocca, con la destinazione:** `documento_url`, `firmato_da`,
`firmato_at`, `data_scadenza` → **ondata 2** (firma). `sub_responsabile` → fuori perimetro (spec §10).

**Vincoli nuovi:** indice `dpa_emissione_numero_unico` · CHECK `dpa_emissione_coerente` · trigger
`updated_at` via `apply_updated_at_trigger('data_processing_agreements')`.

**Simboli esportati nuovi:** `VERSIONE_MODELLO_DPA` · `IMPRONTA_TESTO_DPA` · `datiSostanzialiDpa()` ·
`improntaDpa()` · tipo `DatiSostanzialiDpa` · tipo `EmissioneDpa` (tutti in `src/lib/pdf/dpa-modello.ts`,
tranne `EmissioneDpa` che sta in `generate-dpa.ts`).

**Simbolo esportato che CAMBIA FIRMA — e chi lo consuma:** `generateDpa()` passa da
`Promise<Buffer>` a `Promise<EmissioneDpa>`. Consumatori censiti con
`grep -rn "generateDpa" src tests`: **due** — `src/app/api/clienti/[id]/dpa/route.ts:6,29` (Task 7) e
`tests/unit/generate-dpa.test.ts:12,29,35,42` (Task 4). **Nessun altro.**

**Valore nuovo per un identificatore libero:** `'dpa'` come `tipo` in `progressivi_anno`. **Non è
un'allowlist** (P1), ma **il commento `supabase/schema.sql:128-129` elenca i tipi** e va aggiornato, o
diventa un elenco che sembra completo e non lo è.

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `supabase/migrations/20260803150000_dpa_registro_emissioni.sql` | **Creare** — colonne, indice parziale, CHECK, trigger |
| `src/lib/pdf/dpa-modello.ts` | **Creare** — versione del modello, impronta del testo, dati sostanziali e loro impronta. Nessuna dipendenza da Supabase: si prova senza mock |
| `src/lib/pdf/generate-dpa.ts` | **Modificare** — da «genera un PDF» a «emette, o restituisce l'emissione esistente» |
| `src/app/api/clienti/[id]/dpa/route.ts` | **Modificare** — consuma il nuovo ritorno, nome file dal numero |
| `src/app/(app)/clienti/[id]/page.tsx` | **Modificare** — numero e data dell'ultima emissione; via la frase falsa sui dieci anni |
| `tests/unit/dpa-modello.test.ts` | **Creare** |
| `tests/unit/generate-dpa.test.ts` | **Modificare** — il ritorno cambia |
| `tests/unit/dpa-registro.test.ts` | **Creare** — emissione, riuso, fail-closed, corsa |

---

## Task 1 — La migration, e i due vincoli provati col rifiuto

**File:**
- Creare: `supabase/migrations/20260803150000_dpa_registro_emissioni.sql`
- Modificare: `supabase/schema.sql:128-129` (commento dei tipi) e la sezione della tabella (rispecchia la migration)

**Interfacce:**
- Produce: le sette colonne, l'indice `dpa_emissione_numero_unico`, il CHECK `dpa_emissione_coerente`.

- [ ] **Step 1: scrivere la migration** — `non eseguito`, si verifica allo Step 5

```sql
-- Registro delle emissioni del DPA (ondata 1 — D129/D130).
-- Additiva: nessuna colonna esistente viene modificata.
-- documento_url / firmato_da / firmato_at restano LIBERE per l'ondata 2 (firma).
ALTER TABLE data_processing_agreements
  ADD COLUMN IF NOT EXISTS numero_dpa       TEXT,
  ADD COLUMN IF NOT EXISTS anno_dpa         SMALLINT,
  ADD COLUMN IF NOT EXISTS progressivo_dpa  INTEGER,
  ADD COLUMN IF NOT EXISTS storage_path_pdf TEXT,
  ADD COLUMN IF NOT EXISTS pdf_sha256       TEXT,
  ADD COLUMN IF NOT EXISTS payload_sha256   TEXT,
  ADD COLUMN IF NOT EXISTS emesso_at        TIMESTAMPTZ;

COMMENT ON COLUMN data_processing_agreements.storage_path_pdf IS
  'Percorso del PDF EMESSO nel contenitore privato documenti. Mai un URL: il contenitore e'' privato, getPublicUrl produrrebbe un indirizzo morto.';
COMMENT ON COLUMN data_processing_agreements.payload_sha256 IS
  'Impronta dei soli dati SOSTANZIALI (lab + cliente). Numero e data di emissione sono ESCLUSI: entrandoci, l''impronta cambierebbe ogni giorno.';

-- Due emissioni non possono avere lo stesso numero nello stesso anno.
-- PARZIALE: la tabella deve poter ospitare righe senza numero (sub-responsabili).
CREATE UNIQUE INDEX IF NOT EXISTS dpa_emissione_numero_unico
  ON data_processing_agreements (laboratorio_id, anno_dpa, progressivo_dpa)
  WHERE progressivo_dpa IS NOT NULL;

-- I campi dell'emissione viaggiano tutti insieme o nessuno: una riga a meta' e' una riga che mente.
ALTER TABLE data_processing_agreements
  ADD CONSTRAINT dpa_emissione_coerente CHECK (
    (numero_dpa IS NULL AND anno_dpa IS NULL AND progressivo_dpa IS NULL
      AND storage_path_pdf IS NULL AND pdf_sha256 IS NULL AND payload_sha256 IS NULL AND emesso_at IS NULL)
    OR
    (numero_dpa IS NOT NULL AND anno_dpa IS NOT NULL AND progressivo_dpa IS NOT NULL
      AND storage_path_pdf IS NOT NULL AND pdf_sha256 IS NOT NULL AND payload_sha256 IS NOT NULL AND emesso_at IS NOT NULL)
  );

-- P7: la tabella non aveva il trigger, quindi updated_at non si sarebbe mai aggiornato.
SELECT apply_updated_at_trigger('data_processing_agreements');
```

- [ ] **Step 2: allineare `supabase/schema.sql`** — le stesse colonne nel `CREATE TABLE` (righe 2850-2874) e il commento dei tipi progressivi

```sql
-- supabase/schema.sql:128-129 — da:
--   Tipi gestiti: 'lavoro', 'fattura', 'ddc', 'buono', 'ordine',
--                 'sdi_invio' (per ProgressivoInvio univoco SDI)
-- a:
--   Tipi gestiti: 'lavoro', 'fattura', 'ddc', 'buono', 'ordine',
--                 'sdi_invio' (per ProgressivoInvio univoco SDI), 'dpa'
--   NB: il tipo e' TEXT libero, senza CHECK: questo elenco e' documentazione,
--       non un vincolo. Aggiungerne uno non richiede migration.
```

- [ ] **Step 3: provare il CHECK con una riga che DEVE essere rifiutata** — su **transazione annullata**, mai una migration registrata

```sql
BEGIN;
-- riga a metà: ha il numero ma non il percorso → il CHECK deve rifiutarla
INSERT INTO data_processing_agreements
  (laboratorio_id, tipo_controparte, dentista_id, numero_dpa, anno_dpa, progressivo_dpa)
VALUES
  ('971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c', 'dentista', NULL, 'DPA-2026-0001', 2026, 1);
ROLLBACK;
```

Atteso: **errore** `new row for relation "data_processing_agreements" violates check constraint
"dpa_emissione_coerente"`. **Incollare l'errore vero nel referto.** Un `ALTER TABLE` riuscito prova la
sintassi, non il comportamento.

- [ ] **Step 4: provare l'indice unico con un duplicato che DEVE essere rifiutato**

```sql
BEGIN;
INSERT INTO data_processing_agreements
  (laboratorio_id, tipo_controparte, numero_dpa, anno_dpa, progressivo_dpa,
   storage_path_pdf, pdf_sha256, payload_sha256, emesso_at)
VALUES
  ('971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c','dentista','DPA-2026-0001',2026,1,'x/1.pdf','a','b',now()),
  ('971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c','dentista','DPA-2026-0001',2026,1,'x/2.pdf','c','d',now());
ROLLBACK;
```

Atteso: **errore** `duplicate key value violates unique constraint "dpa_emissione_numero_unico"`.
**Incollare l'errore vero.**

- [ ] **Step 5: applicare la migration**

🛑 **L'esecutore NON la applica da solo.** Il CI **non** applica le migration. Due strade, e si sceglie con
Francesco: `npx supabase db push` (richiede la password del database — **non provato da questa macchina**,
v. Registro delle prove) oppure incollare il file nell'editor SQL del pannello Supabase. **Le sonde degli
Step 3-4 girano nello stesso posto, dopo.**

- [ ] **Step 6: FASE 6b — rigenerare i tipi e verificare**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Atteso: uscita **0**. Se il file finisce con un messaggio della CLI, va tolto a mano (§9 di `ua-app/CLAUDE.md`).

- [ ] **Step 7: salvare**

```bash
git add supabase/migrations/20260803150000_dpa_registro_emissioni.sql supabase/schema.sql src/types/database.types.ts
git commit -F /tmp/msg-task1.txt
```

---

## Task 2 — La versione del modello, e la guardia che impedisce di dimenticarla

**File:**
- Creare: `src/lib/pdf/dpa-modello.ts`
- Creare: `tests/unit/dpa-modello.test.ts`

**Interfacce:**
- Produce: `VERSIONE_MODELLO_DPA: string` (valore `'dpa-v2'`) · `IMPRONTA_TESTO_DPA: string` (sha-256 del
  testo reso con la fixture fissa).

- [ ] **Step 1: scrivere la prova che fallisce**

```typescript
// tests/unit/dpa-modello.test.ts
// @vitest-environment node
// 🔑 La guardia della versione. VERSIONE_MODELLO_DPA va alzata a ogni cambio del
// testo — ma un gesto da ricordare a mano è un gesto che prima o poi non si fa
// (D120: 211 scatti dei mockup mai salvati). Questa prova àncora l'impronta del
// TESTO alla versione dichiarata: chi cambia una parola la vede rossa.
import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { DpaTemplate } from '@/components/features/pdf/DpaTemplate'
import { VERSIONE_MODELLO_DPA, IMPRONTA_TESTO_DPA } from '@/lib/pdf/dpa-modello'

const FIXTURE_FISSA = {
  lab: {
    ragione_sociale: 'Lab Prova S.r.l.', nome: 'Prova', partita_iva: '00000000000',
    codice_fiscale: null, indirizzo: 'Via Uno 1', cap: '84028', citta: 'Serre',
    provincia: 'SA', prrc_nome: 'Mario Bianchi', codice_itca: 'ITCA00000000',
  },
  cliente: {
    studio_nome: 'Studio Prova', nome: 'Anna', cognome: 'Verdi', partita_iva: '11111111111',
    codice_fiscale: null, indirizzo: 'Via Due 2', cap: '84121', citta: 'Salerno', provincia: 'SA',
  },
  numero_dpa: 'DPA-0000-FISSO',
  data_emissione: '2026-01-01T00:00:00.000Z',
}

describe('la versione del modello DPA', () => {
  it('è dichiarata e vale dpa-v2', () => {
    expect(VERSIONE_MODELLO_DPA).toBe('dpa-v2')
  })

  it('🛑 il testo reso corrisponde all\'impronta dichiarata — se fallisce, ALZA la versione e aggiorna l\'impronta', async () => {
    const buffer = await renderPdfDocument(createElement(DpaTemplate, { dpa: FIXTURE_FISSA }))
    const testo = (await new PDFParse({ data: buffer }).getText()).text.replace(/\s+/g, ' ').trim()
    const impronta = createHash('sha256').update(testo, 'utf8').digest('hex')
    expect(impronta).toBe(IMPRONTA_TESTO_DPA)
  })
})
```

- [ ] **Step 2: eseguire e vedere il rosso**

```bash
npx vitest run tests/unit/dpa-modello.test.ts
```

Atteso: **FAIL** — «Failed to resolve import "@/lib/pdf/dpa-modello"».
🛑 **R-P4: questo rosso NON prova nulla.** Si prosegue con l'abbozzo inerte dello Step 3 e si **CONTA**.

- [ ] **Step 3: abbozzo inerte e conteggio delle asserzioni**

```typescript
// src/lib/pdf/dpa-modello.ts — abbozzo inerte, valori volutamente sbagliati
export const VERSIONE_MODELLO_DPA = 'INERTE'
export const IMPRONTA_TESTO_DPA = '0'.repeat(64)
```

```bash
npx vitest run tests/unit/dpa-modello.test.ts
```

Atteso: **2 asserzioni su 2 si accendono** (versione sbagliata, impronta sbagliata). **Scrivere il numero
nel referto: `2 su 2`.** Se se ne accendesse una sola, la seconda non sta provando quello che dice.

**Forme d'input enumerate:** il modello non riceve input variabili in questa prova (fixture fissa, di
proposito). Le forme d'input vere — campi nulli, stringhe vuote — sono coperte da
`tests/unit/dpa-pdf-content.test.ts` e dalle prove di `generate-dpa`: **non coperte qui, ed è voluto.**

- [ ] **Step 4: valori veri**

Si calcola l'impronta **una volta** con lo stesso codice della prova e la si incolla:

```bash
npx tsx -e "
import('./scripts/tmp/impronta-testo-dpa.ts')
" # oppure si legge il valore dal messaggio di fallimento della prova ('expected X to be Y')
```

```typescript
// src/lib/pdf/dpa-modello.ts
/** Versione della FORMA del documento. Si alza a OGNI cambio del testo di
 *  `DpaTemplate.tsx`, insieme a IMPRONTA_TESTO_DPA: le due cose si muovono
 *  sempre insieme, e `tests/unit/dpa-modello.test.ts` è ciò che lo impone.
 *  v2 = riscrittura del 03/08/2026 (D126). */
export const VERSIONE_MODELLO_DPA = 'dpa-v2'

/** sha-256 del testo reso con la fixture fissa della prova. NON è una firma del
 *  documento: è l'ancora che lega il testo alla versione dichiarata. */
export const IMPRONTA_TESTO_DPA = '<valore letto dal fallimento dello Step 3>'
```

- [ ] **Step 5: verde**

```bash
npx vitest run tests/unit/dpa-modello.test.ts
```

Atteso: **2 passed**.

- [ ] **Step 6: provare che la guardia DISCRIMINA** — si rompe apposta e si rimette

Cambiare una parola in `DpaTemplate.tsx` (es. `PREMESSE` → `PREMESSA`), rieseguire: atteso **FAIL** sulla
sola seconda asserzione. Rimettere la parola, rieseguire: atteso **2 passed**. **Incollare entrambi gli
esiti nel referto.** Una guardia non provata rompendola dimostra che il file viene letto, non che la regola
discrimina.

- [ ] **Step 7: salvare**

```bash
git add src/lib/pdf/dpa-modello.ts tests/unit/dpa-modello.test.ts
git commit -F /tmp/msg-task2.txt
```

---

## Task 3 — L'impronta dei soli dati sostanziali

**File:**
- Modificare: `src/lib/pdf/dpa-modello.ts`
- Modificare: `tests/unit/dpa-modello.test.ts`

**Interfacce:**
- Consuma: `improntaPayload(payload: unknown): string` da `@/lib/pdf/generate-ddc` (P2).
- Produce: `type DatiSostanzialiDpa` · `datiSostanzialiDpa(lab, cliente): DatiSostanzialiDpa` ·
  `improntaDpa(lab, cliente): string`.

- [ ] **Step 1: scrivere le prove che falliscono** (si aggiungono al file del Task 2)

```typescript
import { datiSostanzialiDpa, improntaDpa } from '@/lib/pdf/dpa-modello'
import type { Laboratorio, Cliente } from '@/types/domain'

const LAB = { ...FIXTURE_FISSA.lab, id: 'lab-1' } as unknown as Laboratorio
const CLI = { ...FIXTURE_FISSA.cliente, id: 'cli-1' } as unknown as Cliente

describe('l\'impronta dei dati sostanziali', () => {
  it('🛑 NON cambia se cambia la data (è il difetto che avrebbe fatto nascere un\'emissione al giorno)', () => {
    const a = improntaDpa(LAB, CLI)
    const b = improntaDpa(LAB, CLI) // stesso input, momento diverso
    expect(a).toBe(b)
    expect(JSON.stringify(datiSostanzialiDpa(LAB, CLI))).not.toContain('data_emissione')
    expect(JSON.stringify(datiSostanzialiDpa(LAB, CLI))).not.toContain('numero_dpa')
  })

  it('cambia se cambia un dato del CLIENTE', () => {
    expect(improntaDpa(LAB, { ...CLI, studio_nome: 'Altro Studio' } as Cliente)).not.toBe(improntaDpa(LAB, CLI))
  })

  it('cambia se cambia un dato del LABORATORIO', () => {
    expect(improntaDpa({ ...LAB, codice_itca: 'ITCA99999999' } as Laboratorio, CLI)).not.toBe(improntaDpa(LAB, CLI))
  })

  it('porta esattamente i campi che il modello stampa: 10 del lab, 9 del cliente', () => {
    const d = datiSostanzialiDpa(LAB, CLI)
    expect(Object.keys(d.lab)).toHaveLength(10)
    expect(Object.keys(d.cliente)).toHaveLength(9)
  })
})
```

- [ ] **Step 2: rosso**

```bash
npx vitest run tests/unit/dpa-modello.test.ts
```

Atteso: **FAIL** — `datiSostanzialiDpa` non esportata.

- [ ] **Step 3: implementazione minima**

```typescript
// src/lib/pdf/dpa-modello.ts (aggiunta)
import { improntaPayload } from '@/lib/pdf/generate-ddc'
import type { Laboratorio, Cliente } from '@/types/domain'

/** I soli dati che il modello STAMPA. Numero e data di emissione sono
 *  deliberatamente FUORI: sono attributi dell'emissione, non del contenuto —
 *  se entrassero, l'impronta cambierebbe ogni giorno e nascerebbe
 *  un'emissione a ogni scarico in un giorno diverso (spec §5). */
export interface DatiSostanzialiDpa {
  lab: Pick<Laboratorio, 'ragione_sociale' | 'nome' | 'partita_iva' | 'codice_fiscale' | 'indirizzo' | 'cap' | 'citta' | 'provincia' | 'prrc_nome' | 'codice_itca'>
  cliente: Pick<Cliente, 'studio_nome' | 'nome' | 'cognome' | 'partita_iva' | 'codice_fiscale' | 'indirizzo' | 'cap' | 'citta' | 'provincia'>
}

export function datiSostanzialiDpa(lab: Laboratorio, cliente: Cliente): DatiSostanzialiDpa {
  return {
    lab: {
      ragione_sociale: lab.ragione_sociale, nome: lab.nome, partita_iva: lab.partita_iva,
      codice_fiscale: lab.codice_fiscale, indirizzo: lab.indirizzo, cap: lab.cap,
      citta: lab.citta, provincia: lab.provincia, prrc_nome: lab.prrc_nome, codice_itca: lab.codice_itca,
    },
    cliente: {
      studio_nome: cliente.studio_nome, nome: cliente.nome, cognome: cliente.cognome,
      partita_iva: cliente.partita_iva, codice_fiscale: cliente.codice_fiscale,
      indirizzo: cliente.indirizzo, cap: cliente.cap, citta: cliente.citta, provincia: cliente.provincia,
    },
  }
}

export function improntaDpa(lab: Laboratorio, cliente: Cliente): string {
  return improntaPayload(datiSostanzialiDpa(lab, cliente))
}
```

- [ ] **Step 4: verde**

```bash
npx vitest run tests/unit/dpa-modello.test.ts
```

Atteso: **6 passed** (2 del Task 2 + 4 di questo).

- [ ] **Step 5: salvare**

```bash
git add src/lib/pdf/dpa-modello.ts tests/unit/dpa-modello.test.ts
git commit -F /tmp/msg-task3.txt
```

---

## Task 4 — L'emissione nuova

**File:**
- Modificare: `src/lib/pdf/generate-dpa.ts`
- Creare: `tests/unit/dpa-registro.test.ts`
- Modificare: `tests/unit/generate-dpa.test.ts` (il ritorno cambia)
- Leggere prima di toccare: `tests/unit/helpers/pdf-fixtures.ts` (**NON letto**, v. registro delle letture)

**Interfacce:**
- Consuma: `improntaDpa`, `VERSIONE_MODELLO_DPA` (Task 2-3) · `generaProgressivo(supabase, lab, tipo, anno)` ·
  `annoRoma()` · `renderPdfDocument(el) → Promise<Buffer>`.
- Produce:

```typescript
export interface EmissioneDpa {
  buffer: Buffer
  numero_dpa: string      // es. "DPA-2026-0007"
  emissione_id: string    // uuid della riga di registro
  riemessa: boolean       // true = generata ora, false = restituita dall'archivio
}
export async function generateDpa(laboratorio_id: string, cliente_id: string): Promise<EmissioneDpa>
```

- [ ] **Step 1: scrivere la prova che fallisce**

```typescript
// tests/unit/dpa-registro.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, CLIENTE_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert, mockUpload, mockDownload, mockProgressivo } = vi.hoisted(() => ({
  mockFrom: vi.fn(), mockInsert: vi.fn(), mockUpload: vi.fn(), mockDownload: vi.fn(), mockProgressivo: vi.fn(),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ upload: mockUpload, download: mockDownload }) },
  }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: mockProgressivo }))

import { generateDpa } from '@/lib/pdf/generate-dpa'

function montaTabelle(emissioneEsistente: unknown) {
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
    if (tabella === 'clienti') return createChain({ data: CLIENTE_FIXTURE, error: null })
    if (tabella === 'data_processing_agreements') {
      return { ...createChain({ data: emissioneEsistente, error: null }), insert: mockInsert }
    }
    throw new Error(`Tabella inattesa nel mock: ${tabella}`)
  })
}

describe('emissione nuova', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockProgressivo.mockResolvedValue(7)
    mockInsert.mockReturnValue(createChain({ data: { id: 'em-1' }, error: null }))
  })

  it('quando non esiste nulla: carica il file, prende un progressivo, scrive la riga', async () => {
    montaTabelle(null)
    const r = await generateDpa('lab-test-001', 'cli-001')

    expect(r.riemessa).toBe(true)
    expect(r.numero_dpa).toBe('DPA-2026-0007')
    expect(r.buffer.length).toBeGreaterThan(0)

    // il FILE prima della RIGA
    expect(mockUpload).toHaveBeenCalledBefore(mockInsert as never)

    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(riga.tipo_controparte).toBe('dentista')
    expect(riga.dentista_id).toBe('cli-001')
    expect(riga.laboratorio_id).toBe('lab-test-001')
    expect(riga.stato).toBe('da_firmare')
    expect(riga.template_versione).toBe('dpa-v2')
    expect(riga.progressivo_dpa).toBe(7)
    expect(String(riga.storage_path_pdf)).toMatch(/^lab-test-001\/dpa\/\d{4}\/DPA-\d{4}-0007\.pdf$/)
    expect(String(riga.pdf_sha256)).toHaveLength(64)
    expect(String(riga.payload_sha256)).toHaveLength(64)
    expect(riga.emesso_at).toBeTruthy()
  })

  it('il progressivo è chiesto col tipo «dpa» e con l\'anno di Roma', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    expect(mockProgressivo).toHaveBeenCalledWith(expect.anything(), 'lab-test-001', 'dpa', expect.any(Number))
  })

  it('la ricerca dell\'emissione porta SEMPRE il filtro laboratorio_id (il client di servizio aggira la RLS)', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    const catena = mockFrom.mock.results.find((r) => (r.value as { calls?: unknown }).calls)?.value as { calls: { method: string; args: unknown[] }[] }
    expect(catena.calls.some((c) => c.method === 'eq' && c.args[0] === 'laboratorio_id' && c.args[1] === 'lab-test-001')).toBe(true)
  })
})
```

- [ ] **Step 2: rosso, poi abbozzo inerte e conteggio (R-P4)**

```bash
npx vitest run tests/unit/dpa-registro.test.ts
```

Primo atteso: **FAIL** perché `generateDpa` restituisce ancora un `Buffer` (`r.riemessa` è `undefined`).
Poi si mette un abbozzo inerte che restituisce `{ buffer: Buffer.alloc(1), numero_dpa: '', emissione_id: '',
riemessa: false }` **senza toccare Supabase**, si riesegue e si **CONTA** quante asserzioni si accendono.
**Scrivere il numero nel referto** (atteso: **3 prove su 3**, e dentro la prima almeno 10 asserzioni).

**Forme d'input enumerate** — ognuna col suo caso o col suo «non coperta, perché»:
`laboratori` non trova nulla → **coperta** dalle prove esistenti di `generate-dpa.test.ts` · `clienti` non
trova nulla → **coperta** lì · upload che fallisce → **Task 6** · progressivo che solleva → **non coperta,
perché** `generaProgressivo` solleva già e la rotta risponde 500: nessun ramo nuovo · `insert` che fallisce
per duplicato → **Task 6** · cliente di **un altro laboratorio** → **coperta** dal filtro `.eq('laboratorio_id')`
già presente in `generate-dpa.ts:23`.

- [ ] **Step 3: implementazione**

```typescript
// src/lib/pdf/generate-dpa.ts — dopo validateDpaData(lab, cliente)
import { createHash } from 'node:crypto'
import { generaProgressivo } from '@/lib/db/progressivi'
import { annoRoma } from '@/lib/utils/data-roma'
import { improntaDpa, VERSIONE_MODELLO_DPA } from '@/lib/pdf/dpa-modello'

export interface EmissioneDpa {
  buffer: Buffer
  numero_dpa: string
  emissione_id: string
  riemessa: boolean
}

// … dentro generateDpa, dopo validateDpaData:
  const impronta = improntaDpa(lab, cliente)

  // Task 5 inserisce qui il guard di riuso.

  const anno = annoRoma()
  const progressivo = await generaProgressivo(svc, laboratorio_id, 'dpa', anno)
  const numero_dpa = `DPA-${anno}-${String(progressivo).padStart(4, '0')}`

  const dpa = {
    lab: { /* invariato, come oggi alle righe 41-52 */ },
    cliente: { /* invariato, righe 53-63 */ },
    numero_dpa,
    data_emissione: new Date().toISOString(),
  }
  const buffer = await renderPdfDocument(createElement(DpaTemplate, { dpa }))

  // Il FILE prima della RIGA: se il caricamento fallisce, nessuna traccia resta
  // in banca dati. Stessa regola di D61 (immagini/[imgId]/route.ts:207-219).
  const storage_path_pdf = `${laboratorio_id}/dpa/${anno}/${numero_dpa}.pdf`
  const { error: erroreFile } = await svc.storage
    .from('documenti')
    .upload(storage_path_pdf, buffer, { contentType: 'application/pdf', upsert: false })
  if (erroreFile) {
    console.error('generateDpa — caricamento del PDF fallito:', erroreFile.message)
    throw new Error('DPA: non è stato possibile conservare il documento')
  }

  const { data: riga, error: erroreRiga } = await svc
    .from('data_processing_agreements')
    .insert({
      laboratorio_id,
      tipo_controparte: 'dentista',
      dentista_id: cliente_id,
      stato: 'da_firmare',
      template_versione: VERSIONE_MODELLO_DPA,
      numero_dpa,
      anno_dpa: anno,
      progressivo_dpa: progressivo,
      storage_path_pdf,
      pdf_sha256: createHash('sha256').update(buffer).digest('hex'),
      payload_sha256: impronta,
      emesso_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (erroreRiga || !riga) throw new Error(`DPA: registro non scritto — ${erroreRiga?.message ?? 'nessuna riga'}`)

  return { buffer, numero_dpa, emissione_id: riga.id, riemessa: true }
```

- [ ] **Step 4: aggiornare la prova esistente** — `tests/unit/generate-dpa.test.ts:29` da
`expect(buffer.length)` a `expect(r.buffer.length)`, aggiungendo i mock di storage e progressivo come sopra.
Le due prove di rifiuto (`:35`, `:42`) **non cambiano**.

- [ ] **Step 5: verde**

```bash
npx vitest run tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts
```

- [ ] **Step 6: salvare**

---

## Task 5 — Il riuso: nessun numero bruciato

**File:** modificare `src/lib/pdf/generate-dpa.ts` · modificare `tests/unit/dpa-registro.test.ts`

**Interfacce:** consuma `EmissioneDpa` (Task 4). Nessun simbolo nuovo.

- [ ] **Step 1: prove che falliscono**

```typescript
describe('riuso dell\'emissione', () => {
  const ESISTENTE = {
    id: 'em-vecchia', numero_dpa: 'DPA-2026-0003',
    storage_path_pdf: 'lab-test-001/dpa/2026/DPA-2026-0003.pdf',
    payload_sha256: null as string | null, template_versione: 'dpa-v2',
  }

  it('stessi dati e stessa versione: restituisce il PDF conservato, NESSUN numero nuovo', async () => {
    const { improntaDpa } = await import('@/lib/pdf/dpa-modello')
    montaTabelle({ ...ESISTENTE, payload_sha256: improntaDpa(LAB_FIXTURE as never, CLIENTE_FIXTURE as never) })
    mockDownload.mockResolvedValue({ data: new Blob([Buffer.from('%PDF-vecchio')]), error: null })

    const r = await generateDpa('lab-test-001', 'cli-001')

    expect(r.riemessa).toBe(false)
    expect(r.numero_dpa).toBe('DPA-2026-0003')
    expect(r.emissione_id).toBe('em-vecchia')
    expect(mockProgressivo).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
    expect(r.buffer.toString()).toContain('%PDF-vecchio')
  })

  it('🛑 due scarichi in GIORNI diversi restituiscono la STESSA emissione (la data è fuori dall\'impronta)', async () => {
    const { improntaDpa } = await import('@/lib/pdf/dpa-modello')
    montaTabelle({ ...ESISTENTE, payload_sha256: improntaDpa(LAB_FIXTURE as never, CLIENTE_FIXTURE as never) })
    mockDownload.mockResolvedValue({ data: new Blob([Buffer.from('%PDF-vecchio')]), error: null })

    vi.setSystemTime(new Date('2026-08-03T10:00:00Z'))
    const a = await generateDpa('lab-test-001', 'cli-001')
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'))
    const b = await generateDpa('lab-test-001', 'cli-001')
    vi.useRealTimers()

    expect(a.emissione_id).toBe(b.emissione_id)
    expect(mockProgressivo).not.toHaveBeenCalled()
  })

  it('versione del modello diversa: RIEMETTE', async () => {
    const { improntaDpa } = await import('@/lib/pdf/dpa-modello')
    montaTabelle({ ...ESISTENTE, template_versione: 'dpa-v1', payload_sha256: improntaDpa(LAB_FIXTURE as never, CLIENTE_FIXTURE as never) })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it('dati diversi: RIEMETTE', async () => {
    montaTabelle({ ...ESISTENTE, payload_sha256: 'f'.repeat(64) })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(true)
  })

  it('il PDF conservato non si trova più nell\'archivio: RIEMETTE invece di rispondere errore', async () => {
    const { improntaDpa } = await import('@/lib/pdf/dpa-modello')
    montaTabelle({ ...ESISTENTE, payload_sha256: improntaDpa(LAB_FIXTURE as never, CLIENTE_FIXTURE as never) })
    mockDownload.mockResolvedValue({ data: null, error: { message: 'Object not found' } })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(true)
  })
})
```

- [ ] **Step 2: rosso** — `npx vitest run tests/unit/dpa-registro.test.ts` · atteso: le 5 prove nuove falliscono.

- [ ] **Step 3: il guard, al posto del segnaposto del Task 4**

```typescript
  // Guard di riuso (D130). Il confronto è su DUE cose insieme: impronta dei dati
  // E versione del modello — il testo può cambiare a dati identici (D126, 03/08).
  // 🛑 Il filtro laboratorio_id è esplicito: il client di servizio aggira la RLS.
  const { data: esistente } = await svc
    .from('data_processing_agreements')
    .select('id, numero_dpa, storage_path_pdf, payload_sha256, template_versione')
    .eq('laboratorio_id', laboratorio_id)
    .eq('dentista_id', cliente_id)
    .eq('payload_sha256', impronta)
    .eq('template_versione', VERSIONE_MODELLO_DPA)
    .is('deleted_at', null)
    .order('emesso_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (esistente?.storage_path_pdf) {
    const { data: file } = await svc.storage.from('documenti').download(esistente.storage_path_pdf)
    if (file) {
      return {
        buffer: Buffer.from(await file.arrayBuffer()),
        numero_dpa: esistente.numero_dpa as string,
        emissione_id: esistente.id as string,
        riemessa: false,
      }
    }
    // File sparito dall'archivio: meglio un numero nuovo che una porta chiusa.
    console.error('generateDpa — PDF conservato non trovato, riemetto:', esistente.storage_path_pdf)
  }
```

- [ ] **Step 4: verde** — `npx vitest run tests/unit/dpa-registro.test.ts`
- [ ] **Step 5: salvare**

---

## Task 6 — Fail-closed e corsa fra due richieste

**File:** modificare `src/lib/pdf/generate-dpa.ts` · modificare `tests/unit/dpa-registro.test.ts`

- [ ] **Step 1: prove che falliscono**

```typescript
describe('fail-closed e corsa', () => {
  it('🛑 se l\'archivio rifiuta il file, NESSUNA riga viene scritta', async () => {
    montaTabelle(null)
    mockUpload.mockResolvedValue({ error: { message: 'storage giù' } })
    await expect(generateDpa('lab-test-001', 'cli-001')).rejects.toThrow('non è stato possibile conservare')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('il messaggio dell\'archivio NON esce verso il browser (G9)', async () => {
    montaTabelle(null)
    mockUpload.mockResolvedValue({ error: { message: 'chiave segreta xyz' } })
    await expect(generateDpa('lab-test-001', 'cli-001')).rejects.not.toThrow(/chiave segreta/)
  })

  it('corsa sul progressivo: l\'insert dà 23505, si rilegge la riga vincitrice e si restituisce quella', async () => {
    let letture = 0
    mockFrom.mockImplementation((tabella: string) => {
      if (tabella === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (tabella === 'clienti') return createChain({ data: CLIENTE_FIXTURE, error: null })
      // 1ª lettura: niente. 2ª lettura (dopo il 23505): la riga dell'altro.
      letture += 1
      const dato = letture === 1 ? null : { id: 'em-vincitrice', numero_dpa: 'DPA-2026-0007', storage_path_pdf: 'p.pdf' }
      return { ...createChain({ data: dato, error: null }), insert: mockInsert }
    })
    mockInsert.mockReturnValue(createChain({ data: null, error: { code: '23505', message: 'duplicate key' } }))
    mockDownload.mockResolvedValue({ data: new Blob([Buffer.from('%PDF-altro')]), error: null })

    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.emissione_id).toBe('em-vincitrice')
    expect(r.riemessa).toBe(false)
  })
})
```

- [ ] **Step 2: rosso** — atteso: la terza prova fallisce (nessun recupero dal 23505); le prime due possono
già passare dal Task 4. **Contare e scrivere il numero.**

- [ ] **Step 3: recupero dal duplicato**

```typescript
  if (erroreRiga) {
    // Rete di sicurezza per la corsa: due richieste hanno superato entrambe il
    // guard. L'indice unico le separa; chi perde rilegge la riga dell'altro.
    if ((erroreRiga as { code?: string }).code === '23505') {
      const { data: vincitrice } = await svc
        .from('data_processing_agreements')
        .select('id, numero_dpa, storage_path_pdf')
        .eq('laboratorio_id', laboratorio_id)
        .eq('dentista_id', cliente_id)
        .eq('payload_sha256', impronta)
        .is('deleted_at', null)
        .order('emesso_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (vincitrice?.storage_path_pdf) {
        const { data: file } = await svc.storage.from('documenti').download(vincitrice.storage_path_pdf)
        if (file) return {
          buffer: Buffer.from(await file.arrayBuffer()),
          numero_dpa: vincitrice.numero_dpa as string,
          emissione_id: vincitrice.id as string,
          riemessa: false,
        }
      }
    }
    throw new Error(`DPA: registro non scritto — ${erroreRiga.message}`)
  }
```

- [ ] **Step 4: verde** · **Step 5: salvare**

---

## Task 7 — La rotta

**File:** modificare `src/app/api/clienti/[id]/dpa/route.ts` (🛑 **aprirlo per intero prima**: il registro
delle letture dice `letto: 1-35`, il resto **NON letto**)

**Interfacce:** consuma `EmissioneDpa` (Task 4).

**Censimento già fatto, non da rifare:** `ls tests/unit | grep -iE "clienti|dpa"` → `ClientiSearchList.test.tsx`,
`clienti-patch-allowlist.test.ts`, `clienti-patch-portale.test.ts`, `clienti-route.test.ts`,
`dpa-pdf-content.test.ts`, `generate-dpa.test.ts`. **Nessuno copre questa rotta** → la prova nasce in un file
nuovo, `tests/unit/dpa-route.test.ts`.

- [ ] **Step 1: prova che fallisce**

```typescript
// tests/unit/dpa-route.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockContesto, mockGenerateDpa } = vi.hoisted(() => ({ mockContesto: vi.fn(), mockGenerateDpa: vi.fn() }))
vi.mock('@/lib/supabase/lab-context', () => ({ getLabContextWithTimings: mockContesto }))
vi.mock('@/lib/pdf/generate-dpa', () => ({ generateDpa: mockGenerateDpa }))

import { GET } from '@/app/api/clienti/[id]/dpa/route'

describe('GET /api/clienti/[id]/dpa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContesto.mockResolvedValue({
      context: { laboratorioId: 'lab-test-001', ruolo: 'titolare', stato: 'attivo' }, timings: {},
    })
  })

  it('nomina il file col NUMERO dell\'emissione, non con l\'id del cliente', async () => {
    mockGenerateDpa.mockResolvedValue({
      buffer: Buffer.from('%PDF-x'), numero_dpa: 'DPA-2026-0007', emissione_id: 'em-1', riemessa: true,
    })
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ id: 'cli-001' }) })
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="DPA-2026-0007.pdf"')
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })

  it('un ruolo non titolare NON passa (i ruoli sono cinque, mai «admin» nudo)', async () => {
    mockContesto.mockResolvedValue({ context: { laboratorioId: 'lab-test-001', ruolo: 'tecnico' }, timings: {} })
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ id: 'cli-001' }) })
    expect(res.status).toBe(403)
  })
})
```

⚠️ **`assertLabOperativo` non è simulato di proposito:** l'esecutore verifica **aprendo il file** se il
contesto della prima prova gli basta (serve `stato: 'attivo'`); se non basta, aggiunge il mock e **lo
dichiara**, invece di allargare il contesto a caso finché diventa verde.

- [ ] **Step 2: modifica**

```typescript
      const emissione = await generateDpa(labId, clienteId)
      const filename = `${emissione.numero_dpa}.pdf`

      return new NextResponse(new Uint8Array(emissione.buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          // … header esistenti invariati
        },
      })
```

- [ ] **Step 3: verde · Step 4: salvare**

---

## Task 8 — La scheda cliente, e una frase falsa da togliere

**File:** modificare `src/app/(app)/clienti/[id]/page.tsx` (🛑 **aprirlo per intero prima**: `letto: 1-40,
240-280`)

🔴 **Ritrovamento riferito, e sta esattamente sul blocco da toccare:** la riga sotto il tasto dice «*Stampa,
firma in duplice copia e conserva una copia originale per **10 anni**.*» — **è falsa** dopo D126 (i dieci
anni sono della **dichiarazione di conformità**, non del contratto) e contraddice D127-D128 (la firma sarà a
distanza). Si sostituisce **in questo task**, perché lasciare una frase falsa accanto al registro nuovo
sarebbe assurdo.

- [ ] **Step 1: lettura dell'ultima emissione** (componente server, client di servizio già in uso alla riga 3)

```typescript
const { data: ultimaEmissione } = await svc
  .from('data_processing_agreements')
  .select('numero_dpa, emesso_at')
  .eq('laboratorio_id', ctx.laboratorioId)
  .eq('dentista_id', c.id)
  .not('numero_dpa', 'is', null)
  .is('deleted_at', null)
  .order('emesso_at', { ascending: false })
  .limit(1)
  .maybeSingle()
```

- [ ] **Step 2: sostituire la frase e mostrare il numero** (stile **v2.3**, come il resto del blocco)

```tsx
{ultimaEmissione?.numero_dpa && (
  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t2)', marginTop: '6px' }}>
    Ultima emissione: <strong>{ultimaEmissione.numero_dpa}</strong> — {new Date(ultimaEmissione.emesso_at as string).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
  </p>
)}
<p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t3)', marginTop: '6px' }}>
  Stampa e firma in duplice copia con lo studio. Ogni versione emessa resta conservata da UÀ.
</p>
```

- [ ] **Step 3: FASE 9 nel browser** — `preview_start`, scheda cliente a **390 · 768 · 1280**, **chiaro e
scuro**, scatti in `docs/design/screenshots/2026-08-03-dpa-registro/`.
- [ ] **Step 4: salvare**

---

## Task 9 — FASE 7, e la prova in produzione

- [ ] **Step 1: i tre comandi, output incollato**

```bash
npx tsc --noEmit ; echo "TSC: $?"
npx vitest run 2>&1 | tail -6
npx next build > /dev/null 2>&1 ; echo "BUILD: $?"
```

Atteso: `tsc` **0** · `vitest` almeno **4292 + le prove nuove** passate, **zero fallite** · `build` **0**.

- [ ] **Step 2: guardia dei documenti** — `node scripts/guardia-coerenza-documenti.mjs` → verde.
- [ ] **Step 3: pubblicare** solo dopo l'autorizzazione di Francesco (`git push origin main`), attendere il
rilascio e **verificarlo scaricando davvero** — ⚠️ il 03/08 ci sono voluti **~5 minuti**: «pubblicato» e «in
produzione» non sono la stessa cosa.
- [ ] **Step 4: collaudo dal vivo (D103)** — link monouso, **due scarichi** per lo stesso cliente:

```bash
npx tsx scripts/tmp/link-accesso.ts
# poi, con il cookie di sessione:
curl -b ck.txt -o uno.pdf https://uachelab.com/api/clienti/<id>/dpa
curl -b ck.txt -o due.pdf https://uachelab.com/api/clienti/<id>/dpa
shasum -a 256 uno.pdf due.pdf   # atteso: IDENTICHE
```

E la lettura del registro (chiave di servizio): atteso **UNA sola riga**, con `numero_dpa`, `pdf_sha256`
uguale all'impronta dei file scaricati, `template_versione = 'dpa-v2'`.

- [ ] **Step 5: BP-1** — aggiornare `memory/MEMORY.md`, `memory/SESSION_ACTIVE.md` e la riga 10 di
`docs/roadmap/ROADMAP-UFFICIALE.md` (parte **(b)** → fatta la metà «registro»; resta la firma, ondata 2).

---

## Autoverifica del piano

**Copertura della spec, sezione per sezione:** §4 il dato → Task 1 · §4 guardia della versione → Task 2 ·
§5 regola di riemissione → Task 3 (impronta) + Task 5 (guard) · §6 la rotta, ordine file-poi-riga, niente
`getPublicUrl`, corsa → Task 4, 6, 7 · §7 che cosa si vede → Task 8 · §8 errori → Task 5 (file sparito) e
Task 6 (fail-closed, G9, duplicato) · §9 le dieci prove → Task 2 (9), 3 (10), 4 (7), 5 (1, 2, 3), 6 (4),
9 (collaudo); la prova 5 (CHECK) e la 6 (indice) sono gli **Step 3-4 del Task 1**; la prova 8 (contenuto
D126 intatto) gira dentro la suite completa del Task 9. **Nessuna sezione senza task.**

**Segnaposto:** nessuno. Gli unici due valori non ancora noti sono `IMPRONTA_TESTO_DPA` (si **calcola** allo
Step 4 del Task 2, col comando scritto) e il nome del file di prova della rotta (**si censisce** allo Step 1
del Task 7, col comando scritto).

**Coerenza dei nomi:** `EmissioneDpa` con i campi `buffer`, `numero_dpa`, `emissione_id`, `riemessa` è usata
identica nei Task 4, 5, 6, 7 · `improntaDpa` e `VERSIONE_MODELLO_DPA` nei Task 3, 4, 5 · la colonna è sempre
`storage_path_pdf`, mai `documento_url` · il tipo progressivo è sempre la stringa `'dpa'`.
