'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  articoloId: string
  articoloNome: string
}

export function MagazzinoDeleteButton({ articoloId, articoloNome }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Eliminare "${articoloNome}" dal magazzino?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/magazzino/${articoloId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/magazzino')
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
      aria-label={`Elimina ${articoloNome} dal magazzino`}
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
        transition: 'opacity 0.15s',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {deleting ? 'Eliminazione…' : 'Elimina articolo'}
    </button>
  )
}
