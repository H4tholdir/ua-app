// DS v3 §4.4 (Ondata 2, Task 10) — Glifi per FAMIGLIA macro del Passo 2 del
// wizard. La spec (§7.3, frame Passo 2) chiede "glifo line-SVG per famiglia
// macro — i glifi definitivi per-tipo sono backlog": qui NON disegniamo un
// glifo per ciascuno dei 38 tipi granulari, ma uno per ciascuna delle 10
// famiglie di `TipoDispositivo` — il refinement per-tipo resta un lavoro
// futuro esplicitamente fuori scope.
//
// Le 4 shape disponibili sono riusate LETTERALMENTE (stessi `path d=`) da
// wizard.html:311-328 — nessun path nuovo inventato, per istruzione del
// piano. Il mockup ne disegnava una per Corona zirconia/Ponte/Scheletrato/
// Protesi totale (4 TILE d'esempio, non le 10 famiglie): qui la mappa copre
// TUTTE le 10 famiglie (il `Record` sotto forza la copertura a compile-time)
// riusando le 4 shape più volte dove non esiste un match 1:1 diretto — non
// è un difetto, è la stessa scelta "glifo di famiglia, non di tipo" della
// spec, spinta fino in fondo. Assegnazione:
//   - Corona (dente)      → protesi_fissa (match diretto: corona_zirconia),
//                            provvisorio (i provvisori sono perlopiù corone
//                            temporanee) e altro (fallback generico).
//   - Ponte (due pilastri) → implantologia (pilastri = impianti) e cad_cam
//                            (nessun match diretto disponibile).
//   - Scheletrato (arco)   → scheletrato (match diretto) e riparazione
//                            (nessun match diretto disponibile).
//   - Protesi totale (arcata dentale) → protesi_mobile (match diretto:
//                            protesi_totale), ortodonzia e bite_splint
//                            (l'arcata è il contesto comune a entrambe).
//
// stroke 1.7 currentColor (wizard.html:311 style attr) — `color: var(--blue)`
// impostato DIRETTAMENTE sull'<svg> (non su una classe `.tile-scelta .glifo`
// come nel mockup: `TileScelta` non porta quella classe nel porting React,
// quindi senza questo `stroke="currentColor"` risolverebbe a --ink, non blu).
// `aria-hidden`: sempre decorativo, il nome accessibile del tile è `nome`.
// MAI emoji (§4.4) — solo line-SVG.

import type { ReactNode } from 'react'
import type { TipoDispositivo } from '@/types/domain'

const ATTRIBUTI_STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function Corona() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" style={{ color: 'var(--blue)' }} {...ATTRIBUTI_STROKE}>
      <path d="M4.5 8.5l3.4 3.2L12 5.5l4.1 6.2 3.4-3.2-1.6 8.5H6.1l-1.6-8.5z" />
      <path d="M6.5 20h11" />
    </svg>
  )
}

function Ponte() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" style={{ color: 'var(--blue)' }} {...ATTRIBUTI_STROKE}>
      <path d="M4.5 18v-7.5M19.5 18v-7.5" />
      <path d="M4.5 13c2.5-4.5 12.5-4.5 15 0" />
      <path d="M2.5 18h19" />
    </svg>
  )
}

function Scheletrato() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" style={{ color: 'var(--blue)' }} {...ATTRIBUTI_STROKE}>
      <path d="M5.5 19.5v-7a6.5 6.5 0 0 1 13 0v7" />
      <path d="M9.5 19.5v-5.2a2.5 2.5 0 0 1 5 0v5.2" />
    </svg>
  )
}

function ProtesiTotale() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" style={{ color: 'var(--blue)' }} {...ATTRIBUTI_STROKE}>
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M4 16c1.33 1.7 2.67 1.7 4 0 1.33 1.7 2.67 1.7 4 0 1.33 1.7 2.67 1.7 4 0 1.33 1.7 2.67 1.7 4 0" />
    </svg>
  )
}

/**
 * GLIFI_FAMIGLIA — un glifo per famiglia macro (§4.4). `Record<TipoDispositivo,
 * ReactNode>` forza a compile-time la copertura di TUTTE le 10 famiglie: il
 * caso reale più importante da coprire è il default di un laboratorio nuovo
 * (0 lavori, `CANONICI_DAY1` in dati-wizard.ts) — protesi_fissa,
 * implantologia, riparazione, provvisorio — che altrimenti mostrerebbe tile
 * con la tinta blu vuota al primo avvio.
 */
export const GLIFI_FAMIGLIA: Record<TipoDispositivo, ReactNode> = {
  protesi_fissa: <Corona />,
  protesi_mobile: <ProtesiTotale />,
  implantologia: <Ponte />,
  cad_cam: <Ponte />,
  scheletrato: <Scheletrato />,
  ortodonzia: <ProtesiTotale />,
  provvisorio: <Corona />,
  riparazione: <Scheletrato />,
  bite_splint: <ProtesiTotale />,
  altro: <Corona />,
}
