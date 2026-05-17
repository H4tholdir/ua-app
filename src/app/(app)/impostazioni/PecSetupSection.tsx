'use client'

// Wrapper client-side per PecSetupCard.
// Gestisce le chiamate API /api/pec/config e /api/pec/test.
// Viene montato come client island nel Server Component impostazioni/page.tsx.

import { PecSetupCard } from './PecSetupCard'

interface PecSetupSectionProps {
  currentEmail?: string
  configurata?: boolean
}

export function PecSetupSection({ currentEmail, configurata }: PecSetupSectionProps) {
  async function handleSave(
    email: string,
    password: string,
    smtpOverride?: { host: string; port: number; secure: boolean }
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch('/api/pec/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...smtpOverride }),
      })
      const json = await res.json() as { ok: boolean; error?: string; message?: string }
      return { ok: json.ok, error: json.error ?? json.message }
    } catch {
      return { ok: false, error: 'Errore di rete. Riprova.' }
    }
  }

  async function handleTest(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch('/api/pec/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json() as { ok: boolean; message: string }
      return { ok: json.ok, message: json.message }
    } catch {
      return { ok: false, message: 'Errore di rete. Riprova.' }
    }
  }

  return (
    <PecSetupCard
      currentEmail={currentEmail}
      configurata={configurata}
      onSave={handleSave}
      onTest={handleTest}
    />
  )
}
