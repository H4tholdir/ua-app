-- 20260727120250_lavori_denti_touch_dedup.sql — Ondata (a), correzione.
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la migration.
--
-- Il Task 5 ha creato `public.lavori_denti_touch()` come da piano. Il piano
-- sbagliava: `public.trigger_set_updated_at()` esiste dal primo giorno
-- (`supabase/schema.sql:58-81`), ha corpo IDENTICO carattere per carattere, e
-- alimenta già 34 trigger su 34 tabelle — fra cui `dichiarazioni_conformita`.
-- La nostra era la trentacinquesima copia della stessa riga di codice.
--
-- Si adotta la funzione di casa e la convenzione di nome già in uso
-- (`trg_<tabella>_updated_at`), e la copia se ne va.

DROP TRIGGER IF EXISTS lavori_denti_touch_trg ON lavori_denti;
DROP FUNCTION IF EXISTS public.lavori_denti_touch();

CREATE TRIGGER trg_lavori_denti_updated_at
  BEFORE UPDATE ON lavori_denti
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
