'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface CicloListItem {
  id: string
  codice: string
  nome: string
  tipo_dispositivo: string
}

const fontFamily = "'DM Sans', system-ui, sans-serif"

export function CicliProduzioneList({ cicli }: { cicli: CicloListItem[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? cicli.filter((c) =>
        c.codice.toLowerCase().includes(query.toLowerCase()) ||
        c.nome.toLowerCase().includes(query.toLowerCase())
      )
    : cicli

  return (
    <div style={{ padding: '0 20px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="text"
        placeholder="Cerca ciclo per codice o nome..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          background: 'var(--bg, #DDD8D3)',
          border: '1px solid var(--elv, #EDEDEA)',
          color: 'var(--t1, #1C1916)',
          fontFamily,
          fontSize: 15,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {filtered.length === 0 && (
        <p style={{ fontFamily, fontSize: 14, color: 'var(--t2)', textAlign: 'center', margin: '24px 0' }}>
          Nessun ciclo trovato.
        </p>
      )}

      {filtered.map((c) => (
        <Link
          key={c.id}
          href={`/cicli-produzione/${c.id}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: '14px 16px',
            borderRadius: 14,
            background: 'var(--sfc, #E4DFD9)',
            textDecoration: 'none',
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily, fontSize: 15, fontWeight: 600, color: 'var(--t1, #1C1916)' }}>
            {c.nome}
          </span>
          <span style={{ fontFamily, fontSize: 12, color: 'var(--t2, #4A3D33)' }}>
            {c.codice} · {c.tipo_dispositivo}
          </span>
        </Link>
      ))}
    </div>
  )
}
