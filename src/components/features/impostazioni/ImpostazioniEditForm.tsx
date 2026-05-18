'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

let _ac: AudioContext | null = null
function sndClick() {
  try {
    if (!_ac) _ac = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const c = _ac; const len = Math.floor(c.sampleRate * 0.022)
    const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8)
    const src = c.createBufferSource(); src.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.5
    const g = c.createGain(); g.gain.setValueAtTime(0.45, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.022)
    src.connect(bp); bp.connect(g); g.connect(c.destination); src.start()
  } catch { /* silent */ }
}

interface LabFormData {
  nome: string; ragione_sociale: string; partita_iva: string; codice_fiscale: string
  indirizzo: string; cap: string; citta: string; provincia: string
  telefono: string; email: string; pec: string
  codice_itca: string; srn_eudamed: string
  prrc_nome: string; prrc_qualifica: string
  regime_fiscale: string; codice_iva_default: string
}

type NullableLabFormData = { [K in keyof LabFormData]: string | null | undefined }

interface Props {
  initialData: Partial<NullableLabFormData>
}

export function ImpostazioniEditForm({ initialData }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<LabFormData>({
    nome: initialData.nome ?? '',
    ragione_sociale: initialData.ragione_sociale ?? '',
    partita_iva: initialData.partita_iva ?? '',
    codice_fiscale: initialData.codice_fiscale ?? '',
    indirizzo: initialData.indirizzo ?? '',
    cap: initialData.cap ?? '',
    citta: initialData.citta ?? '',
    provincia: initialData.provincia ?? '',
    telefono: initialData.telefono ?? '',
    email: initialData.email ?? '',
    pec: initialData.pec ?? '',
    codice_itca: initialData.codice_itca ?? '',
    srn_eudamed: initialData.srn_eudamed ?? '',
    prrc_nome: initialData.prrc_nome ?? '',
    prrc_qualifica: initialData.prrc_qualifica ?? '',
    regime_fiscale: initialData.regime_fiscale ?? 'RF01',
    codice_iva_default: initialData.codice_iva_default ?? 'N4',
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [open, setOpen] = useState(false)

  const setF = (key: keyof LabFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); sndClick()
    setLoading(true); setMsg(null)
    const res = await fetch('/api/impostazioni', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) { setMsg({ type: 'ok', text: 'Salvato.' }); setOpen(false); router.refresh() }
    else { setMsg({ type: 'err', text: data.error ?? 'Errore salvataggio' }) }
  }, [form, router])

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '12px', border: 'none',
    background: 'var(--prs, #D4CFC9)',
    boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
    fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: 'var(--t2, #96918D)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'block',
  }
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }
  const sectionLabel: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: 'var(--t3, #B8B3AE)',
    textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '4px',
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { sndClick(); setOpen(true) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 18px', borderRadius: '12px', border: 'none',
          background: 'var(--elv, #EDEDEA)', cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700,
          color: 'var(--t2, #96918D)', marginBottom: '12px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
        Modifica dati
      </button>
    )
  }

  return (
    <form onSubmit={handleSave} style={{ marginBottom: '16px' }}>
      <div style={sectionLabel}>Identità</div>
      <div style={fieldStyle}><label style={labelStyle}>Nome commerciale *</label><input style={inputStyle} value={form.nome} onChange={setF('nome')} required /></div>
      <div style={fieldStyle}><label style={labelStyle}>Ragione sociale</label><input style={inputStyle} value={form.ragione_sociale} onChange={setF('ragione_sociale')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>Partita IVA</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.partita_iva} onChange={setF('partita_iva')} maxLength={11} /></div>
        <div style={fieldStyle}><label style={labelStyle}>Codice Fiscale</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.codice_fiscale} onChange={setF('codice_fiscale')} /></div>
      </div>
      <div style={sectionLabel}>Sede</div>
      <div style={fieldStyle}><label style={labelStyle}>Indirizzo</label><input style={inputStyle} value={form.indirizzo} onChange={setF('indirizzo')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 80px', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>CAP</label><input style={inputStyle} value={form.cap} onChange={setF('cap')} maxLength={5} /></div>
        <div style={fieldStyle}><label style={labelStyle}>Città</label><input style={inputStyle} value={form.citta} onChange={setF('citta')} /></div>
        <div style={fieldStyle}><label style={labelStyle}>Prov.</label><input style={{ ...inputStyle, textTransform: 'uppercase' }} value={form.provincia} onChange={setF('provincia')} maxLength={2} /></div>
      </div>
      <div style={sectionLabel}>Contatti</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>Telefono</label><input style={inputStyle} type="tel" value={form.telefono} onChange={setF('telefono')} /></div>
        <div style={fieldStyle}><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={setF('email')} /></div>
      </div>
      <div style={sectionLabel}>Normativo MDR</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>Codice ITCA</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.codice_itca} onChange={setF('codice_itca')} placeholder="ITCAxxxxxxx" /></div>
        <div style={fieldStyle}><label style={labelStyle}>SRN EUDAMED</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.srn_eudamed} onChange={setF('srn_eudamed')} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>PRRC Nome</label><input style={inputStyle} value={form.prrc_nome} onChange={setF('prrc_nome')} /></div>
        <div style={fieldStyle}><label style={labelStyle}>PRRC Qualifica</label><input style={inputStyle} value={form.prrc_qualifica} onChange={setF('prrc_qualifica')} /></div>
      </div>
      <div style={sectionLabel}>Fatturazione</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Regime fiscale</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.regime_fiscale} onChange={setF('regime_fiscale')}>
            <option value="RF01">RF01 — Ordinario</option>
            <option value="RF19">RF19 — Forfettario</option>
            <option value="RF02">RF02 — Minimi</option>
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Codice IVA default</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.codice_iva_default} onChange={setF('codice_iva_default')}>
            <option value="N4">N4 — Esente Art.10 n.18</option>
            <option value="N2.2">N2.2 — Non soggetto Art.7</option>
            <option value="22">22% — IVA ordinaria</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 22px', borderRadius: '12px', border: 'none',
            background: 'var(--primary, #D90012)', color: '#fff',
            fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -2px rgba(180,0,0,.40)',
          }}
        >
          {loading ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          Annulla
        </button>
      </div>
      {msg && (
        <div style={{ marginTop: '10px', padding: '8px 14px', borderRadius: '10px', fontSize: '13px',
          background: msg.type === 'ok' ? 'rgba(22,163,74,.08)' : 'rgba(217,0,18,.07)',
          color: msg.type === 'ok' ? '#16A34A' : '#D90012' }}>
          {msg.text}
        </div>
      )}
    </form>
  )
}
