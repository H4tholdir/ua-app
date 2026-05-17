'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

let _ac: AudioContext | null = null
function sndClick() {
  try {
    if (!_ac) _ac = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const c = _ac
    const len = Math.floor(c.sampleRate * 0.022)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8)
    const src = c.createBufferSource(); src.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.5
    const g = c.createGain()
    g.gain.setValueAtTime(0.45, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.022)
    src.connect(bp); bp.connect(g); g.connect(c.destination); src.start()
  } catch { /* silent */ }
}

export default function NuovoLabPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [sendInvite, setSendInvite] = useState(true)

  const [form, setForm] = useState({
    nome: '',
    ragione_sociale: '',
    partita_iva: '',
    email_titolare: '',
    codice_itca: '',
  })

  const setF = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    sndClick()
    setLoading(true); setMsg(null)

    // 1 — crea laboratorio
    const res = await fetch('/api/admin/labs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        ragione_sociale: form.ragione_sociale || form.nome,
        partita_iva: form.partita_iva,
        email_titolare: form.email_titolare,
        codice_itca: form.codice_itca || undefined,
      }),
    })

    const lab = await res.json().catch(() => ({}))

    if (!res.ok) {
      setLoading(false)
      setMsg({ type: 'err', text: lab.error ?? 'Errore durante la creazione del laboratorio' })
      return
    }

    // 2 — invita il titolare (opzionale)
    if (sendInvite && form.email_titolare) {
      const invRes = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laboratorio_id: lab.id,
          email: form.email_titolare,
          ruolo: 'titolare',
        }),
      })
      if (!invRes.ok) {
        const invData = await invRes.json().catch(() => ({}))
        setMsg({ type: 'ok', text: `Lab creato (${lab.nome}) ma invito non inviato: ${invData.error ?? 'errore sconosciuto'}` })
        setLoading(false)
        setTimeout(() => router.push(`/admin/labs/${lab.id}`), 2000)
        return
      }
    }

    setLoading(false)
    setMsg({ type: 'ok', text: `Laboratorio "${lab.nome}" creato${sendInvite ? ' e invito inviato' : ''}.` })
    setTimeout(() => router.push(`/admin/labs/${lab.id}`), 1200)
  }, [form, sendInvite, router])

  return (
    <div className="adm-detail">
      <Link href="/admin/labs" className="adm-back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        Tutti i laboratori
      </Link>

      <div className="adm-dcard adm-animate">
        <div className="adm-dcard-title">Nuovo laboratorio</div>

        <form onSubmit={handleSubmit}>
          {/* Identità */}
          <div className="adm-sub-label">Identità</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--adm-t3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Nome commerciale *
              </label>
              <input
                className="adm-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={form.nome}
                onChange={setF('nome')}
                required
                placeholder="es. Lab Rossi"
                aria-label="Nome commerciale"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--adm-t3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Ragione sociale
              </label>
              <input
                className="adm-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={form.ragione_sociale}
                onChange={setF('ragione_sociale')}
                placeholder="Se diversa dal nome (lascia vuoto per usare il nome)"
                aria-label="Ragione sociale"
              />
            </div>
          </div>

          {/* Fiscale */}
          <div className="adm-sub-label" style={{ marginTop: 16 }}>Dati fiscali</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--adm-t3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Partita IVA *
              </label>
              <input
                className="adm-input"
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                value={form.partita_iva}
                onChange={setF('partita_iva')}
                required
                placeholder="00000000000"
                maxLength={11}
                aria-label="Partita IVA"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--adm-t3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Codice ITCA
              </label>
              <input
                className="adm-input"
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                value={form.codice_itca}
                onChange={setF('codice_itca')}
                placeholder="ITCAxxxxxxx"
                aria-label="Codice ITCA"
              />
            </div>
          </div>

          {/* Invito titolare */}
          <div className="adm-sub-label" style={{ marginTop: 16 }}>Titolare</div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--adm-t3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Email titolare *
            </label>
            <input
              className="adm-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              type="email"
              value={form.email_titolare}
              onChange={setF('email_titolare')}
              required
              placeholder="titolare@laboratorio.it"
              aria-label="Email titolare"
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={e => setSendInvite(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 13, color: 'var(--adm-t2)' }}>
              Invia invito al titolare dopo la creazione
            </span>
          </label>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="adm-btn-cta"
              disabled={loading}
              aria-busy={loading}
              style={{ height: 42, padding: '0 20px' }}
            >
              {loading ? 'Creazione…' : 'Crea laboratorio'}
            </button>
            <Link href="/admin/labs" className="adm-act" style={{ textDecoration: 'none', height: 42, padding: '0 16px', display: 'flex', alignItems: 'center' }}>
              Annulla
            </Link>
          </div>

          {msg && (
            <div className={`adm-msg ${msg.type}`} style={{ marginTop: 12 }}>
              {msg.text}
            </div>
          )}
        </form>
      </div>

      {/* Info trial */}
      <div className="adm-dcard adm-animate" style={{ animationDelay: '.06s' }}>
        <div className="adm-dcard-title">Info</div>
        <div style={{ fontSize: 13, color: 'var(--adm-t2)', lineHeight: 1.6 }}>
          <p>Il laboratorio viene creato in stato <strong>trial</strong> con piano <strong>lab</strong>.</p>
          <p style={{ marginTop: 6 }}>Un cliente Stripe viene creato automaticamente. Per attivare l&apos;abbonamento vai nel dettaglio lab → Apri in Stripe.</p>
          <p style={{ marginTop: 6 }}>Il trial scade dopo 30 giorni salvo proroga manuale dal dettaglio lab.</p>
        </div>
      </div>
    </div>
  )
}
