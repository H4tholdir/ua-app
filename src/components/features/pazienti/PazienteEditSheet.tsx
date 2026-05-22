'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight } from '@/lib/feedback/haptic'

interface PazienteEditProps {
  paziente: {
    id: string
    codice_paziente: string | null
    note: string | null
    anamnesi: string | null
    asl: string | null
    sesso: string | null
    data_nascita: string | null
  }
}

export function PazienteEditSheet({ paziente }: PazienteEditProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    codice_paziente: paziente.codice_paziente ?? '',
    asl: paziente.asl ?? '',
    sesso: paziente.sesso ?? '',
    data_nascita: paziente.data_nascita ?? '',
    anamnesi: paziente.anamnesi ?? '',
    note: paziente.note ?? '',
  })

  const handleSave = async () => {
    setSaving(true)
    hapticLight()
    try {
      const res = await fetch(`/api/pazienti/${paziente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Errore salvataggio')
      setOpen(false)
      router.refresh()
    } catch {
      // non-critical — user can retry
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--elv, #EDEDEA)',
    border: '1px solid var(--prs, #D4CFC9)',
    borderRadius: 10,
    fontSize: 14,
    color: 'var(--t1)',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--t2)',
    fontFamily: 'DM Sans, sans-serif',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); hapticLight() }}
        style={{
          padding: '10px 16px',
          background: 'var(--sfc)',
          border: '1px solid var(--prs)',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--t1)',
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        ✏️ Modifica
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionTokens.duration.fast }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 40 }}
            />

            {/* Bottom sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ ...motionTokens.spring.soft }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--sfc, #E4DFD9)',
                borderRadius: '20px 20px 0 0',
                padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
                zIndex: 50,
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
            >
              {/* Drag handle */}
              <div style={{
                width: 36, height: 4,
                background: 'var(--prs)',
                borderRadius: 2,
                margin: '0 auto 20px',
              }} />

              <h3 style={{
                margin: '0 0 20px',
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--t1)',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Modifica paziente
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Codice paziente */}
                <div>
                  <label style={labelStyle}>Codice paziente (GDPR)</label>
                  <input
                    style={inputStyle}
                    value={form.codice_paziente}
                    placeholder="es. PAZ/2024/001"
                    onChange={e => setForm(p => ({ ...p, codice_paziente: e.target.value }))}
                  />
                </div>

                {/* Sesso + Data nascita */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Sesso</label>
                    <select
                      style={{ ...inputStyle }}
                      value={form.sesso}
                      onChange={e => setForm(p => ({ ...p, sesso: e.target.value }))}
                    >
                      <option value="">—</option>
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Data nascita</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={form.data_nascita}
                      onChange={e => setForm(p => ({ ...p, data_nascita: e.target.value }))}
                    />
                  </div>
                </div>

                {/* ASL */}
                <div>
                  <label style={labelStyle}>ASL / Ente sanitario</label>
                  <input
                    style={inputStyle}
                    value={form.asl}
                    placeholder="es. ASL Salerno 1"
                    onChange={e => setForm(p => ({ ...p, asl: e.target.value }))}
                  />
                </div>

                {/* Anamnesi */}
                <div>
                  <label style={labelStyle}>Anamnesi</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                    value={form.anamnesi}
                    placeholder="Allergie, patologie rilevanti..."
                    onChange={e => setForm(p => ({ ...p, anamnesi: e.target.value }))}
                  />
                </div>

                {/* Note */}
                <div>
                  <label style={labelStyle}>Note</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
                    value={form.note}
                    onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  />
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginTop: 20,
                  width: '100%',
                  padding: '14px',
                  background: saving ? 'var(--prs)' : 'var(--primary, #D90012)',
                  color: 'white',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {saving ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
