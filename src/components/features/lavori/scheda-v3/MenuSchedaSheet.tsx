'use client'

// Ondata 3a Task 4 — MenuSchedaSheet: lo `Sheet` del menu ⋯ della scheda-vista
// v3 (§7.1, 6 voci). Le 4 voci "pesanti" (Prezzi e lavorazioni, Dati clinici,
// Prove, Foto) non hanno ancora un editor dedicato in questa ondata: navigano
// tutte al ponte `/lavori/{id}/modifica?tab=…` (Task 9, `router.push` — mai un
// editor duplicato qui). Documenti resta nella pagina corrente: apre il suo
// proprio Sheet nel padre (Task 6/7), quindi chiama `onApriDocumenti()` invece
// di navigare. Annulla lavoro (DEVIAZIONE dal piano, vedi mockup
// `scheda-lavoro.html` §7.1: un dispositivo su misura tracciato MDR non si
// "butta via", si annulla — la tracciabilità resta) non ha ancora un backend
// in questa ondata (YAGNI): renderizzata SEMPRE `disabled`, nessun handler,
// nota "prossimamente" a spiegare perché è spenta piuttosto che lasciarla
// muta.

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ds/Sheet'
import { MenuVoce } from '@/components/ds/MenuVoce'
import { spazio } from '@/design-system/v3/tokens'

/** Contesto passato a `azione` di ogni voce — `push` verso il ponte di
 * modifica (Task 9) e `onApriDocumenti` per l'unica voce che resta in pagina. */
type ContestoAzione = { push: (url: string) => void; onApriDocumenti: () => void }

type Voce = {
  chiave: string
  etichetta: string
  icona: ReactNode
  disabilitata?: boolean
  nota?: string
  /** Assente per «Annulla lavoro» (disabilitata, nessun handler — YAGNI, niente backend). */
  azione?: (ctx: ContestoAzione) => void
}

/** Costruisce l'`azione` delle 4 voci "pesanti": tutte condividono lo stesso
 * `router.push` verso il ponte `/lavori/{id}/modifica`, cambia solo il tab. */
function versoPonte(lavoroId: string, tab: string): (ctx: ContestoAzione) => void {
  return ({ push }) => push(`/lavori/${lavoroId}/modifica?tab=${tab}`)
}

// Path grezzi, copiati VERBATIM dal mockup approvato
// (`docs/design/mockups/2026-07-09-il-cuore/scheda-lavoro.html:561-584`, la
// classe `.menu-voce .mi svg` porta lì stroke/fill/linecap/linejoin — qui
// invece questi attributi vivono UNA volta sola sul tag `<svg>` in
// `renderIcona` (sotto), i path restano solo geometria, senza ripetere gli
// stessi 4 attributi 6 volte.
function costruisciVoci(lavoroId: string): Voce[] {
  return [
    {
      chiave: 'lavorazioni',
      etichetta: 'Prezzi e lavorazioni',
      azione: versoPonte(lavoroId, 'lavorazioni'),
      icona: (
        <>
          <path d="M12 2v20" />
          <path d="M17 5.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 3 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3" />
        </>
      ),
    },
    {
      chiave: 'clinica',
      etichetta: 'Dati clinici',
      azione: versoPonte(lavoroId, 'clinica'),
      icona: (
        <>
          <path d="M8 3v3M16 3v3" />
          <path d="M4 8h16" />
          <rect x="4" y="6" width="16" height="15" rx="2.5" />
          <path d="M9 13l2 2 4-4" />
        </>
      ),
    },
    {
      chiave: 'prove',
      etichetta: 'Prove',
      azione: versoPonte(lavoroId, 'prove'),
      icona: (
        <>
          <path d="M20 7h-3.5l-1-2h-7l-1 2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
          <circle cx="12" cy="13.5" r="3.2" />
        </>
      ),
    },
    {
      chiave: 'immagini',
      etichetta: 'Foto',
      azione: versoPonte(lavoroId, 'immagini'),
      icona: (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <circle cx="8.5" cy="9.5" r="1.8" />
          <path d="M21 16l-5-5-9 9" />
        </>
      ),
    },
    {
      chiave: 'documenti',
      etichetta: 'Documenti',
      azione: ({ onApriDocumenti }) => onApriDocumenti(),
      icona: (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h6" />
        </>
      ),
    },
    {
      chiave: 'annulla',
      etichetta: 'Annulla lavoro',
      disabilitata: true,
      nota: 'Prossimamente',
      icona: (
        <>
          <path d="M4 7h16" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
          <path d="M10 11v6M14 11v6" />
        </>
      ),
    },
  ]
}

/**
 * MenuSchedaSheet — lo `Sheet` del menu ⋯ (§7.1, `docs/design/mockups/2026-07-09-il-cuore/scheda-lavoro.html`).
 * 6 voci, guidate da `costruisciVoci` invece di 6 blocchi copiati: le 4
 * pesanti condividono lo stesso `router.push` verso il ponte (`versoPonte`),
 * cambia solo il tab; Documenti e Annulla sono i due rami "speciali"
 * (callback locale / nessuna `azione`, disabilitata) espressi con lo stesso
 * shape `Voce`.
 */
export function MenuSchedaSheet(props: {
  aperto: boolean
  onChiudi: () => void
  lavoroId: string
  onApriDocumenti: () => void
}) {
  const { aperto, onChiudi, lavoroId, onApriDocumenti } = props
  const router = useRouter()
  const voci = costruisciVoci(lavoroId)

  function gestisciClick(voce: Voce) {
    voce.azione?.({ push: router.push, onApriDocumenti })
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {voci.map((voce, indice) => (
          <div
            key={voce.chiave}
            style={{
              // Separatori POSIZIONALI del contenitore (v. MenuVoce): riga fra
              // le voci standard; il gruppo «butta» (Annulla) si stacca sopra.
              borderBottom: indice < voci.length - 1 && !voce.disabilitata ? '1.5px solid var(--line)' : 'none',
              borderTop: voce.disabilitata ? '1.5px solid var(--line)' : 'none',
              marginTop: voce.disabilitata ? spazio.xs : 0,
            }}
          >
            <MenuVoce
              icona={voce.icona}
              testo={voce.etichetta}
              nota={voce.nota}
              butta={voce.disabilitata}
              disabled={voce.disabilitata}
              onTap={() => gestisciClick(voce)}
            />
          </div>
        ))}
      </div>
    </Sheet>
  )
}
