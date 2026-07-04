-- ua-app/supabase/migrations/20260704160000_security_hardening_rls_tables.sql
-- Security Advisor ERROR: rls_disabled_in_public.
-- postgres (owner _audit_trigger_fn) e service_role (unico client applicativo
-- per queste 3 tabelle) hanno rolbypassrls=true — RLS deny-all non blocca
-- alcuna scrittura esistente (verificato 2026-07-04).

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_processors ENABLE ROW LEVEL SECURITY;
