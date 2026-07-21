'use client'

// Task 12 — SwatchesColore: la riga di scelta colore condivisa dai due sheet della Parete
// (§5.2 «Nuova cassetta», §5.3 sheet cassetta). 6 facce standard + custom, 1:1 dal mockup
// ratificato (2026-07-20-parete-cassette-v2.html:152-157).
//
// Il gradiente delle 6 facce NON è ridichiarato qui: lo swatch porta le classi
// `ds-cassetta <slug>` e il background arriva dalle regole già esistenti in ds-v3.css
// (`.ds-cassetta.<slug>`, righe 276-281) — `.ds-swatch` riporta solo la geometria a quella
// dello swatch (brief Task 12: «Riusa le classi esistenti, non ridichiarare i gradienti»).
// Il colore custom è l'unico valore per-istanza: arriva dall'`<input type="color">` nativo come
// stringa a runtime (`valore`), MAI come letterale nel sorgente (nessun hex nei .tsx).
//
// A11y (constraint 6): ogni swatch ha un nome accessibile che DICE il colore (non solo la
// faccia), e lo stato selezionato porta TRE segnali insieme — il ✓ visibile, l'anello blu e
// `aria-pressed`. Mai il solo anello: è la stessa legge L3 già incisa in `ChipScelta` (§5.31) e
// in `CampoData` («porta sempre un ✓ e aria-pressed, mai solo il tint verde»). L'inchiostro del ✓
// si sceglie con `targaScura` — la stessa funzione con cui la Cassetta decide targa/testi scuri
// su faccia chiara (§5.35): su bianca/azzurra e sugli hex chiari un ✓ bianco sparirebbe.

import { useRef } from 'react'
import { targaScura } from '@/components/ds/Cassetta'

/** Le 6 facce standard, nell'ordine del mockup (righe 380-387). Lo `slug` è la classe già in
 *  ds-v3.css; il `nome` è il nome accessibile italiano. */
export const SWATCH_STANDARD = [
  { slug: 'bianca', nome: 'Bianca' },
  { slug: 'azzurra', nome: 'Azzurra' },
  { slug: 'rossa', nome: 'Rossa' },
  { slug: 'blu', nome: 'Blu' },
  { slug: 'verde', nome: 'Verde' },
  { slug: 'grigia', nome: 'Grigia' },
] as const

/** `valore` è uno slug ('bianca'…) oppure un hex ('#AABBCC'). Un hex → è selezionato lo swatch
 *  custom, che mostra il colore scelto. `onScegli` riceve lo slug o l'hex. */
export function SwatchesColore(props: {
  valore: string
  onScegli: (colore: string) => void
  disabilitato?: boolean
}) {
  const { valore, onScegli, disabilitato = false } = props
  const inputRef = useRef<HTMLInputElement>(null)
  const eHex = valore.startsWith('#')

  return (
    <div className="ds-swatches" role="group" aria-label="Colore della cassetta">
      {SWATCH_STANDARD.map(({ slug, nome }) => {
        const scelta = valore === slug
        return (
          <button
            key={slug}
            type="button"
            className={[
              'ds-swatch',
              'ds-cassetta',
              slug,
              scelta ? 'is-scelto' : undefined,
              targaScura(slug) ? 'is-chiara' : undefined,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={nome}
            aria-pressed={scelta}
            disabled={disabilitato}
            onClick={() => onScegli(slug)}
          >
            {scelta && (
              <span className="ds-swatch-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        )
      })}
      <button
        type="button"
        className={[
          'ds-swatch',
          'ds-swatch-custom',
          eHex ? 'is-scelto' : undefined,
          eHex && targaScura(valore) ? 'is-chiara' : undefined,
        ]
          .filter(Boolean)
          .join(' ')}
        // `valore` è una stringa hex a runtime, non un letterale nel sorgente: la faccia custom
        // mostra il colore scelto quando è attivo, il conic-gradient di default altrimenti (CSS).
        style={eHex ? { background: valore } : undefined}
        aria-label="Colore personalizzato"
        aria-pressed={eHex}
        disabled={disabilitato}
        onClick={() => inputRef.current?.click()}
      >
        {eHex ? (
          <span className="ds-swatch-check" aria-hidden="true">
            ✓
          </span>
        ) : (
          <span className="glifo" aria-hidden="true">
            +
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="color"
        className="ds-swatch-input"
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabilitato}
        onChange={(e) => onScegli(e.target.value)}
      />
    </div>
  )
}
