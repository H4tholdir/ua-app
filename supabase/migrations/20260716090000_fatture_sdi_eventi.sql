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
