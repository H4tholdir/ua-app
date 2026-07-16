'use client'

// Foglio «Carica ricevuta PEC» (mockup 2026-07-16-riconciliazioni.html,
// sezione «Flusso — Carica ricevuta PEC»): 2 step, scelta file → «Ecco cosa
// ho letto» (dati REALI dalla risposta di POST /api/pec/ricevute, Task 10,
// mai un OK generico) → conferma con POST /api/pec/ricevute/[id]/applica
// (Task 11). Condiviso tra titolare e front_desk (RUOLI_INVIO_PEC).
//
// Lingua visiva ricalcata da NotaCreditoButton.tsx: bottom sheet mobile /
// dialog ancorato desktop, token globali v2.3, animazioni SOLO da
// design-system/motion.ts.

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticError, hapticMedium, hapticSuccess } from '@/lib/feedback/haptic'
import { soundError } from '@/lib/feedback/sounds'
import { STATO_SDI_LABEL } from '@/lib/fattura/stato-sdi-label'

const FONT = 'var(--font-dm-sans, "DM Sans", system-ui, sans-serif)'
const BORDER = '1px solid var(--elv)'
const SCRIM = 'rgba(0,0,0,0.45)'

interface UploadEsito {
  esito: 'proposta' | 'duplicata' | 'non_valida' | 'cap_superato'
  ricevutaId?: string
  tipo?: string
  fattura?: { id: string; numero: string; stato_sdi: string }
  transizioneProposta?: string | null
  esitoVerificaFirma?: 'valida' | 'fallita'
}

export interface UploadRicevutaSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Fattura in attesa per cui si sta caricando la ricevuta (contesto sheet). */
  numero: string
}

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return desktop
}

export function UploadRicevutaSheet(props: UploadRicevutaSheetProps) {
  const { open, onClose, onSuccess, numero } = props
  const reducedMotion = useReducedMotion()
  const isDesktop = useIsDesktop()

  const [step, setStep] = useState<1 | 2>(1)
  const [file, setFile] = useState<File | null>(null)
  const [esito, setEsito] = useState<UploadEsito | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Stato dedicato per il duplicato (QA FASE 9, scenario 2): il server risponde
  // 200 {esito:'duplicata'} senza inserire nulla (dedup sha256, ingest-ricevuta
  // step 1) — non è un errore, va spiegato in parole del banco.
  const [duplicata, setDuplicata] = useState(false)
  const [isPending, setIsPending] = useState(false)

  // Nessun effect di reset-su-`open`: RiconciliazioniClient monta questo
  // foglio SOLO quando serve e lo smonta alla chiusura — ogni apertura è
  // già un mount fresco con gli useState iniziali sopra.

  async function handleLeggi() {
    if (!file || isPending) return
    hapticMedium()
    setIsPending(true)
    setError(null)
    setDuplicata(false)
    const formData = new FormData()
    formData.append('file', file)
    let res: Response
    try {
      res = await fetch('/api/pec/ricevute', { method: 'POST', body: formData })
    } catch {
      hapticError()
      soundError()
      setIsPending(false)
      setError('Connessione assente. Riprova.')
      return
    }
    const raw = (await res.json().catch(() => null)) as (UploadEsito & { error?: string }) | null
    setIsPending(false)
    if (!res.ok || !raw) {
      hapticError()
      soundError()
      setError(raw?.error ?? 'Non sono riuscita a leggere la ricevuta. Riprova.')
      return
    }
    const data: UploadEsito = raw
    if (data.esito === 'non_valida') {
      hapticError()
      soundError()
      setError('Il file non è una ricevuta SdI valida.')
      return
    }
    if (data.esito === 'cap_superato') {
      hapticError()
      soundError()
      setError('Troppi caricamenti nelle ultime 24 ore. Riprova più tardi.')
      return
    }
    if (data.esito === 'duplicata') {
      // Nessun nuovo inserimento (già garantito dal server): messaggio
      // informativo, non un errore rosso. Nessun link alla riga esistente:
      // non esiste una pagina per singola ricevuta — se richiede ancora un
      // intervento è già elencata nei gruppi di questa pagina.
      setDuplicata(true)
      return
    }
    setEsito(data)
    setStep(2)
  }

  async function handleConferma() {
    if (!esito?.ricevutaId || isPending) return
    hapticMedium()
    setIsPending(true)
    setError(null)
    let res: Response
    try {
      res = await fetch(`/api/pec/ricevute/${esito.ricevutaId}/applica`, { method: 'POST' })
    } catch {
      hapticError()
      soundError()
      setIsPending(false)
      setError('Connessione assente. Riprova.')
      return
    }
    if (res.ok) {
      hapticSuccess()
      setIsPending(false)
      onSuccess()
      return
    }
    hapticError()
    soundError()
    setIsPending(false)
    const data = (await res.json().catch(() => null)) as { error?: string; esito?: string } | null
    if (data?.esito === 'quarantena') {
      setError('Verifica firma non disponibile — controllo manuale obbligatorio.')
    } else {
      setError(data?.error ?? "Impossibile applicare la ricevuta. Riprova.")
    }
  }

  const ctaRed: React.CSSProperties = {
    flex: 2, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, background: 'var(--primary)', border: 'none', color: '#fff',
    fontFamily: FONT, fontSize: 14, fontWeight: 700, outline: 'none',
  }
  const ctaNeutral: React.CSSProperties = {
    flex: 1, minHeight: 48, borderRadius: 12, background: 'var(--elv)', border: BORDER, color: 'var(--t2)',
    fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: 'pointer', outline: 'none',
  }
  const label: React.CSSProperties = {
    fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--t3)', margin: '0 0 8px',
  }
  const row: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0',
    borderBottom: BORDER, fontSize: 13, fontFamily: FONT, gap: 12,
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="upl-scrim"
            onClick={() => !isPending && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : t('fast')}
            style={{ position: 'fixed', inset: 0, background: SCRIM, zIndex: 300 }}
            aria-hidden="true"
          />
          <motion.div
            key="upl-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upl-sheet-title"
            initial={reducedMotion ? { opacity: 0 } : isDesktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
            animate={reducedMotion ? { opacity: 1 } : isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : isDesktop ? { opacity: 0, scale: 0.97, y: 4 } : { y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : isDesktop ? t('normal') : { ...motionTokens.spring.soft }}
            style={
              isDesktop
                ? {
                    position: 'fixed', top: 76, right: 24, width: 440, maxHeight: 'calc(100vh - 100px)',
                    overflowY: 'auto', zIndex: 301, background: 'var(--bg)', border: BORDER, borderRadius: 20,
                    boxShadow: 'var(--sh-b)', padding: 20,
                  }
                : {
                    position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '92vh', overflowY: 'auto',
                    zIndex: 301, background: 'var(--bg)', borderRadius: '22px 22px 0 0',
                    paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: 'var(--sh-b)',
                  }
            }
          >
            <div style={{ padding: isDesktop ? 0 : 18 }}>
              {!isDesktop && (
                <div aria-hidden="true" style={{ width: 34, height: 4, borderRadius: 2, background: 'var(--elv)', margin: '0 auto 14px' }} />
              )}

              {step === 1 ? (
                <>
                  <h2 id="upl-sheet-title" style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: 'var(--t1)', margin: '0 0 3px' }}>
                    Carica ricevuta PEC
                  </h2>
                  <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t2)', margin: '0 0 14px' }}>
                    Fattura {numero} · nessuna risposta dallo Stato finora
                  </p>

                  <p style={label}>
                    File della ricevuta <span style={{ color: 'var(--primary)' }}>*</span>
                  </p>
                  <input
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    aria-label="File della ricevuta"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    style={{
                      width: '100%', fontFamily: FONT, fontSize: 12, color: 'var(--t1)',
                      background: 'var(--elv)', border: BORDER, borderRadius: 12, padding: '11px 12px',
                      margin: '0 0 16px', boxSizing: 'border-box',
                    }}
                  />

                  <p style={label}>Dove la trovo?</p>
                  <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t2)', lineHeight: 1.5, margin: '0 0 16px' }}>
                    Nella casella PEC del laboratorio: è l&apos;allegato XML del messaggio arrivato dopo l&apos;invio.
                    Caricalo qui e UÀ lo legge per te.
                  </p>

                  {duplicata && (
                    <div
                      role="status"
                      style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 12,
                        margin: '0 0 14px', background: 'color-mix(in srgb, var(--c-blue) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--c-blue) 32%, transparent)',
                      }}
                    >
                      <span aria-hidden="true" style={{ color: 'var(--c-blue)', fontSize: 15, lineHeight: 1.2 }}>ℹ</span>
                      <span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t1)', lineHeight: 1.45 }}>
                        <b style={{ fontWeight: 700 }}>Questa ricevuta è già stata caricata.</b> Non serve rifarlo:
                        se richiede ancora un intervento, la trovi già qui tra le cose da sistemare.
                      </span>
                    </div>
                  )}

                  {error && (
                    <p role="alert" style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--primary)', margin: '0 0 10px' }}>
                      {error}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={onClose} disabled={isPending} style={ctaNeutral}>
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleLeggi}
                      disabled={!file || isPending}
                      style={{ ...ctaRed, cursor: !file || isPending ? 'not-allowed' : 'pointer', opacity: !file || isPending ? 0.42 : 1, boxShadow: !file || isPending ? 'none' : 'var(--sh-red)' }}
                    >
                      {isPending ? 'Leggo…' : 'Leggi la ricevuta'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 id="upl-sheet-title" style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: 'var(--t1)', margin: '0 0 3px' }}>
                    Ecco cosa ho letto
                  </h2>
                  <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t2)', margin: '0 0 14px' }}>
                    Controlla che torni tutto, poi conferma
                  </p>

                  <div style={{ background: 'var(--sfc)', borderRadius: 18, padding: 16, margin: '0 0 14px' }}>
                    <p style={label}>Cosa dice la ricevuta</p>
                    <div style={row}>
                      <span style={{ color: 'var(--t2)' }}>Che ricevuta è</span>
                      <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{esito?.tipo ?? '—'}</span>
                    </div>
                    <div style={row}>
                      <span style={{ color: 'var(--t2)' }}>Per quale fattura</span>
                      <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{esito?.fattura?.numero ?? 'Nessun abbinamento'}</span>
                    </div>
                    <div style={row}>
                      <span style={{ color: 'var(--t2)' }}>La fattura passerà a</span>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {esito?.transizioneProposta ? (STATO_SDI_LABEL[esito.transizioneProposta] ?? esito.transizioneProposta) : 'Nessuna variazione automatica'}
                      </span>
                    </div>
                    {esito?.esitoVerificaFirma === 'fallita' && (
                      <div style={{ ...row, borderBottom: 'none' }} role="alert">
                        <span style={{ color: 'var(--c-orange)', fontWeight: 700 }}>
                          ⚠ Verifica firma non disponibile — controllo manuale obbligatorio
                        </span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <p role="alert" style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--primary)', margin: '0 0 10px' }}>
                      {error}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={onClose} disabled={isPending} style={ctaNeutral}>
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleConferma}
                      disabled={isPending}
                      style={{ ...ctaRed, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1, boxShadow: 'var(--sh-red)' }}
                    >
                      {isPending ? 'Conferma…' : 'Conferma ricevuta'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
