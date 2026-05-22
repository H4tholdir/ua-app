'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight } from '@/lib/feedback/haptic'

interface VoceListino {
  id: string
  nome: string
  codice: string
  categoria: string
  unita_misura: string
  descrizione: string | null
  prezzo_1: number | null
  prezzo_2: number | null
  prezzo_3: number | null
  prezzo_4: number | null
}

interface Props {
  voce: VoceListino
  onSaved: () => void
}

export function ListinoEditSheet({ voce, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: voce.nome,
    codice: voce.codice,
    categoria: voce.categoria,
    unita_misura: voce.unita_misura,
    descrizione: voce.descrizione ?? '',
    prezzo_1: voce.prezzo_1 ?? 0,
    prezzo_2: voce.prezzo_2 ?? 0,
    prezzo_3: voce.prezzo_3 ?? 0,
    prezzo_4: voce.prezzo_4 ?? 0,
  })

  const handleSave = async () => {
    setSaving(true)
    hapticLight()
    try {
      const res = await fetch(`/api/listino/${voce.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          codice: form.codice,
          categoria: form.categoria,
          unita_misura: form.unita_misura,
          descrizione: form.descrizione || null,
          prezzo_1: form.prezzo_1 || null,
          prezzo_2: form.prezzo_2 || null,
          prezzo_3: form.prezzo_3 || null,
          prezzo_4: form.prezzo_4 || null,
        }),
      })
      if (!res.ok) throw new Error('Errore')
      setOpen(false)
      onSaved()
    } catch {
      // silent — verrà risincronizzato al prossimo caricamento
    } finally {
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
        title="Modifica voce"
        aria-label={`Modifica ${voce.nome}`}
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: 'var(--prs)',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✏️
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={motionTokens.spring.gentle}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'black',
                zIndex: 40,
              }}
            />

            {/* Bottom sheet */}
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
              {/* Drag handle */}
              <div
                style={{
                  width: 36,
                  height: 4,
                  background: 'var(--prs)',
                  borderRadius: 2,
                  margin: '0 auto 20px',
                }}
              />

              <h3
                style={{
                  margin: '0 0 18px',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--t1)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Modifica voce listino
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Nome */}
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input
                    style={inputStyle}
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>

                {/* Codice + U.M. */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Codice</label>
                    <input
                      style={inputStyle}
                      value={form.codice}
                      onChange={e => setForm(p => ({ ...p, codice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>U.M.</label>
                    <input
                      style={inputStyle}
                      value={form.unita_misura}
                      onChange={e => setForm(p => ({ ...p, unita_misura: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <input
                    style={inputStyle}
                    value={form.categoria}
                    onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  />
                </div>

                {/* Descrizione */}
                <div>
                  <label style={labelStyle}>Descrizione</label>
                  <input
                    style={inputStyle}
                    value={form.descrizione}
                    onChange={e => setForm(p => ({ ...p, descrizione: e.target.value }))}
                  />
                </div>

                {/* Prezzi */}
                <div>
                  <label style={labelStyle}>Prezzi (€)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    {(['prezzo_1', 'prezzo_2', 'prezzo_3', 'prezzo_4'] as const).map((k, i) => (
                      <div key={k}>
                        <label style={{ ...labelStyle, fontSize: 10 }}>P{i + 1}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          style={{ ...inputStyle, textAlign: 'right' }}
                          value={form[k] || ''}
                          onChange={e =>
                            setForm(p => ({ ...p, [k]: parseFloat(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save button */}
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
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
