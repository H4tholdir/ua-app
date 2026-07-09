'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TecnicoRow = {
  id: string
  nome: string
  cognome: string
  sigla: string | null
  qualifica: string | null
  prrc: boolean
  compenso_base: number | null
  tipo_compenso: string | null
}

interface Props {
  tecnico: TecnicoRow
}

export function TecnicoEditInline({ tecnico }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState(tecnico.nome)
  const [cognome, setCognome] = useState(tecnico.cognome)
  const [sigla, setSigla] = useState(tecnico.sigla ?? '')
  const [qualifica, setQualifica] = useState(tecnico.qualifica ?? '')
  const [tipoCompenso, setTipoCompenso] = useState(tecnico.tipo_compenso ?? '')
  const [compensoBase, setCompensoBase] = useState(
    tecnico.compenso_base != null ? String(tecnico.compenso_base) : ''
  )

  async function handleSave() {
    if (!nome.trim() || !cognome.trim()) {
      alert('Nome e cognome sono obbligatori')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/tecnici/${tecnico.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cognome: cognome.trim(),
          sigla: sigla.trim() || null,
          qualifica: qualifica.trim() || null,
          tipo_compenso: tipoCompenso || null,
          compenso_base: compensoBase.trim() === '' ? null : Number(compensoBase),
        }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? 'Errore durante il salvataggio')
      }
    } catch {
      alert('Errore di rete — riprova')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '36px',
    padding: '0 10px',
    borderRadius: '8px',
    border: '1px solid var(--elv, #EDEDEA)',
    background: 'var(--bg, #DDD8D3)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px',
    color: 'var(--t1, #1C1916)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--t3, #6B5C51)',
    marginBottom: '4px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Modifica ${tecnico.cognome} ${tecnico.nome}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--t3, #6B5C51)',
          flexShrink: 0,
          padding: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t1, #1C1916)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t3, #6B5C51)' }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M11.5 2.5a1.41 1.41 0 012 2L5 13H2v-3L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--sfc, #E4DFD9)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 32px',
          boxShadow: '-5px -5px 22px rgba(0,0,0,.15)',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--t3, #6B5C51)', margin: '0 auto 16px' }} />

        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '17px', fontWeight: 700, color: 'var(--t1)', margin: '0 0 16px' }}>
          Modifica tecnico
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Nome</label>
            <input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Cognome</label>
            <input style={inputStyle} value={cognome} onChange={(e) => setCognome(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Sigla</label>
            <input style={inputStyle} value={sigla} onChange={(e) => setSigla(e.target.value)} maxLength={6} />
          </div>
          <div>
            <label style={labelStyle}>Qualifica</label>
            <input style={inputStyle} value={qualifica} onChange={(e) => setQualifica(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div>
            <label htmlFor="tecnico-edit-tipo-compenso" style={labelStyle}>Tipo compenso</label>
            <select
              id="tecnico-edit-tipo-compenso"
              style={inputStyle}
              value={tipoCompenso}
              onChange={(e) => setTipoCompenso(e.target.value)}
            >
              <option value="">Non specificato</option>
              <option value="fisso">Fisso</option>
              <option value="percentuale">Percentuale</option>
              <option value="per_lavorazione">Per lavorazione</option>
            </select>
          </div>
          <div>
            <label htmlFor="tecnico-edit-compenso-base" style={labelStyle}>Compenso base (€)</label>
            <input
              id="tecnico-edit-compenso-base"
              type="number"
              style={inputStyle}
              value={compensoBase}
              onChange={(e) => setCompensoBase(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              flex: 1, height: '44px', borderRadius: '12px',
              border: '1px solid var(--elv)', background: 'transparent',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
              color: 'var(--t2)', cursor: 'pointer',
            }}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, height: '44px', borderRadius: '12px',
              border: 'none', background: 'var(--primary, #D90012)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
              color: '#fff', cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
