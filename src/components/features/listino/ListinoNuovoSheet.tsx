'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'

const CATEGORIE: Array<[string, string]> = [
  ['protesi_fissa', 'Protesi fissa'],
  ['protesi_mobile', 'Protesi mobile'],
  ['implantologia', 'Implantologia'],
  ['cad_cam', 'CAD/CAM'],
  ['ortodonzia', 'Ortodonzia'],
  ['scheletrato', 'Scheletrato'],
  ['riparazione', 'Riparazione'],
  ['materiale', 'Materiale'],
  ['altro', 'Altro'],
]

const CLASSI_RISCHIO: Array<[string, string]> = [
  ['classe_i', 'Classe I'],
  ['classe_iia', 'Classe IIa'],
  ['classe_iib', 'Classe IIb'],
  ['classe_iii', 'Classe III'],
]

function emptyForm() {
  return {
    nome: '',
    codice: '',
    categoria: '',
    unita_misura: 'pz',
    descrizione: '',
    prezzo_1: 0,
    prezzo_2: 0,
    prezzo_3: 0,
    prezzo_4: 0,
    tipo_dispositivo_mdr: '',
    classe_rischio: '',
    da_conformare: true,
  }
}

export function ListinoNuovoSheet() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setForm(emptyForm())
  }

  const handleSave = async () => {
    setError(null)

    if (!form.nome.trim()) {
      setError('Il campo "nome" è obbligatorio')
      return
    }
    if (!form.codice.trim()) {
      setError('Il campo "codice" è obbligatorio')
      return
    }
    if (!form.categoria) {
      setError('Il campo "categoria" è obbligatorio')
      return
    }

    setSaving(true)
    hapticLight()

    try {
      const res = await fetch('/api/listino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          codice: form.codice.trim(),
          categoria: form.categoria,
          unita_misura: form.unita_misura.trim() || 'pz',
          descrizione: form.descrizione.trim() || null,
          prezzo_1: form.prezzo_1 || null,
          prezzo_2: form.prezzo_2 || null,
          prezzo_3: form.prezzo_3 || null,
          prezzo_4: form.prezzo_4 || null,
          tipo_dispositivo_mdr: form.tipo_dispositivo_mdr.trim() || null,
          classe_rischio: form.classe_rischio || null,
          da_conformare: form.da_conformare,
        }),
      })

      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Errore durante il salvataggio, riprova')
        setSaving(false)
        return
      }

      hapticMedium()
      window.location.reload()
    } catch {
      setError('Errore di rete — controlla la connessione')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 11px',
    background: 'var(--elv, #EDEDEA)',
    border: '1px solid var(--prs, #D4CFC9)',
    borderRadius: 9,
    fontSize: 13,
    color: 'var(--t1)',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--t2)',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    fontFamily: 'DM Sans, sans-serif',
    marginBottom: 3,
    display: 'block',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); hapticLight() }}
        aria-label="Nuova voce listino"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '40px',
          minHeight: '52px',
          padding: '0 16px',
          borderRadius: '12px',
          background: 'var(--primary, #D90012)',
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 0 16px rgba(0,0,0,.12)',
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Nuova voce
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={motionTokens.spring.gentle}
              onClick={handleClose}
              style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 40 }}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={motionTokens.spring.soft}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--sfc, #E4DFD9)',
                borderRadius: '20px 20px 0 0',
                padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
                zIndex: 50,
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'var(--prs)', borderRadius: 2, margin: '0 auto 20px' }} />

              <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
                Nuova voce listino
              </h3>

              {error && (
                <p role="alert" style={{ margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-nome">Nome *</label>
                  <input
                    id="listino-nuovo-nome"
                    style={inputStyle}
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle} htmlFor="listino-nuovo-codice">Codice *</label>
                    <input
                      id="listino-nuovo-codice"
                      style={inputStyle}
                      value={form.codice}
                      onChange={e => setForm(p => ({ ...p, codice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="listino-nuovo-um">U.M.</label>
                    <input
                      id="listino-nuovo-um"
                      style={inputStyle}
                      value={form.unita_misura}
                      onChange={e => setForm(p => ({ ...p, unita_misura: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-categoria">Categoria *</label>
                  <select
                    id="listino-nuovo-categoria"
                    style={inputStyle}
                    value={form.categoria}
                    onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  >
                    <option value="">Seleziona categoria</option>
                    {CATEGORIE.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-descrizione">Descrizione</label>
                  <input
                    id="listino-nuovo-descrizione"
                    style={inputStyle}
                    value={form.descrizione}
                    onChange={e => setForm(p => ({ ...p, descrizione: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Prezzi (€)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    {(['prezzo_1', 'prezzo_2', 'prezzo_3', 'prezzo_4'] as const).map((k, i) => (
                      <div key={k}>
                        <label style={{ ...labelStyle, fontSize: 10 }} htmlFor={`listino-nuovo-${k}`}>P{i + 1}</label>
                        <input
                          id={`listino-nuovo-${k}`}
                          type="number"
                          min="0"
                          step="0.01"
                          style={{ ...inputStyle, textAlign: 'right' }}
                          value={form[k] || ''}
                          onChange={e => setForm(p => ({ ...p, [k]: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-tipo-mdr">Tipo dispositivo MDR</label>
                  <input
                    id="listino-nuovo-tipo-mdr"
                    style={inputStyle}
                    placeholder='Es. "Corona in zirconia monolitica"'
                    value={form.tipo_dispositivo_mdr}
                    onChange={e => setForm(p => ({ ...p, tipo_dispositivo_mdr: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-classe-rischio">Classe di rischio MDR</label>
                  <select
                    id="listino-nuovo-classe-rischio"
                    style={inputStyle}
                    value={form.classe_rischio}
                    onChange={e => setForm(p => ({ ...p, classe_rischio: e.target.value }))}
                  >
                    <option value="">Non specificata</option>
                    {CLASSI_RISCHIO.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--t1)' }}>
                  <input
                    type="checkbox"
                    checked={form.da_conformare}
                    onChange={e => setForm(p => ({ ...p, da_conformare: e.target.checked }))}
                    style={{ width: 18, height: 18 }}
                  />
                  Richiede Dichiarazione di Conformità
                </label>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '13px',
                  background: saving ? 'var(--prs)' : 'var(--primary, #D90012)',
                  color: 'white',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  minHeight: 44,
                }}
              >
                {saving ? 'Creazione...' : 'Crea voce'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
