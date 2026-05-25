'use client'

import { useRealtimeNotifiche } from '@/hooks/useRealtimeNotifiche'
import { ToastNotifiche } from '@/components/ui/ToastNotifiche'

interface Props {
  laboratorioId: string | null
  ruolo: string | null
  children: React.ReactNode
}

export function RealtimeProvider({ laboratorioId, ruolo, children }: Props) {
  const { notifiche, dismiss } = useRealtimeNotifiche(laboratorioId, ruolo)
  return (
    <>
      <ToastNotifiche notifiche={notifiche} onDismiss={dismiss} />
      {children}
    </>
  )
}
