'use client'

// DS v3 §5.35 (Task 9) — NavDesk: sostituisce home+☰ su desktop (≥1024, mockup
// `home.html` `.nav-desk`). Aside 240px `--bg-deep` con logo, «+ Nuovo lavoro»,
// le 4 voci-pila (badge numerico colore-famiglia) + le sezioni statiche, e in
// fondo (`marginTop: auto`) la StrisciaStato — che su desktop lascia il footer
// della home mobile e vive qui (mockup: «su desktop la StrisciaStato vive nel
// footer nav»). Le voci sono `<Link>` (ADR B6 — selezione via `?pila=`,
// navigazione dichiarativa, zero stato client duplicato); il tasto «+ Nuovo
// lavoro» resta un `<button>` (non una selezione di pila).
//
// Il tasto «+ Nuovo lavoro» NON riusa `TastoPrimario` (H fissa 70/60, §5.1):
// qui la legge vuole H 52/testo 16, una misura che il componente condiviso
// non espone. Stesso schema di `TastoConsegnaInline` in `CardLavoro.tsx` —
// una variante fisica locale, stessa faccia/corsa/suono/vibra, taglia propria.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, raggio, tipografia, testoSuFaccia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'
import type { Pila } from '@/lib/lavori/urgenza'

const CORSA_RIPOSO = '0 6px 0 var(--red-dark)'
const CORSA_PREMUTA = '0 1px 0 var(--red-dark)'

/** Variante locale H52/testo16 del tasto fisico (v. nota sopra). */
function TastoNuovoLavoro() {
  const router = useRouter()

  function handleClick() {
    suona('tap')
    vibra('medium')
    router.push('/lavori/nuovo')
  }

  return (
    <>
      <style>{`
        .ds-nav-nuovo:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
      `}</style>
      <motion.button
        type="button"
        className="ds-nav-nuovo"
        onClick={handleClick}
        whileTap={{ y: 5, scale: 0.995, boxShadow: CORSA_PREMUTA }}
        transition={molla.press}
        style={{
          width: '100%',
          height: 52,
          borderRadius: raggio.tasto,
          border: 'none',
          background: gradiente.tastoPrimario,
          color: testoSuFaccia,
          fontSize: 16,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          boxShadow: CORSA_RIPOSO,
          cursor: 'pointer',
        }}
      >
        + Nuovo lavoro
      </motion.button>
    </>
  )
}

const VOCI_PILA: Array<{ pila: Pila; nome: string; colore: string; tint: string }> = [
  { pila: 'rossa', nome: 'Oggi', colore: 'var(--red)', tint: 'var(--red-tint)' },
  { pila: 'ambra', nome: 'Sul banco', colore: 'var(--amber)', tint: 'var(--amber-tint)' },
  { pila: 'viola', nome: 'Da rifare', colore: 'var(--purple)', tint: 'var(--purple-tint)' },
  { pila: 'blu', nome: 'Appena arrivati', colore: 'var(--blue)', tint: 'var(--blue-tint)' },
]

const VOCI_ALTRE: Array<{ nome: string; href: string }> = [
  { nome: 'Agenda', href: '/agenda' },
  { nome: 'Dentisti', href: '/clienti' },
  { nome: 'Fatture', href: '/fatture' },
  { nome: 'Magazzino', href: '/magazzino' },
  { nome: 'Documenti', href: '/qualita' },
]

function Badge(props: { children: ReactNode; colore: string; tint: string }) {
  const { children, colore, tint } = props
  return (
    <span
      style={{
        minWidth: 24,
        height: 24,
        padding: '0 7px',
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: tipografia.weight.extrabold,
        fontVariantNumeric: 'tabular-nums',
        background: tint,
        color: colore,
      }}
    >
      {children}
    </span>
  )
}

function Voce(props: { nome: string; href: string; selezionata: boolean; badge?: ReactNode }) {
  const { nome, href, selezionata, badge } = props
  return (
    <Link
      href={href}
      aria-current={selezionata ? 'true' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 48,
        padding: '0 14px',
        borderRadius: 12,
        background: selezionata ? 'var(--bg)' : 'transparent',
        color: selezionata ? 'var(--ink)' : 'var(--muted)',
        fontSize: 16,
        fontWeight: selezionata ? tipografia.weight.bold : tipografia.weight.semibold,
        textDecoration: 'none',
      }}
    >
      <span style={{ flex: 1 }}>{nome}</span>
      {badge}
    </Link>
  )
}

export function NavDesk(props: { conteggi: Record<Pila, number>; pilaSelezionata: Pila; segnale: SegnaleStriscia }) {
  const { conteggi, pilaSelezionata, segnale } = props

  return (
    <aside style={{ background: 'var(--bg-deep)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden' }}>
      <div style={{ fontSize: 26, fontWeight: tipografia.weight.extrabold, letterSpacing: '-0.02em', color: 'var(--ink)', padding: '0 8px' }}>
        UÀ<em style={{ fontStyle: 'normal', color: 'var(--red)' }}>.</em>
      </div>

      <TastoNuovoLavoro />

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {VOCI_PILA.map(({ pila, nome, colore, tint }) => (
          <Voce
            key={pila}
            nome={nome}
            href={`/dashboard?pila=${pila}`}
            selezionata={pila === pilaSelezionata}
            badge={<Badge colore={colore} tint={tint}>{conteggi[pila]}</Badge>}
          />
        ))}
        {VOCI_ALTRE.map(({ nome, href }) => (
          <Voce key={nome} nome={nome} href={href} selezionata={false} />
        ))}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <StrisciaStato attenzione={segnale.attenzione} forte={segnale.forte} azione={segnale.azione}>
          {segnale.testo}
        </StrisciaStato>
      </div>
    </aside>
  )
}
