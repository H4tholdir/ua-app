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
// ramo condizionale, sparisce quando quel ramo sparisce, e non c'è nulla da idratare in più
// rispetto a ciò che il server ha reso.
//
// Task H4a (F2 «impara e si assottiglia» + T2, ratifica Francesco al ri-collaudo #3, verbale
// `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` §H4, mockup
// `docs/design/mockups/2026-07-25-linguetta-e-piede-proposte.html` variante F2+T2, valori
// verbatim) — cambia la SEMANTICA di «appresa»: prima si spegneva per sempre dopo 3 accessi
// riusciti, ORA non sparisce più — si assottiglia a un filo rosso, sempre presente e sempre
// tappabile (hit-area 44px invariata). Il conteggio stesso (chiave, soglia, persistenza
// per-device) resta l'INVARIATO `linguettaAppresa`/`registraAccessoParete` sotto: cambia solo
// cosa succede quando `linguettaAppresa()` è vero (rendering «filo», non più `null`).
//
// NOTA per chi tocca questo file: il brief H4a indica `src/lib/preferenze/segna-parete-intro.ts`
// come sede del conteggio da adeguare — verificato che NON è così: quel file è una PATCH
// fire-and-forget per una preferenza server-side scorrelata («intro Parete vista»), il
// conteggio dei 3 passaggi vive qui (`KEY`, `ACCESSI_APPRESA`, `linguettaAppresa`,
// `registraAccessoParete`, sotto) fin dal Task 13/QA D4. Editato qui, non lì.
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

/** True quando la linguetta ha già fatto il suo lavoro (≥3 accessi registrati). Da Task H4a
 *  (F2) NON significa più «non compare più»: significa «da qui in poi si mostra come filo»
 *  (v. `calcolaModo`, sotto) — il nome è rimasto perché il fatto che descrive («soglia
 *  raggiunta») non è cambiato, solo la sua conseguenza. Lettura difensiva — un `localStorage`
 *  inaccessibile (privato/quota) fa restare la linguetta in fase piena all'infinito, mai il
 *  contrario: innocuo, mai un blocco. */
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

/** I tre stati della linguetta (Task H4a, F2 «impara e si assottiglia»):
 *  - `nascosta`  — fuori dall'albero (non sulla stanza Pile, o ritirata dopo i 5s di `piena`).
 *  - `piena`     — resa T2 completa (freccia + decorazione + etichetta), come oggi ma 34px.
 *  - `filo`      — dal 4° passaggio riuscito: assottigliata, sempre presente, mai temporizzata. */
type Modo = 'nascosta' | 'piena' | 'filo'

function calcolaModo(visibile: boolean): Modo {
  if (!visibile) return 'nascosta'
  return linguettaAppresa() ? 'filo' : 'piena'
}

export function LinguettaCassette(props: { onVai: () => void; visibile: boolean }) {
  // `modo` NON si accende dentro un effect (un `setState` sincrono lì dentro innescherebbe
  // una cascata di render — `react-hooks/set-state-in-effect`, gate di lint di questo repo):
  // il valore al mount è già noto in anticipo (`visibile` + apprendimento), quindi entra come
  // inizializzatore pigro di `useState`. Il pager mantiene MONTATA la stessa istanza mentre
  // l'utente va avanti e indietro fra le stanze (`visibile` si limita a passare da true a
  // false e viceversa): l'aggiustamento AL CAMBIO di `visibile` — non al mount, quello è già
  // coperto sopra — è un confronto sincrono DURANTE il render con l'ultimo valore visto
  // (pattern React ufficiale «adjusting state when a prop changes», già in uso in questo
  // stesso pacchetto per `StanzaParete` in `StanzePager.tsx`), non un effect. `calcolaModo`
  // rilegge `linguettaAppresa()` ad OGNI ritorno sulla stanza Pile: è così che la migrazione
  // «chi ha già superato i 3 accessi vede direttamente il filo» funziona senza reset — il
  // contatore non cambia mai qui dentro, cambia solo l'interpretazione del suo valore.
  const [modo, setModo] = useState<Modo>(() => calcolaModo(props.visibile))
  const [visibilePrecedente, setVisibilePrecedente] = useState(props.visibile)
  if (props.visibile !== visibilePrecedente) {
    setVisibilePrecedente(props.visibile)
    setModo(calcolaModo(props.visibile))
  }

  const reduced = useReducedMotion()

  // Il ritiro a ~5s vale SOLO per la fase `piena` (comportamento preservato, il mockup F2 non
  // lo tocca — la fase piena resta identica a prima, solo più larga/T2). Il `filo` non
  // programma alcun timer: resta finché `visibile` non torna false (mai sparita, F2). Qui SOLO
  // lo scheduling: `setModo('nascosta')` vive dentro il CALLBACK del timer (una reazione a un
  // evento futuro esterno, il tempo che passa — il caso d'uso canonico di un effect), non è
  // una call sincrona nel corpo dell'effect stesso.
  useEffect(() => {
    if (modo !== 'piena') return
    const t = setTimeout(() => setModo('nascosta'), MS_IN_VISTA)
    return () => clearTimeout(t)
  }, [modo])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {modo !== 'nascosta' && (
        <div data-ds="v3" style={{ display: 'contents' }} key="linguetta-wrap">
          <motion.button
            type="button"
            className={modo === 'filo' ? 'ds-linguetta is-filo' : 'ds-linguetta'}
            aria-label="Le cassette"
            initial={reduced ? { opacity: 0 } : { x: '110%' }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '110%' }}
            transition={molla.smooth}
            onClick={() => {
              registraAccessoParete()
              setModo('nascosta')
              props.onVai()
            }}
          >
            {modo === 'piena' && (
              <>
                <span className="fre" aria-hidden="true">‹</span>
                <span className="mini-rete" aria-hidden="true" />
                <span className="eti">Le cassette</span>
              </>
            )}
          </motion.button>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
