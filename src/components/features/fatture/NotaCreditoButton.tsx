'use client'

// Nota di Credito TD04 — variante B APPROVATA (docs/design/decisions/2026-07-15-nota-credito-td04.md):
// voce danger nel menu overflow ⋯ dell'header + bottom sheet (mobile) / dialog
// ancorato (desktop) a 2 step. Lingua visiva del pattern REALE di riferimento
// src/components/features/lavori/RifacimentoButton.tsx, ma su token GLOBALI v2.3
// (--sfc/--t1/--primary…) perché /fatture/[id] è una pagina v2.3, non v3.
// Animazioni SOLO da src/design-system/motion.ts. Colori SOLO via CSS var.

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import type { StatoSDI } from '@/types/domain'
import { hapticError, hapticLight, hapticMedium } from '@/lib/feedback/haptic'
import { soundError } from '@/lib/feedback/sounds'

// Gate (vincolante, decisione approvata): la voce compare SOLO su fatture
// realmente stornabili. Set allineato a StatoSDI (domain.ts), non allo
// schema.sql legacy.
const STATI_STORNABILI: readonly StatoSDI[] = [
  'smtp_inviata',
  'pec_consegnata',
  'ricevuta_sdi',
  'accettata',
  'scaduta',
] as const

const CHUNK = 200
const FONT = 'var(--font-dm-sans, "DM Sans", system-ui, sans-serif)'
const BORDER = '1px solid var(--elv)'
const SCRIM = 'rgba(0,0,0,0.45)'

interface Props {
  fatturaId: string
  numero: string
  clienteNome: string
  importo: number
  pagata: boolean
  lavoroId: string | null
  statoSdi: StatoSDI
  tipoDocumento: string
  stornataAt: string | null
}

/** Desktop breakpoint (≥768px) — mobile-first come SSR (default false → nessun
 * hydration mismatch, stesso pattern di useReducedMotion). */
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

export function NotaCreditoButton(props: Props) {
  const { fatturaId, numero, clienteNome, importo, pagata, lavoroId } = props
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const isDesktop = useIsDesktop()

  const [menuOpen, setMenuOpen] = useState(false)
  const [step, setStep] = useState<0 | 1 | 2>(0) // 0 = chiuso
  const [causale, setCausale] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const closeSheet = useCallback(() => {
    if (isPending) return
    setStep(0)
  }, [isPending])

  // Esc chiude menu o foglio (mai una X come unica uscita).
  useEffect(() => {
    if (!menuOpen && step === 0) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (menuOpen) setMenuOpen(false)
      else closeSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, step, closeSheet])

  // ── Gate visibilità ────────────────────────────────────────────────────
  const stornabile =
    props.tipoDocumento === 'TD01' &&
    !props.stornataAt &&
    STATI_STORNABILI.includes(props.statoSdi)
  if (!stornabile) return null

  const causaleTrim = causale.trim()
  const importoFmt = `€${importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`

  function apriFoglio() {
    setMenuOpen(false)
    setCausale('')
    setError(null)
    setStep(1)
    hapticLight()
  }

  function handleConfirm() {
    if (!causaleTrim || isPending) return
    hapticMedium()
    startTransition(async () => {
      setError(null)
      let res: Response
      try {
        res = await fetch(`/api/fatture/${fatturaId}/nota-credito`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ causale: causaleTrim }),
        })
      } catch {
        hapticError()
        soundError()
        setError('Connessione assente. Riprova.')
        return
      }
      if (res.ok) {
        // 200 {numero} oppure 200 {xml_pending:true}: in entrambi i casi lo
        // storno è avvenuto → esito non-bloccante: chiudi + refresh. La pagina
        // riflette badge «Stornata» + link al TD04 (in pending, XML in coda).
        setStep(0)
        router.refresh()
        return
      }
      // 400 / 404 / 409 / 500 → errore NEL foglio, senza chiudere.
      hapticError()
      soundError()
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error ?? 'Impossibile emettere la nota di credito. Riprova.')
    })
  }

  const showSheet = step !== 0

  // ── Stili condivisi ──────────────────────────────────────────────────────
  const kebab: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--elv)',
    border: BORDER,
    color: 'var(--t1)',
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  }

  const ctaRed: React.CSSProperties = {
    flex: 2,
    minHeight: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    background: 'var(--primary)',
    border: 'none',
    color: '#fff',
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
    boxShadow: 'var(--sh-red)',
  }

  const ctaNeutral: React.CSSProperties = {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    background: 'var(--elv)',
    border: BORDER,
    color: 'var(--t2)',
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
  }

  const label: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--t3)',
    margin: '0 0 8px',
  }

  return (
    <div data-nota-credito="v2.3" style={{ display: 'contents' }}>
      {/* ── Trigger ⋯ ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Azioni documento"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={kebab}
        >
          ⋯
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              {/* backdrop trasparente: click fuori chiude il menu */}
              <div
                onClick={() => setMenuOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 290 }}
                aria-hidden="true"
              />
              <motion.div
                role="menu"
                aria-label="Azioni documento"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={reducedMotion ? { duration: 0 } : t('fast')}
                style={{
                  position: 'absolute',
                  top: 52,
                  right: 0,
                  width: 244,
                  background: 'var(--sfc)',
                  border: BORDER,
                  borderRadius: 16,
                  boxShadow: 'var(--sh-b)',
                  overflow: 'hidden',
                  zIndex: 291,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={apriFoglio}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    minHeight: 48,
                    padding: '13px 14px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontFamily: FONT,
                    fontSize: 14,
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <span aria-hidden="true" style={{ width: 18, textAlign: 'center' }}>
                    ↩
                  </span>
                  Emetti nota di credito
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Scrim + Foglio (2 step) ──────────────────────────────────────── */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              key="nc-scrim"
              onClick={closeSheet}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : t('fast')}
              style={{ position: 'fixed', inset: 0, background: SCRIM, zIndex: 300 }}
              aria-hidden="true"
            />
            <motion.div
              key="nc-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="nc-sheet-title"
              initial={
                reducedMotion
                  ? { opacity: 0 }
                  : isDesktop
                    ? { opacity: 0, scale: 0.96, y: 8 }
                    : { y: '100%' }
              }
              animate={reducedMotion ? { opacity: 1 } : isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : isDesktop
                    ? { opacity: 0, scale: 0.97, y: 4 }
                    : { y: '100%' }
              }
              transition={
                reducedMotion ? { duration: 0 } : isDesktop ? t('normal') : { ...motionTokens.spring.soft }
              }
              style={
                isDesktop
                  ? {
                      position: 'fixed',
                      top: 76,
                      right: 24,
                      width: 440,
                      maxHeight: 'calc(100vh - 100px)',
                      overflowY: 'auto',
                      zIndex: 301,
                      background: 'var(--bg)',
                      border: BORDER,
                      borderRadius: 20,
                      boxShadow: 'var(--sh-b)',
                      padding: 20,
                    }
                  : {
                      position: 'fixed',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      maxHeight: '92vh',
                      overflowY: 'auto',
                      zIndex: 301,
                      background: 'var(--bg)',
                      borderRadius: '22px 22px 0 0',
                      paddingBottom: 'env(safe-area-inset-bottom)',
                      boxShadow: 'var(--sh-b)',
                    }
              }
            >
              <div style={{ padding: isDesktop ? 0 : 18 }}>
                {!isDesktop && (
                  <div
                    aria-hidden="true"
                    style={{ width: 34, height: 4, borderRadius: 2, background: 'var(--elv)', margin: '0 auto 14px' }}
                  />
                )}

                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px' }}>
                  <StepDot n={1} state={step === 1 ? 'on' : 'done'} labelText="Causale" />
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      borderRadius: 2,
                      background: step === 2 ? 'color-mix(in srgb, var(--c-green) 45%, transparent)' : 'var(--elv)',
                    }}
                  />
                  <StepDot n={2} state={step === 2 ? 'on' : 'idle'} labelText="Conferma" />
                </div>

                {step === 1 ? (
                  <>
                    <h2 id="nc-sheet-title" style={titleStyle}>
                      Perché stornare questa fattura?
                    </h2>
                    <p style={subStyle}>
                      Fattura {numero} · {clienteNome} · {importoFmt}
                    </p>

                    <p style={label}>
                      Causale <span style={{ color: 'var(--primary)' }}>*</span>
                    </p>
                    <textarea
                      aria-label="Causale"
                      value={causale}
                      onChange={(e) => setCausale(e.target.value)}
                      rows={3}
                      placeholder="Es. errore di fatturazione — prestazione non eseguita…"
                      style={{
                        width: '100%',
                        minHeight: 74,
                        background: 'var(--sfc)',
                        border: BORDER,
                        borderRadius: 12,
                        padding: '11px 12px',
                        fontFamily: FONT,
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: 'var(--t1)',
                        resize: 'none',
                        outline: 'none',
                        boxSizing: 'border-box',
                        display: 'block',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        margin: '7px 0 16px',
                      }}
                    >
                      <span style={{ fontFamily: FONT, fontSize: 11, color: 'var(--t3)', lineHeight: 1.35 }}>
                        {`Finirà nell'XML della nota di credito, in blocchi da ${CHUNK} caratteri.`}
                      </span>
                      <span
                        style={{
                          fontFamily: FONT,
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--t2)',
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {causale.length} / {CHUNK}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={closeSheet} style={ctaNeutral}>
                        Annulla
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={!causaleTrim}
                        style={{
                          ...ctaRed,
                          cursor: causaleTrim ? 'pointer' : 'not-allowed',
                          opacity: causaleTrim ? 1 : 0.45,
                          boxShadow: causaleTrim ? 'var(--sh-red)' : 'none',
                        }}
                      >
                        Continua →
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 id="nc-sheet-title" style={titleStyle}>
                      Confermi lo storno?
                    </h2>

                    {/* Callout irreversibile (icona + testo) */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        padding: '11px 12px',
                        borderRadius: 12,
                        margin: '4px 0 14px',
                        background: 'color-mix(in srgb, var(--primary) 9%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                      }}
                    >
                      <span aria-hidden="true" style={{ color: 'var(--primary)', fontSize: 15, lineHeight: 1.2 }}>
                        ⚠
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t1)', lineHeight: 1.45 }}>
                        <b style={{ fontWeight: 700 }}>Irreversibile.</b> Non potrai annullare la nota di credito una
                        volta emessa.
                      </span>
                    </div>

                    <p style={label}>Cosa succede a conferma</p>
                    <div style={{ border: BORDER, borderRadius: 14, padding: '2px 12px', margin: '0 0 14px' }}>
                      <Effetto
                        tint="var(--c-red)"
                        ink="var(--primary)"
                        icon="↩"
                        titolo={`Storno integrale della TD01 ${numero}`}
                        sub="Diventa Stornata, non più valida."
                      />
                      {pagata && (
                        <Effetto
                          tint="var(--c-green)"
                          ink="var(--success)"
                          icon="€"
                          titolo={`Credito di ${importoFmt} a ${clienteNome}`}
                          sub="Fattura pagata → importo accreditato al cliente."
                        />
                      )}
                      {lavoroId && (
                        <Effetto
                          tint="var(--c-blue)"
                          ink="var(--c-blue)"
                          icon="↻"
                          titolo="Il lavoro collegato torna ri-fatturabile"
                          sub="Potrai riemettere una nuova fattura."
                          last
                        />
                      )}
                    </div>

                    {error && (
                      <p
                        role="alert"
                        style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--primary)', margin: '0 0 10px' }}
                      >
                        {error}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null)
                          setStep(1)
                        }}
                        disabled={isPending}
                        style={ctaNeutral}
                      >
                        ‹ Indietro
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isPending}
                        style={{ ...ctaRed, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1 }}
                      >
                        <span aria-hidden="true">↩</span>
                        {isPending ? 'Emissione…' : 'Emetti TD04'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

const titleStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 17,
  fontWeight: 700,
  color: 'var(--t1)',
  margin: '0 0 3px',
}

const subStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 12,
  color: 'var(--t2)',
  margin: '0 0 14px',
}

function StepDot({ n, state, labelText }: { n: number; state: 'on' | 'done' | 'idle'; labelText: string }) {
  const done = state === 'done'
  const on = state === 'on'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 700,
          background: on
            ? 'var(--primary)'
            : done
              ? 'color-mix(in srgb, var(--c-green) 22%, transparent)'
              : 'var(--elv)',
          color: on ? '#fff' : done ? 'var(--success)' : 'var(--t3)',
          border: on ? '1px solid var(--primary)' : BORDER,
        }}
      >
        {done ? '✓' : n}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: 'var(--t2)' }}>{labelText}</span>
    </div>
  )
}

function Effetto({
  tint,
  ink,
  icon,
  titolo,
  sub,
  last,
}: {
  tint: string
  ink: string
  icon: string
  titolo: string
  sub: string
  last?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 11,
        alignItems: 'flex-start',
        padding: '11px 0',
        borderBottom: last ? 'none' : BORDER,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          background: `color-mix(in srgb, ${tint} 16%, transparent)`,
          color: ink,
        }}
      >
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.35 }}>
          {titolo}
        </span>
        <span style={{ display: 'block', fontFamily: FONT, fontSize: 11, color: 'var(--t2)', marginTop: 2, lineHeight: 1.35 }}>
          {sub}
        </span>
      </span>
    </div>
  )
}
