'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Stato = 'trial' | 'attivo' | 'sospeso' | 'scaduto' | 'blacklist'
type Utente = { id: string; nome: string; cognome: string | null; email: string | null; ruolo: string }
type Invite = { id: string; email: string; ruolo: string; expires_at: string; created_at: string }
type LogEntry = { stato_from: string | null; stato_to: string; source: string; actor: string | null; created_at: string }

// Lab data passed for edit form
interface LabData {
  nome: string
  ragione_sociale: string | null
  partita_iva: string | null
  codice_fiscale: string | null
  indirizzo: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  telefono: string | null
  email: string | null
  pec: string | null
  codice_itca: string | null
  srn_eudamed: string | null
  numero_rea: string | null
  numero_albo: string | null
  prrc_nome: string | null
  prrc_qualifica: string | null
  anno_prima_marcatura: string | null
  regime_fiscale: string
  codice_iva_default: string
  soglia_bollo: number
  importo_bollo: number
  bollo_default_attivo: boolean
  piano: string
  trial_ends_at: string | null
}

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
  trialEndsAt: string | null
  stripeCustomerId: string | null
  utenti: Utente[]
  invites: Invite[]
  log: LogEntry[]
  labData: LabData
}

// Collapsible section helper
function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,.06)', paddingBottom: open ? 12 : 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '10px 0',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--adm-t2, #555)',
          textTransform: 'uppercase',
          letterSpacing: '.05em',
        }}
        aria-expanded={open}
      >
        <span style={{ display: 'inline-block', transition: 'transform .15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        {title}
      </button>
      {open && <div style={{ paddingTop: 4 }}>{children}</div>}
    </div>
  )
}

// Reusable row: label + input
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
      <label style={{ fontSize: 12, color: 'var(--adm-t3, #888)', minWidth: 150, flexShrink: 0 }}>{label}</label>
      <div style={{ flex: 1, minWidth: 160 }}>{children}</div>
    </div>
  )
}

const iw: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
}

export default function LabActions({ labId, currentStato, trialEndsAt, stripeCustomerId, utenti, invites, log, labData }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [trialDate, setTrialDate] = useState(trialEndsAt ? trialEndsAt.slice(0, 10) : '')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRuolo, setInviteRuolo] = useState('titolare')
  const [inviteResult, setInviteResult] = useState<string | null>(null)
  const [pendingInvites, setPendingInvites] = useState<Invite[]>(invites)

  // Impersonation state
  const [impersonateLink, setImpersonateLink] = useState<string | null>(null)
  const [impersonateName, setImpersonateName] = useState<string>('')

  // Edit form state — initialised from labData
  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [form, setForm] = useState<{
    nome: string
    ragione_sociale: string
    partita_iva: string
    codice_fiscale: string
    indirizzo: string
    cap: string
    citta: string
    provincia: string
    telefono: string
    email: string
    pec: string
    codice_itca: string
    srn_eudamed: string
    numero_rea: string
    numero_albo: string
    prrc_nome: string
    prrc_qualifica: string
    anno_prima_marcatura: string
    regime_fiscale: string
    codice_iva_default: string
    soglia_bollo: string
    importo_bollo: string
    bollo_default_attivo: boolean
    piano: string
    trial_ends_at: string
  }>({
    nome: labData.nome ?? '',
    ragione_sociale: labData.ragione_sociale ?? '',
    partita_iva: labData.partita_iva ?? '',
    codice_fiscale: labData.codice_fiscale ?? '',
    indirizzo: labData.indirizzo ?? '',
    cap: labData.cap ?? '',
    citta: labData.citta ?? '',
    provincia: labData.provincia ?? '',
    telefono: labData.telefono ?? '',
    email: labData.email ?? '',
    pec: labData.pec ?? '',
    codice_itca: labData.codice_itca ?? '',
    srn_eudamed: labData.srn_eudamed ?? '',
    numero_rea: labData.numero_rea ?? '',
    numero_albo: labData.numero_albo ?? '',
    prrc_nome: labData.prrc_nome ?? '',
    prrc_qualifica: labData.prrc_qualifica ?? '',
    anno_prima_marcatura: labData.anno_prima_marcatura ?? '',
    regime_fiscale: labData.regime_fiscale ?? 'RF01',
    codice_iva_default: labData.codice_iva_default ?? 'N4',
    soglia_bollo: String(labData.soglia_bollo ?? 77.47),
    importo_bollo: String(labData.importo_bollo ?? 2.00),
    bollo_default_attivo: labData.bollo_default_attivo ?? false,
    piano: labData.piano ?? 'lab',
    trial_ends_at: labData.trial_ends_at ? labData.trial_ends_at.slice(0, 10) : '',
  })

  const setF = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm(prev => ({ ...prev, [key]: val }))
  }

  // Stato locale per aggiornamento UI immediato senza aspettare router.refresh()
  const [stato, setStatoLocal] = useState<Stato>(currentStato as Stato)

  const setStato = useCallback(async (newStato: Stato) => {
    if (!window.confirm(`Cambia stato a "${newStato}"?`)) return
    sndClick()
    setLoading(true); setActionMsg(null)
    const res = await fetch(`/api/admin/labs/${labId}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: newStato }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) {
      setStatoLocal(newStato)
      setActionMsg({ type: 'ok', text: `Stato aggiornato a "${newStato}"` })
      router.refresh()
    } else {
      setActionMsg({ type: 'err', text: data.error ?? 'Errore durante la transizione' })
    }
  }, [labId, router])

  const extendTrial = useCallback(async () => {
    if (!trialDate) return
    sndClick()
    setLoading(true); setActionMsg(null)
    const res = await fetch(`/api/admin/labs/${labId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial_ends_at: new Date(trialDate).toISOString() }),
    })
    setLoading(false)
    if (res.ok) { setActionMsg({ type: 'ok', text: 'Trial esteso' }); router.refresh() }
    else { setActionMsg({ type: 'err', text: 'Errore nel salvataggio del trial' }) }
  }, [labId, trialDate, router])

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

  // Feature 2 — Impersonazione
  const handleImpersonate = useCallback(async () => {
    sndClick()
    setLoading(true)
    setActionMsg(null)
    const res = await fetch(`/api/admin/labs/${labId}/impersonate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) {
      setImpersonateLink(data.action_link)
      setImpersonateName(data.titolare_nome)
    } else {
      setActionMsg({ type: 'err', text: data.error ?? 'Errore generazione link' })
    }
  }, [labId])

  // Feature 3 — Archivia (passa a blacklist senza DELETE)
  const handleArchive = useCallback(async () => {
    if (!window.confirm('Archiviare questo laboratorio? L\'accesso verrà bloccato ma i dati saranno preservati.')) return
    if (!window.confirm('Conferma: il laboratorio passa a stato BLACKLIST. I dati rimangono nel database.')) return
    sndClick()
    await setStato('blacklist')
  }, [setStato])

  // Hard delete — elimina definitivamente il laboratorio dal database
  const [hardDeleteName, setHardDeleteName] = useState('')
  const [hardDeleteMsg, setHardDeleteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [hardDeleteLoading, setHardDeleteLoading] = useState(false)

  const handleHardDelete = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.confirm('ATTENZIONE: questa operazione è IRREVERSIBILE. Tutti i dati del laboratorio verranno eliminati definitivamente. Continuare?')) return
    sndClick()
    setHardDeleteLoading(true); setHardDeleteMsg(null)
    const res = await fetch(`/api/admin/labs/${labId}/hard-delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm_nome: hardDeleteName }),
    })
    const data = await res.json().catch(() => ({}))
    setHardDeleteLoading(false)
    if (res.ok) {
      setHardDeleteMsg({ type: 'ok', text: 'Laboratorio eliminato definitivamente.' })
      setTimeout(() => { window.location.href = '/admin/labs' }, 1500)
    } else {
      setHardDeleteMsg({ type: 'err', text: data.error ?? 'Errore durante la cancellazione' })
    }
  }, [labId, hardDeleteName])

  // Feature 1 — Salva modifica dati laboratorio
  const handleSaveForm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    sndClick()
    setFormLoading(true); setFormMsg(null)

    const payload: Record<string, unknown> = {
      nome: form.nome || undefined,
      ragione_sociale: form.ragione_sociale || null,
      partita_iva: form.partita_iva || null,
      codice_fiscale: form.codice_fiscale || null,
      indirizzo: form.indirizzo || null,
      cap: form.cap || null,
      citta: form.citta || null,
      provincia: form.provincia || null,
      telefono: form.telefono || null,
      email: form.email || null,
      pec: form.pec || null,
      codice_itca: form.codice_itca || null,
      srn_eudamed: form.srn_eudamed || null,
      numero_rea: form.numero_rea || null,
      numero_albo: form.numero_albo || null,
      prrc_nome: form.prrc_nome || null,
      prrc_qualifica: form.prrc_qualifica || null,
      anno_prima_marcatura: form.anno_prima_marcatura || null,
      regime_fiscale: form.regime_fiscale || 'RF01',
      codice_iva_default: form.codice_iva_default || 'N4',
      soglia_bollo: parseFloat(form.soglia_bollo) || 77.47,
      importo_bollo: parseFloat(form.importo_bollo) || 2.00,
      bollo_default_attivo: form.bollo_default_attivo,
      piano: form.piano || undefined,
      trial_ends_at: form.trial_ends_at ? new Date(form.trial_ends_at).toISOString() : null,
    }

    const res = await fetch(`/api/admin/labs/${labId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    setFormLoading(false)
    if (res.ok) {
      setFormMsg({ type: 'ok', text: 'Dati salvati con successo' })
      router.refresh()
    } else {
      setFormMsg({ type: 'err', text: data.error ?? 'Errore nel salvataggio' })
    }
  }, [labId, form, router])

  return (
    <>
      {/* Accedi come titolare — preview + magic link in un'unica sezione */}
      <div className="adm-dcard adm-animate">
        <div className="adm-dcard-title">Accedi come titolare</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: impersonateLink ? 14 : 0 }}>
          {/* Preview: solo lettura, sessione admin rimane attiva */}
          <a
            href={`/admin/labs/${labId}/live`}
            className="adm-act"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
            </svg>
            Anteprima (solo lettura)
          </a>
          {/* Magic link: accesso reale come titolare */}
          <button
            type="button"
            className="adm-act"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleImpersonate}
            disabled={loading}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Genera magic link
          </button>
        </div>

        {impersonateLink && (
          <div style={{ background: 'rgba(217,0,18,.06)', borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ fontSize: 12, color: 'var(--adm-t2)', margin: '0 0 8px' }}>
              Link monouso per <strong>{impersonateName || 'titolare'}</strong> — apri in incognito:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <a
                href={impersonateLink}
                target="_blank"
                rel="noopener noreferrer"
                className="adm-btn-cta"
                style={{ display: 'inline-flex', textDecoration: 'none', padding: '8px 16px', fontSize: 13, height: 'auto' }}
              >
                Accedi come {impersonateName || 'titolare'} &rarr;
              </a>
              <button
                type="button"
                onClick={() => setImpersonateLink(null)}
                style={{ background: 'none', border: 'none', color: 'var(--adm-t3)', cursor: 'pointer', fontSize: 12 }}
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
        {actionMsg && actionMsg.text === (actionMsg.type === 'err' ? actionMsg.text : '') && null}
      </div>

      {/* FEATURE 1 — Form modifica dati */}
      <div className="adm-dcard adm-animate">
        <div className="adm-dcard-title">Modifica dati laboratorio</div>
        <form onSubmit={handleSaveForm}>

          <Section title="Anagrafica" defaultOpen={true}>
            <FieldRow label="Nome commerciale *">
              <input className="adm-input" style={iw} value={form.nome} onChange={setF('nome')} required aria-label="Nome" />
            </FieldRow>
            <FieldRow label="Ragione sociale">
              <input className="adm-input" style={iw} value={form.ragione_sociale} onChange={setF('ragione_sociale')} aria-label="Ragione sociale" />
            </FieldRow>
            <FieldRow label="Partita IVA">
              <input className="adm-input" style={iw} value={form.partita_iva} onChange={setF('partita_iva')} aria-label="Partita IVA" />
            </FieldRow>
            <FieldRow label="Codice Fiscale">
              <input className="adm-input" style={iw} value={form.codice_fiscale} onChange={setF('codice_fiscale')} aria-label="Codice Fiscale" />
            </FieldRow>
            <FieldRow label="Indirizzo">
              <input className="adm-input" style={iw} value={form.indirizzo} onChange={setF('indirizzo')} aria-label="Indirizzo" />
            </FieldRow>
            <FieldRow label="CAP">
              <input className="adm-input" style={iw} value={form.cap} onChange={setF('cap')} aria-label="CAP" maxLength={5} />
            </FieldRow>
            <FieldRow label="Città">
              <input className="adm-input" style={iw} value={form.citta} onChange={setF('citta')} aria-label="Città" />
            </FieldRow>
            <FieldRow label="Provincia (sigla)">
              <input className="adm-input" style={{ ...iw, textTransform: 'uppercase', width: 80 }} value={form.provincia} onChange={setF('provincia')} aria-label="Provincia" maxLength={2} />
            </FieldRow>
            <FieldRow label="Telefono">
              <input className="adm-input" style={iw} type="tel" value={form.telefono} onChange={setF('telefono')} aria-label="Telefono" />
            </FieldRow>
            <FieldRow label="Email">
              <input className="adm-input" style={iw} type="email" value={form.email} onChange={setF('email')} aria-label="Email" />
            </FieldRow>
            <FieldRow label="PEC">
              <input className="adm-input" style={iw} type="email" value={form.pec} onChange={setF('pec')} aria-label="PEC" />
            </FieldRow>
          </Section>

          <Section title="MDR / Normativo">
            <FieldRow label="Codice ITCA">
              <input className="adm-input" style={iw} value={form.codice_itca} onChange={setF('codice_itca')} aria-label="Codice ITCA" placeholder="ITCAxxxxxxx" />
            </FieldRow>
            <FieldRow label="SRN EUDAMED">
              <input className="adm-input" style={iw} value={form.srn_eudamed} onChange={setF('srn_eudamed')} aria-label="SRN EUDAMED" placeholder="IT-MF-000..." />
            </FieldRow>
            <FieldRow label="N. REA">
              <input className="adm-input" style={iw} value={form.numero_rea} onChange={setF('numero_rea')} aria-label="Numero REA" />
            </FieldRow>
            <FieldRow label="N. Albo odontotecnici">
              <input className="adm-input" style={iw} value={form.numero_albo} onChange={setF('numero_albo')} aria-label="Numero Albo" />
            </FieldRow>
            <FieldRow label="PRRC Nome">
              <input className="adm-input" style={iw} value={form.prrc_nome} onChange={setF('prrc_nome')} aria-label="PRRC Nome" />
            </FieldRow>
            <FieldRow label="PRRC Qualifica">
              <input className="adm-input" style={iw} value={form.prrc_qualifica} onChange={setF('prrc_qualifica')} aria-label="PRRC Qualifica" />
            </FieldRow>
            <FieldRow label="Anno prima marcatura">
              <input className="adm-input" style={{ ...iw, width: 100 }} value={form.anno_prima_marcatura} onChange={setF('anno_prima_marcatura')} aria-label="Anno prima marcatura" placeholder="es. 2019" maxLength={4} />
            </FieldRow>
          </Section>

          <Section title="Fatturazione">
            <FieldRow label="Regime fiscale">
              <select className="adm-select" style={iw} value={form.regime_fiscale} onChange={setF('regime_fiscale')} aria-label="Regime fiscale">
                <option value="RF01">RF01 — Ordinario</option>
                <option value="RF02">RF02 — Contribuenti minimi</option>
                <option value="RF19">RF19 — Forfettario</option>
              </select>
            </FieldRow>
            <FieldRow label="Codice IVA default">
              <select className="adm-select" style={iw} value={form.codice_iva_default} onChange={setF('codice_iva_default')} aria-label="Codice IVA default">
                <option value="N4">N4 — Esente Art.10 n.18</option>
                <option value="N2.2">N2.2 — Non soggetto Art.7</option>
                <option value="22">22% — IVA ordinaria</option>
                <option value="10">10% — IVA ridotta</option>
              </select>
            </FieldRow>
            <FieldRow label="Soglia bollo (€)">
              <input className="adm-input" style={{ ...iw, width: 120 }} type="number" step="0.01" value={form.soglia_bollo} onChange={setF('soglia_bollo')} aria-label="Soglia bollo" />
            </FieldRow>
            <FieldRow label="Importo bollo (€)">
              <input className="adm-input" style={{ ...iw, width: 120 }} type="number" step="0.01" value={form.importo_bollo} onChange={setF('importo_bollo')} aria-label="Importo bollo" />
            </FieldRow>
            <FieldRow label="Bollo attivo default">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.bollo_default_attivo} onChange={setF('bollo_default_attivo')} aria-label="Bollo default attivo" style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13 }}>Applica bollo automaticamente</span>
              </label>
            </FieldRow>
          </Section>

          <Section title="Piano e Stato">
            <FieldRow label="Piano">
              <select className="adm-select" style={iw} value={form.piano} onChange={setF('piano')} aria-label="Piano">
                <option value="freemium">freemium</option>
                <option value="lab">lab</option>
                <option value="rete">rete</option>
              </select>
            </FieldRow>
            <FieldRow label="Trial ends at">
              <input className="adm-input" style={{ ...iw, width: 180 }} type="date" value={form.trial_ends_at} onChange={setF('trial_ends_at')} aria-label="Trial ends at" />
              <span style={{ fontSize: 11, color: 'var(--adm-t3, #888)', marginTop: 4, display: 'block' }}>Lascia vuoto per nessuna scadenza</span>
            </FieldRow>
          </Section>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="submit" className="adm-btn-cta" disabled={formLoading} aria-busy={formLoading}>
              {formLoading ? 'Salvataggio…' : 'Salva tutte le modifiche'}
            </button>
            {formMsg && (
              <div className={`adm-msg ${formMsg.type}`} style={{ margin: 0 }}>
                {formMsg.text}
              </div>
            )}
          </div>
        </form>
      </div>

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

        {/* Extend trial — quick action kept here as shortcut */}
        <div className="adm-row-divider">
          <span className="adm-row-label">Estendi trial fino al:</span>
          <input
            className="adm-input"
            type="date"
            value={trialDate}
            onChange={e => setTrialDate(e.target.value)}
            style={{ width: '150px' }}
            aria-label="Data fine trial"
          />
          <button className="adm-act" onClick={extendTrial} disabled={loading || !trialDate}>
            Salva
          </button>
        </div>

        {/* Archivia lab (blacklist senza DELETE) */}
        {stato !== 'blacklist' && (
          <div className="adm-row-divider" style={{ borderTop: '1px solid rgba(220,38,38,.12)', marginTop: 12 }}>
            <button
              type="button"
              className="adm-act red"
              onClick={handleArchive}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="1" y="4" width="10" height="7" rx="1" stroke="var(--adm-red)" strokeWidth="1.4"/>
                <path d="M4 4V2.5A1.5 1.5 0 0 1 8 2.5V4" stroke="var(--adm-red)" strokeWidth="1.4"/>
                <path d="M5 7v1M7 7v1" stroke="var(--adm-red)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Archivia lab e blocca accesso
            </button>
            <p style={{ fontSize: 11, color: 'var(--adm-t3, #888)', margin: '6px 0 0' }}>
              I dati rimangono nel database. Lo stato passa a BLACKLIST e viene loggato in lab_stato_log.
            </p>
          </div>
        )}

        {/* Hard delete — elimina definitivamente */}
        <div className="adm-row-divider" style={{ borderTop: '1px solid rgba(220,38,38,.18)', marginTop: 16, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--adm-red)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Eliminazione definitiva
          </p>
          <p style={{ fontSize: 11, color: 'var(--adm-t3)', margin: 0 }}>
            Elimina il laboratorio e tutti i suoi dati in modo irreversibile. Digita il nome esatto per confermare.
          </p>
          <form onSubmit={handleHardDelete} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%' }}>
            <input
              className="adm-input"
              placeholder="Nome laboratorio esatto..."
              value={hardDeleteName}
              onChange={e => setHardDeleteName(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
              aria-label="Conferma nome laboratorio"
            />
            <button
              type="submit"
              className="adm-act red"
              disabled={hardDeleteLoading || !hardDeleteName.trim()}
            >
              {hardDeleteLoading ? 'Eliminazione…' : 'Elimina definitivamente'}
            </button>
          </form>
          {hardDeleteMsg && (
            <div className={`adm-msg ${hardDeleteMsg.type}`} style={{ margin: 0 }}>{hardDeleteMsg.text}</div>
          )}
        </div>
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
                {entry.stato_from ?? '—'} &rarr; {entry.stato_to}
              </span>
              <span className="adm-log-source">{entry.source}{entry.actor ? ` · ${entry.actor}` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
