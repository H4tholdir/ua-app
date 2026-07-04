'use client'
import { useState } from 'react'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'

interface AccettaInvitoReteFormProps {
  token: string
  reteNome: string
}

const fontFamily = "'DM Sans', system-ui, sans-serif"

export function AccettaInvitoReteForm({ token, reteNome }: AccettaInvitoReteFormProps) {
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccetta = async () => {
    setError(null)
    setAccepting(true)
    hapticLight()

    try {
      const res = await fetch(`/api/rete/inviti/${token}/accept`, { method: 'POST' })

      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? "Errore durante l'accettazione, riprova")
        setAccepting(false)
        return
      }

      const data = (await res.json()) as { rete_id: string }
      hapticMedium()
      window.location.href = `/rete/${data.rete_id}`
    } catch {
      setError('Errore di rete — controlla la connessione')
      setAccepting(false)
    }
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'var(--sfc, #E4DFD9)', borderRadius: '12px', padding: '20px' }}>
        <p style={{ color: 'var(--t1, #1C1916)', fontSize: 15, fontFamily, margin: 0, lineHeight: 1.5 }}>
          Sei stato invitato a unire il tuo laboratorio alla rete <strong>{reteNome}</strong>.
        </p>
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, fontFamily, fontSize: 13, color: 'var(--primary, #D90012)' }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAccetta}
        disabled={accepting}
        style={{
          padding: '13px',
          background: accepting ? 'var(--prs)' : 'var(--primary, #D90012)',
          color: 'white',
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 15,
          border: 'none',
          cursor: accepting ? 'not-allowed' : 'pointer',
          fontFamily,
          minHeight: 48,
        }}
      >
        {accepting ? 'Accettazione...' : 'Accetta'}
      </button>
    </div>
  )
}
