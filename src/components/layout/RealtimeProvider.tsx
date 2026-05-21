'use client'

import { useRealtimeNotifiche } from '@/hooks/useRealtimeNotifiche'
import { ToastNotifiche } from '@/components/ui/ToastNotifiche'

interface Props {
  laboratorioId: string | null
  ruolo: string | null
  children: React.ReactNode
}

export function RealtimeProvider({ laboratorioId, ruolo, children }: Props) {
  const { notifiche, dismiss, isConnected } = useRealtimeNotifiche(laboratorioId, ruolo)
  return (
    <>
      <ToastNotifiche notifiche={notifiche} onDismiss={dismiss} />
      {/* Dot "Live" — visibile solo quando connesso (TASK 8d) */}
      {isConnected && (
        <div
          aria-label="Aggiornamenti in tempo reale attivi"
          title="Live"
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 201,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--sfc, #E4DFD9)',
            borderRadius: '20px',
            padding: '3px 8px 3px 6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
            pointerEvents: 'none',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--success, #16A34A)',
              display: 'block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--t2, #96918D)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Live
          </span>
        </div>
      )}
      {children}
    </>
  )
}
