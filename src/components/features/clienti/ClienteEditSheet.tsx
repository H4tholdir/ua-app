'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'

// ─── Tipi ──────────────────────────────────────────────────────────────────────

export interface ClienteEditData {
  id: string
  studio_nome: string | null
  nome: string
  cognome: string
  telefono: string | null
  email: string | null
  indirizzo: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  partita_iva: string | null
  codice_fiscale: string | null
  codice_sdi: string | null
  pec: string | null
  listino_numero: number
  sconto_percentuale: number
  modalita_pagamento: string | null
  note: string | null
}

interface ClienteEditSheetProps {
  cliente: ClienteEditData
  isOpen: boolean
  onClose: () => void
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  padding: '0 12px',
  borderRadius: '10px',
  border: '1.5px solid var(--prs, #D4CFC9)',
  background: 'var(--elv, #EDEDEA)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  color: 'var(--t1, #1C1916)',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--t3, #B8B3AE)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '5px',
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ClienteEditSheet({ cliente, isOpen, onClose }: ClienteEditSheetProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()

  const [form, setForm] = useState({
    studio_nome: cliente.studio_nome ?? '',
    nome: cliente.nome,
    cognome: cliente.cognome,
    telefono: cliente.telefono ?? '',
    email: cliente.email ?? '',
    indirizzo: cliente.indirizzo ?? '',
    cap: cliente.cap ?? '',
    citta: cliente.citta ?? '',
    provincia: cliente.provincia ?? '',
    partita_iva: cliente.partita_iva ?? '',
    codice_fiscale: cliente.codice_fiscale ?? '',
    codice_sdi: cliente.codice_sdi ?? '',
    pec: cliente.pec ?? '',
    listino_numero: String(cliente.listino_numero),
    sconto_percentuale: String(cliente.sconto_percentuale),
    modalita_pagamento: cliente.modalita_pagamento ?? '',
    note: cliente.note ?? '',
  })

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      setErrorMsg(null)
    }
  }

  function handleClose() {
    setErrorMsg(null)
    onClose()
  }

  async function handleSalva() {
    if (!form.nome.trim()) {
      setErrorMsg('Il campo "Nome" è obbligatorio.')
      return
    }
    if (!form.cognome.trim()) {
      setErrorMsg('Il campo "Cognome" è obbligatorio.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const body: Record<string, unknown> = {
        studio_nome: form.studio_nome.trim() || null,
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        indirizzo: form.indirizzo.trim() || null,
        cap: form.cap.trim() || null,
        citta: form.citta.trim() || null,
        provincia: form.provincia.trim().toUpperCase() || null,
        partita_iva: form.partita_iva.trim() || null,
        codice_fiscale: form.codice_fiscale.trim() || null,
        codice_sdi: form.codice_sdi.trim() || null,
        pec: form.pec.trim() || null,
        listino_numero: parseInt(form.listino_numero, 10) || 1,
        sconto_percentuale: parseFloat(form.sconto_percentuale) || 0,
        modalita_pagamento: form.modalita_pagamento.trim() || null,
        note: form.note.trim() || null,
      }

      const res = await fetch(`/api/clienti/${cliente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg((data as { error?: string }).error ?? 'Errore durante il salvataggio.')
        setLoading(false)
        return
      }

      // Refresh server component data, then close
      router.refresh()
      handleClose()
    } catch {
      setErrorMsg('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="cliente-edit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : t('fast', 'exit')}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,.38)',
              zIndex: 80,
            }}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="cliente-edit-sheet"
            initial={reducedMotion ? undefined : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reducedMotion ? undefined : { y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: 600,
              margin: '0 auto',
              background: 'var(--sfc, #E4DFD9)',
              borderRadius: '24px 24px 0 0',
              zIndex: 81,
              boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
              maxHeight: '92dvh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--t3, #B8B3AE)',
                margin: '12px auto 0',
                flexShrink: 0,
              }}
            />

            {/* Header */}
            <div
              style={{
                padding: '14px 20px 12px',
                borderBottom: '1px solid var(--prs, #D4CFC9)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'var(--t1, #1C1916)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Modifica cliente
                </p>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13,
                    color: 'var(--t2, #96918D)',
                    margin: '2px 0 0',
                  }}
                >
                  {cliente.cognome} {cliente.nome}
                </p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Chiudi"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'var(--prs, #D4CFC9)',
                  cursor: 'pointer',
                  color: 'var(--t2, #96918D)',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Scrollable form */}
            <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>

              {/* Sezione: Anagrafica */}
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'var(--t2, #96918D)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                Anagrafica
              </p>

              <FieldGroup label="Studio / Clinica">
                <input
                  type="text"
                  value={form.studio_nome}
                  onChange={set('studio_nome')}
                  placeholder="Nome studio dentistico"
                  style={inputStyle}
                />
              </FieldGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <FieldGroup label="Nome *">
                  <input
                    type="text"
                    value={form.nome}
                    onChange={set('nome')}
                    placeholder="Mario"
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="Cognome *">
                  <input
                    type="text"
                    value={form.cognome}
                    onChange={set('cognome')}
                    placeholder="Rossi"
                    style={inputStyle}
                  />
                </FieldGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <FieldGroup label="Telefono">
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={set('telefono')}
                    placeholder="+39 02 1234567"
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="studio@esempio.it"
                    style={inputStyle}
                  />
                </FieldGroup>
              </div>

              <FieldGroup label="Indirizzo">
                <input
                  type="text"
                  value={form.indirizzo}
                  onChange={set('indirizzo')}
                  placeholder="Via Roma 1"
                  style={inputStyle}
                />
              </FieldGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px', gap: '10px' }}>
                <FieldGroup label="CAP">
                  <input
                    type="text"
                    value={form.cap}
                    onChange={set('cap')}
                    placeholder="20100"
                    maxLength={5}
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="Città">
                  <input
                    type="text"
                    value={form.citta}
                    onChange={set('citta')}
                    placeholder="Milano"
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="Prov.">
                  <input
                    type="text"
                    value={form.provincia}
                    onChange={set('provincia')}
                    placeholder="MI"
                    maxLength={2}
                    style={{ ...inputStyle, textTransform: 'uppercase' }}
                  />
                </FieldGroup>
              </div>

              {/* Sezione: Dati fiscali */}
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'var(--t2, #96918D)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>
                Dati fiscali
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <FieldGroup label="Partita IVA">
                  <input
                    type="text"
                    value={form.partita_iva}
                    onChange={set('partita_iva')}
                    placeholder="IT12345678901"
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="Codice fiscale">
                  <input
                    type="text"
                    value={form.codice_fiscale}
                    onChange={set('codice_fiscale')}
                    placeholder="RSSMRA80A01H501U"
                    style={inputStyle}
                  />
                </FieldGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <FieldGroup label="Codice SDI">
                  <input
                    type="text"
                    value={form.codice_sdi}
                    onChange={set('codice_sdi')}
                    placeholder="XXXXXXX"
                    maxLength={7}
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="PEC">
                  <input
                    type="email"
                    value={form.pec}
                    onChange={set('pec')}
                    placeholder="studio@pec.it"
                    style={inputStyle}
                  />
                </FieldGroup>
              </div>

              {/* Sezione: Commerciale */}
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'var(--t2, #96918D)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>
                Commerciale
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <FieldGroup label="Listino (1–4)">
                  <select
                    value={form.listino_numero}
                    onChange={set('listino_numero')}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="1">Listino 1</option>
                    <option value="2">Listino 2</option>
                    <option value="3">Listino 3</option>
                    <option value="4">Listino 4</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Sconto %">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.sconto_percentuale}
                    onChange={set('sconto_percentuale')}
                    placeholder="0"
                    style={inputStyle}
                  />
                </FieldGroup>
              </div>

              <FieldGroup label="Modalità pagamento">
                <input
                  type="text"
                  value={form.modalita_pagamento}
                  onChange={set('modalita_pagamento')}
                  placeholder="es. Bonifico 30gg"
                  style={inputStyle}
                />
              </FieldGroup>

              {/* Note */}
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'var(--t2, #96918D)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>
                Note
              </p>
              <textarea
                value={form.note}
                onChange={set('note')}
                placeholder="Note interne sul cliente..."
                rows={3}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--prs, #D4CFC9)',
                  background: 'var(--elv, #EDEDEA)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: 'var(--t1, #1C1916)',
                  boxSizing: 'border-box',
                  outline: 'none',
                  minHeight: '72px',
                  marginBottom: '4px',
                }}
              />

              {/* Errore */}
              {errorMsg && (
                <p
                  role="alert"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    color: 'var(--primary, #D90012)',
                    margin: '8px 0 0',
                  }}
                >
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Footer sticky */}
            <div
              style={{
                padding: '12px 20px',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
                borderTop: '1px solid var(--prs, #D4CFC9)',
                background: 'var(--sfc, #E4DFD9)',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                disabled={loading}
                onClick={handleSalva}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: 'none',
                  background: loading ? 'rgba(217,0,18,.40)' : 'var(--primary, #D90012)',
                  color: '#fff',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '52px',
                  letterSpacing: '0.01em',
                  transition: 'background 0.08s',
                  boxShadow: loading
                    ? 'none'
                    : 'inset 0 1px 0 rgba(255,255,255,.22), 0 5px 14px -2px rgba(180,0,0,.38)',
                }}
                aria-busy={loading}
              >
                {loading ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
