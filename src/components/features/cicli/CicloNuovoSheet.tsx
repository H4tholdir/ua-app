'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'
import { TIPO_DISPOSITIVO_CICLO_OPTIONS, CLASSE_RISCHIO_CICLO_OPTIONS } from '@/lib/domain/cicli-produzione'

interface CicloValues {
  codice: string
  nome: string
  tipo_dispositivo: string
  classe_rischio: string | null
}

interface CicloNuovoSheetProps {
  mode: 'create' | 'edit'
  cicloId?: string
  initialValues?: CicloValues
}

function emptyForm(initialValues?: CicloValues) {
  return {
    nome: initialValues?.nome ?? '',
    codice: initialValues?.codice ?? '',
    tipo_dispositivo: initialValues?.tipo_dispositivo ?? '',
    classe_rischio: initialValues?.classe_rischio ?? '',
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

const CLASSE_RISCHIO_LABELS: Record<string, string> = {
  classe_i: 'Classe I',
  classe_iia: 'Classe IIa',
  classe_iib: 'Classe IIb',
  classe_iii: 'Classe III',
}

export function CicloNuovoSheet({ mode, cicloId, initialValues }: CicloNuovoSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm(initialValues))

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setForm(emptyForm(initialValues))
  }

  const tipoOptions = form.tipo_dispositivo && !(TIPO_DISPOSITIVO_CICLO_OPTIONS as readonly string[]).includes(form.tipo_dispositivo)
    ? [form.tipo_dispositivo, ...TIPO_DISPOSITIVO_CICLO_OPTIONS]
    : TIPO_DISPOSITIVO_CICLO_OPTIONS

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
    if (!form.tipo_dispositivo) {
      setError('Il campo "tipo_dispositivo" è obbligatorio')
      return
    }

    setSaving(true)
    hapticLight()

    const payload = {
      nome: form.nome.trim(),
      codice: form.codice.trim(),
      tipo_dispositivo: form.tipo_dispositivo,
      classe_rischio: form.classe_rischio || null,
    }

    try {
      const res = mode === 'create'
        ? await fetch('/api/cicli', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/cicli/${cicloId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Errore durante il salvataggio, riprova')
        setSaving(false)
        return
      }

      hapticMedium()

      if (mode === 'create') {
        const d = (await res.json()) as { ciclo: { id: string } }
        router.push(`/cicli-produzione/${d.ciclo.id}`)
      } else {
        window.location.reload()
      }
    } catch {
      setError('Errore di rete — controlla la connessione')
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); hapticLight() }}
        aria-label={mode === 'create' ? 'Nuovo ciclo' : 'Modifica'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '40px',
          minHeight: mode === 'create' ? 52 : 44,
          padding: '0 16px',
          borderRadius: '12px',
          background: mode === 'create' ? 'var(--primary, #D90012)' : 'var(--elv, #EDEDEA)',
          color: mode === 'create' ? '#fff' : 'var(--t1)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {mode === 'create' ? 'Nuovo ciclo' : 'Modifica'}
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
              style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 200 }}
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
                zIndex: 201,
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'var(--prs)', borderRadius: 2, margin: '0 auto 20px' }} />

              <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
                {mode === 'create' ? 'Nuovo ciclo di produzione' : 'Modifica ciclo di produzione'}
              </h3>

              {error && (
                <p role="alert" style={{ margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="ciclo-nuovo-nome">Nome *</label>
                  <input
                    id="ciclo-nuovo-nome"
                    style={inputStyle}
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle} htmlFor="ciclo-nuovo-codice">Codice *</label>
                  <input
                    id="ciclo-nuovo-codice"
                    style={inputStyle}
                    value={form.codice}
                    onChange={e => setForm(p => ({ ...p, codice: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle} htmlFor="ciclo-nuovo-tipo">Tipo dispositivo *</label>
                  <select
                    id="ciclo-nuovo-tipo"
                    style={inputStyle}
                    value={form.tipo_dispositivo}
                    onChange={e => setForm(p => ({ ...p, tipo_dispositivo: e.target.value }))}
                  >
                    <option value="">Seleziona tipo</option>
                    {tipoOptions.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle} htmlFor="ciclo-nuovo-classe-rischio">Classe di rischio</label>
                  <select
                    id="ciclo-nuovo-classe-rischio"
                    style={inputStyle}
                    value={form.classe_rischio}
                    onChange={e => setForm(p => ({ ...p, classe_rischio: e.target.value }))}
                  >
                    <option value="">Non specificata</option>
                    {CLASSE_RISCHIO_CICLO_OPTIONS.map(v => (
                      <option key={v} value={v}>{CLASSE_RISCHIO_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
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
                {saving
                  ? 'Salvataggio...'
                  : mode === 'create' ? 'Crea ciclo' : 'Salva modifiche'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
