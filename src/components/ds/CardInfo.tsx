'use client'

// DS v3 §5.10 — CardInfo/RigaDato: card di sola lettura per dati chiave→valore
// (es. scheda paziente, dettagli lavoro, dati di consegna). RigaDato non sa
// mai da sola se è urgente: `urgente` lo decide il chiamante SOLO per una
// consegna imminente (oggi o domani) — mai per altri significati generici di
// "importante". CardInfo inserisce il separatore tra le righe (mai dopo
// l'ultima) e avvisa in dev se il chiamante supera le 6 righe di legge (D230,
// era 5 fino al gate L2 del 05/08/2026 — v. la costante sotto): non
// le nasconde mai, la regola di prodotto non è applicabile a runtime (come
// TastoPrimario §5.1 — mostra sempre, avvisa solo chi sviluppa).

import { Children, Fragment, useEffect, type ReactNode } from 'react'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'

// D230 (05/08/2026) — SEI, non cinque. La carta «Il lavoro» della scheda che
// Francesco ha approvato (D225②) ne porta sei: dentista · paziente · lavoro ·
// colore · consegna · tecnico. Fino a oggi §5.10 ne dichiarava cinque e il
// nodo era APERTO nella spec: ogni render della scheda in sviluppo stampava un
// avviso in attesa di questa decisione. Ha vinto la carta scelta, non la regola
// scritta prima di vederla.
const MASSIMO_RIGHE = 6

/** I due toni ammessi per la pastiglia di una riga (v. `RigaDato.pastiglia`).
 *  Chiuso apposta: la pastiglia dice PROVENIENZA o STATO, e i due significati
 *  hanno un colore ciascuno — verde «viene dalla prescrizione / è allegata»,
 *  ambra «manca ancora qualcosa». Nessun terzo tono senza una decisione. */
export type TonoPastiglia = 'green' | 'amber'

/**
 * RigaDato — una riga chiave→valore dentro CardInfo (§5.10).
 *
 * Chiave caption 12.5/800 MAIUSCOLA `--faint` a sinistra · valore 17/700
 * `--ink` a destra (con `sub` 14/500 `--muted` opzionale sotto).
 *
 * `urgente` colora SOLO il valore in `--red` — riservato dal chiamante a una
 * consegna imminente (oggi o entro domani), MAI per altri significati di
 * "importante" (es. non usarlo per un valore economico alto).
 *
 * `pastiglia` (ondata B ③, D224 — mockup `2026-08-04-ondata-b3-schermate-vere.html`,
 * classi `.pill-presc` / `.fonte-stato`): una targhetta sotto il valore, allineata
 * a destra come lui, che dice DA DOVE viene quel dato o COSA gli manca ancora.
 * 🔑 Non è mai l'unica fonte del significato (L3): porta sempre la sua parola
 * accanto al colore, e la riga resta leggibile anche senza tinta.
 * ⚠️ NIENTE `white-space: nowrap`, benché il mockup ce l'abbia: a text-zoom
 * 200% (§13.3) una pastiglia che non va a capo esce dalla carta — è la lezione
 * misurata di D96 su `FoglioCategoria`, e non si ripete qui.
 * ✅ RATIFICATA in spec §5.10 il 04/08/2026 (T7, emendamento «RigaDato con
 * pastiglia di provenienza»). La spec dichiara anche la TENUTA SCARSA: la
 * pastiglia va solo dove la provenienza esiste davvero — colore ed elementi —
 * mai generalizzata alle altre righe. Dove la provenienza NON c'è si usa
 * `sub`, che è un segnale positivo quieto e non un'assenza da interpretare.
 */
export function RigaDato(props: {
  chiave: string
  valore: ReactNode
  sub?: string
  urgente?: boolean
  pastiglia?: { testo: string; tono: TonoPastiglia }
}) {
  const { chiave, valore, sub, urgente = false, pastiglia } = props
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spazio.m,
        padding: '9px 0',
      }}
    >
      <span
        style={{
          fontSize: tipografia.size.caption,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: tipografia.tracking.caption,
          textTransform: 'uppercase',
          color: 'var(--faint)',
        }}
      >
        {chiave}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span
          style={{
            fontSize: tipografia.size.body,
            fontWeight: tipografia.weight.bold,
            color: urgente ? 'var(--red)' : 'var(--ink)',
            textAlign: 'right',
          }}
        >
          {valore}
        </span>
        {sub && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--muted)',
              textAlign: 'right',
            }}
          >
            {sub}
          </span>
        )}
        {pastiglia && (
          <span
            className="ds-riga-pastiglia"
            style={{
              marginTop: 5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: raggio.pill,
              background: `var(--${pastiglia.tono}-tint)`,
              color: `var(--${pastiglia.tono})`,
              fontSize: tipografia.size.caption,
              fontWeight: tipografia.weight.extrabold,
              // Passo di tracking del mockup (`.pill-presc`): `tracking` non ha
              // questo valore, come già per §5.38 in CartaAlbum.
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textAlign: 'right',
            }}
          >
            {pastiglia.testo}
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * CardInfo — card di dati di sola lettura (§5.10): card 22 (`raggio.tile`),
 * padding 4/20, raccoglie fino a 6 `RigaDato` (D230, 05/08/2026 — erano 5) con
 * un separatore 1.5 `--line` tra una riga e l'altra (mai dopo l'ultima). Oltre
 * le 6 righe di legge non le nasconde — avvisa solo in dev (§5.10 non è
 * applicabile a runtime).
 */
export function CardInfo(props: { children: ReactNode }) {
  const { children } = props
  const righe = Children.toArray(children)

  useEffect(() => {
    if (righe.length > MASSIMO_RIGHE && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[CardInfo] ${righe.length} righe passate — massimo ${MASSIMO_RIGHE} RigheDato di legge (§5.10).`
      )
    }
  }, [righe.length])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: raggio.tile,
        padding: '4px 20px',
        background: 'var(--card)',
        boxShadow: 'var(--sh-card)',
      }}
    >
      {righe.map((riga, indice) => (
        <Fragment key={indice}>
          {riga}
          {indice < righe.length - 1 && <div style={{ height: 1.5, background: 'var(--line)' }} />}
        </Fragment>
      ))}
    </div>
  )
}
