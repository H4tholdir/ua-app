'use client'
import { useState, useCallback } from 'react'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

const inputBase: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '12px', border: 'none',
  background: 'var(--prs, #D4CFC9)',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--t2, #96918D)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }

export default function PecPage() {
  const [form, setForm] = useState({ pec_host: '', pec_port: '465', pec_user: '', pec_password: '' })
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const setF = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMsg(null)
    const res = await fetch('/api/impostazioni/pec', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, pec_port: parseInt(form.pec_port) }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) setMsg({ type: 'ok', text: 'Configurazione salvata.' })
    else setMsg({ type: 'err', text: data.error ?? 'Errore salvataggio' })
  }, [form])

  const handleTest = useCallback(async () => {
    setTesting(true); setMsg(null)
    const res = await fetch('/api/impostazioni/pec', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setTesting(false)
    if (res.ok) setMsg({ type: 'ok', text: data.message ?? 'Test OK' })
    else setMsg({ type: 'err', text: data.error ?? 'Test fallito' })
  }, [])

  return (
    <>
      <AppHeader title="Configurazione PEC" backHref="/impostazioni" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px', maxWidth: '480px' }}>
          <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif' }}>
            Inserisci le credenziali SMTP del tuo provider PEC (Aruba, Legalmail, ecc.).
            La password viene salvata in modo cifrato e non è mai visibile.
          </p>
          <form onSubmit={handleSave}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Host SMTP PEC *</label>
              <input style={inputBase} value={form.pec_host} onChange={setF('pec_host')} placeholder="smtp.pec.aruba.it" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Porta *</label>
                <input style={inputBase} type="number" value={form.pec_port} onChange={setF('pec_port')} placeholder="465" required />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Utente (indirizzo PEC) *</label>
                <input style={inputBase} type="email" value={form.pec_user} onChange={setF('pec_user')} placeholder="lab@pec.it" required />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Password PEC</label>
              <input style={inputBase} type="password" value={form.pec_password} onChange={setF('pec_password')} placeholder="Lascia vuoto per non modificare" />
              <span style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif' }}>
                Lascia vuoto se la password è già salvata
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
              <button type="submit" disabled={loading} style={{
                padding: '10px 22px', borderRadius: '12px', border: 'none',
                background: 'var(--primary, #D90012)', color: '#fff',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -2px rgba(180,0,0,.40)',
              }}>
                {loading ? 'Salvataggio…' : 'Salva'}
              </button>
              <button type="button" onClick={handleTest} disabled={testing} style={{
                padding: '10px 18px', borderRadius: '12px', border: 'none',
                background: 'var(--elv, #EDEDEA)', color: 'var(--t2)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600,
                cursor: testing ? 'not-allowed' : 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
              }}>
                {testing ? 'Test in corso…' : 'Testa connessione'}
              </button>
            </div>
            {msg && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                background: msg.type === 'ok' ? 'rgba(22,163,74,.08)' : 'rgba(217,0,18,.07)',
                color: msg.type === 'ok' ? '#16A34A' : '#D90012' }}>
                {msg.text}
              </div>
            )}
          </form>
          <div style={{ marginTop: '24px', padding: '14px 16px', borderRadius: '14px', background: 'var(--elv)', fontSize: '12px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
            <strong>Provider comuni:</strong><br/>
            Aruba PEC: smtp.pec.aruba.it · porta 465<br/>
            Legalmail: smtp.legalmail.it · porta 465<br/>
            Namirial: smtps.pec.namirial.com · porta 465
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
