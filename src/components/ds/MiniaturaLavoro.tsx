'use client'

// DS v3 §5.36 (spec docs/superpowers/specs/2026-07-21-parete-cassette-design.md §8/§13) —
// MiniaturaLavoro: SVG materico inline dentro la cavità della Cassetta (§5.35, Cassetta.tsx).
// I 6 simboli del primo giro (corona/provvisorio/impianto/ponte/totale/scheletrato) sono copie
// 1:1 dei path del mockup ratificato `docs/design/mockups/2026-07-20-parete-cassette-v2.html:167-202`.
// Le 4 miniature NUOVE (allineatore, mascherina, riparazione, generica — v. MiniaturaId in
// `src/lib/domain/miniature-lavoro.ts`) hanno superato il gate Task 18: Francesco ha scelto le
// varianti il 22/07 (due giri) dal mockup di legenda
// `docs/design/mockups/2026-07-21-miniature-estensione-legenda.html` — allineatore=A (arco aperto
// tratteggiato, #mk-allineatore-a), mascherina=B (piena + cresta occlusale, #mk-mascherina-b),
// riparazione=C (totale spezzata in due metà scostate/ruotate, #mk-riparazione-c), generica=D
// (molare occlusale, solchi a Y, #mk-generica-d). Anche queste sono copie 1:1 di quei `<symbol>`:
// geometria (`d`/`transform`) LETTERALE, MAI "migliorata".
// La palette (ceramica avorio, gengiva rosa, metallo grigio, resina traslucida) è quella FISSA del
// mockup: vive come custom property CSS `--mat-*` in `src/app/ds-v3.css` (§5.36) e NON in
// `v3/tokens.ts` — il check pre-commit 4a vieta hex/rgba letterali in questo file. La trascrizione
// «carattere per carattere» vale per la GEOMETRIA; i `fill`/`stroke` del mockup diventano le
// `var(--mat-*)` corrispondenti (ceramica / ceramica-ombra / ceramica-traslucida / gengiva /
// gengiva-ombra) — la mappa valore-letterale→variabile vive in `ds-v3.css` e nel report Task 18.
//
// L'UNICO fallback residuo è ora l'id SCONOSCIUTO a runtime (dato non validato a monte), che cade
// sulla generica — che è la D ratificata, non più un rettangolo segnaposto.

import type { MiniaturaId } from '@/lib/domain/miniature-lavoro'

const RATIFICATE = new Set<MiniaturaId>([
  'corona', 'provvisorio', 'impianto', 'ponte', 'totale', 'scheletrato',
  'allineatore', 'mascherina', 'riparazione', 'generica',
])

type IdRisolto =
  | 'corona' | 'provvisorio' | 'impianto' | 'ponte' | 'totale' | 'scheletrato'
  | 'allineatore' | 'mascherina' | 'riparazione' | 'generica'

/**
 * risolvi — un solo punto di fallback, esplicito e commentato (mai un successo silenzioso):
 * ora TUTTI i 10 id ratificati rendono il proprio simbolo. Cade QUI sulla generica (D) SOLO un
 * `id` sconosciuto a runtime (dato non validato a monte — es. un cast `as MiniaturaId` su una
 * stringa arbitraria che bypassa il type-check).
 */
function risolvi(id: MiniaturaId): IdRisolto {
  if (RATIFICATE.has(id)) return id as IdRisolto
  return 'generica'
}

const VIEWBOX: Record<IdRisolto, string> = {
  corona: '0 0 24 24',
  provvisorio: '0 0 24 24',
  impianto: '0 0 24 32',
  ponte: '0 0 44 24',
  totale: '0 0 40 26',
  scheletrato: '0 0 40 26',
  allineatore: '0 0 40 26',
  mascherina: '0 0 40 26',
  riparazione: '0 0 40 26',
  generica: '0 0 24 24',
}

function Simbolo({ id }: { id: IdRisolto }) {
  switch (id) {
    case 'corona':
      return (
        <>
          <path
            d="M4 9.5 C4 4.5 7 3 12 3 C17 3 20 4.5 20 9.5 C20 13 19 16.5 17.8 19.2 C17.2 20.6 15.4 20.5 14.9 19 L13.9 16 C13.3 14.4 10.7 14.4 10.1 16 L9.1 19 C8.6 20.5 6.8 20.6 6.2 19.2 C5 16.5 4 13 4 9.5 Z"
            fill="var(--mat-ceramica)"
          />
          <path
            d="M6.5 6.5 C7.5 5.4 9.5 4.8 12 4.8"
            stroke="var(--mat-bianco)"
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
            opacity={0.8}
          />
          <path
            d="M4 9.5 C4 13 5 16.5 6.2 19.2 C6.8 20.6 8.6 20.5 9.1 19 L10.1 16"
            stroke="var(--mat-ceramica-ombra)"
            strokeWidth={1.2}
            fill="none"
          />
        </>
      )
    case 'provvisorio':
      return (
        <path
          d="M4 9.5 C4 4.5 7 3 12 3 C17 3 20 4.5 20 9.5 C20 13 19 16.5 17.8 19.2 C17.2 20.6 15.4 20.5 14.9 19 L13.9 16 C13.3 14.4 10.7 14.4 10.1 16 L9.1 19 C8.6 20.5 6.8 20.6 6.2 19.2 C5 16.5 4 13 4 9.5 Z"
          fill="var(--mat-ceramica-traslucida)"
          stroke="var(--mat-ceramica)"
          strokeWidth={1.6}
          strokeDasharray="3.2 2.4"
        />
      )
    case 'impianto':
      return (
        <>
          <path
            d="M6 7 C6 3.8 8.2 3 12 3 C15.8 3 18 3.8 18 7 C18 9.4 17.3 11.4 16.6 12.8 C16.2 13.7 7.8 13.7 7.4 12.8 C6.7 11.4 6 9.4 6 7 Z"
            fill="var(--mat-ceramica)"
          />
          <rect x={9.4} y={14.5} width={5.2} height={12} rx={2.2} fill="var(--mat-metallo)" />
          <path d="M9.4 17.5 H14.6 M9.4 20.5 H14.6 M9.4 23.5 H14.6" stroke="var(--mat-metallo-ombra)" strokeWidth={1.4} />
        </>
      )
    case 'ponte':
      return (
        <>
          <path
            d="M3 10 C3 5.5 5.5 4 9.5 4 C13 4 15 5.5 15 10 C15 13 14.2 16 13.3 18.4 C12.8 19.7 11.2 19.6 10.8 18.3 L10.2 16.2 C9.8 14.9 8.2 14.9 7.8 16.2 L7.2 18.3 C6.8 19.6 5.2 19.7 4.7 18.4 C3.8 16 3 13 3 10 Z"
            fill="var(--mat-ceramica)"
          />
          <path
            d="M17 10 C17 5.5 19.5 4 22 4 C24.5 4 27 5.5 27 10 C27 13.5 26.4 16.8 25.6 19 C25.2 20.2 23 20.2 22.6 19 L22 17.2 C21.7 16.2 22.3 16.2 22 17.2 L21.4 19 C21 20.2 18.8 20.2 18.4 19 C17.6 16.8 17 13.5 17 10 Z"
            fill="var(--mat-ceramica-chiara)"
          />
          <path
            d="M29 10 C29 5.5 31 4 34.5 4 C38.5 4 41 5.5 41 10 C41 13 40.2 16 39.3 18.4 C38.8 19.7 37.2 19.6 36.8 18.3 L36.2 16.2 C35.8 14.9 34.2 14.9 33.8 16.2 L33.2 18.3 C32.8 19.6 31.2 19.7 30.7 18.4 C29.8 16 29 13 29 10 Z"
            fill="var(--mat-ceramica)"
          />
          <path d="M14.6 8 H17.6 M26.6 8 H29.6" stroke="var(--mat-ceramica-ombra)" strokeWidth={2.4} strokeLinecap="round" />
        </>
      )
    case 'totale':
      return (
        <>
          <path
            d="M4 24 C4 12 10 4 20 4 C30 4 36 12 36 24 L30.5 24 C30.5 14.5 26 9.5 20 9.5 C14 9.5 9.5 14.5 9.5 24 Z"
            fill="var(--mat-gengiva)"
          />
          <path
            d="M7 20.5 C8.5 13.5 13 8 20 8 C27 8 31.5 13.5 33 20.5"
            stroke="var(--mat-gengiva-ombra)"
            strokeWidth={1.2}
            fill="none"
            opacity={0.7}
          />
          <circle cx={8.3} cy={21} r={2.1} fill="var(--mat-ceramica)" />
          <circle cx={10} cy={15.8} r={2.1} fill="var(--mat-ceramica)" />
          <circle cx={13.5} cy={11.7} r={2.1} fill="var(--mat-ceramica)" />
          <circle cx={18} cy={9.8} r={2.1} fill="var(--mat-ceramica)" />
          <circle cx={22.5} cy={9.9} r={2.1} fill="var(--mat-ceramica)" />
          <circle cx={26.8} cy={11.9} r={2.1} fill="var(--mat-ceramica)" />
          <circle cx={30.1} cy={15.9} r={2.1} fill="var(--mat-ceramica)" />
          <circle cx={31.8} cy={21} r={2.1} fill="var(--mat-ceramica)" />
        </>
      )
    case 'scheletrato':
      return (
        <>
          <path d="M6 23 C6 13 12 6 20 6 C28 6 34 13 34 23" stroke="var(--mat-metallo)" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path
            d="M10 23 C10 15.5 14.5 10.5 20 10.5 C25.5 10.5 30 15.5 30 23"
            stroke="var(--mat-metallo-ombra)"
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M5 19 C3.8 17.5 3.8 15.5 5.2 14.2 M35 19 C36.2 17.5 36.2 15.5 34.8 14.2"
            stroke="var(--mat-metallo)"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M3.5 23 C3.5 20 4.5 18.5 6.5 18 C8.5 17.7 9.5 19 9.5 21 L9.2 23 Z"
            fill="var(--mat-ceramica)"
          />
          <path
            d="M36.5 23 C36.5 20 35.5 18.5 33.5 18 C31.5 17.7 30.5 19 30.5 21 L30.8 23 Z"
            fill="var(--mat-ceramica)"
          />
        </>
      )
    case 'allineatore':
      // Variante A (#mk-allineatore-a): arco aperto tratteggiato, resina traslucida (il tratteggio
      // dice «trasparente/rimovibile»; l'avorio la distingue dal metallo dello scheletrato).
      return (
        <path
          d="M6 23 C6 12.5 12 6 20 6 C28 6 34 12.5 34 23"
          fill="none"
          stroke="var(--mat-ceramica)"
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeDasharray="3.6 2.6"
        />
      )
    case 'mascherina':
      // Variante B (#mk-mascherina-b): ferro di cavallo pieno traslucido (bordo continuo, non
      // tratteggiato) + cresta occlusale (piano di morso) in ombra ceramica — la placca su cui si morde.
      return (
        <>
          <path
            d="M4.5 24 C4.5 11 11 4.5 20 4.5 C29 4.5 35.5 11 35.5 24 L31.5 24 C31.5 14.5 27 10.5 20 10.5 C13 10.5 8.5 14.5 8.5 24 Z"
            fill="var(--mat-ceramica-traslucida)"
            stroke="var(--mat-ceramica)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path
            d="M7.2 23 C7.7 15 12 10.2 20 10.2 C28 10.2 32.3 15 32.8 23"
            fill="none"
            stroke="var(--mat-ceramica-ombra)"
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.7}
          />
        </>
      )
    case 'riparazione':
      // Variante C (#mk-riparazione-c): la totale rosa spezzata in DUE metà, scostate e ruotate di
      // pochi gradi — il gap a V al centro È la frattura, nessuna linea sovrapposta.
      return (
        <>
          <g transform="translate(-1.4 1.3) rotate(-4 10 24)">
            <path d="M4 24 C4 12 10 4 20 4 L20 9.5 C14 9.5 9.5 14.5 9.5 24 Z" fill="var(--mat-gengiva)" />
            <path d="M7 20.5 C8.5 13.5 13 8 20 8" stroke="var(--mat-gengiva-ombra)" strokeWidth={1.2} fill="none" opacity={0.7} />
            <circle cx={8.3} cy={21} r={2.1} fill="var(--mat-ceramica)" />
            <circle cx={10} cy={15.8} r={2.1} fill="var(--mat-ceramica)" />
            <circle cx={13.5} cy={11.7} r={2.1} fill="var(--mat-ceramica)" />
            <circle cx={17.6} cy={9.9} r={2.1} fill="var(--mat-ceramica)" />
            <path d="M20 4.6 L20 9.2" stroke="var(--mat-gengiva-ombra)" strokeWidth={1.1} opacity={0.8} />
          </g>
          <g transform="translate(1.4 -0.5) rotate(3.5 30 24)">
            <path d="M20 4 C30 4 36 12 36 24 L30.5 24 C30.5 14.5 26 9.5 20 9.5 Z" fill="var(--mat-gengiva)" />
            <path d="M20 8 C27 8 31.5 13.5 33 20.5" stroke="var(--mat-gengiva-ombra)" strokeWidth={1.2} fill="none" opacity={0.7} />
            <circle cx={22.4} cy={9.9} r={2.1} fill="var(--mat-ceramica)" />
            <circle cx={26.8} cy={11.9} r={2.1} fill="var(--mat-ceramica)" />
            <circle cx={30.1} cy={15.9} r={2.1} fill="var(--mat-ceramica)" />
            <circle cx={31.8} cy={21} r={2.1} fill="var(--mat-ceramica)" />
            <path d="M20 4.6 L20 9.2" stroke="var(--mat-gengiva-ombra)" strokeWidth={1.1} opacity={0.8} />
          </g>
        </>
      )
    case 'generica':
      // Variante D (#mk-generica-d): molare visto DALL'ALTO (vista occlusale) — ovale con i solchi
      // a Y. Punto di vista diverso dalla corona frontale: a ~22px si distinguono per silhouette.
      // È anche il fallback per un id sconosciuto a runtime (v. `risolvi`).
      return (
        <>
          <path
            d="M12 4.5 C17.2 4.5 20.5 7.5 20.5 12 C20.5 16.5 17.2 19.5 12 19.5 C6.8 19.5 3.5 16.5 3.5 12 C3.5 7.5 6.8 4.5 12 4.5 Z"
            fill="var(--mat-ceramica)"
          />
          <path
            d="M12 4.5 C6.8 4.5 3.5 7.5 3.5 12 C3.5 16.5 6.8 19.5 12 19.5"
            stroke="var(--mat-ceramica-ombra)"
            strokeWidth={1.1}
            fill="none"
            opacity={0.7}
          />
          <path
            d="M12 6.5 L12 11.6 M12 11.6 C10.2 12.8 8.6 13.4 7 15.6 M12 11.6 C13.8 12.8 15.4 13.4 17 15.6"
            fill="none"
            stroke="var(--mat-ceramica-ombra)"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </>
      )
  }
}

/**
 * MiniaturaLavoro — icona materica per tipo di lavoro, dentro la cavità della Cassetta (§5.35).
 * Decorativa (`aria-hidden`): il significato testuale lo porta l'`aria-label` completo della
 * Cassetta, non questa icona — coerente con la regola "il colore non è mai l'unica fonte di
 * stato" applicata qui alla forma (chi non vede l'icona ha comunque il tipo lavoro in testo).
 */
export function MiniaturaLavoro({ id, height = 34 }: { id: MiniaturaId; height?: number }) {
  const risolto = risolvi(id)
  return (
    <svg
      aria-hidden="true"
      data-miniatura-id={risolto}
      className="ds-miniatura"
      viewBox={VIEWBOX[risolto]}
      style={{ height, width: 'auto' }}
    >
      <Simbolo id={risolto} />
    </svg>
  )
}
