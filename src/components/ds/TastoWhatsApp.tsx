'use client'

// DS v3 §5.29 — TastoWhatsApp: il tasto verde DEDICATO alle azioni «apri
// WhatsApp» (mockup consegna.html `.wa-btn` = legge). MAI il verde di stato
// (--green): gradiente §3.3.4 pinnato, identico nei due temi. Contratto
// sicurezza (spec 16/07 §2.3): `waUrl` DEVE iniziare con https://wa.me/ —
// niente href arbitrari (javascript:, data:). Ombra ambiente sul wrapper come
// TastoPrimario (§3.2: dark è flat, --sh-card risolve a none).

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, raggio, tipografia, verdeWhatsApp, testoSuFaccia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

const CORSA_RIPOSO = `0 5px 0 ${verdeWhatsApp.corsa}`
const CORSA_PREMUTA = `0 1px 0 ${verdeWhatsApp.corsa}`
const PREFISSO_SICURO = 'https://wa.me/'

export function TastoWhatsApp(props: { waUrl: string; children?: ReactNode }) {
  const { waUrl, children = 'Invia messaggio WhatsApp' } = props

  if (!waUrl.startsWith(PREFISSO_SICURO)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[TastoWhatsApp] waUrl rifiutata (deve iniziare con ${PREFISSO_SICURO})`)
    }
    return null
  }

  function handleClick() {
    suona('tap')
    vibra('medium')
  }

  return (
    <div style={{ width: '100%', maxWidth: 480, borderRadius: raggio.riga, boxShadow: 'var(--sh-card)' }}>
      <style>{`
        .ds-tasto-whatsapp:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
      `}</style>
      <motion.a
        className="ds-tasto-whatsapp"
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        whileTap={{ y: 4, scale: 0.995, boxShadow: CORSA_PREMUTA }}
        transition={molla.press}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 11,
          width: '100%',
          height: 62,
          borderRadius: raggio.riga,
          background: gradiente.tastoWhatsApp,
          boxShadow: CORSA_RIPOSO,
          color: testoSuFaccia,
          fontSize: 17.5,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: '0.01em',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5Z" />
        </svg>
        {children}
      </motion.a>
    </div>
  )
}
