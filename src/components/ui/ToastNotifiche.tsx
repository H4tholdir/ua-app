'use client'

import { useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import type { Notifica, TipoNotifica } from '@/hooks/useRealtimeNotifiche'

interface Props {
  notifiche: Notifica[]
  onDismiss: (id: string) => void
}

const TIPO_CONFIG: Record<TipoNotifica, { borderColor: string; icon: string; label: string }> = {
  segnalazione: {
    borderColor: 'var(--primary, #D90012)',
    icon: '⚠',
    label: 'Segnalazione',
  },
  pronto: {
    borderColor: 'var(--success, #16A34A)',
    icon: '✅',
    label: 'Pronto',
  },
  ordine_dentista: {
    borderColor: 'var(--c-blue, #3B82F6)',
    icon: '📩',
    label: 'Richiesta',
  },
  urgente: {
    borderColor: 'var(--gold, #D4A843)',
    icon: '⚡',
    label: 'Urgente',
  },
}

interface ToastItemProps {
  notifica: Notifica
  onDismiss: (id: string) => void
  reducedMotion: boolean
}

function ToastItem({ notifica, onDismiss, reducedMotion }: ToastItemProps) {
  const router = useRouter()
  const cfg = TIPO_CONFIG[notifica.tipo]
  const touchStartY = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss after 5s
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(notifica.id)
    }, 5000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [notifica.id, onDismiss])

  const handleCta = useCallback(() => {
    onDismiss(notifica.id)
    if (notifica.href) router.push(notifica.href)
  }, [notifica.id, notifica.href, onDismiss, router])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return
      const deltaY = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current
      // Swipe up = dismiss
      if (deltaY < -30) {
        onDismiss(notifica.id)
      }
      touchStartY.current = null
    },
    [notifica.id, onDismiss],
  )

  const animationProps = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: motionTokens.duration.instant },
      }
    : {
        initial: { y: -60, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -60, opacity: 0 },
        transition: motionTokens.spring.snappy,
      }

  return (
    <motion.div
      layout
      {...animationProps}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        pointerEvents: 'auto',
        background: 'var(--sfc, #E4DFD9)',
        borderRadius: '14px',
        borderLeft: `4px solid ${cfg.borderColor}`,
        boxShadow: [
          '-5px -5px 11px rgba(255,255,255,.72)',
          '9px 12px 22px -4px rgba(148,128,118,.40)',
        ].join(', '),
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        marginBottom: '8px',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onClick={handleCta}
      role={notifica.tipo === 'segnalazione' || notifica.tipo === 'urgente' ? 'alert' : 'status'}
      aria-live={notifica.tipo === 'segnalazione' || notifica.tipo === 'urgente' ? 'assertive' : 'polite'}
    >
      {/* Icon */}
      <span
        aria-hidden="true"
        style={{
          fontSize: '20px',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {cfg.icon}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--t1, #1C1916)',
            margin: 0,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {notifica.titolo}
        </p>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: 'var(--t2, #4A3D33)',
            margin: '2px 0 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {notifica.sub}
        </p>
      </div>

      {/* CTA */}
      {notifica.cta && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleCta()
          }}
          style={{
            flexShrink: 0,
            minHeight: '44px',
            padding: '0 12px',
            borderRadius: '10px',
            background: 'var(--elv, #EDEDEA)',
            border: 'none',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--t1, #1C1916)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label={`${notifica.cta} — ${notifica.titolo}`}
        >
          {notifica.cta}
        </button>
      )}

      {/* Dismiss (X) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss(notifica.id)
        }}
        aria-label="Chiudi notifica"
        style={{
          flexShrink: 0,
          minHeight: '44px',
          minWidth: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          border: 'none',
          background: 'transparent',
          color: 'var(--t3, #6B5C51)',
          fontSize: '16px',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        ✕
      </button>
    </motion.div>
  )
}

export function ToastNotifiche({ notifiche, onDismiss }: Props) {
  const reducedMotion = useReducedMotion()

  if (notifiche.length === 0) return null

  return (
    <div
      aria-label="Notifiche in-app"
      style={{
        position: 'fixed',
        top: 60,
        left: 0,
        right: 0,
        zIndex: 200,
        padding: '0 16px',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {notifiche.map((n) => (
          <ToastItem
            key={n.id}
            notifica={n}
            onDismiss={onDismiss}
            reducedMotion={reducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
