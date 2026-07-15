'use client'

// Invia a SdI — VARIANTE A APPROVATA (docs/design/decisions/2026-07-15-invia-pec-sdi.md):
// bottone rosso pieno «Invia a SdI» sotto le righe della card «Invio SDI», conferma
// su bottom sheet (mobile) / dialog ancorato (desktop) — atto fiscale irreversibile.
// Markup/token dal mockup docs/design/mockups/2026-07-15-invia-pec-sdi.html.
// Nessuna animazione JS: solo spinner CSS (frequency gate Emil — azione rara ma
// il pending state va tenuto sincrono, niente useTransition/AnimatePresence che
// ritarderebbero il commit dietro un frame di animazione).

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const STATO_SDI_LABEL: Record<string, string> = {
  draft: 'Bozza — XML non generato',
  generata: "Pronta per l'invio",
  smtp_inviata: 'Inviata a SdI — in attesa di ricevuta',
  pec_consegnata: 'PEC consegnata',
  ricevuta_sdi: 'Ricevuta da SdI',
  accettata: 'Accettata da SdI',
  rifiutata: 'Rifiutata da SdI',
  scaduta: 'Senza risposta SdI (scaduta)',
}

const RUOLI_AMMESSI = ['titolare', 'front_desk']

const FONT = 'var(--font-dm-sans, "DM Sans", system-ui, sans-serif)'
const BORDER = '1px solid var(--elv)'
const SCRIM = 'rgba(0,0,0,0.45)'

interface Props {
  fatturaId: string
  numero: string
  statoSdi: string
  ruolo: string
  pecConfigurata: boolean
}

/** Desktop breakpoint (≥768px) — mobile-first come SSR (default false → nessun
 * hydration mismatch), stesso pattern di NotaCreditoButton: bottom sheet su
 * mobile, dialog ancorato su desktop (Variante A approvata). */
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

export function InviaPecButton({ fatturaId, numero, statoSdi, ruolo, pecConfigurata }: Props) {
  const router = useRouter()
  const isDesktop = useIsDesktop()

  const [conferma, setConferma] = useState(false)
  const [messaggio, setMessaggio] = useState<{ tipo: 'errore' | 'info'; testo: string } | null>(null)
  const [pending, setPending] = useState(false)
  const annullaRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Esc chiude la conferma (mai una X come unica uscita).
  useEffect(() => {
    if (!conferma) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setConferma(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [conferma])

  // Focus management: al momento della conferma sposta il focus dentro il
  // dialog (su «Annulla», la scelta sicura), e lo ripristina sul trigger alla
  // chiusura — nessun utente da tastiera/screen reader resta "dietro" lo scrim.
  useEffect(() => {
    if (conferma) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
      annullaRef.current?.focus()
    } else {
      previousFocusRef.current?.focus?.()
    }
  }, [conferma])

  if (statoSdi !== 'generata' || !RUOLI_AMMESSI.includes(ruolo)) return null

  const btnRed: React.CSSProperties = {
    width: '100%',
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
    fontSize: 15,
    fontWeight: 700,
    boxShadow: 'var(--sh-red)',
    cursor: 'pointer',
    outline: 'none',
    marginTop: 4,
  }

  if (!pecConfigurata) {
    return (
      <div data-invia-pec="v2.3-disabled">
        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            padding: '10px 12px',
            borderRadius: 12,
            margin: '10px 0 4px',
            background: 'color-mix(in srgb, var(--c-amber) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--c-amber) 36%, transparent)',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 14, color: 'var(--c-amber-ink)', lineHeight: 1.3, flexShrink: 0 }}>
            ⚠
          </span>
          <span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t1)', lineHeight: 1.45 }}>
            Per inviare a SdI serve una casella PEC.{' '}
            <Link
              href="/impostazioni/pec"
              style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Configura PEC ›
            </Link>
          </span>
        </div>
        <button type="button" disabled style={{ ...btnRed, opacity: 0.42, boxShadow: 'none', cursor: 'not-allowed' }}>
          <span aria-hidden="true">✈</span>
          Invia a SdI
        </button>
      </div>
    )
  }

  async function invia() {
    setConferma(false)
    setMessaggio(null)
    setPending(true)
    try {
      const res = await fetch(`/api/fatture/${fatturaId}/invia-pec`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setPending(false)
        router.refresh()
      } else if (res.status === 409) {
        // Informativo, non un errore ritentabile: lo stato reale arriva col refresh.
        setPending(false)
        setMessaggio({ tipo: 'info', testo: body.error ?? 'Invio già in corso o già effettuato' })
        router.refresh()
      } else {
        setPending(false)
        setMessaggio({ tipo: 'errore', testo: body.error ?? 'Invio PEC fallito — riprova' })
      }
    } catch {
      setPending(false)
      setMessaggio({ tipo: 'errore', testo: 'Errore di rete — riprova' })
    }
  }

  return (
    <div data-invia-pec="v2.3">
      <button
        type="button"
        onClick={() => setConferma(true)}
        disabled={pending}
        style={{ ...btnRed, opacity: pending ? 0.88 : 1, cursor: pending ? 'progress' : 'pointer' }}
      >
        {pending ? (
          <>
            <span
              aria-hidden="true"
              className="ua-invia-pec-spin"
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,.35)',
                borderTopColor: '#fff',
              }}
            />
            Invio in corso…
          </>
        ) : (
          <>
            <span aria-hidden="true">✈</span>
            Invia a SdI
          </>
        )}
      </button>

      {messaggio && (
        <p
          data-tipo={messaggio.tipo}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '11px 12px',
            borderRadius: 12,
            margin: '10px 0 0',
            fontFamily: FONT,
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--t1)',
            background:
              messaggio.tipo === 'errore'
                ? 'color-mix(in srgb, var(--c-red) 12%, transparent)'
                : 'color-mix(in srgb, var(--c-blue) 12%, transparent)',
            border:
              messaggio.tipo === 'errore'
                ? '1px solid color-mix(in srgb, var(--c-red) 38%, transparent)'
                : '1px solid color-mix(in srgb, var(--c-blue) 38%, transparent)',
          }}
        >
          {messaggio.testo}
        </p>
      )}

      {conferma && (
        <>
          <div
            onClick={() => setConferma(false)}
            style={{ position: 'fixed', inset: 0, background: SCRIM, zIndex: 300 }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invia-pec-title"
            style={
              isDesktop
                ? {
                    position: 'fixed',
                    top: 76,
                    right: 24,
                    width: 420,
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
              <h2 id="invia-pec-title" style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: 'var(--t1)', margin: '0 0 5px', lineHeight: 1.25 }}>
                Inviare la fattura {numero} a SdI?
              </h2>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '11px 12px',
                  borderRadius: 12,
                  margin: '10px 0 16px',
                  background: 'color-mix(in srgb, var(--primary) 9%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                }}
              >
                <span aria-hidden="true" style={{ color: 'var(--primary)', fontSize: 15, lineHeight: 1.2, flexShrink: 0 }}>
                  ⚠
                </span>
                <span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t1)', lineHeight: 1.45 }}>
                  L&apos;invio è un atto fiscale irreversibile.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  ref={annullaRef}
                  type="button"
                  onClick={() => setConferma(false)}
                  style={{
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
                  }}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={invia}
                  style={{
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
                  }}
                >
                  <span aria-hidden="true">✈</span>
                  Invia
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Spinner keyframes: CSS puro, coerente col mockup (docs/design/mockups/2026-07-15-invia-pec-sdi.html) */}
      <style>{`
        .ua-invia-pec-spin { animation: ua-invia-pec-spin 0.7s linear infinite; }
        @keyframes ua-invia-pec-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .ua-invia-pec-spin { animation-duration: 2.4s; }
        }
      `}</style>
    </div>
  )
}
