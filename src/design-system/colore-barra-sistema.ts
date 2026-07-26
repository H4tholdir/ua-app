// Il colore della barra di stato di sistema E il fondo della superficie corrente.
// REGOLA ZERO: qui non si scrive nessun colore a mano — si deriva dai token v3.
// Se il fondo cambia, la barra cambia con lui: e' questa la relazione che la voce A5
// aveva perso quando il backlog aveva conservato un valore invece di una regola.
//
// Chi lo consuma: la stringa SCRIPT_TEMA di ThemeInitializer.tsx, che interpola
// questi due valori. Non esiste (e non deve esistere) una seconda implementazione
// TypeScript dell'upsert: lo script inline non puo' importare moduli, quindi una
// funzione gemella qui sarebbe codice morto che diverge in silenzio da quello vero.
import { luce, notte } from '@/design-system/v3/tokens'

export const COLORE_BARRA = { light: luce.bg, dark: notte.bg } as const

// I valori finiscono INTERPOLATI dentro apici singoli nel sorgente di uno script
// iniettato con dangerouslySetInnerHTML. Un valore con un apice, un backslash o
// '</script' produrrebbe un errore di sintassi che il try/catch dello script NON
// puo' catturare — uccide lo script che lo contiene, e la rottura resta muta.
// Questo controllo trasforma quel guasto silenzioso in un fallimento di build.
const ESADECIMALE = /^#[0-9A-Fa-f]{6}$/
for (const valore of Object.values(COLORE_BARRA)) {
  if (!ESADECIMALE.test(valore)) {
    throw new Error(
      `COLORE_BARRA: «${valore}» non e' interpolabile in sicurezza nello script inline (atteso #RRGGBB)`,
    )
  }
}
