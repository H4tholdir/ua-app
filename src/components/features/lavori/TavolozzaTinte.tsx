'use client'

// D42 — Task 7 (D247) e Task 8. La tavolozza delle tinte del manufatto:
// la GRIGLIA DI PASTIGLIE scelta da Francesco (D119) fra due mockup, perché
// mostra 17 tinte in una schermata sola mentre l'elenco raggruppato ne mostrava
// 12 su 17.
//
// 🔑 VIVE FUORI DAI SUOI DUE CHIAMANTI, ED È IL PUNTO. D247 ha messo la
//    correzione della tinta in DUE posti — il foglietto della scheda e la
//    pagina di modifica — e il prezzo era dichiarato: la tavolozza serve a
//    entrambi. Scriverla due volte sarebbe stata la settima copia libera del
//    censimento della riga 22, fatta con quel censimento aperto sul tavolo.
// 📮 AL TASK 8: si importa da qui. Le voci arrivano dall'alto (le carica
//    `caricaTinteScheda` lato server): questo componente NON interroga niente.
//
// Geometria dal mockup approvato, verbatim (`docs/design/mockups/
// 2026-08-03-tinte-manufatto-due-tavolozze.html:99-114`): griglia 2 colonne a
// 390 e 3 da 768 (le colonne stanno in `ds-v3.css`, una media query non si
// scrive inline), gap 8, righe ad altezza FISSA 60, pastiglia raggio 18, testo
// 14.5/700 con interlinea 1.15, pallino 22 con anello interno.

import type { TintaManufatto } from '@/lib/domain/tinta'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'

/** La coppia che identifica una tinta sul lavoro. `null` = nessuna tinta. */
export type CoppiaTinta = { famiglia: string; codice: string } | null

const stilePastiglia = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  height: '100%',
  padding: `0 ${spazio.sm}px`,
  border: 'none',
  borderRadius: raggio.riga,
  background: 'var(--bg-deep)',
  color: 'var(--ink)',
  fontFamily: 'inherit',
  fontSize: 14.5,
  fontWeight: tipografia.weight.bold,
  textAlign: 'left',
  cursor: 'pointer',
  lineHeight: 1.15,
} as const

// Selezionata: anello rosso INTERNO + faccia elevata. Due fonti, non una — e
// `aria-pressed` è la terza, quella che si legge senza vedere il colore.
const stilePastigliaScelta = {
  ...stilePastiglia,
  boxShadow: 'inset 0 0 0 2px var(--red)',
  background: 'var(--elv)',
} as const

const stilePallino = {
  width: 22,
  height: 22,
  borderRadius: raggio.pill,
  flex: 'none',
  boxShadow: 'inset 0 0 0 1px var(--line)',
} as const

/**
 * TavolozzaTinte — le tinte fra cui scegliere, più la via per non averne.
 *
 * @param tinte le voci del catalogo, già nell'ordine giusto. **Vuoto = niente
 *   griglia**: se il catalogo non ha risposto, una tavolozza con dentro la sola
 *   «Nessuna tinta» inviterebbe a cancellare invece di dire che non c'è nulla
 *   da scegliere.
 * @param onScegli riceve **la riga intera**, non la coppia: chi salva deve poter
 *   aggiornare la riga della scheda col nome nuovo senza tornare al server.
 */
export function TavolozzaTinte(props: {
  tinte: readonly TintaManufatto[]
  scelta: CoppiaTinta
  onScegli: (tinta: TintaManufatto | null) => void
}) {
  const { tinte, scelta, onScegli } = props
  if (tinte.length === 0) return null

  function scegli(tinta: TintaManufatto | null) {
    // Come `TileScelta`: è una SELEZIONE fra opzioni esistenti, quindi vibra e
    // non suona — il suono è dei tasti che fanno accadere qualcosa.
    vibra('selection')
    onScegli(tinta)
  }

  return (
    <div className="ds-tavolozza-tinte">
      {/* D113 — «Nessuna tinta» in cima: è la via per toglierla, e sta dove la
          si cerca. Senza pallino: non è un colore. */}
      <button
        type="button"
        aria-pressed={scelta === null}
        style={scelta === null ? stilePastigliaScelta : stilePastiglia}
        onClick={() => scegli(null)}
      >
        Nessuna tinta
      </button>

      {tinte.map((t) => {
        const attiva = scelta !== null && scelta.famiglia === t.famiglia && scelta.codice === t.codice
        return (
          <button
            key={`${t.famiglia}:${t.codice}`}
            type="button"
            aria-pressed={attiva}
            style={attiva ? stilePastigliaScelta : stilePastiglia}
            onClick={() => scegli(t)}
          >
            {/* 🔵 D114 — il pallino c'è SOLO dove è onesto: su «Trasparente» e
                sui glitter `hex` è NULL in catalogo, e un colore piatto lì
                direbbe una cosa falsa. Il NOME c'è sempre, quindi il colore non
                è mai l'unica fonte d'informazione.
                ⚠️ `background: t.hex` è UN DATO, non un colore del sistema
                grafico: non viola la regola «mai hex inline», che riguarda i
                colori di marca. */}
            {t.hex ? <span data-pallino aria-hidden style={{ ...stilePallino, background: t.hex }} /> : null}
            {t.nome}
          </button>
        )
      })}
    </div>
  )
}
