'use client'

import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import type { TipoDispositivo } from '@/types/domain'

type FormState = 'idle' | 'loading' | 'successo' | 'errore'

const TIPO_OPTIONS: Array<{ value: TipoDispositivo; label: string }> = [
  { value: 'protesi_fissa', label: 'Protesi fissa (corona, ponte)' },
  { value: 'implantologia', label: 'Implantoprotesi' },
  { value: 'protesi_mobile', label: 'Protesi rimovibile' },
  { value: 'scheletrato', label: 'Scheletrato' },
  { value: 'ortodonzia', label: 'Ortodonzia' },
  { value: 'cad_cam', label: 'CAD/CAM (fresatura)' },
  { value: 'provvisorio', label: 'Provvisorio' },
  { value: 'riparazione', label: 'Riparazione' },
  { value: 'altro', label: 'Altro' },
]

const CHIP_GIORNI = [5, 7, 10, 14]

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDataIT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface Props {
  token: string
  clienteId: string
  labNome: string
  labLogoUrl: string | null
  nomeCliente: string
}

// ─── Checkmark SVG animato ─────────────────────────────────────────────────
function AnimatedCheck({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { scale: 0, opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
      transition={reduced
        ? { duration: motionTokens.duration.fast }
        : motionTokens.spring.pop
      }
      style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'var(--success, #16A34A)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 8px 24px rgba(22,163,74,0.30)',
      }}
      aria-hidden="true"
    >
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <motion.path
          d="M10 20 L17 27 L30 14"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={reduced
            ? { duration: motionTokens.duration.fast }
            : { duration: motionTokens.duration.normal, ease: motionTokens.easing.emphasized }
          }
        />
      </svg>
    </motion.div>
  )
}

export function RichiestaClientForm({
  token,
  labNome,
  labLogoUrl,
  nomeCliente,
}: Props) {
  const reduced = useReducedMotion()

  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [numeroLavoro, setNumeroLavoro] = useState('')

  const [tipoDispositivo, setTipoDispositivo] = useState<TipoDispositivo | ''>('')
  const [pazienteCodice, setPazienteCodice] = useState('')
  const [elementiDentali, setElementiDentali] = useState('')
  const [dataConsegna, setDataConsegna] = useState('')
  const [chipSelezionato, setChipSelezionato] = useState<number | null>(null)
  const [note, setNote] = useState('')

  const handleChip = useCallback((gg: number) => {
    setChipSelezionato(gg)
    setDataConsegna(addDays(gg))
  }, [])

  const handleDateInput = useCallback((v: string) => {
    setDataConsegna(v)
    setChipSelezionato(null)
  }, [])

  const handleReset = useCallback(() => {
    setFormState('idle')
    setTipoDispositivo('')
    setPazienteCodice('')
    setElementiDentali('')
    setDataConsegna('')
    setChipSelezionato(null)
    setNote('')
    setErrorMsg('')
    setNumeroLavoro('')
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // Validazione client-side
    if (!tipoDispositivo) {
      setErrorMsg('Seleziona il tipo di lavoro.')
      return
    }
    if (!pazienteCodice.trim()) {
      setErrorMsg('Inserisci il codice paziente.')
      return
    }
    if (!dataConsegna) {
      setErrorMsg('Seleziona la data di consegna richiesta.')
      return
    }

    setErrorMsg('')
    setFormState('loading')

    try {
      const descrizione = elementiDentali.trim()
        ? `Elementi: ${elementiDentali.trim()}`
        : tipoDispositivo

      const res = await fetch('/api/portale/richiedi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          tipo_dispositivo: tipoDispositivo,
          descrizione,
          paziente_codice: pazienteCodice.trim(),
          data_consegna_prevista: dataConsegna,
          note: note.trim() || undefined,
        }),
      })

      if (res.status === 429) {
        setFormState('errore')
        setErrorMsg('Troppe richieste nelle ultime 24 ore. Riprova domani.')
        return
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
        setFormState('errore')
        setErrorMsg(typeof body.error === 'string' ? body.error : 'Errore invio richiesta.')
        return
      }

      const data = (await res.json()) as { ok: boolean; numero_lavoro: string }
      setNumeroLavoro(data.numero_lavoro ?? '')
      setFormState('successo')
    } catch {
      setFormState('errore')
      setErrorMsg('Errore di rete. Verifica la connessione e riprova.')
    }
  }, [token, tipoDispositivo, pazienteCodice, elementiDentali, dataConsegna, note])

  // ─── Schermata successo ─────────────────────────────────────────────────
  if (formState === 'successo') {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg, #DDD8D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <AnimatedCheck reduced={reduced} />
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: motionTokens.duration.fast } : { duration: motionTokens.duration.normal, delay: 0.18, ease: motionTokens.easing.enter }}
          >
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '24px', fontWeight: 700, color: 'var(--t1, #1C1916)', margin: '0 0 12px' }}>
              Richiesta inviata!
            </h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: 'var(--t2, #4A3D33)', lineHeight: 1.6, margin: '0 0 8px' }}>
              Il laboratorio <strong style={{ color: 'var(--t1)' }}>{labNome}</strong> ha ricevuto la tua richiesta.
            </p>
            {numeroLavoro && (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--t2, #4A3D33)', margin: '0 0 24px' }}>
                Numero pratica: <strong style={{ color: 'var(--t1)' }}>#{numeroLavoro}</strong>
              </p>
            )}
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t2, #4A3D33)', lineHeight: 1.6, margin: '0 0 32px' }}>
              Ti contatteranno per la conferma.
            </p>
            <button
              type="button"
              onClick={handleReset}
              style={{
                height: '44px',
                padding: '0 24px',
                borderRadius: '12px',
                background: 'var(--sfc, #E4DFD9)',
                border: 'none',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--t1, #1C1916)',
                cursor: 'pointer',
                boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
              }}
            >
              ← Invia un&apos;altra richiesta
            </button>
          </motion.div>
        </div>
      </main>
    )
  }

  // ─── Schermata form ────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg, #DDD8D3)' }}>
      {/* Header laboratorio */}
      <header
        style={{
          background: 'var(--sfc, #E4DFD9)',
          borderBottom: '1px solid var(--prs, #D4CFC9)',
          padding: '16px 20px',
        }}
      >
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {labLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={labLogoUrl}
              alt={labNome}
              style={{ height: '36px', objectFit: 'contain', flexShrink: 0 }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--primary, #D90012)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 900,
                fontSize: '16px',
                color: '#fff',
              }}
            >
              UÀ
            </div>
          )}
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--t1, #1C1916)', margin: 0 }}>
              {labNome}
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--t2, #4A3D33)', margin: 0 }}>
              Richiesta lavoro — {nomeCliente}
            </p>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Titolo form */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--t1, #1C1916)', margin: '0 0 8px' }}>
            Nuova richiesta 🦷
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t2, #4A3D33)', margin: 0, lineHeight: 1.5 }}>
            Compila i dettagli. Riceverai conferma appena la riceviamo.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* TIPO DI LAVORO */}
          <FieldGroup label="TIPO DI LAVORO" required>
            <select
              value={tipoDispositivo}
              onChange={(e) => setTipoDispositivo(e.target.value as TipoDispositivo)}
              required
              style={selectStyle}
              aria-label="Tipo di lavoro"
            >
              <option value="">Seleziona...</option>
              {TIPO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FieldGroup>

          {/* CODICE PAZIENTE */}
          <FieldGroup label="CODICE PAZIENTE" required hint="Non inserire nome e cognome — usa un codice identificativo">
            <input
              type="text"
              value={pazienteCodice}
              onChange={(e) => setPazienteCodice(e.target.value)}
              placeholder="Es. MR-2026"
              required
              maxLength={40}
              style={inputStyle}
              aria-label="Codice paziente"
            />
          </FieldGroup>

          {/* ELEMENTI DENTALI */}
          <FieldGroup label="ELEMENTI DENTALI" hint="Numeri FDI (opzionale)">
            <input
              type="text"
              value={elementiDentali}
              onChange={(e) => setElementiDentali(e.target.value)}
              placeholder="Es. 14, 15, 16"
              maxLength={80}
              style={inputStyle}
              aria-label="Elementi dentali"
            />
          </FieldGroup>

          {/* DATA CONSEGNA */}
          <FieldGroup label="DATA CONSEGNA RICHIESTA" required>
            {/* Chip rapidi */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {CHIP_GIORNI.map(gg => (
                <button
                  key={gg}
                  type="button"
                  onClick={() => handleChip(gg)}
                  aria-pressed={chipSelezionato === gg}
                  style={{
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    border: chipSelezionato === gg
                      ? `2px solid var(--primary, #D90012)`
                      : `2px solid var(--prs, #D4CFC9)`,
                    background: chipSelezionato === gg
                      ? 'var(--primary, #D90012)'
                      : 'var(--sfc, #E4DFD9)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: chipSelezionato === gg ? '#fff' : 'var(--t1, #1C1916)',
                    cursor: 'pointer',
                    transition: `background ${motionTokens.duration.instant}s`,
                    flexShrink: 0,
                  }}
                >
                  +{gg}gg
                  {chipSelezionato === gg && dataConsegna && (
                    <span style={{ fontWeight: 400, fontSize: '11px', marginLeft: '4px', opacity: 0.85 }}>
                      ({formatDataIT(dataConsegna)})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={dataConsegna}
              onChange={(e) => handleDateInput(e.target.value)}
              min={addDays(1)}
              required
              style={inputStyle}
              aria-label="Data consegna richiesta"
            />
          </FieldGroup>

          {/* NOTE CLINICHE */}
          <FieldGroup label="NOTE CLINICHE" hint="Istruzioni particolari (opzionale)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Es. colore A2, impronta in busta..."
              style={{
                ...inputStyle,
                height: 'auto',
                resize: 'vertical',
                padding: '12px 14px',
                lineHeight: 1.5,
              }}
              aria-label="Note cliniche"
            />
          </FieldGroup>

          {/* Errore */}
          {errorMsg && (
            <div
              role="alert"
              style={{
                background: 'rgba(217,0,18,0.08)',
                border: '1.5px solid var(--primary, #D90012)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--primary, #D90012)',
                fontWeight: 600,
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={formState === 'loading'}
            style={{
              width: '100%',
              height: '52px',
              borderRadius: '14px',
              background: 'var(--primary, #D90012)',
              border: 'none',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '16px',
              fontWeight: 700,
              color: '#fff',
              cursor: formState === 'loading' ? 'wait' : 'pointer',
              opacity: formState === 'loading' ? 0.75 : 1,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), 0 5px 14px -2px rgba(180,0,0,.38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: `opacity ${motionTokens.duration.instant}s`,
            }}
            aria-busy={formState === 'loading'}
          >
            {formState === 'loading' ? (
              <>
                <LoadingSpinner />
                Invio in corso…
              </>
            ) : (
              '📨 Invia richiesta al laboratorio'
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          color: 'var(--t3, #6B5C51)',
          textAlign: 'center',
          marginTop: '32px',
        }}>
          Powered by UÀ — Gestionale odontotecnico
        </p>
      </div>
    </main>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FieldGroup({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label
        style={{
          display: 'block',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--t2, #4A3D33)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '6px',
        }}
      >
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: 'var(--primary, #D90012)', marginLeft: '2px' }}>
            *
          </span>
        )}
      </label>
      {hint && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          color: 'var(--t3, #6B5C51)',
          margin: '0 0 6px',
        }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  borderRadius: '12px',
  background: 'var(--sfc, #E4DFD9)',
  border: '1.5px solid var(--prs, #D4CFC9)',
  padding: '0 14px',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  color: 'var(--t1, #1C1916)',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%2396918D' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: '36px',
  cursor: 'pointer',
}
