-- ua-app/supabase/migrations/20260704180000_security_hardening_functions_revoke_drop.sql
-- Security Advisor WARN: 16 funzioni SECURITY DEFINER eseguibili da
-- anon/authenticated senza REVOKE esplicito. Trattamento in 3 categorie
-- (vedi design spec §3.3):
--   (a) 5 helper RLS: NON toccate in questa migration (current_lab_id,
--       get_lab_id, has_role, has_role_check, lab_is_accessible).
--   (b) 8 funzioni con caller solo service-role: REVOKE + GRANT service_role.
--   (c) 3 funzioni orfane confermate dead code: DROP.

-- (adozione) cleanup_expired_webauthn_challenges esisteva solo nel DB live,
-- mai in una migration tracciata. Ricreata identica (corpo invariato) per
-- chiudere il gap di tracciabilità prima di applicarle REVOKE.
CREATE OR REPLACE FUNCTION public.cleanup_expired_webauthn_challenges()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.webauthn_challenges WHERE expires_at < now();
$function$;

-- (b) REVOKE PUBLIC/anon/authenticated, GRANT solo service_role
REVOKE ALL ON FUNCTION public._audit_trigger_fn() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._audit_trigger_fn() TO service_role;

REVOKE ALL ON FUNCTION public.admin_delete_laboratorio(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_laboratorio(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_webauthn_challenges() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_webauthn_challenges() TO service_role;

REVOKE ALL ON FUNCTION public.consegna_lavoro_lock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consegna_lavoro_lock(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.consegna_lavoro_lock(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consegna_lavoro_lock(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.crea_rifacimento_atomico(uuid, text, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid, text, text, numeric, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_pec_password(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pec_password(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.refresh_dashboard_cache(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_cache(uuid) TO service_role;

-- (c) Dead code confermato (vedi spec §4 per le verifiche fatte con Francesco).
-- Rollback: definizioni complete in
-- ua-app/docs/superpowers/specs/2026-07-04-security-advisor-hardening-design.md §3.3.
DROP FUNCTION public.set_lab_claim(uuid);
DROP FUNCTION public.soft_delete_lavoro(uuid);
DROP FUNCTION public.stats_dashboard(uuid);
