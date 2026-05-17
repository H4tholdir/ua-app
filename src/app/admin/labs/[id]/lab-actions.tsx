'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Stato = 'trial' | 'attivo' | 'sospeso' | 'scaduto' | 'blacklist'
type Utente = { id: string; nome: string; cognome: string | null; email: string | null; ruolo: string }
type Invite = { id: string; email: string; ruolo: string; expires_at: string; created_at: string }
type LogEntry = { stato_from: string | null; stato_to: string; source: string; actor: string | null; created_at: string }

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

interface Props {
  labId: string
  currentStato: string
  currentNome: string
  currentPiano: string
  trialEndsAt: string | null
  stripeCustomerId: string | null
  utenti: Utente[]
  invites: Invite[]
  log: LogEntry[]
}

export default function LabActions({ labId, currentStato, currentNome, currentPiano, trialEndsAt, stripeCustomerId, utenti, invites, log }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRuolo, setInviteRuolo] = useState('titolare')
  const [inviteResult, setInviteResult] = useState<string | null>(null)
  const [pendingInvites, setPendingInvites] = useState<Invite[]>(invites)

  // Edit section state
  const [editOpen, setEditOpen] = useState(false)
  const [editNome, setEditNome] = useState(currentNome)
  const [editPiano, setEditPiano] = useState(currentPiano)
  const [editTrialDate, setEditTrialDate] = useState(trialEndsAt ? trialEndsAt.slice(0, 10) : '')
  const [editMsg, setEditMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const setStato = useCallback(async (stato: Stato) => {
    if (!window.confirm(`Cambia stato a "${stato}"?`)) return
    sndClick()
    setLoading(true); setActionMsg(null)
    const res = await fetch(`/api/admin/labs/${labId}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) {
      setActionMsg({ type: 'ok', text: `Stato aggiornato a "${stato}"` })
      router.refresh()
    } else {
      setActionMsg({ type: 'err', text: data.error ?? 'Errore durante la transizione' })
    }
  }, [labId, router])

  const saveEdits = useCallback(async () => {
    sndClick()
    setLoading(true); setEditMsg(null)
    const body: Record<string, unknown> = {}
    if (editNome.trim()) body.nome = editNome.trim()
    if (editPiano) body.piano = editPiano
    if (editTrialDate) body.trial_ends_at = new Date(editTrialDate).toISOString()
    else body.trial_ends_at = null
    const res = await fetch(`/api/admin/labs/${labId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (res.ok) { setEditMsg({ type: 'ok', text: 'Dati aggiornati' }); router.refresh() }
    else { setEditMsg({ type: 'err', text: 'Errore nel salvataggio' }) }
  }, [labId, editNome, editPiano, editTrialDate, router])

  const deleteLab = useCallback(async () => {
    if (!window.confirm('ATTENZIONE: questa azione è irreversibile. Eliminare il laboratorio?')) return
    if (!window.confirm('Conferma eliminazione definitiva?')) return
    sndClick()
    setLoading(true)
    const res = await fetch(`/api/admin/labs/${labId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    setLoading(false)
    if (res.ok) {
      window.location.href = '/admin/labs'
    } else {
      const data = await res.json().catch(() => ({}))
      setActionMsg({ type: 'err', text: data.error ?? 'Errore durante l\'eliminazione' })
    }
  }, [labId])

  const sendInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    sndClick()
    setLoading(true); setInviteResult(null)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ laboratorio_id: labId, email: inviteEmail, ruolo: inviteRuolo }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) {
      setInviteEmail('')
      setInviteResult(process.env.NODE_ENV === 'development' ? data.invite_url ?? data.message : data.message)
      router.refresh()
    } else {
      setInviteResult(`Errore: ${data.error ?? 'Sconosciuto'}`)
    }
  }, [labId, inviteEmail, inviteRuolo, router])

  const revokeInvite = useCallback(async (inviteId: string) => {
    sndClick()
    const res = await fetch(`/api/admin/invites/${inviteId}`, { method: 'DELETE' })
    if (res.ok) {
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
    }
  }, [])

  const stato = currentStato as Stato

  return (
    <>
      {/* 4 — AZIONI STATO */}
      <div className="adm-dcard adm-animate" style={{ animationDelay: '.08s' }}>
        <div className="adm-dcard-title">Azioni stato</div>
        <div className="adm-actions">
          {stato !== 'attivo' && stato !== 'blacklist' && (
            <button className="adm-act green" onClick={() => setStato('attivo')} disabled={loading}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6L4.5 8.5L10 3" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Attiva
            </button>
          )}
          {(stato === 'attivo' || stato === 'trial') && (
            <button className="adm-act amber" onClick={() => setStato('sospeso')} disabled={loading}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="2.5" y="2" width="2.5" height="8" rx="1" fill="#B45309"/>
                <rect x="7" y="2" width="2.5" height="8" rx="1" fill="#B45309"/>
              </svg>
              Sospendi
            </button>
          )}
          {stato === 'sospeso' && (
            <button className="adm-act amber" onClick={() => setStato('scaduto')} disabled={loading}>
              Segna come scaduto
            </button>
          )}
          {stato !== 'blacklist' && (
            <button className="adm-act red" onClick={() => setStato('blacklist')} disabled={loading}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 2L10 10M10 2L2 10" stroke="var(--adm-red)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Blacklist
            </button>
          )}
          {stripeCustomerId && (
            <a
              className="adm-act stripe"
              href={`https://dashboard.stripe.com/customers/${stripeCustomerId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={sndClick}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M2 6.5H11M7.5 3L11 6.5L7.5 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Apri in Stripe
            </a>
          )}
        </div>
        {actionMsg && (
          <div className={`adm-msg ${actionMsg.type}`}>{actionMsg.text}</div>
        )}

        {/* Delete lab — only for non-active, non-blacklist */}
        {stato !== 'attivo' && stato !== 'blacklist' && (
          <div className="adm-row-divider">
            <button
              className="adm-act red"
              style={{ marginLeft: 'auto' }}
              onClick={deleteLab}
              disabled={loading}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 2L10 10M10 2L2 10" stroke="var(--adm-red)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Elimina laboratorio
            </button>
          </div>
        )}
      </div>

      {/* EDIT SECTION */}
      <div className="adm-dcard adm-animate" style={{ animationDelay: '.10s' }}>
        <button
          className="adm-dcard-title"
          onClick={() => { sndClick(); setEditOpen(o => !o) }}
          style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', color: 'inherit', font: 'inherit' }}
          aria-expanded={editOpen}
        >
          <span>Modifica dati</span>
          <span style={{ marginLeft: 'auto', fontSize: '14px', color: 'var(--adm-t2)' }}>{editOpen ? '▲' : '▼'}</span>
        </button>

        {editOpen && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="adm-row-label" htmlFor="edit-nome">Nome laboratorio</label>
              <input
                id="edit-nome"
                className="adm-input"
                type="text"
                value={editNome}
                onChange={e => setEditNome(e.target.value)}
                style={{ width: '100%', maxWidth: '360px' }}
                aria-label="Nome laboratorio"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="adm-row-label" htmlFor="edit-piano">Piano</label>
              <select
                id="edit-piano"
                className="adm-select"
                value={editPiano}
                onChange={e => setEditPiano(e.target.value)}
                style={{ width: '180px' }}
                aria-label="Piano abbonamento"
              >
                <option value="lab">Lab</option>
                <option value="rete">Rete</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="adm-row-label" htmlFor="edit-trial">Data fine trial</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="edit-trial"
                  className="adm-input"
                  type="date"
                  value={editTrialDate}
                  onChange={e => setEditTrialDate(e.target.value)}
                  style={{ width: '160px' }}
                  aria-label="Data fine trial"
                />
                {editTrialDate && (
                  <button
                    className="adm-act"
                    style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
                    onClick={() => setEditTrialDate('')}
                    type="button"
                  >
                    Rimuovi
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '4px' }}>
              <button className="adm-btn-cta" onClick={saveEdits} disabled={loading || !editNome.trim()} aria-busy={loading}>
                {loading ? '…' : 'Salva modifiche'}
              </button>
            </div>

            {editMsg && (
              <div className={`adm-msg ${editMsg.type}`}>{editMsg.text}</div>
            )}
          </div>
        )}
      </div>

      {/* 5 — UTENTI + INVITI */}
      <div className="adm-dcard adm-animate" style={{ animationDelay: '.12s' }}>
        <div className="adm-dcard-title">Utenti del laboratorio</div>

        {/* User list */}
        <div className="adm-user-list">
          {utenti.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--adm-t3)' }}>Nessun utente registrato</p>
          )}
          {utenti.map(u => (
            <div key={u.id} className="adm-user-item">
              <div className="adm-avatar">
                {(u.nome?.[0] ?? '?').toUpperCase()}{(u.cognome?.[0] ?? '').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="adm-user-name">{u.nome} {u.cognome ?? ''}</div>
                <div className="adm-user-email">{u.email ?? '—'}</div>
              </div>
              <span className={`adm-badge ${u.ruolo}`}>{u.ruolo}</span>
            </div>
          ))}
        </div>

        {/* Invite form */}
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
          <div className="adm-sub-label" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>Invia invito</div>
          <form onSubmit={sendInvite} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              className="adm-input"
              type="email"
              placeholder="email@lab.it"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              style={{ flex: 1, minWidth: '150px' }}
              aria-label="Email invitato"
            />
            <select
              className="adm-select"
              value={inviteRuolo}
              onChange={e => setInviteRuolo(e.target.value)}
              aria-label="Ruolo invitato"
            >
              <option value="titolare">titolare</option>
              <option value="tecnico">tecnico</option>
              <option value="front_desk">front_desk</option>
              <option value="admin_rete">admin_rete</option>
            </select>
            <button type="submit" className="adm-btn-cta" disabled={loading} aria-busy={loading}>
              {loading ? '…' : 'Invia'}
            </button>
          </form>
          {inviteResult && (
            <div className={`adm-msg ${inviteResult.startsWith('Errore') ? 'err' : 'ok'}`}>
              {inviteResult}
            </div>
          )}
        </div>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="adm-invite-list">
            <div className="adm-sub-label">Inviti pendenti</div>
            {pendingInvites.map(inv => (
              <div key={inv.id} className="adm-invite-item">
                <span className="adm-invite-email">{inv.email}</span>
                <span className="adm-invite-meta">{inv.ruolo}</span>
                <span className="adm-invite-meta">
                  scade {new Date(inv.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
                <button
                  className="adm-act red"
                  style={{ height: '26px', padding: '0 8px', fontSize: '11px' }}
                  onClick={() => revokeInvite(inv.id)}
                >
                  Revoca
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6 — LOG TRANSIZIONI */}
      {log.length > 0 && (
        <div className="adm-dcard adm-animate" style={{ animationDelay: '.16s' }}>
          <div className="adm-dcard-title">Log transizioni stato</div>
          {log.map((entry, i) => (
            <div key={i} className="adm-log-row">
              <span className="adm-log-time">
                {new Date(entry.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="adm-log-transition">
                {entry.stato_from ?? '—'} → {entry.stato_to}
              </span>
              <span className="adm-log-source">{entry.source}{entry.actor ? ` · ${entry.actor}` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
