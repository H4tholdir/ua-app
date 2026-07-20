// N13: route ESENTI dalla guard lab.stato — ogni riga ha un perché.
// Il test lab-guard-static.test.ts impone assertLabOperativo( in tutte le altre.
// Decisione ratificata: docs/design/decisions/2026-07-17-N13-N14-N11bis-ratifiche.md
//
// NOTA admin/*: le route admin NON sono esenti — chiamano la guard anche se
// verifyAdmin() garantisce admin_sistema (bypass by design nella matrice).
// Scelta deliberata di defense-in-depth: se un domani una route admin
// allargasse i ruoli ammessi, la guard è già in posizione.
export const LAB_GUARD_EXEMPT_ROUTES = [
  // Billing: devono restare raggiungibili proprio quando il lab NON è operativo
  // (riattivazione abbonamento). Self-check blacklist già presente nei file.
  'app/api/stripe/checkout/route.ts',
  'app/api/stripe/portal/route.ts',
  // Autenticata dalla firma Stripe, non da un utente
  'app/api/stripe/webhook/route.ts',
  // Flussi auth: precedono o costruiscono il contesto lab
  'app/api/auth/accept-invite/route.ts',
  'app/api/auth/webauthn/login/options/route.ts',
  'app/api/auth/webauthn/login/verify/route.ts',
  'app/api/auth/webauthn/register/options/route.ts',
  'app/api/auth/webauthn/register/verify/route.ts',
  // Portale token: guardia propria (blacklist→404 generico) in guardie.ts/route
  'app/api/portale/richiedi/route.ts',
  'app/api/portale/[token]/pin/route.ts',
  'app/api/portale/[token]/fatture/route.ts',
  'app/api/portale/[token]/fatturazione/route.ts',
  'app/api/portale/[token]/situazione/route.ts',
  'app/api/portale/[token]/fatturazione/stampa/route.ts',
  'app/api/portale/[token]/fatturazione/[lavoro_id]/route.ts',
  'app/api/portale/[token]/fatture/[fattura_id]/pdf/route.ts',
  'app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts',
  // Callback interna autenticata da x-internal-secret (confronto constant-time)
  'app/api/internal/pec-verify/route.ts',
  // Export GDPR/portabilità: canale in-band ratificato, resta aperto
  'app/api/fatture/export/route.ts',
  'app/api/lavori/export/route.ts',
] as const
