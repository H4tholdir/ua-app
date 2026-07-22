'use client'

// Polish Livello 1 (2026-07-14) — SchedaNavRail: il rail di navigazione desktop
// della scheda-vista v3. Nasce perché registrando `/lavori/[id]` come route v3
// (isV3MigratedRoute) si ritirano avatar + BottomNavPill legacy: su desktop la
// scheda resterebbe senza navigazione. Il NavDesk della home (§5.37) è
// pile-specifico (richiede conteggi/segnale/StrisciaStato), quindi qui vive un
// rail GENERICO — logo, «+ Nuovo lavoro», le voci-app standard (le stesse
// destinazioni della BottomNavPill) e il toggle tema in fondo. Reso solo da
// ≥1024 via CSS (`.scheda-rail` in ds-v3.css); su mobile/tablet `display:none`.
// Variante approvata da Francesco: mockup `2026-07-14-scheda-v3-desktop-varianti`
// (V3 «Bilanciata»).

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, raggio, spazio, tipografia, testoSuFaccia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton'

type Voce = { href: string; etichetta: string; glifo: string }

// Stesse destinazioni della BottomNavPill (l'ordine segue la nav mobile).
// Task 7 (ondata A mini-triage): la voce «Lavori» → `/lavori` è stata
// rimossa. `/lavori` senza `?pila=` ora fa redirect a `/dashboard` (morte
// di «Le pile»): un ripuntamento nudo della voce a `/dashboard` avrebbe
// duplicato «Oggi» già presente sopra — rimozione = ripuntamento senza
// duplicato (decisions doc, caso «rimuovere/ripuntare»).
const VOCI: Voce[] = [
  { href: '/dashboard', etichetta: 'Oggi', glifo: '▦' },
  { href: '/clienti', etichetta: 'Clienti', glifo: '◔' },
  { href: '/fatture', etichetta: 'Fatture', glifo: '🧾' },
  { href: '/scadenzario', etichetta: 'Sospesi', glifo: '⏱' },
  { href: '/tutto-il-resto', etichetta: 'Tutto il resto', glifo: '☰' },
]

function voceAttiva(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export function SchedaNavRail() {
  const pathname = usePathname()
  const router = useRouter()

  function nuovoLavoro() {
    suona('tap')
    vibra('medium')
    router.push('/lavori/nuovo')
  }

  return (
    <aside className="scheda-rail" aria-label="Navigazione">
      <div
        style={{
          fontSize: 22,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: '-0.5px',
          padding: `${spazio.s}px ${spazio.s}px ${spazio.m}px`,
          color: 'var(--ink)',
        }}
      >
        U<span style={{ color: 'var(--red)' }}>À</span>
      </div>

      <motion.button
        type="button"
        onClick={nuovoLavoro}
        whileTap={{ y: 3, scale: 0.995 }}
        transition={molla.press}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spazio.s,
          height: 48,
          borderRadius: raggio.tasto,
          border: 'none',
          background: gradiente.tastoPrimario,
          color: testoSuFaccia,
          fontSize: tipografia.size.callout,
          fontWeight: tipografia.weight.bold,
          fontFamily: tipografia.famiglia,
          cursor: 'pointer',
        }}
      >
        + Nuovo lavoro
      </motion.button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: spazio.m }}>
        {VOCI.map((v) => {
          const attiva = voceAttiva(v.href, pathname)
          return (
            <Link
              key={v.href}
              href={v.href}
              className="ds-tap-v3"
              aria-current={attiva ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: `10px ${spazio.s}px`,
                borderRadius: raggio.riga,
                textDecoration: 'none',
                fontFamily: tipografia.famiglia,
                fontSize: tipografia.size.callout,
                fontWeight: tipografia.weight.semibold,
                color: attiva ? 'var(--ink)' : 'var(--muted)',
                background: attiva ? 'var(--card)' : 'transparent',
                boxShadow: attiva ? 'var(--sh-card)' : 'none',
              }}
            >
              <span aria-hidden="true" style={{ width: 20, textAlign: 'center', opacity: 0.85 }}>
                {v.glifo}
              </span>
              {v.etichetta}
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spazio.s }}>
        <span style={{ fontSize: tipografia.size.caption, color: 'var(--faint)', fontWeight: tipografia.weight.semibold }}>
          Tema
        </span>
        <ThemeToggleButton />
      </div>
    </aside>
  )
}
