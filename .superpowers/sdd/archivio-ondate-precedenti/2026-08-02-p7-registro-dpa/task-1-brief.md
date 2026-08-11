# Task 1 — La migration: cancello, traccia, colonna

**File:**
- 🆕 Crea (nuovo): `supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql`
- Modifica: `supabase/schema.sql` (righe **2876-2878** per la regola; il blocco colonne intorno a **2864-2884**)
- Modifica: `src/types/database.types.ts` (**generato**, mai a mano)

**Interfacce:**
- Produce: la colonna `emesso_da` nel tipo `data_processing_agreements` di `database.types.ts` — **il Task 2 non compila senza**.

- [ ] **Step 0: il ramo, e lo stato di partenza**

```bash
git checkout -b p7-registro-dpa-cancello-traccia && git status -sb
```

- [ ] **Step 1: rileggere il catalogo VIVO, in sola lettura, PRIMA di scrivere il file**

🔑 Le misure di questo piano sono del 04/08. Si rileggono: un numero vecchio ha l'aria di un numero fresco.

```bash
node scripts/tmp/p7-riverifica.mjs
```

Atteso: **2 righe, 0 firmate** · `dpa_laboratorio` con `cmd=ALL` e `ha_with_check=false` · `data_processing_agreements` **assente** dall'elenco degli automatismi di audit.
🛑 **Se la tabella non è più vuota di firme, ci si FERMA e si riferisce:** la finestra a costo zero si è chiusa e il piano va ripensato.

- [ ] **Step 2: scrivere la migration**

```sql
-- supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql
-- P7 — il registro DPA smette di essere scrivibile dal client dell'utente,
-- comincia a lasciare traccia, e la traccia sa dire CHI ha emesso.
-- Spec: docs/superpowers/specs/2026-08-04-p7-registro-dpa-cancello-traccia-design.md
-- Decisioni: D146 (si parte da P7) · D147 (cancello + traccia) · D148 (il «chi»).
--
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge gia' la migration.
-- L'idempotenza e' per SINGOLA istruzione: il file sopravvive a una seconda
-- esecuzione anche se la prima si e' fermata a meta'.
--
-- Stato del catalogo VIVO letto il 04/08/2026 PRIMA di scrivere questo file
-- (Management API, read_only:true) — le query in forma copiabile stanno nel
-- piano, Task 1 Step 1, che e' in git e sopravvive a questo file:
--   docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md
--   · dpa_laboratorio: polcmd = '*' (ALL), polwithcheck = NULL
--     → PostgreSQL riusa USING come WITH CHECK: un utente del laboratorio,
--       anche un `tecnico`, potrebbe riscrivere le righe del proprio lab.
--   · nessun automatismo di audit sulla tabella (10 tabelle agganciate, non questa);
--   · emesso_da NON esiste (22 colonne censite una per una);
--   · 2 righe, 0 firmate → nessun ADD COLUMN puo' abortire su dati veri.

-- ── ① IL CANCELLO ────────────────────────────────────────────────────────────
-- Il modello e' `sdi_receipts_laboratorio` (schema.sql:2963-2966), FOR SELECT,
-- col commento «mai UPDATE/DELETE su documenti fiscali». Qui la ragione e' la
-- stessa: una prova che la parte interessata puo' riscrivere non e' una prova.
-- Il filtro `deleted_at IS NULL` RESTA: ora che la regola e' di sola lettura,
-- fa il mestiere per cui era stato scritto — nascondere le righe archiviate.
-- Nessun WITH CHECK: senza comando di scrittura ammesso non c'e' scrittura da
-- controllare, e aggiungerlo darebbe l'idea di una porta dove non c'e' piu' porta.
DROP POLICY IF EXISTS "dpa_laboratorio" ON public.data_processing_agreements;
CREATE POLICY "dpa_laboratorio" ON public.data_processing_agreements
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id() AND deleted_at IS NULL
  );

-- ── ② LA TRACCIA ─────────────────────────────────────────────────────────────
-- Da DIECI tabelle sorvegliate a UNDICI. `_audit_trigger_fn` e' generica: legge
-- `id` e `laboratorio_id` da to_jsonb(NEW/OLD), entrambe presenti qui.
-- ⚠️ La traccia dira' COSA e QUANDO, non CHI: auth.uid() e' vuoto quando scrive
-- il client di servizio (1.587 righe su 1.588 in audit_log — voce P25). Il «chi»
-- di QUESTA tabella arriva dal blocco ③, dentro la fotografia della riga.
DROP TRIGGER IF EXISTS _audit_data_processing_agreements ON public.data_processing_agreements;
CREATE TRIGGER _audit_data_processing_agreements
  AFTER INSERT OR DELETE OR UPDATE ON public.data_processing_agreements
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

-- ── ③ IL «CHI» ───────────────────────────────────────────────────────────────
-- Sta accanto a `emesso_at`: c'era il quando, mancava il chi.
-- 🛑 NON e' `firmato_da`, che e' TEXT ed e' il nome della CONTROPARTE allo studio.
-- Annullabile per scelta: le 2 righe esistenti sono nate prima e non si sa chi le
-- abbia emesse — riempirle sarebbe inventare una prova. Il vincolo vive nel
-- compilatore (terzo parametro OBBLIGATORIO di generateDpa), non in un valore finto.
-- Chiave esterna NUDA come tutte le altre 18 verso `utenti`: nessun percorso
-- cancella un utente singolo, e dentro admin_delete_laboratorio le righe DPA se ne
-- vanno alla 155, `utenti` alla 163. ⚠️ Quell'ORDINE e' ora PORTANTE.
-- Scartato ON DELETE SET NULL: cancellerebbe il «chi» quando un tecnico lascia il
-- laboratorio, cioe' proprio quando serve — contraddirebbe D148 in silenzio.
ALTER TABLE public.data_processing_agreements
  ADD COLUMN IF NOT EXISTS emesso_da UUID REFERENCES public.utenti(id);

COMMENT ON COLUMN public.data_processing_agreements.emesso_da IS
  'Utente di UA che ha EMESSO il documento (chi ha premuto). Distinto da firmato_da, che e'' il nome della controparte allo studio. Vuoto sulle righe nate prima del 04/08/2026: non si inventa. Sul RIUSO di un''emissione esistente NON si riscrive (spec P7, T3b).';
```

- [ ] **Step 3: aggiornare `supabase/schema.sql` a mano, nello stesso commit**

Due punti. ① Alla riga della colonna, dopo `emesso_at TIMESTAMPTZ,`:

```sql
  emesso_at         TIMESTAMPTZ,
  emesso_da         UUID REFERENCES utenti(id),        -- chi ha PREMUTO (≠ firmato_da, che e' la controparte)
```

② Alla regola (righe **2876-2878**), sostituendo il testo attuale:

```sql
CREATE POLICY "dpa_laboratorio" ON data_processing_agreements
  FOR SELECT USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
-- Solo SELECT (P7, 04/08/2026) — una prova che la parte interessata puo'
-- riscrivere non e' una prova. Stesso principio di sdi_receipts.
CREATE TRIGGER _audit_data_processing_agreements
  AFTER INSERT OR DELETE OR UPDATE ON data_processing_agreements
  FOR EACH ROW EXECUTE FUNCTION _audit_trigger_fn();
```

- [ ] **Step 4: verificare che il file sia coerente con sé stesso**

```bash
grep -c "BEGIN;\|COMMIT;" supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql
```

Atteso: **0**.

- [ ] **Step 5: APPLICARE la migration — Management API, `read_only:false` (D151)**

🔄 **Questo Step era il numero 6, e prima di lui ce n'era un altro che è stato TOLTO.** Lo Step 5 originale prometteva «le sonde su transazione annullata» e conteneva un `CREATE TEMP TABLE` seguito da `SELECT 1`: **non provava niente**. 🔑 **Un passo che finge una verifica è peggio di un passo assente** — chi lo esegue lo spunta e crede di aver provato qualcosa (R-P1: si marca solo ciò che è provato). Le prove vere di questa migration sono **T1-T5, nel Task 3**, e girano sulla tabella **vera**.

**Chi la applica:** Claude, con la Management API. ✅ **Deciso da Francesco (D151)**, fra tre strade presentate col loro prezzo.
🔑 **La decisione è esistita perché il divieto non era tecnico:** `.env.local` ha sempre avuto `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_URL`. Un motivo falso è un motivo che smette di funzionare.
✅ **Rischio misurato:** la banca dati ha **solo dati di prova** (3 laboratori finti) e ogni istruzione è **idempotente**, quindi una seconda passata non fa nulla.

```bash
# le tre istruzioni della migration, una chiamata per blocco, read_only:false
# (il file è la fonte: si legge da lì, non si ricopia a mano)
```

⚠️ **Il ledger resta indietro di una riga e va rimesso in pari:**

```bash
npx supabase migration repair --status applied 20260804120000
```

- [ ] **Step 6: verificare che il database sia DAVVERO cambiato — in sola lettura**

```bash
node scripts/tmp/p7-riverifica.mjs
```

Atteso, e sono tre cose diverse: `dpa_laboratorio` con `comando: "r"` (era `"*"`) · `data_processing_agreements` **presente** fra gli automatismi · la colonna `emesso_da` nell'elenco.
🛑 **Questo Step NON prova il comportamento**, solo che il catalogo è cambiato. Il comportamento è il Task 3.

- [ ] **Step 7: FASE 6b — rigenerare i tipi (solo dopo lo Step 6)**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Atteso: **0 errori**. Togliere l'eventuale messaggio del CLI in fondo al file generato.

```bash
grep -c "emesso_da" src/types/database.types.ts
```

Atteso: **≥ 3** (Row, Insert, Update).

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql supabase/schema.sql src/types/database.types.ts
git commit -F <messaggio fuori dal repo>
```

---

