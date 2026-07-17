'use client'

// N14b Opzione C: il modal di registrazione passkey non blocca più il login.
// Il login «arma» il prompt (sessionStorage, TTL) e la dashboard lo mostra
// qui, non-bloccante, poco dopo il primo paint — così non ruba il primo
// sguardo alla coda lavori ma resta contestuale al login appena avvenuto.
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { consumePasskeyPrompt } from '@/lib/auth/passkey-prompt'

const PasskeyRegistrationModal = dynamic(
  () => import('@/components/features/auth/PasskeyRegistrationModal'),
  { ssr: false }
)

// Ritardo post-paint prima di mostrare il bottom sheet (advisor UX: ~800ms).
const POST_PAINT_DELAY_MS = 800

export function PasskeyPromptOnDashboard() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    // consumePasskeyPrompt è one-shot: rimuove il flag e restituisce l'email
    // solo se il prompt è entro il TTL (login appena avvenuto).
    const armed = consumePasskeyPrompt()
    if (!armed) return
    const id = setTimeout(() => setEmail(armed), POST_PAINT_DELAY_MS)
    return () => clearTimeout(id)
  }, [])

  if (!email) return null

  return <PasskeyRegistrationModal email={email} onDone={() => setEmail(null)} />
}
