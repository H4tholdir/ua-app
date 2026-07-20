// Ondata 1 (spec sp.3 §1 + review finale item 4, ratifica Francesco 12/07):
// il predicato «questa route è migrata a v3» decideva da solo, duplicato
// dentro `BottomNavPill.tsx` (P9), se la bottom nav legacy si ritira. Estratto
// qui perché `UserProfileSheet.tsx` deve ritirarsi con lo STESSO
// comportamento (l'avatar top-right è ridondante col ☰ TastoTondo della home
// v3 — il mockup `home.html` non lo prevede su quelle route). Confronto
// ESATTO (non prefix) su `ROUTE_MIGRATE_V3`, ESATTO anche su `/lavori`.
// `/lavori/nuovo` è v3 da Ondata 2 (Task 8: il wizard `WizardNuovoLavoro`
// sostituisce integralmente il form multi-tab v2.3).
//
// Polish Livello 1 (2026-07-14, ratifica Francesco): la scheda-vista v3
// `/lavori/[id]` (Ondata 3a) e la route-ponte `/lavori/[id]/modifica` sono ora
// v3 → avatar + BottomNavPill legacy si ritirano anche lì (su desktop la scheda
// rende il proprio rail). Il flusso di consegna vive in-place nella
// scheda/pile (ondata 16/07); la route `/consegna` è un semplice redirect →
// resta correttamente FUORI dal predicato. `SCHEDA_V3_RE` copre esattamente
// detail e ponte, mai `/consegna` né altre sotto-route: `[^/]+` è un singolo
// segmento (l'id), il gruppo `/modifica` è opzionale e chiuso da `$`.
//
// Task 11 (ondata A mini-triage): `/tecnici` migra integralmente a v3 come
// «Persone» (spec v3 §14: migrazione per route) → avatar + BottomNavPill
// legacy si ritirano anche lì.
export const ROUTE_MIGRATE_V3 = ['/dashboard', '/tutto-il-resto', '/lavori/nuovo', '/tecnici']

const SCHEDA_V3_RE = /^\/lavori\/[^/]+(\/modifica)?$/

export function isV3MigratedRoute(pathname: string): boolean {
  return ROUTE_MIGRATE_V3.includes(pathname) || pathname === '/lavori' || SCHEDA_V3_RE.test(pathname)
}
