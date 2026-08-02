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
