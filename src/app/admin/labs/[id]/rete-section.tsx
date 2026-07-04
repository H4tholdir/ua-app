'use client'
import { useState } from 'react'
import Link from 'next/link'

interface ReteInfo {
  id: string
  nome: string
}

interface ReteAttuale extends ReteInfo {
  isAdmin: boolean
}

interface ReteSectionProps {
  labId: string
  reteAttuale: ReteAttuale | null
  retiDisponibili: ReteInfo[]
}

export default function ReteSection({ labId, reteAttuale, retiDisponibili }: ReteSectionProps) {
  const [selectedReteId, setSelectedReteId] = useState(retiDisponibili[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAggiungi = async () => {
    if (!selectedReteId) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reti/${selectedReteId}/membri`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laboratorio_id: labId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "Errore durante l'aggiunta")
        setLoading(false)
        return
      }
      window.location.reload()
    } catch {
      setError('Errore di rete — controlla la connessione')
      setLoading(false)
    }
  }

  const handleRimuovi = async () => {
    if (!reteAttuale) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/rete/${reteAttuale.id}/membri/${labId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Errore durante la rimozione')
        setLoading(false)
        return
      }
      window.location.reload()
    } catch {
      setError('Errore di rete — controlla la connessione')
      setLoading(false)
    }
  }

  return (
    <div className="adm-dcard adm-animate">
      <div className="adm-dcard-title">Rete</div>

      {error && <p role="alert" className="adm-info-value err">{error}</p>}

      {reteAttuale ? (
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">Stato</div>
            <div className="adm-info-value">
              {reteAttuale.isAdmin ? 'Amministra la rete ' : 'Membro della rete '}
              <Link href={`/rete/${reteAttuale.id}`}>{reteAttuale.nome}</Link>
            </div>
          </div>
          {!reteAttuale.isAdmin && (
            <div>
              <button
                type="button"
                onClick={handleRimuovi}
                disabled={loading}
                style={{ minHeight: 44, padding: '0 14px', borderRadius: 8, border: '1px solid #D90012', background: 'transparent', color: '#D90012', cursor: 'pointer' }}
              >
                {loading ? 'Rimozione...' : 'Rimuovi da questa rete'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">Stato</div>
            <div className="adm-info-value dim">Nessuna rete</div>
          </div>
          {retiDisponibili.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={selectedReteId}
                onChange={e => setSelectedReteId(e.target.value)}
                style={{ minHeight: 40, padding: '0 8px' }}
              >
                {retiDisponibili.map(r => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAggiungi}
                disabled={loading}
                style={{ minHeight: 44, padding: '0 14px', borderRadius: 8, border: 'none', background: '#D90012', color: '#fff', cursor: 'pointer' }}
              >
                {loading ? 'Aggiunta...' : 'Aggiungi'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
