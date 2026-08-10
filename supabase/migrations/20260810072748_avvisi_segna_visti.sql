-- supabase/migrations/20260810072748_avvisi_segna_visti.sql
-- Task 8 dell'ondata «l'avviso al dentista» — §2 del brief.
--
-- La migration precedente (20260809124517) ha tolto l'UPDATE di
-- `visto_dal_dentista_at` a OGNI ruolo dell'app, e ha dichiarato la via
-- d'uscita nel suo COMMENT: una funzione SECURITY DEFINER, modello
-- `valutazione_supera` (20260806142910). Questa migration la scrive.
--
-- 🔑 SEMANTICA: NULL→now(), MAI un timestamp fornito dal chiamante — la
-- ricevuta registra la PRIMA visione. Un secondo giro sullo stesso id non
-- riscrive nulla (prova nella FASE 6b/§2 e nel test d'integrazione gemello).
--
-- 🔴 LA FIRMA NON È SOLO `(p_ids uuid[])`, COME SUGGERIVA IL BRIEF — DEVIAZIONE
-- DICHIARATA, MOTIVATA NEL RESOCONTO. Il modello di casa (`valutazione_supera`)
-- scopa SEMPRE per laboratorio, anche quando l'id del chiamante basterebbe da
-- solo a isolare la riga giusta: è difesa in profondità, non ridondanza. Qui
-- gli id arrivano da una lettura già scoped per cliente+laboratorio
-- (`archivioCliente`), quindi il rischio pratico è basso — ma il costo di un
-- secondo parametro è zero, e allinea questa funzione all'UNICO precedente in
-- casa invece di re-interpretare da capo cosa "scoped abbastanza" voglia dire.
-- Il danno di un id fuori posto resterebbe comunque basso (marca "letto" un
-- avviso di un altro laboratorio, non rivela né altera nient'altro), ma non
-- c'è ragione di lasciarlo possibile quando costa un parametro.
--
-- 📌 IDIOMA: DROP -> CREATE -> REVOKE -> GRANT -> COMMENT, lo stesso delle
-- migration precedenti di quest'ondata. Il REVOKE è PORTANTE: dopo un
-- DROP+CREATE Postgres concede EXECUTE a PUBLIC.

DROP FUNCTION IF EXISTS public.avvisi_segna_visti(uuid[], uuid);

CREATE FUNCTION public.avvisi_segna_visti(
  p_ids uuid[], p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE public.avvisi_dentista
     SET visto_dal_dentista_at = now()
   WHERE id = ANY(p_ids)
     AND laboratorio_id = p_laboratorio_id
     AND visto_dal_dentista_at IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN json_build_object('esito', 'ok', 'aggiornati', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.avvisi_segna_visti(uuid[], uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.avvisi_segna_visti(uuid[], uuid) TO service_role;

COMMENT ON FUNCTION public.avvisi_segna_visti(uuid[], uuid) IS
  'Ricevuta di lettura del dentista (D332): scrive now() su visto_dal_dentista_at '
  'SOLO dove e'' NULL — la prima visione, mai riscritta. Unica via: l''UPDATE '
  'diretto della colonna non e'' concesso a nessun ruolo (migration 20260809124517). '
  'SECURITY DEFINER, scoped su laboratorio_id per difesa in profondita'' '
  '(modello: valutazione_supera, 20260806142910). Task 8 — sezione avvisi del portale.';
