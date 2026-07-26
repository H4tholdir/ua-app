// Il colore della barra di stato di sistema E il fondo della superficie corrente.
// REGOLA ZERO: qui non si scrive nessun colore a mano — si deriva dai token v3.
// Se il fondo cambia, la barra cambia con lui: e' questa la relazione che la voce A5
// aveva perso quando il backlog aveva conservato un valore invece di una regola.
import { luce, notte } from '@/design-system/v3/tokens'

export const COLORE_BARRA = { light: luce.bg, dark: notte.bg } as const

export type TemaRisolto = 'light' | 'dark'

/**
 * Upsert del colore della barra di stato.
 *
 * Aggiorna il content di TUTTI i meta[name="theme-color"] presenti e ne crea uno
 * se non ce n'e' nessuno. Non e' pignoleria: l'ordine fra i tag emessi da Next e
 * lo script inline in <head> non e' un contratto (React solleva e riordina i meta
 * rispetto al JSX), quindi un querySelector che trova null sarebbe un no-op
 * silenzioso — funzionante in una build e rotto nell'altra.
 */
export function impostaColoreBarra(tema: TemaRisolto): void {
  const colore = tema === 'dark' ? COLORE_BARRA.dark : COLORE_BARRA.light
  const esistenti = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')

  if (esistenti.length === 0) {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', colore)
    document.head.appendChild(meta)
    return
  }

  esistenti.forEach(meta => meta.setAttribute('content', colore))
}
