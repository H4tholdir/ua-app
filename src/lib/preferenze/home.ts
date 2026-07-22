// src/lib/preferenze/home.ts
// Parsing difensivo della preferenza «La tua home» (colonna `utenti.nav_preferences`, Json).
// Scritta SOLO via RPC `utente_set_nav_pref` (route: src/app/api/impostazioni/preferenze/route.ts).
// Consumato in lettura dai Task 14 (home a due stanze), 15 (stanza Parete) e 17 (riga in
// /impostazioni).
export type HomePref = 'due_stanze' | 'pile' | 'parete'

const VALIDE: readonly HomePref[] = ['due_stanze', 'pile', 'parete']

/**
 * Validatore STRETTO per la scrittura (route PATCH): un valore fuori enum deve produrre un 422
 * esplicito. NON riusare `homePrefDa` per validare l'input in scrittura — la sua semantica di
 * default silenzioso a 'due_stanze' nasconderebbe l'errore invece di segnalarlo (avrebbe scritto
 * 'due_stanze' senza che l'utente l'avesse davvero scelto).
 */
export function isHomePref(v: unknown): v is HomePref {
  return typeof v === 'string' && (VALIDE as readonly string[]).includes(v)
}

/** Lettura difensiva (Task 14/15/17): default 'due_stanze' su null/garbage/valore ignoto. */
export function homePrefDa(navPreferences: unknown): HomePref {
  if (navPreferences && typeof navPreferences === 'object') {
    const v = (navPreferences as Record<string, unknown>).home
    if (isHomePref(v)) return v
  }
  return 'due_stanze'
}

/** Le due stanze della home (§6): le pile (che cosa urge) e la parete (dove stanno). */
export type StanzaHome = 'pile' | 'parete'

/** La forma che la home assume in QUESTA visita: il pager a due stanze, oppure una sola. */
export type VistaHome = { tipo: 'pager'; iniziale: StanzaHome } | { tipo: 'sola'; stanza: StanzaHome }

/**
 * La vista risolta (Task 14) — UNA sola regola, letta sia da `dashboard/page.tsx` (che decide
 * se leggere la parete) sia da `HomeV3` (che decide che cosa rendere). Tenerle separate le
 * farebbe divergere: la home renderebbe una stanza Parete con dati mai letti, cioè un muro
 * vuoto che mente.
 *
 * `?stanza=` (deep-link, ADR B6 server-driven) vince SEMPRE sulla preferenza, per la durata della
 * visita: spec §7 lo definisce «la garanzia che NESSUNA stanza è mai irraggiungibile», e una
 * garanzia che vale solo finché nessuno la esercita non è una garanzia. Scartare la richiesta in
 * silenzio — la home di sempre, nessun messaggio — è il modo di fallire che l'ADR B6 esiste per
 * impedire.
 * - `due_stanze` → apre il pager sulla stanza chiesta;
 * - `parete` + `?stanza=pile` → porta alle pile (che sono SEMPRE lette: servono a
 *   `scegliSegnale` e a `HomeDesktop`);
 * - `pile` + `?stanza=parete` → **il pager, posizionato sulla parete**, non la sola parete.
 *   Chi ha scelto «solo le pile» non ha, in home, alcuna via verso la parete — e la voce
 *   «I lavori» che riporta alle pile esiste solo per chi ha preferenza `parete` (§7, Task 15).
 *   Dandogli la sola stanza parete lo si chiuderebbe in una visita senza ritorno; col pager la
 *   via di casa è a uno swipe, e non dipende da un altro task.
 *   Sul costo di `getParete` (3 query + eventuali RPC di auto-riparazione): l'auto-riparazione
 *   parte SOLO per righe vive il cui lavoro è già chiuso, è convergente, ed è la stessa che gira
 *   a ogni apertura di `/cassette` — raggiungibile dalla voce fissa «Le cassette» da qualunque
 *   home. Non è una scrittura che si evita non leggendo qui.
 */
export function vistaHome(pref: HomePref, stanzaParam?: string | null): VistaHome {
  const chiesta: StanzaHome | null = stanzaParam === 'pile' || stanzaParam === 'parete' ? stanzaParam : null
  if (pref === 'due_stanze') return { tipo: 'pager', iniziale: chiesta ?? 'pile' }
  if (pref === 'pile') return chiesta === 'parete' ? { tipo: 'pager', iniziale: 'parete' } : { tipo: 'sola', stanza: 'pile' }
  return { tipo: 'sola', stanza: chiesta ?? 'parete' }
}

/** La parete si legge SOLO se una stanza Parete viene davvero resa (v. `vistaHome`). */
export function serveParete(vista: VistaHome): boolean {
  return vista.tipo === 'pager' || vista.stanza === 'parete'
}

/** Lettura difensiva del flag «intro Parete già vista» (Task 15): false di default, true SOLO
 *  se il valore booleano `true` è esplicitamente presente. */
export function pareteIntroVista(navPreferences: unknown): boolean {
  return !!(
    navPreferences &&
    typeof navPreferences === 'object' &&
    (navPreferences as Record<string, unknown>).parete_intro_vista === true
  )
}
