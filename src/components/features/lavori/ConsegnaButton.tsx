'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import useSound from 'use-sound'
import { t } from '@/design-system/motion'
import type { ConsegnaError } from '@/types/domain'

interface ConsegnaButtonProps {
  lavoroId: string
  onSuccess?: () => void
}

type Stato = 'idle' | 'loading' | 'success' | 'error'

const BUTTON_STYLES: Record<Stato, React.CSSProperties> = {
  idle: {
    background: '#D4A843',
    color: 'var(--t1, #1C1916)',
    cursor: 'pointer',
  },
  loading: {
    background: '#D4A843',
    color: 'var(--t1, #1C1916)',
    opacity: 0.8,
    cursor: 'not-allowed',
  },
  success: {
    background: 'var(--success, #16A34A)',
    color: '#fff',
    boxShadow: '0 0 20px hsl(155 62% 47% / 0.5)',
    cursor: 'default',
  },
  error: {
    background: 'var(--primary, #D90012)',
    color: '#fff',
    cursor: 'pointer',
  },
}

const BUTTON_TEXT: Record<Stato, string> = {
  idle: '📦 CONSEGNA',
  loading: '⏳ Generando documenti...',
  success: '✅ Consegnato!',
  error: '⚠️ Riprova',
}

export function ConsegnaButton({ lavoroId, onSuccess }: ConsegnaButtonProps) {
  const [stato, setStato] = useState<Stato>('idle')
  const [errore, setErrore] = useState<string | null>(null)

  // use-sound gestisce silenziosamente i file mancanti — play() non lancia se il file non esiste
  const [playSuccess] = useSound('/sounds/success.mp3', {
    volume: 0.35,
    // Ignora errori di caricamento (file non ancora presente)
    onloaderror: () => undefined,
  })

  const handleClick = async () => {
    if (stato === 'loading' || stato === 'success') return

    setStato('loading')
    setErrore(null)

    try {
      const res = await fetch(`/api/lavori/${lavoroId}/consegna`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.ok) {
        try { playSuccess() } catch { /* suono facoltativo */ }
        setStato('success')
        onSuccess?.()
        return
      }

      const json = (await res.json()) as ConsegnaError
      if (json.tipo === 'precheck_fallito' && json.errori_precheck) {
        setErrore(json.errori_precheck.map(e => e.descrizione).join(', '))
      } else {
        setErrore(json.messaggio ?? 'Errore durante la consegna')
      }
      setStato('error')
    } catch {
      setErrore('Errore di rete — controlla la connessione')
      setStato('error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <motion.button
        onClick={handleClick}
        disabled={stato === 'loading' || stato === 'success'}
        whileTap={stato === 'idle' || stato === 'error' ? { scale: 0.96 } : undefined}
        transition={t('fast', 'enter')}
        style={{
          width: '100%',
          minHeight: '52px',
          padding: '14px 24px',
          borderRadius: '12px',
          border: 'none',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: `background ${t('normal', 'standard').duration}s, box-shadow ${t('normal', 'standard').duration}s`,
          ...BUTTON_STYLES[stato],
        }}
        aria-label={BUTTON_TEXT[stato]}
        aria-busy={stato === 'loading'}
      >
        {BUTTON_TEXT[stato]}
      </motion.button>

      <AnimatePresence>
        {errore && (
          <motion.p
            key="errore"
            initial={{ opacity: 0, transform: 'translateY(-6px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0, transform: 'translateY(-6px)' }}
            transition={t('fast', 'enter')}
            style={{
              margin: 0,
              color: 'var(--primary, #D90012)',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
            role="alert"
          >
            {errore}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
