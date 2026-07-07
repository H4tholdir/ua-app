'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  cicloId: string
  cicloNome: string
}

export function CicloDeleteButton({ cicloId, cicloNome }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Eliminare il ciclo "${cicloNome}"?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/cicli/${cicloId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/cicli-produzione')
        router.refresh()
      } else {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? 'Errore durante l\'eliminazione')
        setDeleting(false)
      }
    } catch {
      alert('Errore di rete — riprova')
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label={`Elimina ciclo ${cicloNome}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 16px',
        minHeight: '44px',
        borderRadius: '12px',
        border: '1px solid rgba(217,0,18,.25)',
        background: 'rgba(217,0,18,.06)',
        color: '#D90012',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600,
        fontSize: '13px',
        cursor: deleting ? 'wait' : 'pointer',
        opacity: deleting ? 0.6 : 1,
      }}
    >
      {deleting ? 'Eliminazione…' : 'Elimina ciclo'}
    </button>
  )
}
