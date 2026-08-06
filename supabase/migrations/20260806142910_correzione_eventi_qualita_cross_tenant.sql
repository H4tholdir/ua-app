-- supabase/migrations/20260806142910_correzione_eventi_qualita_cross_tenant.sql
-- Correzione dei rilievi della revisione sul Task 1 dell'ondata
-- «si deve sempre poter intervenire» (20260806140823_eventi_qualita.sql, già applicata).
-- Non si tocca la migration precedente: il registro delle migration si disallinea.
--
-- Quattro rilievi, in ordine di gravità:
-- CRITICO 1 — REVOKE UPDATE/DELETE mancava service_role (nota E8, precedente già in
--   casa: 20260721090000_parete_cassette.sql:126-139 e applicato in
--   20260804150306_ondata_b_lavori_prescrizioni.sql:79).
-- CRITICO 2 — FK semplici permettevano riferimenti cross-tenant (precedente già in
--   casa: 20260727120000_lavori_denti.sql:8 e
--   20260804150306_ondata_b_lavori_prescrizioni.sql:50-54, "FK COMPOSITA anti
--   cross-tenant").
-- IMPORTANTE 3 — le prove di rifiuto sull'invariante vivono in
--   scripts/tmp/sonda-intervento-fix-r-p1.mjs (transazione annullata, mai una
--   migration): R-P1 vieta di registrare un vincolo che aborta come migration.
-- IMPORTANTE 4 — indici mancanti, sotto.

-- ============================================================================
-- CRITICO 2 — FK COMPOSITE anti cross-tenant
-- ============================================================================

-- Il supporto per le FK composite verso eventi_qualita (modello lavori_id_lab_uk,
-- 20260727120000:8; lavori_immagini_id_lab_uk, 20260804150306:8).
ALTER TABLE public.eventi_qualita
  ADD CONSTRAINT eventi_qualita_id_lab_uk UNIQUE (id, laboratorio_id);

-- eventi_qualita.lavoro_id → lavori: la FK semplice permetteva al laboratorio A di
-- puntare a un lavoro del laboratorio B (lavori_id_lab_uk esiste già da 20260727120000).
ALTER TABLE public.eventi_qualita
  DROP CONSTRAINT eventi_qualita_lavoro_id_fkey,
  ADD CONSTRAINT eventi_qualita_lavoro_fk FOREIGN KEY (lavoro_id, laboratorio_id)
    REFERENCES public.lavori (id, laboratorio_id);

-- valutazioni_evento.evento_id → eventi_qualita: stessa classe di difetto.
-- Effetto collaterale VOLUTO (verificato sotto, IMPORTANTE 3 test b/c): con questa FK,
-- ogni valutazione che punta a un dato evento_id eredita per forza il laboratorio_id
-- di quell'evento — quindi valutazione_viva_unique (laboratorio_id, evento_id) non
-- può più essere aggirato da due laboratori diversi sullo stesso evento_id, perché
-- il laboratorio_id non è più libero di variare a parità di evento_id.
ALTER TABLE public.valutazioni_evento
  DROP CONSTRAINT valutazioni_evento_evento_id_fkey,
  ADD CONSTRAINT valutazioni_evento_evento_fk FOREIGN KEY (evento_id, laboratorio_id)
    REFERENCES public.eventi_qualita (id, laboratorio_id);

-- lavori_rifacimenti.evento_id → eventi_qualita: stessa classe di difetto.
ALTER TABLE public.lavori_rifacimenti
  DROP CONSTRAINT lavori_rifacimenti_evento_id_fkey,
  ADD CONSTRAINT lavori_rifacimenti_evento_fk FOREIGN KEY (evento_id, laboratorio_id)
    REFERENCES public.eventi_qualita (id, laboratorio_id);

-- ============================================================================
-- CRITICO 1 — service_role nel REVOKE + funzione SECURITY DEFINER per "superare"
-- ============================================================================

-- ⚠️ E8 — service_role va nella lista del REVOKE, esattamente come già documentato
-- in 20260721090000_parete_cassette.sql:126-139 e già applicato in
-- 20260804150306_ondata_b_lavori_prescrizioni.sql:79. Le default privileges di
-- Supabase (`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO
-- postgres, anon, authenticated, service_role`) danno a service_role UPDATE/DELETE
-- dal CREATE TABLE, e service_role ha bypassrls: la RLS non lo ferma. La migration
-- 20260806140823 revocava UPDATE/DELETE solo da anon, authenticated — questa la
-- chiude anche per service_role.
REVOKE UPDATE, DELETE ON public.valutazioni_evento FROM anon, authenticated, service_role;

-- Con service_role senza UPDATE, "superare" una valutazione (superata = true) non si
-- può più fare da client: serve una funzione SECURITY DEFINER, stesso trattamento di
-- sicurezza delle altre RPC del progetto (modello: consegna_finalizza_atomica,
-- 20260710091500).
CREATE OR REPLACE FUNCTION public.valutazione_supera(
  p_valutazione_vecchia_id uuid, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE public.valutazioni_evento
     SET superata = true
   WHERE id = p_valutazione_vecchia_id
     AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN json_build_object('esito', 'non_trovata');
  END IF;
  RETURN json_build_object('esito', 'ok');
END;
$$;

REVOKE ALL ON FUNCTION public.valutazione_supera(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.valutazione_supera(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.valutazione_supera(uuid, uuid) IS
  'Unica via per marcare superata=true su valutazioni_evento dopo il REVOKE UPDATE '
  '(service_role compreso, E8). SECURITY DEFINER, scrive solo sulla riga del '
  'laboratorio chiamante.';

-- ============================================================================
-- IMPORTANTE 4 — indici mancanti
-- ============================================================================

-- Lo storico completo di un evento (tutte le valutazioni, superate comprese) oggi fa
-- scansione sequenziale: l'unico indice esistente (valutazione_viva_unique) è
-- parziale su superata = false.
CREATE INDEX IF NOT EXISTS valutazioni_evento_lab_evento_idx
  ON public.valutazioni_evento (laboratorio_id, evento_id);

CREATE INDEX IF NOT EXISTS lavori_rifacimenti_evento_idx
  ON public.lavori_rifacimenti (evento_id);
