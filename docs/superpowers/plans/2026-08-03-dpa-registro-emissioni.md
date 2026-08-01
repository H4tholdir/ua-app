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

### 🔄 Due prove RITIRATE dal panel del 03/08 — erano più deboli della conclusione che reggevano

- **P3 è ritirata.** «`content-range: */0`» **non dichiara con quale chiave** è stata misurata. Con una chiave
  `anon`/`authenticated` la policy `dpa_laboratorio` (`supabase/schema.sql:2877-2878`) filtra su
  `current_lab_id() AND deleted_at IS NULL`: `*/0` sarebbe compatibile con una tabella **piena** di righe di
  altri laboratori o cancellate logicamente. 🔑 **La conclusione del Task 1 non ne aveva bisogno:** le sette
  colonne **nascono adesso e senza `DEFAULT`**, quindi ogni riga preesistente le ha tutte a `NULL` e soddisfa
  il primo ramo del CHECK — l'`ADD CONSTRAINT` non può abortire su dati preesistenti, **qualunque** sia il
  loro numero. Una prova debole e per caso giusta è una prova che verrà riusata quando è debole e sbagliata.
- **P7 è DECLASSATA a indizio.** `grep -c "apply_updated_at_trigger('data_processing_agreements')"` interroga
  un **file**, non il catalogo vivo — la sostituzione che **R-P3** vieta proprio per gli oggetti di banca
  dati. `supabase/schema.sql` è una fotografia con 40+ migration di deriva potenziale alle spalle. Il fatto
  vero si legge solo così, e il Task 1 lo fa **prima** di applicare:
  `SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.data_processing_agreements'::regclass AND NOT tgisinternal;`

### ✅ Tre prove NUOVE, riverificate a mano dopo il panel (le fonti si rileggono, non si citano)

| # | Assunzione | Comando | Esito reale |
|---|---|---|---|
| **P10** | `apply_updated_at_trigger` **non è rieseguibile**: fa un `CREATE TRIGGER` **nudo** | lettura `supabase/schema.sql:70-82` | `EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I …')`. Il `CREATE OR REPLACE` sta sulla **funzione**, non sul trigger che la funzione crea. Seconda chiamata → `42710` |
| **P11** | Il precedente della DdC porta **DUE** indici, non uno | lettura `20260710090000_ddc_annullata_unique_parziale.sql` + `grep -n "anno_ddc, progressivo_ddc" supabase/schema.sql` | deduplicazione: `CREATE UNIQUE INDEX ddc_lavoro_attiva_unique … (laboratorio_id, lavoro_id) WHERE stato <> 'annullata'` — **le stesse colonne del guard** · backstop: `schema.sql:1273` `UNIQUE (laboratorio_id, anno_ddc, progressivo_ddc)` |
| **P12** | La regola «due indici» è **già ratificata** nel progetto, per le fatture | lettura `docs/superpowers/specs/2026-07-09-ondata-4a-server-consegna-fiscale-design.md:46` | «*ogni doppia emissione futura è un 23505, non un doppio documento*» + «*Il backstop `UNIQUE (laboratorio_id, anno, progressivo)` **esiste già***» |

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

**Vincoli nuovi** (🔄 **rivisti dal panel del 03/08** — v. Task 1): indice `dpa_emissione_numero_unico`
(backstop della numerazione) · indice **`dpa_emissione_viva_unica`** 🆕 (chiave di deduplicazione: è QUESTO
che trasforma la corsa in un `23505`) · CHECK `dpa_emissione_coerente` (irrobustito: un'emissione implica
`dentista_id`) · CHECK **`dpa_impronte_esadecimali`** 🆕 · CHECK
**`dpa_percorso_nel_proprio_laboratorio`** 🆕 · trigger `updated_at` via
`apply_updated_at_trigger('data_processing_agreements')`.

**Simboli esportati nuovi:** `VERSIONE_MODELLO_DPA` · `IMPRONTA_TESTO_DPA` · `datiSostanzialiDpa()` ·
`improntaDpa()` · tipo `DatiSostanzialiDpa` · tipo `EmissioneDpa` (tutti in `src/lib/pdf/dpa-modello.ts`, 🆕 da creare,
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
| `supabase/migrations/20260803150000_dpa_registro_emissioni.sql` | 🆕 **da creare** — colonne, indice parziale, CHECK, trigger |
| `src/lib/pdf/dpa-modello.ts` | 🆕 **da creare** — versione del modello, impronta del testo, dati sostanziali e loro impronta. Nessuna dipendenza da Supabase: si prova senza mock |
| `src/lib/pdf/generate-dpa.ts` | **Modificare** — da «genera un PDF» a «emette, o restituisce l'emissione esistente» |
| `src/app/api/clienti/[id]/dpa/route.ts` | **Modificare** — consuma il nuovo ritorno, nome file dal numero |
| `src/app/(app)/clienti/[id]/page.tsx` | **Modificare** — numero e data dell'ultima emissione; via la frase falsa sui dieci anni |
| `tests/unit/dpa-modello.test.ts` | 🆕 **da creare** |
| `tests/unit/generate-dpa.test.ts` | **Modificare** — il ritorno cambia |
| `tests/unit/dpa-registro.test.ts` | 🆕 **da creare** — emissione, riuso, fail-closed, corsa |

---

## Task 1 — La migration, e i vincoli provati col rifiuto

> 🔄 **RISCRITTO il 03/08/2026 dopo un panel di due advisor con mandato di confutare.** La prima stesura
> aveva **sei difetti**, tre dei quali bloccanti. Il verbale sta in §«Perché questo task è stato riscritto»,
> in fondo al task. **Chi esegue legga quella sezione**: dice quali trappole erano già state disinnescate,
> e serve a non rimetterle.

**File:**
- 🆕 da creare: `supabase/migrations/20260803150000_dpa_registro_emissioni.sql`
- Modificare: `supabase/schema.sql` — il commento dei tipi progressivi (`:128-129`) **e** la sezione della
  tabella (`:2850-2879`), che deve rispecchiare la migration **per intero**: colonne, **entrambi** gli
  indici, **tutti e tre** i CHECK, **e la riga del trigger**.

**Interfacce:**
- Produce: le sette colonne · gli indici `dpa_emissione_numero_unico` e **`dpa_emissione_viva_unica`** ·
  i CHECK `dpa_emissione_coerente`, `dpa_impronte_esadecimali`, `dpa_percorso_nel_proprio_laboratorio` ·
  il trigger `updated_at`.

- [ ] **Step 0: leggere il catalogo VIVO prima di scrivere** — `non eseguito`

P7 è un `grep` su un file, non una lettura del catalogo (v. registro delle prove). Il fatto vero è uno solo,
e se il trigger esistesse già la migration aborterebbe alla **prima** esecuzione, non alla seconda:

```sql
SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'public.data_processing_agreements'::regclass AND NOT tgisinternal;
-- e, già che si è lì, le colonne che si sta per aggiungere:
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name='data_processing_agreements';
```

🛑 `ADD COLUMN IF NOT EXISTS` **non solleva** su una colonna che esiste già con un **tipo diverso**: la
terrebbe com'è, in silenzio. Se una delle sette c'è già, **fermarsi e riferire**.

- [ ] **Step 1: scrivere la migration** — `non eseguito`, si verifica allo Step 5

🔑 **Ogni istruzione è idempotente PER CONTO SUO.** Non si sa — e non serve sapere — se l'editor SQL del
pannello avvolga lo script incollato in una transazione unica: se ogni istruzione regge la riesecuzione, una
seconda passata **converge comunque sia finita la prima**. È l'unica forma che regge sia `supabase db push`
sia l'incollata a mano, ripetuta.

🛑 **Nessun `BEGIN;`/`COMMIT;` nel file** — regola di casa già scritta cinque volte
(`20260727120000_lavori_denti.sql:3`: «*il runner Supabase avvolge già la migration*»). Un `COMMIT` interno
spezzerebbe l'atomicità fra la migration e la sua riga di ledger.

```sql
-- supabase/migrations/20260803150000_dpa_registro_emissioni.sql
-- Registro delle emissioni del DPA (ondata 1 — D129/D130).
-- Additiva: nessuna colonna esistente viene modificata.
-- documento_url / firmato_da / firmato_at restano LIBERE per l'ondata 2 (firma).
--
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge gia' la migration
-- (stessa nota di 20260727120000_lavori_denti.sql:3). L'idempotenza qui e' per
-- SINGOLA istruzione: il file sopravvive a una seconda esecuzione anche se la
-- prima si e' fermata a meta'.

ALTER TABLE public.data_processing_agreements
  ADD COLUMN IF NOT EXISTS numero_dpa       TEXT,
  ADD COLUMN IF NOT EXISTS anno_dpa         SMALLINT,
  ADD COLUMN IF NOT EXISTS progressivo_dpa  INTEGER,
  ADD COLUMN IF NOT EXISTS storage_path_pdf TEXT,
  ADD COLUMN IF NOT EXISTS pdf_sha256       TEXT,
  ADD COLUMN IF NOT EXISTS payload_sha256   TEXT,
  ADD COLUMN IF NOT EXISTS emesso_at        TIMESTAMPTZ;

COMMENT ON COLUMN public.data_processing_agreements.storage_path_pdf IS
  'Percorso del PDF EMESSO nel contenitore privato documenti. Mai un URL: il contenitore e'' privato, getPublicUrl produrrebbe un indirizzo morto.';
COMMENT ON COLUMN public.data_processing_agreements.payload_sha256 IS
  'Impronta dei soli dati SOSTANZIALI (lab + cliente). Numero e data di emissione sono ESCLUSI: entrandoci, l''impronta cambierebbe ogni giorno.';

-- ------------------------------------------------------------------ indici --
-- (1) BACKSTOP DELLA NUMERAZIONE: due emissioni non possono portare lo stesso
--     numero nello stesso anno. PARZIALE: la tabella deve poter ospitare righe
--     senza numero (sub-responsabili).
CREATE UNIQUE INDEX IF NOT EXISTS dpa_emissione_numero_unico
  ON public.data_processing_agreements (laboratorio_id, anno_dpa, progressivo_dpa)
  WHERE progressivo_dpa IS NOT NULL;

-- (2) CHIAVE DI DEDUPLICAZIONE: una sola emissione VIVA per
--     (laboratorio, dentista, dati, versione del modello).
--     🔑 E' QUESTO l'indice su cui poggia il recupero dal 23505 del Task 6.
--     Quello sopra NON puo' scattare in una corsa: genera_progressivo
--     (schema.sql:111-115) da' ai due concorrenti due numeri DIVERSI, apposta.
--     Senza questo indice la corsa non da' errore: da' due emissioni complete
--     per lo stesso dentista e lo stesso testo, in silenzio.
--     Le colonne sono LE STESSE QUATTRO su cui interroga il guard di riuso
--     (Task 5) e su cui deve interrogare la rilettura dopo il 23505 (Task 6).
--     Precedente identico in casa: ddc_lavoro_attiva_unique
--     (20260710090000_ddc_annullata_unique_parziale.sql) + il suo backstop
--     UNIQUE (laboratorio_id, anno_ddc, progressivo_ddc) a schema.sql:1273.
--     Regola gia' ratificata per le fatture: spec 2026-07-09 ondata-4a, §4 M3.
CREATE UNIQUE INDEX IF NOT EXISTS dpa_emissione_viva_unica
  ON public.data_processing_agreements
     (laboratorio_id, dentista_id, payload_sha256, template_versione)
  WHERE deleted_at IS NULL AND payload_sha256 IS NOT NULL;

-- ----------------------------------------------------------------- vincoli --
-- ADD CONSTRAINT non ha IF NOT EXISTS: si guarda pg_constraint.
-- Forma gia' in casa: supabase/migrations/001_commercial_infra.sql:30-48.
-- 🛑 NON si usa DROP CONSTRAINT IF EXISTS + ADD: rivaliderebbe l'intera tabella
--    a ogni riesecuzione, con lock esclusivo e una finestra senza vincolo.
DO $migr$
BEGIN
  -- I campi dell'emissione viaggiano tutti insieme o nessuno: una riga a meta'
  -- e' una riga che mente. E un'emissione SENZA CONTROPARTE e' una riga che
  -- mente allo stesso modo: dentista_id e' annullabile per i sub-responsabili,
  -- ma un'emissione senza dentista non documenta nulla.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.data_processing_agreements'::regclass
       AND conname  = 'dpa_emissione_coerente'
  ) THEN
    ALTER TABLE public.data_processing_agreements
      ADD CONSTRAINT dpa_emissione_coerente CHECK (
        (numero_dpa IS NULL AND anno_dpa IS NULL AND progressivo_dpa IS NULL
          AND storage_path_pdf IS NULL AND pdf_sha256 IS NULL
          AND payload_sha256 IS NULL AND emesso_at IS NULL)
        OR
        (numero_dpa IS NOT NULL AND anno_dpa IS NOT NULL AND progressivo_dpa IS NOT NULL
          AND storage_path_pdf IS NOT NULL AND pdf_sha256 IS NOT NULL
          AND payload_sha256 IS NOT NULL AND emesso_at IS NOT NULL
          AND dentista_id IS NOT NULL AND tipo_controparte = 'dentista')
      );
  END IF;

  -- Le impronte sono sha-256 esadecimali MINUSCOLE, 64 caratteri.
  -- 🔑 payload_sha256 NON e' un dato descrittivo: e' la CHIAVE DI CONFRONTO del
  -- guard di riuso. Una forma diversa (base64, maiuscolo, prefisso, troncamento)
  -- non solleverebbe niente: il guard smetterebbe di trovare la riga e OGNI
  -- scarico brucerebbe un numero nuovo. Guasto silenzioso su un registro legale.
  -- Vincolo SEPARATO e con nome proprio: se un giorno l'algoritmo cambia si
  -- toglie questa riga sola, senza riscrivere il vincolo di coerenza.
  -- Solo [0-9a-f]: ammettere A-F renderebbe il vincolo cieco proprio al caso in
  -- cui qualcuno cambia il modo di produrre l'impronta.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.data_processing_agreements'::regclass
       AND conname  = 'dpa_impronte_esadecimali'
  ) THEN
    ALTER TABLE public.data_processing_agreements
      ADD CONSTRAINT dpa_impronte_esadecimali CHECK (
        (pdf_sha256     IS NULL OR pdf_sha256     ~ '^[0-9a-f]{64}$') AND
        (payload_sha256 IS NULL OR payload_sha256 ~ '^[0-9a-f]{64}$')
      );
  END IF;

  -- Il percorso del PDF sta SOTTO la cartella del proprio laboratorio.
  -- E' l'unico isolamento fra laboratori che la banca dati possa offrire su un
  -- percorso che poi il client di SERVIZIO (che la RLS la aggira) passa a
  -- Storage. L'UUID reso a testo non contiene ne' % ne' _ : nessun jolly LIKE.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.data_processing_agreements'::regclass
       AND conname  = 'dpa_percorso_nel_proprio_laboratorio'
  ) THEN
    ALTER TABLE public.data_processing_agreements
      ADD CONSTRAINT dpa_percorso_nel_proprio_laboratorio CHECK (
        storage_path_pdf IS NULL
        OR storage_path_pdf LIKE laboratorio_id::text || '/%'
      );
  END IF;
END
$migr$;

-- ----------------------------------------------------------------- trigger --
-- La tabella non aveva il trigger, quindi updated_at non si sarebbe mai
-- aggiornato da solo. Ma apply_updated_at_trigger fa un CREATE TRIGGER *NUDO*
-- (schema.sql:70-82): il CREATE OR REPLACE sta sulla FUNZIONE, non sul trigger
-- che la funzione crea. Chiamarla due volte da' 42710. Si guarda prima.
DO $trg$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.data_processing_agreements'::regclass
       AND tgname  = 'trg_data_processing_agreements_updated_at'
       AND NOT tgisinternal
  ) THEN
    PERFORM public.apply_updated_at_trigger('data_processing_agreements');
  END IF;
END
$trg$;
```

- [ ] **Step 2: allineare `supabase/schema.sql` — TUTTO, non solo le colonne**

🛑 **La prima stesura rispecchiava solo le colonne e il commento, ed era una trappola.** Lasciando fuori la
riga del trigger, il `grep` della prova P7 avrebbe continuato a dare **0** anche a lavoro finito — e il
prossimo lettore, usando lo stesso metodo che questo piano gli insegna, avrebbe concluso che il trigger manca
e lo avrebbe aggiunto **una seconda volta**. Un piano che lascia in eredità il proprio metodo di prova come
trappola è peggio di un piano che non prova niente.

Vanno rispecchiati nel `CREATE TABLE` e attorno (righe 2850-2879): **le sette colonne** · **entrambi gli
indici** · **tutti e tre i CHECK** · **la riga `SELECT apply_updated_at_trigger('data_processing_agreements');`**.
`provato:` dopo lo Step 2, `grep -c "apply_updated_at_trigger('data_processing_agreements')" supabase/schema.sql`
deve dare **1** (dava 0). **Incollare l'esito.**

E il commento dei tipi progressivi:

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

- [ ] **Steps 3-4: le sonde — TRE, e si controllano da sole**

🛑 **Perché le sonde della prima stesura erano una trappola.** Scrivevano a mano il laboratorio
`971061a1-…`, che è **documentazione, non catalogo**. Se quell'UUID non esistesse — o, molto peggio, **se il
vincolo non fosse stato applicato** — l'`INSERT` arriverebbe fino alla chiave esterna e restituirebbe
`23503`. L'operatore, a cui il piano ha detto «*atteso: errore*», vede un errore rosso e spunta la casella.
**La sonda che doveva provare che il vincolo funziona avrebbe appena provato che non esiste.**

Le sonde riscritte hanno tre proprietà, e sono tutte e tre necessarie: ① **affermano che il vincolo esiste**
prima di provocarlo · ② **derivano** laboratorio e cliente dai dati veri, invece di scriverli a mano ·
③ **verificano QUALE vincolo ha rifiutato**, e lasciano una **tabella leggibile** — una prova che
l'operatore non può incollare non è una prova (le `NOTICE` l'editor del pannello può non mostrarle).

⚠️ **Confine invariato:** girano su **transazione annullata**, mai dentro una migration registrata.

```sql
-- SONDE — Task 1. Si incolla nell'editor SQL DOPO aver applicato la migration.
-- Non registrano nulla, non toccano il ledger delle migration.
-- Si incolla nel referto la TABELLA FINALE: e' quella la prova.
BEGIN;

CREATE TEMP TABLE sonda_esito (
  sonda text, esito text, sqlstate text, vincolo text, messaggio text
) ON COMMIT DROP;

DO $sonde$
DECLARE
  v_lab uuid; v_cli uuid;
  v_st text; v_msg text; v_vinc text;
BEGIN
  ---------------------------------------------------------------- premesse --
  -- (a) i vincoli devono ESISTERE, o le sonde non provano niente.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid='public.data_processing_agreements'::regclass
                    AND conname='dpa_emissione_coerente' AND contype='c') THEN
    RAISE EXCEPTION 'SONDA NON VALIDA: il CHECK dpa_emissione_coerente NON esiste — la migration non e'' stata applicata, o e'' abortita';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='public' AND c.relkind='i'
                    AND c.relname='dpa_emissione_numero_unico') THEN
    RAISE EXCEPTION 'SONDA NON VALIDA: l''indice dpa_emissione_numero_unico NON esiste';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='public' AND c.relkind='i'
                    AND c.relname='dpa_emissione_viva_unica') THEN
    RAISE EXCEPTION 'SONDA NON VALIDA: l''indice dpa_emissione_viva_unica NON esiste';
  END IF;

  -- (b) laboratorio e cliente si DERIVANO, e si derivano INSIEME: prendendoli
  --     dalla stessa riga di clienti sono coerenti per costruzione.
  SELECT c.laboratorio_id, c.id INTO v_lab, v_cli
    FROM public.clienti c ORDER BY c.laboratorio_id, c.id LIMIT 1;
  IF v_lab IS NULL THEN
    RAISE EXCEPTION 'SONDA NON VALIDA: nessuna riga in clienti — niente da cui derivare laboratorio e controparte';
  END IF;

  -------------------------------------- SONDA A — CHECK dpa_emissione_coerente --
  BEGIN
    -- riga a meta': ha il numero, non ha il percorso ne' le impronte.
    INSERT INTO public.data_processing_agreements
      (laboratorio_id, tipo_controparte, dentista_id, numero_dpa, anno_dpa, progressivo_dpa)
    VALUES (v_lab, 'dentista', v_cli, 'DPA-2026-9001', 2026, 9001);
    RAISE EXCEPTION 'SONDA A FALLITA: la riga a meta'' e'' stata ACCETTATA';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_st=RETURNED_SQLSTATE, v_msg=MESSAGE_TEXT, v_vinc=CONSTRAINT_NAME;
    IF v_vinc IS DISTINCT FROM 'dpa_emissione_coerente' THEN
      RAISE EXCEPTION 'SONDA A: rifiutata dal vincolo SBAGLIATO (%) — %', v_vinc, v_msg;
    END IF;
    INSERT INTO sonda_esito VALUES ('A — CHECK dpa_emissione_coerente','RIFIUTATA (atteso)',v_st,v_vinc,v_msg);
  END;

  --------------------------------- SONDA B — indice dpa_emissione_numero_unico --
  -- Stesso (anno, progressivo), impronte DIVERSE: cosi' l'unico indice che puo'
  -- scattare e' quello del numero. Percorsi e impronte rispettano gli altri due
  -- CHECK, o la sonda fallirebbe sul vincolo sbagliato.
  BEGIN
    INSERT INTO public.data_processing_agreements
      (laboratorio_id, tipo_controparte, dentista_id, template_versione,
       numero_dpa, anno_dpa, progressivo_dpa, storage_path_pdf, pdf_sha256, payload_sha256, emesso_at)
    VALUES
      (v_lab,'dentista',v_cli,'dpa-v2','DPA-2026-9001',2026,9001,
       v_lab::text||'/dpa/2026/A.pdf', repeat('a',64), repeat('b',64), now()),
      (v_lab,'dentista',v_cli,'dpa-v2','DPA-2026-9001',2026,9001,
       v_lab::text||'/dpa/2026/B.pdf', repeat('c',64), repeat('d',64), now());
    RAISE EXCEPTION 'SONDA B FALLITA: il numero duplicato e'' stato ACCETTATO';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_st=RETURNED_SQLSTATE, v_msg=MESSAGE_TEXT, v_vinc=CONSTRAINT_NAME;
    IF v_msg NOT LIKE '%dpa_emissione_numero_unico%' THEN
      RAISE EXCEPTION 'SONDA B: rifiutata dall''indice SBAGLIATO — %', v_msg;
    END IF;
    INSERT INTO sonda_esito VALUES ('B — indice dpa_emissione_numero_unico','RIFIUTATA (atteso)',v_st,v_vinc,v_msg);
  END;

  ------------------------ SONDA C — indice dpa_emissione_viva_unica (LA CORSA) --
  -- 🔑 E' LA SONDA CHE IL PIANO NON AVEVA, e riproduce la corsa VERA: stessi
  -- dati, stessa versione del modello, PROGRESSIVI DIVERSI — perche' e' esatta-
  -- mente quello che genera_progressivo consegna a due richieste simultanee.
  -- Con il solo indice sul numero questa INSERT passerebbe, e sarebbero due
  -- emissioni per lo stesso dentista e lo stesso testo.
  BEGIN
    INSERT INTO public.data_processing_agreements
      (laboratorio_id, tipo_controparte, dentista_id, template_versione,
       numero_dpa, anno_dpa, progressivo_dpa, storage_path_pdf, pdf_sha256, payload_sha256, emesso_at)
    VALUES
      (v_lab,'dentista',v_cli,'dpa-v2','DPA-2026-9007',2026,9007,
       v_lab::text||'/dpa/2026/C7.pdf', repeat('e',64), repeat('f',64), now()),
      (v_lab,'dentista',v_cli,'dpa-v2','DPA-2026-9008',2026,9008,
       v_lab::text||'/dpa/2026/C8.pdf', repeat('0',64), repeat('f',64), now());
    RAISE EXCEPTION 'SONDA C FALLITA: DUE emissioni per lo stesso dentista e lo stesso testo sono state ACCETTATE — la corsa non e'' coperta';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_st=RETURNED_SQLSTATE, v_msg=MESSAGE_TEXT, v_vinc=CONSTRAINT_NAME;
    IF v_msg NOT LIKE '%dpa_emissione_viva_unica%' THEN
      RAISE EXCEPTION 'SONDA C: rifiutata dall''indice SBAGLIATO — %', v_msg;
    END IF;
    INSERT INTO sonda_esito VALUES ('C — indice dpa_emissione_viva_unica (corsa)','RIFIUTATA (atteso)',v_st,v_vinc,v_msg);
  END;
END
$sonde$;

SELECT * FROM sonda_esito;

ROLLBACK;
```

**Atteso: tre righe, tutte `RIFIUTATA (atteso)` con `sqlstate` `23514`, `23505`, `23505`.**
**Incollare la tabella vera nel referto.** Un `ALTER TABLE` riuscito prova la sintassi, non il comportamento.

📎 Nota tecnica, perché non venga «semplificata» via: `RAISE EXCEPTION` senza `ERRCODE` produce `P0001`,
**non** `23514` — è per questo che un «SONDA A FALLITA» non viene mangiato dal proprio gestore
`WHEN check_violation` e propaga rumoroso. E su B e C l'asserzione è sul **testo** del messaggio, non su
`CONSTRAINT_NAME`: per un **indice** unico (che non è un `constraint`) la valorizzazione di quel campo
dipende da `errtableconstraint`, e non si vuole una sonda che fallisce per una propria sovra-asserzione.

- [ ] **Step 5: salvare — E FERMARSI QUI**

🛑 **Questo è il confine del task, e l'esecutore lo rispetta.** Steps 0, 1, 2 e 5 si fanno da qui; gli
Steps 3, 4, 6 e 7 **richiedono la migration già applicata**, e applicarla non è nelle mani dell'esecutore.

```bash
git add supabase/migrations/20260803150000_dpa_registro_emissioni.sql supabase/schema.sql
git commit -F <file-messaggio-FUORI-dal-repo>
```

🛑 **`src/types/database.types.ts` NON entra in questo salvataggio**: si rigenera dal database **dopo**
l'applicazione (Step 7). Committarlo ora significherebbe committare i tipi vecchi fingendo che siano nuovi.
🛑 **Mai `git add -A`.**

- [ ] **Step 6: APPLICARE la migration — è il punto in cui il lavoro aspetta Francesco**

Il CI **non** applica le migration. Due strade, e si sceglie con Francesco:
`npx supabase db push` (richiede la password del database — **non provato da questa macchina**, e **non si
tenta**) oppure **incollare il file nell'editor SQL del pannello Supabase**. Subito dopo, **nello stesso
posto**, si incollano le sonde degli Steps 3-4 e si riporta la tabella d'esito.

- [ ] **Step 7: FASE 6b — rigenerare i tipi e verificare** (solo dopo lo Step 6)

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Atteso: uscita **0**. Se il file finisce con un messaggio della CLI, va tolto a mano (§9 di `ua-app/CLAUDE.md`).
Poi si salva `src/types/database.types.ts` con un commit suo.

---

### Perché questo task è stato riscritto — il verbale del panel del 03/08/2026

Due advisor con **mandato di confutare**, prospettive diverse (architettura della concorrenza · tenuta del
dato e isolamento), sono arrivati **indipendentemente** alle stesse conclusioni. Le tre affermazioni portanti
sono state **rilette a mano** dopo il panel (prove **P10 · P11 · P12** nel registro): la regola advisor dice
che un panel si riverifica, non si cita.

| # | Difetto della prima stesura | Gravità |
|---|---|---|
| **T1-01** | `ADD CONSTRAINT` senza guardia: la seconda esecuzione dà `42710` e aborta il file — proprio sulla strada che il piano prescrive (incollare a mano) | 🔴 bloccante |
| **T1-02** | `apply_updated_at_trigger` **non è rieseguibile**: fa un `CREATE TRIGGER` nudo. Il `CREATE OR REPLACE` sta sulla **funzione**, non sul trigger — è lo scambio che fa sembrare idempotente ciò che non lo è | 🔴 bloccante |
| **T1-03** | Lo Step 2 rispecchiava in `schema.sql` **solo le colonne**: la prova P7 avrebbe continuato a dare 0 e il prossimo lettore avrebbe aggiunto il trigger **due volte** | 🔴 bloccante |
| **T1-04** | L'indice sul progressivo **non può scattare in una corsa** — `genera_progressivo` dà ai due concorrenti numeri **diversi**, apposta. Il recupero dal `23505` del Task 6 era irraggiungibile, e la corsa vera produceva **due emissioni complete e silenziose** per lo stesso dentista e lo stesso testo. 🔑 **E il piano dichiarava «stessa rete della DdC» essendo falso contro lo schema della DdC stessa**, che di indici ne ha due (P11), come la regola già ratificata per le fatture (P12) | 🔴 alto |
| **T1-05** | Le sonde non si controllavano da sole: laboratorio scritto a mano, nessuna verifica che il vincolo esista, nessuna verifica di **quale** vincolo abbia rifiutato. A vincolo mancante avrebbero restituito `23503`, e l'operatore avrebbe incollato quello come prova | 🔴 alto |
| **T1-06** | Nessun vincolo di forma su impronte che sono **chiavi di confronto**: una forma diversa rompe il riuso **in silenzio** e brucia un numero a ogni scarico | 🟠 alto |
| **T1-07** | Nessun vincolo legava `storage_path_pdf` al proprio laboratorio, su un percorso che il client di **servizio** (che la RLS la aggira) passa a Storage | 🟠 medio |

**Accettato consapevolmente, non risolto — e va detto o costa mezza giornata d'indagine alla prima
ispezione:** il **buco nella numerazione resta**. Chi perde la corsa ha già consumato il suo progressivo, e
`genera_progressivo` incrementa in una RPC propria, fuori da qualsiasi transazione annullabile: il registro
avrà 7 e poi 9. I numeri restano **unici e crescenti**, che è ciò che conta per un registro non fiscale.
⚠️ Per la stessa ragione il **titolo del Task 5 («nessun numero bruciato») è vero solo a metà**: il
progressivo si prende **prima** del caricamento su Storage, quindi un rifiuto dell'archivio lo consuma
comunque.

**Il ramo `23505` che arriva dall'indice del NUMERO** (non da quello di deduplicazione) non è distinguibile
dal solo codice d'errore e cadrà nel `throw` finale del Task 6. **È corretto così** — è un'anomalia vera, non
una corsa — ma va commentato lì, o il prossimo lettore lo crederà un caso dimenticato.

**Quattro cose restano non verificabili senza toccare il database**, e sono dichiarate, non stimate:
① se il trigger esista già (lo Step 0 lo guarda) · ② se una delle sette colonne esista già **con un tipo
diverso** — `ADD COLUMN IF NOT EXISTS` non solleverebbe (Step 0) · ③ quante righe abbia davvero la tabella
(P3 ritirata; la conclusione non ne dipende) · ④ se l'editor del pannello avvolga lo script in una
transazione unica — **reso irrilevante** dall'idempotenza per singola istruzione.

---

## Task 2 — La versione del modello, e la guardia che impedisce di dimenticarla

**File:**
- 🆕 da creare: `src/lib/pdf/dpa-modello.ts`
- 🆕 da creare: `tests/unit/dpa-modello.test.ts`

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
 *  sempre insieme, e `tests/unit/dpa-modello.test.ts` (🆕 da creare) è ciò che lo impone.
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
- Modificare (🆕 creato al Task 2): `src/lib/pdf/dpa-modello.ts`
- Modificare (🆕 creato al Task 2): `tests/unit/dpa-modello.test.ts`

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
- 🆕 da creare: `tests/unit/dpa-registro.test.ts`
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

**File:** modificare `src/lib/pdf/generate-dpa.ts` · modificare `tests/unit/dpa-registro.test.ts` (🆕 creato al Task 4)

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
    // 🛑 MA PRIMA VA LIBERATA LA CHIAVE — v. nota qui sotto: senza questo
    //    UPDATE, con dpa_emissione_viva_unica in casa, la riemissione e' una
    //    porta chiusa PERMANENTE.
    await svc
      .from('data_processing_agreements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', esistente.id)
      .eq('laboratorio_id', laboratorio_id)   // il client di servizio aggira la RLS
    console.error('generateDpa — PDF conservato non trovato, riga archiviata e riemetto:', esistente.storage_path_pdf)
  }
```

🔄 **Corretto il 03/08 dal panel del Task 1, e senza questa correzione il ramo si autodistrugge.** Con il
nuovo indice `dpa_emissione_viva_unica`, riemettere significa inserire una **seconda** riga viva con **stessa**
impronta e **stessa** versione: rifiutata → `23505` → la rilettura del Task 6 ritrova **la stessa riga
orfana** → lo scarico fallisce di nuovo → si cade sul `throw`. E **ogni clic, prima di fallire, brucia un
progressivo e carica un PDF orfano in più**, perché il caricamento precede l'`INSERT`. Il soft-delete
esplicito libera la chiave (il predicato dell'indice è `WHERE deleted_at IS NULL`) e **lascia comunque
traccia**: una riga il cui file non esiste più è un'emissione che non documenta niente, e archiviarla è un
atto che deve risultare, non un effetto collaterale.

⚠️ **Serve una prova in più rispetto a quelle già elencate:** dopo il ramo «file sparito», l'`update` è
stato chiamato con l'`id` dell'orfana **e** col filtro `laboratorio_id`. Senza quell'asserzione, un domani
qualcuno toglie l'`UPDATE` credendolo ridondante e riapre la porta chiusa.

- [ ] **Step 4: verde** — `npx vitest run tests/unit/dpa-registro.test.ts`
- [ ] **Step 5: salvare**

---

## Task 6 — Fail-closed e corsa fra due richieste

**File:** modificare `src/lib/pdf/generate-dpa.ts` · modificare `tests/unit/dpa-registro.test.ts` (🆕 creato al Task 4)

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
    // guard. A separarle e' `dpa_emissione_viva_unica` — l'indice sulla chiave
    // di deduplicazione, NON quello sul numero: genera_progressivo ha gia' dato
    // ai due concorrenti progressivi diversi, apposta (schema.sql:111-115).
    // ⚠️ Un 23505 puo' arrivare anche da dpa_emissione_numero_unico, e da qui
    //    i due casi NON sono distinguibili: quello e' un'anomalia vera (un
    //    numero riusato) e la rilettura qui sotto non lo trovera' -> throw.
    //    E' il comportamento voluto, non un caso dimenticato.
    if ((erroreRiga as { code?: string }).code === '23505') {
      const { data: vincitrice } = await svc
        .from('data_processing_agreements')
        .select('id, numero_dpa, storage_path_pdf')
        .eq('laboratorio_id', laboratorio_id)
        .eq('dentista_id', cliente_id)
        .eq('payload_sha256', impronta)
        .eq('template_versione', VERSIONE_MODELLO_DPA)   // 🔑 le QUATTRO colonne
        .is('deleted_at', null)
        .order('emesso_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (vincitrice?.storage_path_pdf) {
        const { data: file } = await svc.storage.from('documenti').download(vincitrice.storage_path_pdf)
        if (file) {
          // Chi perde ha gia' caricato il PROPRIO file, su un percorso diverso:
          // resta li' senza nessuna riga che lo nomini. Un PDF non referenziato
          // coi dati dello studio e' un problema di minimizzazione, non d'ordine.
          await svc.storage.from('documenti').remove([storage_path_pdf])
          return {
            buffer: Buffer.from(await file.arrayBuffer()),
            numero_dpa: vincitrice.numero_dpa as string,
            emissione_id: vincitrice.id as string,
            riemessa: false,
          }
        }
      }
    }
    throw new Error(`DPA: registro non scritto — ${erroreRiga.message}`)
  }
```

🔄 **Due correzioni del 03/08, dal panel del Task 1 — la prima è grave.**

**① Il filtro della rilettura DEVE essere identico a quello del guard.** La prima stesura ne filtrava
**tre** colonne dove il guard ne filtra quattro: mancava `template_versione`. Con l'indice a quattro
colonne, chi perde la corsa poteva rileggere **l'emissione di una versione di modello diversa** e consegnare
al dentista **il testo sbagliato** — precisamente il fallimento che questo registro esiste per impedire.
🔑 **L'invariante, da tenere per tutta l'ondata:** *colonne dell'indice = filtro del guard = filtro della
rilettura*, tutti e tre uguali. Se uno dei tre cambia, cambiano tutti e tre.

**② Chi perde toglie il proprio file.** Il caricamento precede l'`INSERT` (ed è giusto così): il perdente ha
già scritto un PDF su un percorso che nessuna riga nominerà mai.

⚠️ **Due prove in più rispetto a quelle già elencate:** che la rilettura porti **anche**
`template_versione`, e che il perdente chiami `remove` **col proprio** percorso — non con quello della
vincitrice.

- [ ] **Step 4: verde** · **Step 5: salvare**

---

## Task 7 — La rotta

**File:** modificare `src/app/api/clienti/[id]/dpa/route.ts` (🛑 **aprirlo per intero prima**: il registro
delle letture dice `letto: 1-35`, il resto **NON letto**)

**Interfacce:** consuma `EmissioneDpa` (Task 4).

**Censimento già fatto, non da rifare:** `ls tests/unit | grep -iE "clienti|dpa"` → `ClientiSearchList.test.tsx`,
`clienti-patch-allowlist.test.ts`, `clienti-patch-portale.test.ts`, `clienti-route.test.ts`,
`dpa-pdf-content.test.ts`, `generate-dpa.test.ts`. **Nessuno copre questa rotta** → la prova nasce in un file
nuovo, 🆕 `tests/unit/dpa-route.test.ts`.

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

✅ **GIÀ FATTO, FUORI DA QUESTO TASK — non cercarla, non c'è più.** La riga sotto il tasto diceva «*Stampa,
firma in duplice copia e conserva una copia originale per **10 anni**.*» — **falsa** dopo D126 (i dieci anni
sono della **dichiarazione di conformità**, non del contratto) e in contraddizione con D127-D128 (la firma
sarà a distanza). **Tolta il 03/08/2026, prima dell'esecuzione del piano**, perché era viva davanti a un
utente e non poteva aspettare nove task. Testo oggi in produzione:
«*Stampa e firma in duplice copia con lo studio: una copia al laboratorio, una allo studio.*»

🛑 **E perché non dice ancora niente sulla conservazione:** la frase che questo piano aveva previsto —
«*Ogni versione emessa resta conservata da UÀ*» — **sarebbe stata falsa il giorno in cui è stata scritta**:
il registro non esiste finché non è finito il **Task 4**, e oggi `generateDpa()` rende un PDF al volo senza
conservare niente. Sostituire una promessa falsa con una promessa falsa più nuova non è una correzione.
La frase sulla conservazione entra **qui**, in questo task, quando il registro dietro c'è davvero.

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

- [ ] **Step 2: mostrare il numero, e SOLO ORA promettere la conservazione** (stile **v2.3**, come il resto
del blocco). Il paragrafo da sostituire è quello **neutro** messo il 03/08 (v. sopra), non quello dei dieci
anni: la riga dei dieci anni **non esiste più nel file**, e un esecutore che la cerchi si è perso.

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

# (a) DUE SCARICHI IN SEQUENZA — prova il riuso (D130)
curl -b ck.txt -o uno.pdf https://uachelab.com/api/clienti/<id>/dpa
curl -b ck.txt -o due.pdf https://uachelab.com/api/clienti/<id>/dpa
shasum -a 256 uno.pdf due.pdf   # atteso: IDENTICHE

# (b) 🔑 DUE SCARICHI IN PARALLELO — prova la CORSA, che in sequenza non si vede.
#     Su un cliente DIVERSO, mai emesso prima: e' l'unico modo di far arrivare
#     due richieste dentro la stessa finestra fra guard e INSERT.
curl -b ck.txt -o par1.pdf https://uachelab.com/api/clienti/<id2>/dpa &
curl -b ck.txt -o par2.pdf https://uachelab.com/api/clienti/<id2>/dpa &
wait
shasum -a 256 par1.pdf par2.pdf   # atteso: IDENTICHE
```

🛑 **Senza il punto (b) la corsa resta provata solo contro un mock**, e un mock non è un fatto: è ciò che
avevamo scritto noi. Lettura del registro dopo (b), con la chiave di servizio: atteso **UNA SOLA riga** per
quel cliente. Se ce ne fossero due, `dpa_emissione_viva_unica` non sta facendo il suo lavoro e il Task 1 va
riaperto.

E la lettura del registro dopo (a) (chiave di servizio): atteso **UNA sola riga**, con `numero_dpa`,
`pdf_sha256` uguale all'impronta dei file scaricati, `template_versione = 'dpa-v2'`.

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
