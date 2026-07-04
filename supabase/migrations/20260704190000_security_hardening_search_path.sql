-- ua-app/supabase/migrations/20260704190000_security_hardening_search_path.sql
-- Security Advisor WARN: function_search_path_mutable su 33 funzioni
-- (36 meno le 3 eliminate nella migration precedente). Operazione additiva,
-- non tocca il body delle funzioni. Verificato (2026-07-04) che nessuna
-- referenzia oggetti fuori da `public` in modo non qualificato — i
-- riferimenti a vault./auth. nelle funzioni PEC/audit sono già
-- schema-qualificati nel body.

ALTER FUNCTION public.trigger_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_updated_at_trigger(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_progressivo(uuid, text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_lavoro_ritardo() SET search_path = public, pg_temp;
ALTER FUNCTION public.aggiorna_scorta_lotto() SET search_path = public, pg_temp;
ALTER FUNCTION public.calcola_bollo_fattura() SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_numero_lavoro(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_numero_fattura(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_numero_ddc(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.calcola_imponibile_lavoro(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.richiede_bollo(numeric, numeric, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_xml_fattura_pa(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.xmlescape(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_prrc_valido(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_paziente_nome_cognome() SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_refresh_dashboard() SET search_path = public, pg_temp;
ALTER FUNCTION public.assert_same_lab_lavoro() SET search_path = public, pg_temp;
ALTER FUNCTION public.assert_same_lab_lavoro_optional() SET search_path = public, pg_temp;
ALTER FUNCTION public.consegna_lavoro_lock(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.consegna_lavoro_lock(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_pec_password(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.assert_same_lab_rifacimento() SET search_path = public, pg_temp;
ALTER FUNCTION public.assert_same_lab_lavorazione() SET search_path = public, pg_temp;
ALTER FUNCTION public.crea_rifacimento_atomico(uuid, text, text, numeric, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_delete_laboratorio(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public._audit_trigger_fn() SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_pec_vault_secret(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_pec_vault_secret(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.decrementa_scorta(uuid, uuid, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.accept_invite_atomic(text, uuid, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.ricalcola_pagamento_fattura(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_ricalcola_pagamento_fattura() SET search_path = public, pg_temp;
