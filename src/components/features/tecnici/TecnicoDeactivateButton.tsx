'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hapticLight } from '@/lib/feedback/haptic'

interface Props {
  tecnicoId: string
  tecnicoNome: string
}

export function TecnicoDeactivateButton({ tecnicoId, tecnicoNome }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      `Disattivare ${tecnicoNome}?\n\nIl tecnico non potrà più accedere al laboratorio. I suoi dati e la cronologia lavori rimarranno intatti.`
    )
    if (!confirmed) return

    setLoading(true)
    hapticLight()
    try {
      const res = await fetch(`/api/tecnici/${tecnicoId}/deactivate`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error ?? 'Errore durante la disattivazione')
        return
      }
      setDone(true)
      router.refresh()
    } catch {
      alert('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span style={{
        fontSize: 12, color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif',
        padding: '6px 10px', background: 'var(--prs)', borderRadius: 8,
      }}>
        ✓ Disattivato
      </span>
    )
  }

  return (
    <button
      onClick={handleDeactivate}
      disabled={loading}
      style={{
        padding: '8px 14px',
        background: 'transparent',
        border: '1px solid var(--primary, #D90012)',
        borderRadius: 9, fontSize: 12, fontWeight: 600,
        color: 'var(--primary, #D90012)',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'DM Sans, sans-serif',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? '...' : '🚫 Disattiva'}
    </button>
  )
}
