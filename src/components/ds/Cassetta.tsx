'use client'

// DS v3 §5.35 (spec docs/superpowers/specs/2026-07-21-parete-cassette-design.md §5/§13) —
// Cassetta (tray): la cella della Parete, fedele 1:1 al mockup ratificato
// `docs/design/mockups/2026-07-20-parete-cassette-v2.html` (righe 66-105 CSS, 229-268 markup
// demo). Corpo gradiente + linguetta `::before` + cavità con `MiniaturaLavoro` (§5.36) + targa
// (troncamento CSS ~6ch, SR legge il nome completo via `aria-label` — il troncamento è visivo,
// non semantico) + riga «n.{numero} · {dentista}».
//
// Le 6 coppie di gradiente standard (righe 77-82 del mockup) sono FISSE e verbatim — vivono come
// classi CSS in `src/app/ds-v3.css` (`.ds-cassetta.<slug>`), non come token derivato: sono valori
// letterali già ratificati (brief Task 10, risoluzione 4 — "non normalizzarla, non derivarla da
// token"). Il colore custom (hex) è l'unico caso davvero per-istanza e resta inline qui, via la
// formula `color-mix` data dal brief.
//
// Stati: libera (cavità vuota, targa outline, «libera» al 60%) · accesa (ricerca: anello blu 3px
// + elevazione, `aria-current="true"` — mai solo colore, spec §12) · spenta (opacity .3 +
// desaturazione — resta un `<button>` NON-disabled e tappabile: è opacità, non inattività).
//
// Gesti (spec §5.4/§5.35): tap = azione primaria (`onTap`) · hold 300ms fermo (<8px di
// spostamento) = apre lo sheet cassetta (`onLongPressSheet`) · spostamento oltre 8px = solleva il
// drag, gestito dal chiamante (Task 11: griglia/riordino) — qui `draggable` è solo l'affordance
// (cursor grab + attributo HTML nativo), non l'implementazione del riordino.

import { useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { cssEase } from '@/design-system/v3/motion'
import { miniaturaPerLavoro } from '@/lib/domain/miniature-lavoro'
import { MiniaturaLavoro } from './MiniaturaLavoro'

const SOGLIA_LONG_PRESS_MS = 300
const SOGLIA_MOVIMENTO_PX = 8

// Le 6 facce standard vivono come classi in ds-v3.css (v. nota di testa) — questo Set serve
// SOLO a decidere "applica la classe" vs "componi il gradiente custom inline" (il solo caso
// per-istanza: un hex arbitrario non può essere una classe statica).
const SLUG_STANDARD = new Set(['rossa', 'blu', 'azzurra', 'grigia', 'bianca', 'verde'])

function luminanzaRelativa(hex: string): number {
  const canale = (byte: number) => {
    const s = byte / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const r = canale(parseInt(hex.slice(1, 3), 16))
  const g = canale(parseInt(hex.slice(3, 5), 16))
  const b = canale(parseInt(hex.slice(5, 7), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * targaScura (§5.35) — quando la faccia della cassetta è chiara, targa/riga "cont" passano a
 * inchiostro scuro (altrimenti bianco su bianco/azzurro sarebbe illeggibile: pura leggibilità
 * del testo, il colore non è mai l'unica fonte di stato altrove nel componente).
 * - slug `bianca`/`azzurra` → sempre `true` (le uniche due facce standard chiare).
 * - hex custom → luminanza relativa WCAG > 0.55 → `true`.
 * - qualunque altro slug standard (rossa/blu/grigia/verde) → `false`.
 */
export function targaScura(colore: string): boolean {
  if (colore === 'bianca' || colore === 'azzurra') return true
  if (/^#[0-9A-Fa-f]{6}$/.test(colore)) return luminanzaRelativa(colore) > 0.55
  return false
}

export type StatoCassetta = 'normale' | 'accesa' | 'spenta'

// Shape allineata (duck-typing) a `CassettaParete['lavoro']` di `src/lib/cassette/parco-shared.ts`
// (Task 3) — il chiamante (Task 11) passa il dato così com'è, senza rimapping: qui prendiamo
// solo i campi che ci servono per il testo e per risolvere la miniatura.
export type LavoroCassetta = {
  numero: string
  dentista: string
  descrizione: string | null
  tipoDispositivo: string | null
}

export function Cassetta(props: {
  id: string
  nome: string
  colore: string
  lavoro: LavoroCassetta | null
  stato: StatoCassetta
  onTap: () => void
  onLongPressSheet?: () => void
  draggable?: boolean
}) {
  const { id, nome, colore, lavoro, stato, onTap, onLongPressSheet, draggable = false } = props

  // Stato del gesto in ref (non state): niente re-render durante pointermove, il tap/long-press
  // si decide solo al rilascio.
  const inizio = useRef<{ x: number; y: number } | null>(null)
  const spostato = useRef(false)
  const pressioneLunga = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function pulisciTimer() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  function handlePointerDown(evento: ReactPointerEvent<HTMLButtonElement>) {
    inizio.current = { x: evento.clientX, y: evento.clientY }
    spostato.current = false
    pressioneLunga.current = false
    // Il timer parte solo se il chiamante vuole davvero il gesto: senza `onLongPressSheet` ogni
    // rilascio fermo ricade sul tap, qualunque sia la durata della pressione (nessuna azione
    // persa per una cassetta che non offre lo sheet via long-press).
    if (onLongPressSheet) {
      timer.current = setTimeout(() => {
        pressioneLunga.current = true
      }, SOGLIA_LONG_PRESS_MS)
    }
  }

  function handlePointerMove(evento: ReactPointerEvent<HTMLButtonElement>) {
    if (!inizio.current) return
    const dx = evento.clientX - inizio.current.x
    const dy = evento.clientY - inizio.current.y
    if (Math.hypot(dx, dy) > SOGLIA_MOVIMENTO_PX) {
      // Spostamento oltre soglia = sollevamento drag (gestito dal chiamante, Task 11): qui
      // annulliamo solo il timer, niente tap né sheet al rilascio.
      spostato.current = true
      pulisciTimer()
    }
  }

  function handlePointerUp() {
    // Guardia (review Task 10, Important): senza un pointerdown corrispondente su QUESTO
    // elemento, `spostato`/`pressioneLunga` sono nel loro stato di riposo (azzerati solo al
    // pointerdown, mai al pointerup) — un pointerup "orfano" (down su un'altra cassetta o sullo
    // sfondo, rilascio qui: raggiungibile con mouse/penna, dove NON c'è pointer capture implicita
    // come su touch) troverebbe `spostato=false` e chiamerebbe `onTap()` per un gesto mai iniziato
    // su questo bottone. `inizio.current` è `null` finché non arriva un pointerdown genuino.
    if (!inizio.current) return
    pulisciTimer()
    if (!spostato.current) {
      if (pressioneLunga.current) {
        onLongPressSheet?.()
      } else {
        onTap()
      }
    }
    inizio.current = null
  }

  function handlePointerCancel() {
    // Anche un drag nativo (draggable=true) che prende il sopravvento cancella qui: nessuna
    // azione fantasma al termine di un gesto interrotto.
    pulisciTimer()
    inizio.current = null
  }

  function handleKeyDown(evento: ReactKeyboardEvent<HTMLButtonElement>) {
    // Tastiera: Invio/Spazio = SEMPRE azione primaria. Il long-press non ha un equivalente da
    // tastiera (niente pointerdown/up da qui) — chi naviga a tastiera arriva sempre al tap.
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      onTap()
    }
  }

  const occupata = !!lavoro
  const scura = targaScura(colore)
  const classeColoreStandard = SLUG_STANDARD.has(colore) ? colore : undefined
  const backgroundCustom = classeColoreStandard
    ? undefined
    : `linear-gradient(180deg, ${colore}, color-mix(in srgb, ${colore} 72%, black))`

  const classi = [
    'ds-cassetta',
    classeColoreStandard,
    occupata ? undefined : 'is-libera',
    scura ? 'is-chiara' : undefined,
    stato === 'accesa' ? 'is-accesa' : undefined,
    stato === 'spenta' ? 'is-spenta' : undefined,
    draggable ? 'is-draggable' : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  // SOLO `descrizione` (testo libero scritto da un umano): `tipoDispositivo` è uno slug macchina
  // (es. "protesi_fissa") che uno screen reader pronuncerebbe alla lettera — meglio un'etichetta
  // più corta che una che parla in gergo macchina (review Task 10, M5). Nessuna mappa nuova: se
  // `descrizione` manca, quella parte dell'etichetta si omette, non si sostituisce.
  const etichetta = lavoro
    ? `Cassetta ${nome}, occupata: lavoro n.${lavoro.numero}, ${lavoro.dentista}${lavoro.descrizione ? `, ${lavoro.descrizione}` : ''}`
    : `Cassetta ${nome}, libera`

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): questo componente lo porta con sé, come
          gli altri ds (v. CardLavoro/TastoTondo). */}
      <style>{`
        .ds-cassetta:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <button
        type="button"
        data-cassetta-id={id}
        className={classi}
        style={{
          background: backgroundCustom,
          // Mockup riga 69: `transition: opacity 200ms` — SOLO opacity, non uno shorthand `all`
          // (che animerebbe anche l'anello di `accesa`, il `filter: saturate()` di `spenta` e il
          // background custom). `cssEase.generico` resta la fonte del tempo/easing (v3/motion.ts
          // §8.1) — NIENTE duration/ease inventati, solo la proprietà è esplicita (review M2).
          transition: `opacity ${cssEase.generico}`,
        }}
        draggable={draggable}
        aria-label={etichetta}
        aria-current={stato === 'accesa' ? 'true' : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
      >
        <span className="ds-cassetta-cavita">
          {lavoro && <MiniaturaLavoro id={miniaturaPerLavoro(lavoro.descrizione, lavoro.tipoDispositivo)} />}
        </span>
        <span className="ds-cassetta-targa">{nome}</span>
        <span className="ds-cassetta-cont">{occupata ? `n.${lavoro.numero} · ${lavoro.dentista}` : 'libera'}</span>
      </button>
    </>
  )
}
