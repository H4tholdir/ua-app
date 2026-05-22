'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  pazienteId: string
  pazienteNome: string
}

export function PazienteArchiviaButton({ pazienteId, pazienteNome }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleArchivia() {
    if (!window.confirm(`Archiviare il paziente "${pazienteNome}"?\n\nI lavori collegati non verranno modificati.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/pazienti/${pazienteId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/pazienti')
        router.refresh()
      } else {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? 'Errore durante l\'archiviazione')
        setLoading(false)
      }
    } catch {
      alert('Errore di rete — riprova')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleArchivia}
      disabled={loading}
      aria-label={`Archivia paziente ${pazienteNome}`}
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
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 4.5h12M2 4.5v9a1 1 0 001 1h10a1 1 0 001-1v-9M2 4.5L3.5 2h9L14 4.5M6.5 7.5v4M9.5 7.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {loading ? 'Archiviazione…' : 'Archivia paziente'}
    </button>
  )
}
