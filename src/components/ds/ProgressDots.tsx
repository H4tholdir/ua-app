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
// ── La variante «stanze» (Task 14 → morta, QA device D3) ─────────────────
// Questo file esportava ANCHE `ProgressDotsStanze` + `idTabStanza`, i dots
// delle due stanze della home (§5.32, emendamento 20/07, `role="tablist"`
// con due `role="tab"` veri). QA device (verbale 25/07, fix-list D3,
// decisione RATIFICATA): i dot indicatore vengono rimossi del tutto, da
// entrambi i lati del pager — componente, markup, stili e handler dedicati
// (frecce ←→, roving tabindex) muoiono con loro. Il percorso da tastiera
// equivalente NON torna a un indicatore visivo: resta la linguetta «Le
// cassette» (pile→parete, `LinguettaCassette.tsx` — un `<button>` vero,
// focusabile e attivabile da tastiera come qualunque altro) e il tasto
// «‹ Indietro» dell'header della parete (parete→pile, già un `<button>` nel
// chrome di pagina — v. `StanzePager.tsx`/`PareteClient.tsx`). LIMITE NOTO
// (non risolto qui, la policy linguetta è fuori scope del brief FIX-E): la
// linguetta è transitoria — visibile ~5s per apparizione e mai più dopo 3
// accessi riusciti (`ACCESSI_APPRESA`, `LinguettaCassette.tsx`) — quindi il
// percorso da tastiera verso la parete è garantito SOLO mentre lei è in
// vista, non un accesso permanente. V. decision record 2026-07-25 per il
// resto delle regole CSS abrogate.

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

