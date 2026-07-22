'use client'

// Task 12 — SwatchesColore: la riga di scelta colore condivisa dai due sheet della Parete
// (§5.2 «Nuova cassetta», §5.3 sheet cassetta). 6 facce standard + custom, 1:1 dal mockup
// ratificato (2026-07-20-parete-cassette-v2.html:152-157).
//
// Il gradiente delle 6 facce NON è ridichiarato qui: lo swatch porta le classi
// `ds-cassetta <slug>` e il background arriva dalle regole già esistenti in ds-v3.css
// (`.ds-cassetta.<slug>`, righe 276-281) — `.ds-swatch` riporta geometria E ombra a quelle dello
// swatch (brief Task 12: «Riusa le classi esistenti, non ridichiarare i gradienti»).
// La regola CSS vera (qui c'era scritto il falso fino alla review del Task 12): `.ds-swatch` è
// (0,2,0) come la regola base `.ds-cassetta`, e sulla GEOMETRIA vince perché dichiarata dopo —
// in light e in dark, visto che nessun ramo di tema ridichiara la geometria. L'OMBRA in dark la
// ridichiara però `[data-theme="dark"] [data-ds="v3"] .ds-cassetta`, che è (0,3,0): lì l'ordine
// non basta, a parità d'ordine vince la specificità. Per questo ds-v3.css porta una regola
// `[data-theme="dark"] … .ds-swatch` dedicata — senza, in dark le 6 facce prendevano l'ombra di
// una tray alta 104px e il custom (che non porta `ds-cassetta`) teneva la propria.
// Il colore custom è l'unico valore per-istanza: arriva dall'`<input type="color">` nativo come
// stringa a runtime (`valore`), MAI come letterale nel sorgente (nessun hex nei .tsx).
//
// A11y (constraint 6): ogni swatch ha un nome accessibile che DICE il colore (non solo la
// faccia), e lo stato selezionato porta più segnali insieme — mai il solo anello: è la stessa
// legge L3 già incisa in `ChipScelta` (§5.31) e in `CampoData` («porta sempre un ✓ e aria-pressed,
// mai solo il tint verde»). Le 6 facce standard (bottoni reali) portano ✓ + anello + `aria-pressed`;
// il custom (Collaudo R1, P11a) è un `<input type="color">` REALE — non un bottone — quindi il suo
// stato non è un booleano ma il proprio `value`: lo screen reader lo annuncia letteralmente (l'hex
// scelto), oltre a ✓ e anello visibili sullo `span` decorativo che lo racchiude. L'inchiostro del ✓
// si sceglie con `targaScura` — la stessa funzione con cui la Cassetta decide targa/testi scuri
// su faccia chiara (§5.35): su bianca/azzurra e sugli hex chiari un ✓ bianco sparirebbe.

import { targaScura, derivaFacciaCustom, facciaScura } from '@/components/ds/Cassetta'
import { facciaHex } from '@/design-system/v3/tokens'

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
 *  custom, che mostra il colore scelto. `onScegli` riceve lo slug o l'hex.
 *
 *  CONTRATTO di `onScegli` (review Task 12, Important 1) — «la scelta ORA è questa», NON «l'utente
 *  ha finito di scegliere». Le due cose coincidono per le 6 facce (un click è un valore discreto e
 *  concluso), ma NON per il custom: React mappa `onChange` sull'evento DOM `input`, che il picker
 *  nativo emette LIVE mentre il cursore si trascina. Quindi `onScegli` può arrivare decine di volte
 *  per una sola scelta, con valori intermedi. Un chiamante che ci appende un effetto (una PATCH,
 *  una chiusura) DEVE decidere lui quando la scelta è conclusa: vedi `CassettaSheet`, che tiene
 *  l'hex in sospeso e lo committa con un tasto. Non si «risolve» qui passando all'evento nativo
 *  `change`: su alcuni browser il picker lo emette anch'esso durante il trascinamento. */
export function SwatchesColore(props: {
  valore: string
  onScegli: (colore: string) => void
  disabilitato?: boolean
}) {
  const { valore, onScegli, disabilitato = false } = props
  const eHex = valore.startsWith('#')
  // `value` controllato dell'input color: mai il default #000000 del browser (P11b), sempre
  // l'hex della faccia corrente o l'hex custom già scelto.
  const hexCorrente = eHex ? valore : (facciaHex[valore as keyof typeof facciaHex] ?? facciaHex.bianca)

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
      {/* Collaudo R1 (P11a) — lo swatch custom è uno `span` decorativo: l'elemento TOCCATO è
          l'input color sovrapposto (opacity 0, a tutta area). Safari iOS apre il picker di
          sistema solo su interazione diretta dell'utente con l'input — il vecchio pattern
          (bottone + `inputRef.click()` programmatico) non lo apriva MAI su iPhone. */}
      <span
        className={[
          'ds-swatch',
          'ds-swatch-custom',
          eHex ? 'is-scelto' : undefined,
          eHex && targaScura(valore) ? 'is-chiara' : undefined,
          eHex && facciaScura(valore) ? 'is-nera' : undefined,
        ]
          .filter(Boolean)
          .join(' ')}
        // `valore` è una stringa hex a runtime, non un letterale nel sorgente: la faccia custom
        // mostra il gradiente derivato (P11c, clamp di luminanza — mai piatto sui neri) quando è
        // attivo, il conic-gradient di default altrimenti (CSS).
        style={eHex ? { background: derivaFacciaCustom(valore) } : undefined}
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
        <input
          type="color"
          className="ds-swatch-input"
          aria-label="Colore personalizzato"
          value={hexCorrente}
          disabled={disabilitato}
          // LIVE durante il trascinamento (React `onChange` = evento DOM `input`): è un'anteprima
          // continua, non una scelta conclusa — v. il contratto di `onScegli` sopra.
          onChange={(e) => onScegli(e.target.value)}
        />
      </span>
    </div>
  )
}
