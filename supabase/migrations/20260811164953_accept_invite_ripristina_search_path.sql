-- ═══ PERCHÉ QUESTA MIGRATION ═════════════════════════════════════════════════
-- `CREATE OR REPLACE FUNCTION` SCARTA i SET applicati con ALTER: la
-- 20260811162235 ha ridefinito `accept_invite_atomic` (fallimento pulito sul
-- cambio lab di chi ha firmato) e, ricopiando il corpo di B7 (20260703130000,
-- che il pin non l'aveva inline), ha PERSO IN SILENZIO il
-- `SET search_path = public, pg_temp` che l'hardening 20260704190000 aveva
-- agganciato proprio a questa funzione con ALTER FUNCTION.
-- `provato:` ri-revisione finale dell'11/08/2026, catalogo vivo:
-- `prosecdef = true, proconfig = null`.
--
-- Sfruttabilità bassa (EXECUTE revocato a PUBLIC/anon/authenticated; chiama
-- solo service_role da rotta controllata) ma è la regressione muta di un
-- controllo di sicurezza esplicito su una SECURITY DEFINER del dominio auth:
-- si ripristina, e la prova che RESTI agganciato vive nel test ④ di
-- tests/integration/accept-invite-firma-intrasferibile.rpc.test.ts — così la
-- trappola «CREATE OR REPLACE mangia gli ALTER» non può ripetersi in silenzio
-- su questa funzione.
--
-- 🔑 Lezione per le prossime redefinizioni: le tre SECURITY DEFINER più
-- recenti dichiarano il search_path INLINE nella definizione (20260806170700,
-- 20260809133546, 20260810072748) — è la forma che sopravvive al replace.

ALTER FUNCTION public.accept_invite_atomic(text, uuid, text, text, text)
  SET search_path = public, pg_temp;
