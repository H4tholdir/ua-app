'use client'
import { useState, useTransition } from 'react'

export function PreferenzaDashboardToggle({
  current,
}: {
  current: 'ibrido' | 'gestione_solo'
}) {
  const [val, setVal] = useState(current)
  const [isPending, startTransition] = useTransition()

  async function toggle() {
    const next = val === 'ibrido' ? 'gestione_solo' : 'ibrido'
    setVal(next)
    startTransition(async () => {
      await fetch('/api/impostazioni/preferenze', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferenza_dashboard: next }),
      })
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
      <div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--t1, #1C1916)', margin: 0 }}>
          Vista dashboard
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t2, #96918D)', margin: '2px 0 0' }}>
          {val === 'ibrido' ? 'Mostra tab Gestione + Produzione' : 'Solo vista Gestione (business)'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        style={{
          padding: '6px 14px',
          borderRadius: '100px',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'DM Sans, sans-serif',
          background: val === 'ibrido' ? 'var(--primary, #D90012)' : 'var(--prs, #D4CFC9)',
          color: val === 'ibrido' ? '#fff' : 'var(--t2, #96918D)',
          border: 'none',
          cursor: 'pointer',
          opacity: isPending ? .6 : 1,
        }}
      >
        {val === 'ibrido' ? 'Ibrida' : 'Solo gestione'}
      </button>
    </div>
  )
}
