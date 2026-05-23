# Tenant Isolation
**Carica quando:** task tocca RLS, service_role, cross-tenant, laboratorio_id, getServiceClient, getServerUserClient.

## File chiave
- `supabase/schema.sql` — `current_lab_id()` SECURITY DEFINER, `lab_is_accessible()`
- `supabase/migrations/MANUAL_000_auth_helpers.sql` — perché la funzione è in schema `public` (non `auth`)
- `src/lib/supabase/server-service.ts` — `getServiceClient()` con SUPABASE_SERVICE_ROLE_KEY (bypassa RLS)
- `src/lib/supabase/server-user.ts` — `getServerUserClient()` con anon key (RLS attiva)
- `src/app/(app)/layout.tsx` — cross-tenant guard all'ingresso di ogni route protetta

## Invariante critica
`service_role` bypassa RLS completamente. Ogni route API che usa `getServiceClient()` DEVE fare un cross-tenant guard esplicito nel codice TypeScript: `.eq('laboratorio_id', utente.laboratorio_id)`.
Mancante → un utente autenticato può leggere/scrivere dati di un altro lab. Security breach.

## Regole operative
- `public.current_lab_id()` — NON `auth.current_lab_id()`. La funzione è in schema `public` per compatibilità con le RLS policy
- `SECURITY DEFINER` su funzioni PL/pgSQL: `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT` esplicito solo a `service_role`
- Pattern obbligatorio: `utenti → laboratorio_id → .eq('laboratorio_id', lab_id) → operazione`
- Child tables (es. `lavoro_prove`): anche le query child devono filtrare per `laboratorio_id`, non solo la parent

## Issue nota (Codex)
`prove/route.ts` fa guard sul parent `lavori` per lab, poi fetcha `lavoro_prove` solo per `lavoro_id` — manca il filtro `laboratorio_id` sulla child table.
