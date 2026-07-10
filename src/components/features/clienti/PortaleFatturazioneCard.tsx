'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  clienteId: string
  attiva: boolean
  pinImpostato: boolean
}

const MESSAGGIO_403 = 'Solo il titolare o il front desk possono modificare il portale.'

// ─── Stili (fedeli al mockup 2026-07-10-lab-portale-cliente-scadenzario.html) ──

const cardStyle: React.CSSProperties = {
  background: 'var(--surface, #E4DFD9)',
  borderRadius: '16px',
  padding: '16px',
  boxShadow: 'var(--sh-b, var(--sh-b))',
  marginBottom: '12px',
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--t2, #4A3D33)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 8px',
}

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--elv, #EDEDEA)',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  paddingTop: '14px',
}

const switchRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
}

const switchLabelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--t1, #1C1916)',
  marginBottom: '2px',
}

const switchCaptionStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11.5px',
  color: 'var(--t3, #6B5C51)',
  lineHeight: 1.4,
  maxWidth: '240px',
}

const switchTapStyle: React.CSSProperties = {
  width: '56px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  cursor: 'pointer',
  background: 'transparent',
  border: 'none',
  padding: 0,
}

function trackStyle(on: boolean, disabled: boolean): React.CSSProperties {
  return {
    width: '46px',
    height: '27px',
    borderRadius: '999px',
    position: 'relative',
    transition: `background ${'var(--tr, .18s)'}`,
    background: on ? 'var(--primary, #D90012)' : 'var(--prs, #D4CFC9)',
    border: on ? 'none' : '1px solid color-mix(in srgb, var(--t3, #6B5C51) 40%, transparent)',
    opacity: disabled ? 0.6 : 1,
  }
}

function knobStyle(on: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: '3px',
    left: on ? '22px' : '3px',
    width: '21px',
    height: '21px',
    borderRadius: '50%',
    background: on ? '#fff' : '#fdfdfc',
    boxShadow: '0 1px 2px rgba(0,0,0,.28)',
    transition: 'left var(--tr, .18s)',
  }
}

const notaDisattivatoStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  color: 'var(--t3, #6B5C51)',
  fontStyle: 'italic',
  paddingTop: '2px',
}

const pinRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const pinRowTitoloStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--t1, #1C1916)',
}

const pinInputGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
}

const pinInputStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '16px',
  fontWeight: 600,
  letterSpacing: '0.35em',
  color: 'var(--t1, #1C1916)',
  background: 'var(--elv, #EDEDEA)',
  boxShadow: 'var(--sh-i)',
  border: 'none',
  borderRadius: '10px',
  padding: '0 14px',
  height: '44px',
  width: '130px',
  textAlign: 'center',
}

const btnPrimarioSmStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '13px',
  fontWeight: 700,
  color: '#fff',
  background: 'var(--primary, #D90012)',
  border: 'none',
  borderRadius: '10px',
  height: '44px',
  padding: '0 16px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const pinHelperStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  color: 'var(--t3, #6B5C51)',
}

const pinImpostatoRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
}

const pinBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--success, #16A34A)',
}

const btnSecondarioSmStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12.5px',
  fontWeight: 700,
  color: 'var(--t1, #1C1916)',
  background: 'var(--elv, #EDEDEA)',
  border: 'none',
  borderRadius: '10px',
  height: '44px',
  padding: '0 14px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const btnOutlineStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--t1, #1C1916)',
  background: 'transparent',
  border: '1.5px solid color-mix(in srgb, var(--t3, #6B5C51) 45%, transparent)',
  borderRadius: '10px',
  height: '44px',
  padding: '0 16px',
  cursor: 'pointer',
  alignSelf: 'flex-start',
}

const helpTextStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  color: 'var(--t3, #6B5C51)',
  marginTop: '8px',
  lineHeight: 1.4,
}

const notaOperativaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  background: 'var(--elv, #EDEDEA)',
  borderRadius: '10px',
  padding: '10px 12px',
}

const notaOperativaTestoStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11.5px',
  color: 'var(--t2, #4A3D33)',
  lineHeight: 1.45,
}

const errorTextStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  color: 'var(--primary, #D90012)',
  margin: 0,
}

const successTextStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  color: 'var(--success, #16A34A)',
  margin: '8px 0 0',
}

// ─── Componente ────────────────────────────────────────────────────────────

export function PortaleFatturazioneCard({ clienteId, attiva, pinImpostato }: Props) {
  const router = useRouter()

  // Interruttore
  const [togglePending, setTogglePending] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  // PIN
  const [pinValue, setPinValue] = useState('')
  const [pinEditing, setPinEditing] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)

  // Rigenera link
  const [regenConfirm, setRegenConfirm] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenError, setRegenError] = useState<string | null>(null)
  const [regenSuccessMsg, setRegenSuccessMsg] = useState<string | null>(null)

  const showPinInput = !pinImpostato || pinEditing

  async function handleToggle() {
    setToggleError(null)
    setTogglePending(true)
    try {
      const res = await fetch(`/api/clienti/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portale_fatturazione_attiva: !attiva }),
      })
      if (!res.ok) {
        if (res.status === 403) {
          setToggleError(MESSAGGIO_403)
        } else {
          const data = await res.json().catch(() => ({}))
          setToggleError((data as { error?: string }).error ?? 'Errore durante l’aggiornamento.')
        }
        return
      }
      router.refresh()
    } catch {
      setToggleError('Errore di rete. Riprova.')
    } finally {
      setTogglePending(false)
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPinError(null)
    setPinLoading(true)
    try {
      const res = await fetch(`/api/clienti/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portale_pin: pinValue }),
      })
      if (!res.ok) {
        if (res.status === 403) {
          setPinError(MESSAGGIO_403)
        } else {
          const data = await res.json().catch(() => ({}))
          setPinError((data as { error?: string }).error ?? 'Errore durante l’impostazione del PIN.')
        }
        return
      }
      // Il PIN non si rivede mai: il campo si svuota sempre dopo il successo.
      setPinValue('')
      setPinEditing(false)
      router.refresh()
    } catch {
      setPinError('Errore di rete. Riprova.')
    } finally {
      setPinLoading(false)
    }
  }

  function handleRegenTap() {
    setRegenError(null)
    setRegenSuccessMsg(null)
    setRegenConfirm(true)
  }

  async function handleRegenConferma() {
    setRegenError(null)
    setRegenLoading(true)
    try {
      const res = await fetch(`/api/clienti/${clienteId}/rigenera-portale-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        if (res.status === 403) {
          setRegenError(MESSAGGIO_403)
        } else {
          const data = await res.json().catch(() => ({}))
          setRegenError((data as { error?: string }).error ?? 'Errore durante la rigenerazione del link.')
        }
        return
      }
      setRegenSuccessMsg('Link rigenerato. Comunica il nuovo link al dentista.')
      router.refresh()
    } catch {
      setRegenError('Errore di rete. Riprova.')
    } finally {
      setRegenConfirm(false)
      setRegenLoading(false)
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Portale — fatturazione concordata</h2>
      <div style={dividerStyle}>
        {/* Interruttore */}
        <div style={switchRowStyle}>
          <div>
            <div style={switchLabelStyle}>Sezione economica del portale</div>
            <div style={switchCaptionStyle}>Il dentista vede i lavori e propone se fatturare o no.</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={attiva}
            aria-label={attiva ? 'Disattiva sezione economica del portale' : 'Attiva sezione economica del portale'}
            disabled={togglePending}
            onClick={handleToggle}
            style={switchTapStyle}
          >
            <span style={trackStyle(attiva, togglePending)}>
              <span style={knobStyle(attiva)} />
            </span>
          </button>
        </div>

        {toggleError && <p role="alert" style={errorTextStyle}>{toggleError}</p>}

        {!attiva && (
          <div style={notaDisattivatoStyle}>
            Attiva l&apos;interruttore per impostare un PIN e condividere il link al dentista.
          </div>
        )}

        {attiva && (
          <>
            {/* PIN */}
            <div style={pinRowStyle}>
              <div style={pinRowTitoloStyle}>PIN di accesso</div>

              {showPinInput ? (
                <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={pinInputGroupStyle}>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      autoComplete="off"
                      maxLength={6}
                      placeholder="· · · · · ·"
                      aria-label="Imposta PIN a 6 cifre"
                      value={pinValue}
                      onChange={(e) => {
                        setPinError(null)
                        setPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }}
                      style={pinInputStyle}
                    />
                    <button
                      type="submit"
                      disabled={pinLoading || pinValue.length !== 6}
                      style={{ ...btnPrimarioSmStyle, opacity: pinLoading || pinValue.length !== 6 ? 0.6 : 1, cursor: pinLoading || pinValue.length !== 6 ? 'not-allowed' : 'pointer' }}
                    >
                      {pinLoading ? '...' : 'Imposta PIN'}
                    </button>
                  </div>
                  <div style={pinHelperStyle}>6 cifre numeriche. Il PIN non è mai visibile dopo l&apos;impostazione.</div>
                  {pinError && <p role="alert" style={errorTextStyle}>{pinError}</p>}
                </form>
              ) : (
                <>
                  <div style={pinImpostatoRowStyle}>
                    <span style={pinBadgeStyle}>✓ PIN impostato</span>
                    <button type="button" onClick={() => setPinEditing(true)} style={btnSecondarioSmStyle}>
                      Cambia PIN
                    </button>
                  </div>
                  <div style={pinHelperStyle}>Non è mai visibile, nemmeno al laboratorio.</div>
                </>
              )}
            </div>

            {/* Rigenera link */}
            <div>
              {!regenConfirm ? (
                <button type="button" onClick={handleRegenTap} style={btnOutlineStyle}>
                  🔄 Rigenera link portale
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--t2, #4A3D33)' }}>
                    Sicuro? Il link attuale smette di funzionare
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleRegenConferma}
                      disabled={regenLoading}
                      style={{ ...btnPrimarioSmStyle, opacity: regenLoading ? 0.6 : 1, cursor: regenLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {regenLoading ? '...' : 'Conferma'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegenConfirm(false)}
                      disabled={regenLoading}
                      style={btnSecondarioSmStyle}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
              <div style={helpTextStyle}>Invalida il link attuale. Comunica il nuovo link al dentista.</div>
              {regenError && <p role="alert" style={errorTextStyle}>{regenError}</p>}
              {regenSuccessMsg && <p style={successTextStyle}>{regenSuccessMsg}</p>}
            </div>

            {/* Nota operativa — canale separato PIN */}
            <div style={notaOperativaStyle}>
              <span aria-hidden="true">🔒</span>
              <span style={notaOperativaTestoStyle}>
                Comunica il PIN a voce o per telefono, mai nello stesso messaggio del link.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
