// Ondata 1 (spec sp.3 §1 + review finale item 4, ratifica Francesco 12/07):
// il predicato «questa route è migrata a v3» decideva da solo, duplicato
// dentro `BottomNavPill.tsx` (P9), se la bottom nav legacy si ritira. Estratto
// qui perché `UserProfileSheet.tsx` deve ritirarsi con lo STESSO
// comportamento (l'avatar top-right è ridondante col ☰ TastoTondo della home
// v3 — il mockup `home.html` non lo prevede su quelle route). Confronto
// ESATTO (non prefix) su `ROUTE_MIGRATE_V3`, ESATTO anche su `/lavori`.
// `/lavori/nuovo` è v3 da Ondata 2 (Task 8: il wizard `WizardNuovoLavoro`
// sostituisce integralmente il form multi-tab v2.3) — le altre sotto-route di
// `/lavori` (es. `/lavori/[id]`) restano v2.3.
export const ROUTE_MIGRATE_V3 = ['/dashboard', '/tutto-il-resto', '/lavori/nuovo']

export function isV3MigratedRoute(pathname: string): boolean {
  return ROUTE_MIGRATE_V3.includes(pathname) || pathname === '/lavori'
}
