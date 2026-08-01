-- supabase/migrations/20260803150000_dpa_registro_emissioni.sql
-- Registro delle emissioni del DPA (ondata 1 — D129/D130).
-- Additiva: nessuna colonna esistente viene modificata.
-- documento_url / firmato_da / firmato_at restano LIBERE per l'ondata 2 (firma).
--
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge gia' la migration
-- (stessa nota di 20260727120000_lavori_denti.sql:3). L'idempotenza qui e' per
-- SINGOLA istruzione: il file sopravvive a una seconda esecuzione anche se la
-- prima si e' fermata a meta'.
--
-- Stato del catalogo VIVO letto il 03/08/2026 PRIMA di scrivere questo file
-- (Management API Supabase, read_only:true — v. .superpowers/sdd/task-1-report.md §1):
--   · le sette colonne qui sotto NON esistevano (42703 su tutte e sette);
--   · nessun trigger non interno sulla tabella (pg_trigger → 0 righe);
--   · nessun indice oltre alla chiave primaria, nessun CHECK oltre ai due
--     originari (stato, tipo_controparte);
--   · la tabella era VUOTA (count(*) = 0), quindi nessun ADD CONSTRAINT puo'
--     abortire su dati preesistenti.

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
-- 🛑 CREATE INDEX IF NOT EXISTS guarda il NOME, non la DEFINIZIONE: un indice
--    omonimo con altre colonne verrebbe tenuto in silenzio, esattamente come
--    ADD COLUMN IF NOT EXISTS con un tipo diverso. Per questo il catalogo vivo
--    e' stato letto prima (pg_indexes → solo data_processing_agreements_pkey).
--
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
--     NB: dentro il predicato di questo indice dentista_id non e' mai NULL —
--     payload_sha256 NOT NULL implica, per dpa_emissione_coerente, il ramo
--     dell'emissione completa, che pretende dentista_id NOT NULL. Senza quel
--     CHECK i NULL sarebbero distinti fra loro e l'indice non deduplicherebbe.
CREATE UNIQUE INDEX IF NOT EXISTS dpa_emissione_viva_unica
  ON public.data_processing_agreements
     (laboratorio_id, dentista_id, payload_sha256, template_versione)
  WHERE deleted_at IS NULL AND payload_sha256 IS NOT NULL;

-- ----------------------------------------------------------------- vincoli --
-- ADD CONSTRAINT non ha IF NOT EXISTS: si guarda pg_constraint.
-- Forma gia' in casa: supabase/migrations/001_commercial_infra.sql:30-48.
-- 🛑 NON si usa DROP CONSTRAINT IF EXISTS + ADD: rivaliderebbe l'intera tabella
--    a ogni riesecuzione, con lock esclusivo e una finestra senza vincolo.
-- 🛑 Anche questa guardia e' sul NOME: v. la nota sugli indici qui sopra.
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
  -- La forma e' quella gia' in uso per la DdC:
  --   `${lavoro.laboratorio_id}/ddc/${anno}/${numero}.pdf`
  --   (src/lib/pdf/generate-ddc.ts:181) — cioe' UUID del laboratorio, poi '/'.
  -- Il cast uuid->text e' una CoerceViaIO fra uuid_out e textin, entrambe
  -- IMMUTABLE nel catalogo: e' cio' che rende l'espressione ammissibile in un
  -- CHECK ("functions in check constraint must be marked IMMUTABLE").
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
-- La tabella non aveva il trigger (pg_trigger letto il 03/08/2026: zero righe
-- non interne), quindi updated_at non si sarebbe mai aggiornato da solo.
--
-- ⚠️ Sul perche' della guardia, e una correzione: il piano diceva che
-- apply_updated_at_trigger fa un CREATE TRIGGER *NUDO* e che chiamarla due
-- volte da' 42710. E' vero di supabase/schema.sql:70-82, che pero' e' una
-- FOTOGRAFIA. Nel catalogo VIVO la funzione e' un'altra:
--   format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I; CREATE TRIGGER …')
-- cioe' e' gia' rieseguibile (letto in pg_proc.prosrc il 03/08/2026; quella
-- forma non compare in nessun file del repo — e' deriva non documentata).
--
-- La guardia RESTA, e non per prudenza generica:
--   ① sotto la funzione VIVA una chiamata secca farebbe DROP+CREATE, aprendo
--      una finestra in cui la tabella e' senza trigger. Con la guardia la
--      seconda passata non fa nulla;
--   ② sotto la funzione di schema.sql (se quel file venisse mai rigiocato)
--      una chiamata secca darebbe davvero 42710 e aborterebbe il file.
-- Regge entrambe le versioni e non costa niente.
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
