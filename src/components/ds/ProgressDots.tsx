'use client'

// DS v3 §5.32 — ProgressDots: testata dei 3 passi di scelta del wizard
// (§7.3 dentista → tipo lavoro → paziente). Fonte di verità visiva:
// wizard.html:84-91 classe `.dots .dot` — valori copiati VERBATIM da lì.
//
// I 3 dot rappresentano UN'unica informazione (a che punto siamo): il
// contenitore porta `role="img"` + `aria-label`, i singoli dot sono
// decorativi (`aria-hidden`) — uno screen reader legge una frase, non 3
// elementi separati.
//
// ── Due componenti, non uno parametrico (Task 14) ────────────────────────
// Questo file esporta ANCHE `ProgressDotsStanze`, la variante «stanze»
// (§5.32, emendamento 20/07): i dots della home a due stanze. Non è una
// prop in più su `ProgressDots`, è un secondo componente, perché le due
// forme non condividono NULLA della resa: il wizard è UNA informazione non
// interattiva (`role="img"`, 3 span decorativi), le stanze sono DUE
// controlli veri (`role="tablist"`, 2 `<button role="tab">` che navigano).
// Fonderle in un'unione discriminata avrebbe fatto pagare il rischio a
// `ProgressDots`, che è già in produzione nel wizard, senza guadagnare una
// riga di codice condivisa. Ciò che si condivide davvero — la geometria del
// pallino e la curva — vive nelle costanti qui sotto.

import { useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { cssEase } from '@/design-system/v3/motion'

const DIAMETRO = 11 // wizard.html:86 — 11px
const LARGHEZZA_ATTIVO = 30 // wizard.html:91 — 30px, il dot = rosso sanzionato (§7.3)
const GAP = 8 // wizard.html:84

/**
 * ProgressDots — dots del wizard (§5.32).
 *
 * `passo` è 1-indicizzato: i dot prima di `passo` sono «fatti» (verdi), il
 * dot `passo` è «attivo» (30px, rosso), quelli dopo sono «upcoming» (neutri).
 */
export function ProgressDots(props: { passo: 1 | 2 | 3 }) {
  const { passo } = props

  return (
    <div
      role="img"
      aria-label={`Passo ${passo} di 3`}
      style={{ display: 'flex', alignItems: 'center', gap: GAP }}
    >
      {[1, 2, 3].map((indice) => {
        const attivo = indice === passo
        const fatto = indice < passo
        const background = attivo ? 'var(--red)' : fatto ? 'var(--green)' : 'var(--line)'
        return (
          <span
            key={indice}
            aria-hidden="true"
            style={{
              width: attivo ? LARGHEZZA_ATTIVO : DIAMETRO,
              height: DIAMETRO,
              borderRadius: 999,
              background,
              transition: cssEase.dots,
            }}
          />
        )
      })}
    </div>
  )
}

// Touch target di legge (§12): 44px pieni per ciascun dot. È il motivo per cui i pallini
// stanno più larghi che nel mockup statico — lì erano decorazione, qui sono due controlli.
const HIT_AREA = 44

/** L'id del tab che etichetta un pannello-stanza. Vive qui (non nel chiamante) perché il
 *  legame `aria-controls`/`aria-labelledby` è a due teste: derivarlo due volte lo farebbe
 *  divergere al primo rinominare. */
export function idTabStanza(idPannello: string): string {
  return `${idPannello}-tab`
}

/**
 * ProgressDotsStanze — variante «stanze» di §5.32 (Task 14).
 *
 * Due dot = due stanze della home. A differenza del wizard NON è un'informazione ma un
 * comando: `role="tablist"` con due `role="tab"` veri, `aria-selected`, roving tabindex e
 * frecce ←→ (↑↓ come sinonimi). Ai bordi non avvolge: oltre l'ultima stanza non c'è nulla,
 * esattamente come lo swipe che sbatte sul bordo del pager.
 *
 * `onSceglie` distingue l'origine perché il FOCUS deve comportarsi in modo diverso:
 * - `'tap'` → il chiamante porta il focus dentro la stanza entrante (chi tocca il dot vuole
 *   entrarci);
 * - `'freccia'` → il focus resta sui dots (qui lo spostiamo noi sull'altro dot), altrimenti
 *   chi naviga da tastiera resterebbe chiuso nella stanza in cui è appena entrato, senza un
 *   modo ovvio di tornare indietro.
 *
 * Il pallino attivo è in `--ink`, MAI in `--red`: in home il rosso pieno è del TastoPiù e di
 * nessun altro (§3.3 regola 1). Geometria e curva sono quelle del wizard — stessa famiglia.
 */
export function ProgressDotsStanze(props: {
  etichetta: string
  etichette: readonly [string, string]
  idPannelli: readonly [string, string]
  attiva: 0 | 1
  onSceglie: (indice: 0 | 1, origine: 'tap' | 'freccia') => void
}) {
  const { etichetta, etichette, idPannelli, attiva, onSceglie } = props
  const riferimenti = useRef<Array<HTMLButtonElement | null>>([null, null])

  function handleKeyDown(evento: ReactKeyboardEvent<HTMLButtonElement>, indice: 0 | 1) {
    const avanti = evento.key === 'ArrowRight' || evento.key === 'ArrowDown'
    const indietro = evento.key === 'ArrowLeft' || evento.key === 'ArrowUp'
    if (!avanti && !indietro) return
    const destinazione = avanti ? indice + 1 : indice - 1
    if (destinazione < 0 || destinazione > 1) return
    evento.preventDefault()
    const prossima = destinazione as 0 | 1
    // Prima il focus, poi l'annuncio: il nodo è lo stesso dopo il re-render del chiamante,
    // quindi il focus non si perde e il roving tabindex si aggiorna sotto di lui.
    riferimenti.current[prossima]?.focus()
    onSceglie(prossima, 'freccia')
  }

  return (
    <>
      <style>{`
        .ds-dot-stanza:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: -6px;
          border-radius: 999px;
        }
      `}</style>
      <div
        role="tablist"
        aria-label={etichetta}
        aria-orientation="horizontal"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {([0, 1] as const).map((indice) => {
          const eAttiva = indice === attiva
          return (
            <button
              key={idPannelli[indice]}
              type="button"
              role="tab"
              id={idTabStanza(idPannelli[indice])}
              className="ds-dot-stanza"
              aria-selected={eAttiva}
              aria-controls={idPannelli[indice]}
              aria-label={etichette[indice]}
              tabIndex={eAttiva ? 0 : -1}
              ref={(nodo) => {
                riferimenti.current[indice] = nodo
              }}
              onClick={() => onSceglie(indice, 'tap')}
              onKeyDown={(evento) => handleKeyDown(evento, indice)}
              style={{
                minWidth: HIT_AREA,
                minHeight: HIT_AREA,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: eAttiva ? LARGHEZZA_ATTIVO : DIAMETRO,
                  height: DIAMETRO,
                  borderRadius: 999,
                  background: eAttiva ? 'var(--ink)' : 'var(--line)',
                  transition: cssEase.dots,
                }}
              />
            </button>
          )
        })}
      </div>
    </>
  )
}
