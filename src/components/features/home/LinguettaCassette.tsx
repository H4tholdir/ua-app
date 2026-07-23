'use client'

// Task 13 (D7, spec redesign §3.2, mockup C2 ratificato
// `docs/design/mockups/2026-07-23-invito-swipe-linguetta-rifinita.html`) — la linguetta
// «Le cassette»: linguetta verticale basso-destra, ~26px visivi + hit-area 44px (riserva UX
// 3a), appare quando `visibile` diventa true (al mount, o ogni volta che si torna sulla
// stanza Pile dentro il pager — il componente resta montato mentre l'utente naviga fra le
// stanze), resta ~5s, si ritira (molla `molla.smooth`; reduced-motion → dissolvenza). Si
// SPEGNE per sempre dopo 3 accessi riusciti alla parete (riserva UX 3b) —
// persistenza per-device in localStorage (nessuna migration, pattern `ua_sounds_v3`). Mai
// focus-steal (compare e sparisce da sola, non chiede mai focus); da ritirata esce
// dall'albero (unmount, non `display:none`/`visibility:hidden` — uno screen reader non deve
// mai incontrarla morta).
//
// Portale su `document.body` (riserva FE R5): il wrapper `container-type:size` della home
// (`.ua-home`) ne farebbe il containing block di un `position:fixed` e la clipperebbe dentro
// il frame della home invece che nel viewport reale.
//
// Wrapper `data-ds="v3"` (stesso pattern di `Sheet`/`PareteClient` — v. `ds-ghost`): l'attributo
// va su un ANTENATO separato, DENTRO il ramo condizionale di `AnimatePresence`, non su un
// contenitore sempre presente. Un wrapper sempre montato (anche a "0 contenuto", come il
// contenitore di `Avviso`) esisterebbe già al primo render client mentre il server — che non
// ha `document` — ha reso `null`: un mismatch di idratazione reale (v. commento SSR-safety in
// `Avviso.tsx`, QA T15). Qui il wrapper non serve da ancora persistente per una coda (a
// differenza di `Avviso`): esiste solo per lo scope CSS, quindi vive interamente dentro il
// ramo `visibile && inVista`, sparisce quando quel ramo sparisce, e non c'è nulla da
// idratare in più rispetto a ciò che il server ha reso.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { molla, useReducedMotion } from '@/design-system/v3/motion'

// QA device (verbale 25/07, fix-list D4, parte meccanica) — v3 era saturo (≥3 accessi) sui
// device usati nei collaudi: la linguetta non compariva più su NESSUN device di prova,
// apprendimento vero o no. Bump a v4: invalida i vecchi contatori senza toccare soglia (3),
// durata (5s) o policy — quella è una decisione di Francesco ancora da ratificare (fuori
// scope di questo fix, v. brief FIX-E).
const KEY = 'ua_linguetta_v4'
const ACCESSI_APPRESA = 3
const MS_IN_VISTA = 5000

/** True quando la linguetta ha già fatto il suo lavoro (≥3 accessi registrati): non compare
 *  più. Lettura difensiva — un `localStorage` inaccessibile (privato/quota) fa apparire la
 *  linguetta all'infinito, mai il contrario: innocuo, mai un blocco. */
export function linguettaAppresa(): boolean {
  try {
    return Number(localStorage.getItem(KEY) ?? '0') >= ACCESSI_APPRESA
  } catch {
    return false
  }
}

/** Registra un accesso riuscito alla stanza Parete (riserva UX 3b). Scrittura difensiva:
 *  smette di incrementare una volta appresa (nessun overflow silenzioso da centinaia di
 *  visite), e un errore di scrittura (privato/quota) non fa fallire nulla — la linguetta
 *  continuerà semplicemente a comparire. */
export function registraAccessoParete(): void {
  try {
    const n = Number(localStorage.getItem(KEY) ?? '0')
    if (n < ACCESSI_APPRESA) localStorage.setItem(KEY, String(n + 1))
  } catch {
    /* privato/quota: la linguetta continuerà a comparire — innocuo */
  }
}

export function LinguettaCassette(props: { onVai: () => void; visibile: boolean }) {
  // `inVista` NON si accende dentro un effect (un `setState` sincrono lì dentro innescherebbe
  // una cascata di render — `react-hooks/set-state-in-effect`, gate di lint di questo repo):
  // il valore al mount è già noto in anticipo (`visibile` + apprendimento), quindi entra come
  // inizializzatore pigro di `useState`. Il pager mantiene MONTATA la stessa istanza mentre
  // l'utente va avanti e indietro fra le stanze (`visibile` si limita a passare da true a
  // false e viceversa): l'aggiustamento AL CAMBIO di `visibile` — non al mount, quello è già
  // coperto sopra — è un confronto sincrono DURANTE il render con l'ultimo valore visto
  // (pattern React ufficiale «adjusting state when a prop changes», già in uso in questo
  // stesso pacchetto per `StanzaParete` in `StanzePager.tsx`), non un effect.
  const [inVista, setInVista] = useState(() => props.visibile && !linguettaAppresa())
  const [visibilePrecedente, setVisibilePrecedente] = useState(props.visibile)
  if (props.visibile !== visibilePrecedente) {
    setVisibilePrecedente(props.visibile)
    if (props.visibile) {
      if (!linguettaAppresa()) setInVista(true)
    } else {
      setInVista(false)
    }
  }

  const reduced = useReducedMotion()

  // Qui SOLO lo scheduling del ritiro: `setInVista(false)` vive dentro il CALLBACK del timer
  // (una reazione a un evento futuro esterno, il tempo che passa — il caso d'uso canonico di
  // un effect), non è una call sincrona nel corpo dell'effect stesso.
  useEffect(() => {
    if (!inVista) return
    const t = setTimeout(() => setInVista(false), MS_IN_VISTA)
    return () => clearTimeout(t)
  }, [inVista])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {props.visibile && inVista && (
        <div data-ds="v3" style={{ display: 'contents' }} key="linguetta-wrap">
          <motion.button
            type="button"
            className="ds-linguetta"
            initial={reduced ? { opacity: 0 } : { x: '110%' }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '110%' }}
            transition={molla.smooth}
            onClick={() => {
              registraAccessoParete()
              setInVista(false)
              props.onVai()
            }}
          >
            <span className="fre" aria-hidden="true">‹</span>
            <span className="mini-rete" aria-hidden="true" />
            <span className="eti">Le cassette</span>
          </motion.button>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
