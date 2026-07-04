-- ua-app/supabase/migrations/20260704170000_security_hardening_views_invoker.sql
-- Security Advisor ERROR: security_definer_view su 7 viste.
-- Le viste filtrano già current_lab_id() internamente; nessun consumer
-- applicativo le usa oggi (verificato via grep in ua-app/src), zero rischio
-- di rottura.

ALTER VIEW public.lavori_dashboard SET (security_invoker = on);
ALTER VIEW public.fatture_da_inviare SET (security_invoker = on);
ALTER VIEW public.magazzino_sotto_scorta SET (security_invoker = on);
ALTER VIEW public.dichiarazioni_in_scadenza SET (security_invoker = on);
ALTER VIEW public.tracciabilita_lotto SET (security_invoker = on);
ALTER VIEW public.partitario_clienti SET (security_invoker = on);
ALTER VIEW public.statistiche_mensili SET (security_invoker = on);
