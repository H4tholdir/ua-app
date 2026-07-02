'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticSuccess } from '@/lib/feedback/haptic'
import { soundPaymentSuccess } from '@/lib/feedback/sounds'

const DS = {
  sfc: 'var(--sfc, #E4DFD9)',
  elv: 'var(--elv, #EDEDEA)',
  prs: 'var(--prs, #D4CFC9)',
  t1: 'var(--t1, #1C1916)',
  t2: 'var(--t2, #4A3D33)',
  t3: 'var(--t3, #6B5C51)',
  primary: 'var(--primary, #D90012)',
  green: 'var(--success, #16A34A)',
  shB: 'var(--sh-b)',
} as const

const METODI: Array<{ value: string; label: string }> = [
  { value: 'contanti', label: 'Contanti' },
  { value: 'bonifico', label: 'Bonifico' },
  { value: 'pos', label: 'POS' },
  { value: 'assegno', label: 'Assegno' },
  { value: 'altro', label: 'Altro' },
]

export interface TargetPagamento {
  tipo: 'fattura' | 'lavoro'
  id: string
  residuo: number
  etichetta: string // es. "Fattura 2026-0042" o "Lavoro 2026/0113"
}

interface Props {
  target: TargetPagamento | null
  onClose: () => void
  onRegistrato: (eccedenza: number) => void
}

export function RegistraPagamentoSheet({ target, onClose, onRegistrato }: Props) {
  const reducedMotion = useReducedMotion()
  const [importo, setImporto] = useState<string>('')
  const [metodo, setMetodo] = useState<string>('contanti')
  const [metodoNota, setMetodoNota] = useState<string>('')
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const importoDefault = target ? String(target.residuo) : ''

  const handleSubmit = useCallback(async () => {
    if (!target || loading) return
    const importoNum = Number(importo || importoDefault)
    if (!(importoNum > 0)) {
      setErrore('Inserisci un importo valido')
      return
    }

    setLoading(true)
    setErrore(null)
    try {
      const res = await fetch('/api/pagamenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [target.tipo === 'fattura' ? 'fattura_id' : 'lavoro_id']: target.id,
          importo: importoNum,
          metodo,
          metodo_nota: metodoNota || null,
          data_pagamento: dataPagamento,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrore(json.error ?? 'Errore registrazione pagamento')
        return
      }
      hapticSuccess()
      soundPaymentSuccess()
      onRegistrato(json.eccedenza ?? 0)
      setImporto('')
      setMetodoNota('')
      onClose()
    } catch {
      setErrore('Errore di rete — riprova')
    } finally {
      setLoading(false)
    }
  }, [target, loading, importo, importoDefault, metodo, metodoNota, dataPagamento, onRegistrato, onClose])

  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            key="registra-pagamento-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.32)' }}
          />
          <motion.div
            key="registra-pagamento-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 81,
              background: DS.sfc,
              borderRadius: '28px 28px 0 0',
              maxWidth: 600, margin: '0 auto',
              maxHeight: '92dvh',
              display: 'flex', flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Registra pagamento"
          >
            <div style={{ width: 36, height: 4, background: DS.t3, borderRadius: 99, margin: '12px auto 16px' }} />

            <div style={{ padding: '0 20px 16px', flex: 1, overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 4px', fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: DS.t1 }}>
                Registra pagamento
              </h2>
              <p style={{ margin: '0 0 20px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.t2 }}>
                {target.etichetta} — residuo {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(target.residuo)}
              </p>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Importo (€)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder={importoDefault}
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                    background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Metodo
                </span>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                    background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                  }}
                >
                  {METODI.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Nota metodo (opzionale)
                </span>
                <input
                  type="text"
                  placeholder="es. ultime 4 cifre assegno"
                  value={metodoNota}
                  onChange={(e) => setMetodoNota(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                    background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                  Data pagamento
                </span>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                    background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                  }}
                />
              </label>

              {errore && (
                <p role="alert" style={{ margin: '8px 0 0', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.primary }}>
                  {errore}
                </p>
              )}
            </div>

            <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: '100%', minHeight: 52, borderRadius: 100, border: 'none',
                  background: DS.green, color: '#fff',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 15,
                  cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Registrazione…' : '✓ Registra pagamento'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
