// src/components/features/scadenzario/CreditoSheet.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticSuccess } from '@/lib/feedback/haptic'
import type { DovutoEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, labelOrigine } from './estratto-conto-shared'

const METODI: Array<{ value: string; label: string }> = [
  { value: 'contanti', label: 'Contanti' },
  { value: 'bonifico', label: 'Bonifico' },
  { value: 'pos', label: 'POS' },
  { value: 'assegno', label: 'Assegno' },
  { value: 'altro', label: 'Altro' },
]

interface Props {
  mode: 'applica' | 'rimborsa' | null
  clienteId: string
  disponibile: number
  dovutiApplicabili: DovutoEstratto[]
  onClose: () => void
}

export function CreditoSheet({ mode, clienteId, disponibile, dovutiApplicabili, onClose }: Props) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [dovutoId, setDovutoId] = useState<string>(dovutiApplicabili[0]?.id ?? '')
  const [importo, setImporto] = useState<string>('')
  const [metodo, setMetodo] = useState<string>('contanti')
  const [metodoNota, setMetodoNota] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!mode || loading) return
    const importoNum = Number(importo)
    if (!(importoNum > 0)) {
      setErrore('Inserisci un importo valido')
      return
    }
    if (importoNum > disponibile) {
      setErrore(`Importo superiore al credito disponibile (${fmt.format(disponibile)})`)
      return
    }

    setLoading(true)
    setErrore(null)
    try {
      const url = mode === 'applica'
        ? `/api/clienti/${clienteId}/credito/applica`
        : `/api/clienti/${clienteId}/credito/rimborsa`

      const dovuto = dovutiApplicabili.find((d) => d.id === dovutoId)
      const body = mode === 'applica'
        ? {
            importo: importoNum,
            ...(dovuto?.origine === 'fattura' ? { fattura_id: dovuto.id } : { lavoro_id: dovuto?.id }),
          }
        : { importo: importoNum, metodo, metodo_nota: metodoNota || null }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrore(json.error ?? 'Errore')
        return
      }
      hapticSuccess()
      setImporto('')
      setMetodoNota('')
      router.refresh()
      onClose()
    } catch {
      setErrore('Errore di rete — riprova')
    } finally {
      setLoading(false)
    }
  }, [mode, loading, importo, disponibile, dovutiApplicabili, dovutoId, metodo, metodoNota, clienteId, router, onClose])

  return (
    <AnimatePresence>
      {mode && (
        <>
          <motion.div
            key="credito-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.32)' }}
          />
          <motion.div
            key="credito-sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 81,
              background: DS.sfc, borderRadius: '28px 28px 0 0',
              maxWidth: 600, margin: '0 auto', maxHeight: '92dvh',
              display: 'flex', flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'applica' ? 'Applica credito' : 'Rimborsa credito'}
          >
            <div style={{ width: 36, height: 4, background: DS.t3, borderRadius: 99, margin: '12px auto 16px' }} />

            <div style={{ padding: '0 20px 16px', flex: 1, overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 4px', fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: DS.t1 }}>
                {mode === 'applica' ? 'Applica credito a un dovuto' : 'Rimborsa credito'}
              </h2>
              <p style={{ margin: '0 0 20px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.t2 }}>
                Credito disponibile: {fmt.format(disponibile)}
              </p>

              {mode === 'applica' && (
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                    Dovuto target
                  </span>
                  <select
                    value={dovutoId}
                    onChange={(e) => setDovutoId(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`, background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: DS.t1 }}
                  >
                    {dovutiApplicabili.map((d) => (
                      <option key={d.id} value={d.id}>
                        {labelOrigine(d.origine)} N. {d.numero} — residuo {fmt.format(d.residuo)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Importo (€)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`, background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1 }}
                />
              </label>

              {mode === 'rimborsa' && (
                <>
                  <label style={{ display: 'block', marginBottom: 14 }}>
                    <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                      Metodo
                    </span>
                    <select
                      value={metodo}
                      onChange={(e) => setMetodo(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`, background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1 }}
                    >
                      {METODI.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                    </select>
                  </label>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                      Nota (opzionale)
                    </span>
                    <input
                      type="text"
                      value={metodoNota}
                      onChange={(e) => setMetodoNota(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`, background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1 }}
                    />
                  </label>
                </>
              )}

              {errore && (
                <p role="alert" style={{ margin: '8px 0 0', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.red }}>
                  {errore}
                </p>
              )}
            </div>

            <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (mode === 'applica' && dovutiApplicabili.length === 0)}
                style={{
                  width: '100%', minHeight: 52, borderRadius: 100, border: 'none',
                  background: DS.green, color: '#fff', fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Invio…' : mode === 'applica' ? '✓ Applica credito' : '✓ Registra rimborso'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
