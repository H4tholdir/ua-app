'use client'

// DS v3 §5.8 — CardLavoro (nelle liste): la card di un lavoro nelle liste che
// si aprono dalle pile (§5.7). Card intera tappabile → `onApri`
// (selezione/navigazione: `vibra('selection')`, MAI `suona()`). Se il
// chiamante passa `onConsegna` compare una quarta riga — TastoConsegnaInline,
// l'UNICA azione fisica dentro la card (`suona('tap')` + `vibra('medium')`),
// riservata dal chiamante al primo elemento della pila rossa (§5.8) —
// responsabilità sua, non di questo componente. Massimo 4 righe: niente
// progress bar, niente icone di stato aggiuntive — la pila di provenienza È
// lo stato.
//
// Task 8 (P4) — `conferma`: riga 4 alternativa, riservata dal chiamante a
// OGNI card della pila blu (i lavori appena arrivati vanno confermati uno
// per uno, non solo il primo). Rende un `TastoSecondario` «Conferma» a piena
// larghezza. MAI insieme a `onConsegna` — sono due varianti della stessa
// riga 4 opzionale, mutuamente esclusive per costruzione del chiamante.
//
// Task 2 (A14, decisions 20/07) — `cassetta`: targa opzionale in riga 1, tra
// il blocco lavoro e la PillTempo — gemella visiva del blocco lavoro
// (variante A, co-identità, mockup ratificato
// 2026-07-20-mini-triage-a14bis-cassetta-ripensata.html). Assente
// (`null`/`undefined`) ⇒ blocco assente, card identica a prima.
//
// Nesting: la card è tappabile E contiene un tasto azione — un `<button>`
// dentro un `<button>` è HTML non valido. La card è quindi un `<div
// role="button" tabIndex={0}>` con gestione manuale di click e tastiera
// (Invio/Spazio), mentre TastoConsegnaInline resta un vero `<button>`
// figlio: `stopPropagation()` sul suo click impedisce che la pressione sul
// tasto si propaghi come apertura della card. `TastoSecondario` non porta
// con sé questa garanzia (componente condiviso, non specifico di questa
// card): l'involucro di `conferma` la aggiunge dall'esterno, stesso esito.
//
// GDPR: `paziente` arriva SEMPRE già pseudonimizzato dal chiamante (formato
// PZ-xxxx). Il componente lo renderizza così com'è — non lo conosce, non lo
// valida, non lo trasforma: non deve MAI essere alimentato con un nome
// reale, quella garanzia vive a monte, in chi assembla i dati del lavoro.

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, raggio, spazio, tipografia, testoSuFaccia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'
import { PillTempo, type Famiglia } from './Pill'
import { TastoSecondario } from './TastoSecondario'

const H_TASTO_CONSEGNA_INLINE = 54
// Corsa fisica compressa (§5.8): 4px a riposo (contro i 6 del TastoPrimario a
// schermo intero — vive dentro una card, non da sola), 1px premuto: stessa
// faccia/gradiente, stessa logica, corsa ridotta.
const CORSA_RIPOSO_INLINE = '0 4px 0 var(--red-dark)'
const CORSA_PREMUTA_INLINE = '0 1px 0 var(--red-dark)'

/**
 * TastoConsegnaInline — variante compatta del TastoPrimario (§5.1), interna a
 * CardLavoro (non esportata come file a sé): riga 4 opzionale, SOLO sul primo
 * elemento della pila rossa (responsabilità del chiamante — non di questo
 * componente). H 54, stessa faccia/corsa del TastoPrimario ridotta a 4px,
 * testo 17/800 "CONSEGNA".
 */
function TastoConsegnaInline(props: { onClick: () => void }) {
  const { onClick } = props

  function handleClick(evento: ReactMouseEvent) {
    // Ferma la propagazione: il tap sul tasto NON deve aprire la card.
    evento.stopPropagation()
    suona('tap')
    vibra('medium')
    onClick()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): questo tasto è
          separatamente focalizzabile dalla card, quindi porta il proprio. */}
      <style>{`
        .ds-tasto-consegna-inline:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-tasto-consegna-inline"
        onClick={handleClick}
        whileTap={{ y: 3, scale: 0.995, boxShadow: CORSA_PREMUTA_INLINE }}
        transition={molla.press}
        style={{
          width: '100%',
          height: H_TASTO_CONSEGNA_INLINE,
          borderRadius: raggio.tasto,
          border: 'none',
          background: gradiente.tastoPrimario,
          color: testoSuFaccia,
          fontSize: tipografia.size.body,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          boxShadow: CORSA_RIPOSO_INLINE,
          cursor: 'pointer',
        }}
      >
        CONSEGNA
      </motion.button>
    </>
  )
}

/**
 * CardLavoro — la card di un lavoro nelle liste (§5.8).
 *
 * Card 24 · padding 20/22 · riga 1: `n.147` (heading 21/800, prefisso
 * `LAVORO` caption 12.5/800 `--faint`) + `PillTempo` a destra · riga 2:
 * `dentista · paziente` 17.5/700 · riga 3: `tipoLavoro` 15.5/600 `--muted` ·
 * riga 4 opzionale (SOLO se `onConsegna` è passato): `TastoConsegnaInline`.
 * Massimo 4 righe — niente progress bar, niente icone di stato aggiuntive.
 *
 * GDPR: `paziente` è SEMPRE uno pseudonimo (`PZ-xxxx`) fornito dal chiamante
 * — il componente lo mostra invariato e non deve mai ricevere un nome reale.
 */
// Esclusione mutua di TIPO fra le due varianti della riga 4 (§5.8/P4): un
// chiamante può passare `onConsegna` O `conferma`, mai entrambe insieme —
// `never` incrociati fanno fallire `tsc` sul chiamante che le combina, senza
// churn sui chiamanti esistenti (che ne passano al più una, o nessuna).
type Riga4 =
  | { onConsegna?: () => void; conferma?: never }
  | { conferma?: { onClick: () => void }; onConsegna?: never }

export function CardLavoro(props: {
  numero: string
  // Targa cassetta (A14) — v. nota di testa. Assente ⇒ blocco assente.
  cassetta?: string | null
  dentista: string
  paziente: string
  tipoLavoro: string
  tempo: { testo: string; famiglia: Famiglia }
  onApri: () => void
  // Ring di selezione (review finale Ondata 1, item 1): §3.4 «ring selezione
  // 2.5 --red», mockup `home.html` riga 205/219. Il ring vive QUI, sul nodo
  // che possiede lo sfondo opaco (`background: var(--card)`) — non su un
  // wrapper esterno: un inset box-shadow dipinto SOTTO un discendente con
  // sfondo opaco non è mai visibile (bug scoperto in review: `HomeDesktop`/
  // `PilaSplit` mettevano il ring su un wrapper fuori da questo componente).
  // Default `false`: i chiamanti che non selezionano nulla (mobile
  // `PilaAperta`, catalogo DS) restano identici a prima.
  selezionato?: boolean
} & Riga4) {
  const { numero, cassetta, dentista, paziente, tipoLavoro, tempo, onApri, onConsegna, conferma, selezionato = false } = props

  // Guardia dev-only (Task 10, O1c): l'esclusione reciproca di `onConsegna` e
  // `conferma` è garantita SOLO a livello di tipo (`Riga4`, sopra) — un
  // chiamante che bypassa `tsc` (spread di due oggetti, `as any`…) supera il
  // compilatore ma qui sotto i due blocchi JSX (righe 261+/267+) sono `if`
  // indipendenti, non un if/else: NESSUNA variante vince, vengono montate
  // ENTRAMBE le righe 4, violando il «massimo 4 righe» della card (§5.8).
  if (process.env.NODE_ENV !== 'production' && conferma && onConsegna) {
    console.warn('CardLavoro: conferma e onConsegna sono mutuamente esclusivi — con entrambi impostati vengono renderizzate ENTRAMBE le righe 4 (nessuna variante ne esclude l\'altra)')
  }

  function handleApri() {
    vibra('selection')
    onApri()
  }

  function handleKeyDown(evento: ReactKeyboardEvent) {
    // Solo se il target è la card stessa: il keydown di Invio/Spazio dato al
    // TastoConsegnaInline focalizzato bubble-a fin qui, ma quello NON deve
    // aprire la card (stessa garanzia dello stopPropagation sul click).
    if (evento.target !== evento.currentTarget) return
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      handleApri()
    }
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato. */}
      <style>{`
        .ds-card-lavoro:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`Apri lavoro n.${numero}`}
        className="ds-card-lavoro"
        onClick={handleApri}
        onKeyDown={handleKeyDown}
        whileTap={{ scale: 0.99 }}
        transition={molla.press}
        style={{
          display: 'flex',
          flexDirection: 'column',
          // decision doc 12/07: il fork home 10/2 si chiude qui — canonico
          // 12/3 sulle righe 2/3 (marginTop dedicato sotto), niente più gap
          // uniforme sul contenitore.
          gap: 0,
          padding: '20px 22px',
          borderRadius: raggio.card,
          background: 'var(--card)',
          // Single-value SEMPRE (mai una lista con `var(--sh-card)` +
          // ring): in dark `--sh-card` risolve a `none`, e `none` come
          // membro di un box-shadow multi-valore invalida l'INTERA
          // dichiarazione (stesso anti-pattern documentato in
          // `TastoPrimario.tsx`). Selezionata → SOLO il ring (2.5px
          // --red, §3.4); non selezionata → SOLO l'ombra ambiente,
          // esattamente come prima di questa prop.
          boxShadow: selezionato ? 'inset 0 0 0 2.5px var(--red)' : 'var(--sh-card)',
          cursor: 'pointer',
        }}
      >
        {/* Riga 1 — numero a sinistra, PillTempo a destra (§5.8). Nessuno dei
            due si comprime (testo nowrap = larghezza minima incomprimibile):
            quando non ci stanno entrambi (390px + pill lunga, es. «APPENA
            ARRIVATO») la riga va a capo e la pill scende su una riga sua,
            restando a destra grazie a marginLeft auto — mai un overflow oltre
            il bordo della card (QA visivo T15). */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: `${spazio.s}px ${spazio.m}px`,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'baseline', gap: spazio.s, flexShrink: 0 }}>
            <span
              style={{
                fontSize: tipografia.size.caption,
                fontWeight: tipografia.weight.extrabold,
                letterSpacing: tipografia.tracking.caption,
                color: 'var(--faint)',
              }}
            >
              LAVORO
            </span>
            <span
              style={{
                fontSize: tipografia.size.heading,
                fontWeight: tipografia.weight.extrabold,
                color: 'var(--ink)',
              }}
            >
              n.{numero}
            </span>
          </span>
          {cassetta && (
            <span
              role="img"
              aria-label={`Cassetta ${cassetta}`}
              style={{
                flex: 'none',
                borderRadius: 12,
                background: 'var(--bg-deep)',
                boxShadow: 'inset 0 0 0 1.5px var(--line)',
                padding: '6px 12px 7px',
                textAlign: 'center',
              }}
            >
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: tipografia.weight.extrabold, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 1 }}>
                Cassetta
              </span>
              <span style={{ display: 'block', fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, maxWidth: '7ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cassetta}
              </span>
            </span>
          )}
          <span style={{ display: 'inline-flex', flexShrink: 0, marginLeft: 'auto' }}>
            <PillTempo famiglia={tempo.famiglia}>{tempo.testo}</PillTempo>
          </span>
        </div>

        <p
          style={{
            fontSize: 17.5,
            fontWeight: tipografia.weight.bold,
            color: 'var(--ink)',
            margin: '12px 0 0',
          }}
        >
          {dentista} · {paziente}
        </p>

        <p
          style={{
            fontSize: tipografia.size.callout,
            fontWeight: tipografia.weight.semibold,
            color: 'var(--muted)',
            margin: '3px 0 0',
          }}
        >
          {tipoLavoro}
        </p>

        {onConsegna && (
          <div style={{ marginTop: spazio.m }}>
            <TastoConsegnaInline onClick={onConsegna} />
          </div>
        )}

        {conferma && (
          // Stesso schema anti-nesting del TastoConsegnaInline (v. sopra), ma
          // applicato dall'esterno: `TastoSecondario` è un componente condiviso,
          // non porta da sé lo stopPropagation. `.ds-card-lavoro-conferma button`
          // porta il tasto a piena larghezza (§5.8) — `TastoSecondario` non
          // espone una prop `style`, quindi la resa larga vive qui via classe.
          <>
            <style>{`.ds-card-lavoro-conferma button { width: 100%; }`}</style>
            <span
              className="ds-card-lavoro-conferma"
              style={{ display: 'block', marginTop: spazio.m }}
              onClick={(evento: ReactMouseEvent) => evento.stopPropagation()}
              onKeyDown={(evento: ReactKeyboardEvent) => evento.stopPropagation()}
            >
              <TastoSecondario onClick={conferma.onClick}>Conferma</TastoSecondario>
            </span>
          </>
        )}
      </motion.div>
    </>
  )
}
