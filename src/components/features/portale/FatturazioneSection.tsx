'use client'
// Sezione economica del portale (spec §5) — fedele al mockup approvato:
// docs/design/mockups/2026-07-10-portale-da-fatturare.html
//
// Nota tipi (Task 12, decisione documentata): Riga/Dati sono ridefiniti
// localmente invece di un import type-only dal route file
// (`../../app/api/portale/[token]/fatturazione/route`). Le due forme sono
// identiche a RigaDaFatturare/FatturazioneResponse — la ridefinizione evita
// di accoppiare un componente client a un path con segmento dinamico
// `[token]`, resta leggibile senza saltare a un altro file e si allinea
// alla stessa forma testata in tests/unit/portale-fatturazione-get-route.test.ts.
//
// Stile: CSS inline con valori esadecimali diretti (non design-system
// tokens, non Tailwind) — stesso pattern di src/app/portale/[token]/page.tsx
// e dello stesso mockup approvato.
import { useCallback, useEffect, useRef, useState } from 'react'
import { FattureStoricoSection } from './FattureStoricoSection'

type Proposta = 'fatturare' | 'non_fatturare'

type Riga = {
  id: string
  numero_lavoro: string
  tipo_dispositivo: string
  data_consegna: string | null
  prezzo: number
  paziente: string
  proposta: Proposta | null
  proposta_at: string | null
  confermato: boolean
  decisione: Proposta | null
}

type Gruppo = { mese: string; lavori: Riga[] }

type Dati = { studio: string | null; gruppi: Gruppo[]; totale_fatturare: number }

type FasePin = {
  fase: 'pin'
  pinDigits: string
  submitting: boolean
  errore: string | null
  erroreCifra: boolean
  tentativiRimasti: number | null
  bloccatoFinoA: string | null
  pinNonImpostato: boolean
  sessioneNonValida: boolean
}
type FaseLista = { fase: 'lista'; dati: Dati; avviso: string | null }
type Stato =
  | { fase: 'caricamento' }
  | FasePin
  | FaseLista
  | { fase: 'disattivato' }

// Stessa mappa di src/app/portale/[token]/page.tsx (etichette dell'enum
// tipo_dispositivo) — duplicata qui perché nel portale non esiste un file
// condiviso di label (pattern già in uso nel progetto).
const tipoLabels: Record<string, string> = {
  protesi_fissa: 'Protesi fissa',
  protesi_mobile: 'Protesi mobile',
  implantologia: 'Implantologia',
  cad_cam: 'CAD/CAM',
  scheletrato: 'Scheletrato',
  ortodonzia: 'Ortodonzia',
  provvisorio: 'Provvisorio',
  riparazione: 'Riparazione',
  altro: 'Altro',
}

const propostaLabels: Record<Proposta, string> = {
  fatturare: 'Fatturare',
  non_fatturare: 'Non fatturare',
}

const currencyFmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const meseFmt = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })
const dataBreveFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })
const dataLungaFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
const dataStampaRigaFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

function formatMese(mese: string): string {
  if (!mese || mese === 'senza-data') return 'Senza data'
  const label = meseFmt.format(new Date(`${mese}-01T00:00:00`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatDataBreve(dataIso: string | null): string {
  if (!dataIso) return '—'
  return dataBreveFmt.format(new Date(dataIso))
}

function formatDataStampa(dataIso: string | null): string {
  if (!dataIso) return '—'
  return dataStampaRigaFmt.format(new Date(dataIso))
}

function calcolaTotale(dati: Dati): number {
  return dati.gruppi
    .flatMap((g) => g.lavori)
    .filter((r) => r.decisione === 'fatturare' || (!r.confermato && r.proposta === 'fatturare'))
    .reduce((s, r) => s + r.prezzo, 0)
}

function esitoRiga(r: Riga): Proposta | null {
  return r.confermato ? r.decisione : r.proposta
}

function formatCountdown(ms: number): string {
  const totale = Math.max(0, Math.ceil(ms / 1000))
  const mm = Math.floor(totale / 60)
  const ss = totale % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function statoPinIniziale(overrides: Partial<Omit<FasePin, 'fase'>> = {}): FasePin {
  return {
    fase: 'pin',
    pinDigits: '',
    submitting: false,
    errore: null,
    erroreCifra: false,
    tentativiRimasti: null,
    bloccatoFinoA: null,
    pinNonImpostato: false,
    sessioneNonValida: false,
    ...overrides,
  }
}

function aggiornaRigaLocale(dati: Dati, rigaId: string, proposta: Proposta): Dati {
  return {
    ...dati,
    gruppi: dati.gruppi.map((g) => ({
      ...g,
      lavori: g.lavori.map((r) =>
        r.id === rigaId ? { ...r, proposta, proposta_at: new Date().toISOString() } : r,
      ),
    })),
  }
}

// Ripristina proposta/proposta_at di una riga ai valori passati (rollback
// locale) — a differenza di aggiornaRigaLocale non genera un nuovo
// timestamp, riscrive esattamente i valori precedenti l'optimistic update.
function impostaRigaLocale(
  dati: Dati,
  rigaId: string,
  valori: { proposta: Proposta | null; proposta_at: string | null },
): Dati {
  return {
    ...dati,
    gruppi: dati.gruppi.map((g) => ({
      ...g,
      lavori: g.lavori.map((r) => (r.id === rigaId ? { ...r, ...valori } : r)),
    })),
  }
}

// Sonda la sessione economica (GET lista) e restituisce lo stato risultante,
// SENZA toccare React — chiamata sia dall'effetto di mount sia dopo un PIN
// riuscito sia dopo un errore sul toggle. Tenuta come funzione pura a livello
// di modulo (non un hook) apposta: gli effetti che la usano definiscono la
// loro funzione async LOCALMENTE (pattern già in uso in TabProve.tsx) così
// la chiamata a setStato resta sempre dentro alla closure dell'effetto, mai
// una chiamata diretta a una funzione esterna da un useEffect (regola lint
// react-hooks/set-state-in-effect).
async function sondaSessione(token: string): Promise<FaseLista | FasePin | { fase: 'disattivato' }> {
  try {
    const res = await fetch(`/api/portale/${token}/fatturazione`, { credentials: 'same-origin' })
    if (res.ok) {
      const dati = (await res.json()) as Dati
      return { fase: 'lista', dati, avviso: null }
    }
    const body = (await res.json().catch(() => ({}))) as { errore?: string }
    if (res.status === 403 && body.errore === 'sezione_disattivata') {
      return { fase: 'disattivato' }
    }
    // 401 sessione_scaduta | non_autorizzato → richiedi il PIN
    return statoPinIniziale()
  } catch {
    return statoPinIniziale({ errore: 'Errore di rete. Riprova.' })
  }
}

export function FatturazioneSection({
  token,
  nomeLaboratorio,
}: {
  token: string
  nomeLaboratorio?: string | null
}) {
  const [stato, setStato] = useState<Stato>({ fase: 'caricamento' })
  const [now, setNow] = useState(() => Date.now())
  const montatoRef = useRef(true)

  useEffect(() => {
    montatoRef.current = true
    return () => {
      montatoRef.current = false
    }
  }, [])

  // ─── Mount: il primo GET sonda la sessione (200 → lista, 401 → pin) ─────
  useEffect(() => {
    async function esegui() {
      const risultato = await sondaSessione(token)
      if (montatoRef.current) setStato(risultato)
    }
    esegui()
  }, [token])

  // ─── Ricarica silenziosa con messaggio (409 / errori sul toggle) ────────
  const ricaricaConAvviso = useCallback(
    async (msg: string) => {
      const risultato = await sondaSessione(token)
      if (!montatoRef.current) return
      setStato(risultato.fase === 'lista' ? { ...risultato, avviso: msg } : risultato)
    },
    [token],
  )

  // ─── PIN: submit al 6° digit ─────────────────────────────────────────────
  const submitPin = useCallback(
    async (pin: string) => {
      setStato((prev) => (prev.fase === 'pin' ? { ...prev, submitting: true, errore: null, erroreCifra: false } : prev))
      try {
        const res = await fetch(`/api/portale/${token}/pin`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        })
        if (res.ok) {
          const risultato = await sondaSessione(token)
          if (montatoRef.current) setStato(risultato)
          return
        }
        const body = (await res.json().catch(() => ({}))) as {
          errore?: string
          tentativi_rimasti?: number
          riprova_alle?: string
        }
        if (!montatoRef.current) return

        if (res.status === 401 && body.errore === 'pin_errato') {
          setStato(
            statoPinIniziale({
              errore: `PIN errato — ${body.tentativi_rimasti ?? 0} tentativi rimasti`,
              erroreCifra: true,
              tentativiRimasti: body.tentativi_rimasti ?? null,
            }),
          )
          return
        }
        if (res.status === 429 && body.errore === 'pin_bloccato') {
          setStato(statoPinIniziale({ bloccatoFinoA: body.riprova_alle ?? null }))
          return
        }
        if (res.status === 429 && body.errore === 'troppi_tentativi') {
          setStato(
            statoPinIniziale({ errore: 'Troppi tentativi da questo dispositivo. Riprova più tardi.' }),
          )
          return
        }
        if (res.status === 403 && body.errore === 'pin_non_impostato') {
          setStato(statoPinIniziale({ pinNonImpostato: true }))
          return
        }
        if (res.status === 403 && body.errore === 'sezione_disattivata') {
          setStato({ fase: 'disattivato' })
          return
        }
        if (res.status === 401 && body.errore === 'non_autorizzato') {
          setStato(statoPinIniziale({ sessioneNonValida: true }))
          return
        }
        setStato(statoPinIniziale({ errore: 'Si è verificato un errore. Riprova.' }))
      } catch {
        if (montatoRef.current) setStato(statoPinIniziale({ errore: 'Errore di rete. Riprova.' }))
      }
    },
    [token],
  )

  // premiCifra/cancellaCifra: funzioni semplici (non memoizzate) definite nel
  // corpo del componente — leggono `stato` direttamente dalla closure del
  // render corrente. Evita di richiamare submitPin da dentro l'updater
  // funzionale di setStato (un side-effect di rete dentro un updater può
  // essere invocato più volte da React, es. in StrictMode).
  function premiCifra(cifra: string) {
    if (stato.fase !== 'pin') return
    if (stato.submitting || stato.bloccatoFinoA || stato.pinNonImpostato || stato.sessioneNonValida) return
    const next = (stato.pinDigits + cifra).slice(0, 6)
    setStato({ ...stato, pinDigits: next, errore: null, erroreCifra: false })
    if (next.length === 6) submitPin(next)
  }

  function cancellaCifra() {
    if (stato.fase !== 'pin') return
    if (stato.submitting || stato.bloccatoFinoA || stato.pinNonImpostato || stato.sessioneNonValida) return
    setStato({ ...stato, pinDigits: stato.pinDigits.slice(0, -1), errore: null, erroreCifra: false })
  }

  // Countdown mm:ss del blocco PIN — 1 tick/sec, cleanup su unmount/cambio.
  const bloccatoFinoA = stato.fase === 'pin' ? stato.bloccatoFinoA : null
  useEffect(() => {
    if (!bloccatoFinoA) return
    const target = new Date(bloccatoFinoA).getTime()
    const id = setInterval(() => {
      if (Date.now() >= target) {
        clearInterval(id)
        setStato((prev) => (prev.fase === 'pin' ? { ...prev, bloccatoFinoA: null } : prev))
      } else {
        setNow(Date.now())
      }
    }, 1000)
    return () => clearInterval(id)
  }, [bloccatoFinoA])

  // ─── Toggle proposta (righe non confermate) ─────────────────────────────
  // Rollback locale (review Task 12): su errore generico o di rete NON si
  // ricarica dal server — un refetch che fallisce a sua volta (rete assente)
  // butterebbe l'utente alla fase PIN pur avendo una sessione valida. Si
  // salva il valore precedente della riga prima dell'optimistic update e,
  // sui rami di errore generico/network, lo si riscrive localmente mostrando
  // solo il banner d'errore. Il ramo 409 (conflitto con il laboratorio) e il
  // ramo sessione_scaduta restano invariati: richiedono uno stato autoritativo
  // dal server (rispettivamente ricarica lista e ritorno al PIN).
  const impostaProposta = useCallback(
    async (rigaId: string, proposta: Proposta) => {
      let precedente: { proposta: Proposta | null; proposta_at: string | null } = {
        proposta: null,
        proposta_at: null,
      }
      setStato((prev) => {
        if (prev.fase !== 'lista') return prev
        const rigaCorrente = prev.dati.gruppi.flatMap((g) => g.lavori).find((r) => r.id === rigaId)
        if (rigaCorrente) {
          precedente = { proposta: rigaCorrente.proposta, proposta_at: rigaCorrente.proposta_at }
        }
        return { ...prev, dati: aggiornaRigaLocale(prev.dati, rigaId, proposta), avviso: null }
      })

      const ripristinaLocale = (msg: string) => {
        if (!montatoRef.current) return
        setStato((prev) => {
          if (prev.fase !== 'lista') return prev
          return { ...prev, dati: impostaRigaLocale(prev.dati, rigaId, precedente), avviso: msg }
        })
      }

      try {
        const res = await fetch(`/api/portale/${token}/fatturazione/${rigaId}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposta }),
        })
        if (res.ok) return

        const body = (await res.json().catch(() => ({}))) as { errore?: string }
        if (res.status === 401 && body.errore === 'sessione_scaduta') {
          if (montatoRef.current) setStato(statoPinIniziale())
          return
        }
        if (res.status === 409) {
          const msg =
            body.errore === 'gia_fatturato'
              ? 'Il laboratorio ha già confermato questo lavoro.'
              : 'Questo lavoro non è più modificabile.'
          await ricaricaConAvviso(msg)
          return
        }
        ripristinaLocale('Non è stato possibile salvare la scelta. Riprova.')
      } catch {
        ripristinaLocale('Errore di rete. Riprova.')
      }
    },
    [token, ricaricaConAvviso],
  )

  // ─── Stampa: audit fire-and-forget + window.print() ─────────────────────
  const handleStampa = useCallback(() => {
    fetch(`/api/portale/${token}/fatturazione/stampa`, {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => {
      // fire-and-forget: l'audit non deve mai bloccare la stampa
    })
    window.print()
  }, [token])

  if (stato.fase === 'caricamento') return null
  if (stato.fase === 'disattivato') return null

  const printCss = `
    .ua-fatt-print-only { display: none; }
    @media print {
      .ua-fatt-no-print { display: none !important; }
      .ua-fatt-print-only { display: block !important; }
    }
    @keyframes uaFattShake {
      10%, 90% { transform: translateX(-2px); }
      20%, 80% { transform: translateX(4px); }
      30%, 50%, 70% { transform: translateX(-8px); }
      40%, 60% { transform: translateX(8px); }
    }
    .ua-fatt-shake { animation: uaFattShake 0.4s; }
    @media (prefers-reduced-motion: reduce) {
      .ua-fatt-shake { animation: none; }
    }
  `

  if (stato.fase === 'pin') {
    const disabilitato = stato.submitting || !!stato.bloccatoFinoA || stato.pinNonImpostato || stato.sessioneNonValida
    const remainingMs = stato.bloccatoFinoA ? new Date(stato.bloccatoFinoA).getTime() - now : 0
    const tasti = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

    return (
      <section style={{ marginTop: '32px' }} aria-label="Sezione fatturazione — accesso riservato">
        <style>{printCss}</style>
        <div
          style={{
            maxWidth: '400px',
            margin: '0 auto',
            background: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
            padding: '40px 28px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '19px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
            Area riservata
          </div>
          <div
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: '#6B7280',
              lineHeight: 1.5,
              maxWidth: '260px',
              marginBottom: '28px',
            }}
          >
            Inserisci il PIN che ti ha comunicato il laboratorio
          </div>

          <div
            className={stato.erroreCifra ? 'ua-fatt-shake' : undefined}
            style={{ display: 'flex', gap: '12px', marginBottom: '22px' }}
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const piena = i < stato.pinDigits.length
              const colore = disabilitato && stato.bloccatoFinoA
                ? '#E5E7EB'
                : stato.erroreCifra
                  ? '#D90012'
                  : piena
                    ? '#111827'
                    : '#FFFFFF'
              return (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: `1.5px solid ${colore === '#FFFFFF' ? '#D1D5DB' : colore}`,
                    background: colore,
                  }}
                />
              )
            })}
          </div>

          <div role="alert" aria-live="polite" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px', fontWeight: 600, color: '#D90012', marginBottom: '20px', minHeight: '16px' }}>
            {stato.errore}
          </div>

          {stato.bloccatoFinoA && (
            <div
              role="status"
              aria-live="polite"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '22px',
                textAlign: 'left',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '16px' }}>⚠</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px', color: '#92400E', lineHeight: 1.45 }}>
                Troppi tentativi. Riprova tra <strong>{formatCountdown(remainingMs)}</strong>
              </span>
            </div>
          )}

          {stato.pinNonImpostato && (
            <div
              role="status"
              style={{
                background: '#F3F4F6',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '22px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12.5px',
                color: '#374151',
                fontWeight: 600,
              }}
            >
              Chiedi il PIN al tuo laboratorio
            </div>
          )}

          {stato.sessioneNonValida && (
            <div
              role="status"
              style={{
                background: '#F3F4F6',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '22px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12.5px',
                color: '#374151',
                fontWeight: 600,
              }}
            >
              Sessione non valida. Ricarica la pagina.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', width: '100%', maxWidth: '264px' }}>
            {tasti.map((t, i) => {
              if (t === '') return <div key={`vuoto-${i}`} aria-hidden="true" />
              const isCancella = t === '⌫'
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabilitato}
                  onClick={isCancella ? cancellaCifra : () => premiCifra(t)}
                  aria-label={isCancella ? 'Cancella' : `Cifra ${t}`}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    minHeight: '64px',
                    borderRadius: '50%',
                    border: 'none',
                    background: disabilitato ? '#EFF1F2' : '#FFFFFF',
                    boxShadow: disabilitato ? 'none' : '0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: isCancella ? '18px' : '20px',
                    fontWeight: 600,
                    color: disabilitato ? '#C6CBD2' : isCancella ? '#6B7280' : '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: disabilitato ? 'default' : 'pointer',
                  }}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // ─── fase: lista ─────────────────────────────────────────────────────────
  const { dati, avviso } = stato
  const isEmpty = dati.gruppi.length === 0 || dati.gruppi.every((g) => g.lavori.length === 0)
  const totale = calcolaTotale(dati)

  return (
    <section style={{ marginTop: '32px' }} aria-label="Sezione fatturazione">
      <style>{printCss}</style>

      <div className="ua-fatt-no-print">
        <div
          style={{
            background: '#F8F9FA',
            borderRadius: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            paddingBottom: isEmpty ? 0 : '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '20px 20px 16px' }}>
            <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '19px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Da fatturare
            </h2>
            {!isEmpty && (
              <button
                type="button"
                onClick={handleStampa}
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#374151',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                🖨 Stampa lista
              </button>
            )}
          </div>

          {avviso && (
            <div
              role="alert"
              style={{
                margin: '0 20px 14px',
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '10px',
                padding: '10px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#92400E',
              }}
            >
              {avviso}
            </div>
          )}

          {isEmpty ? (
            <div style={{ padding: '20px' }}>
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '44px 24px',
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '24px',
                  }}
                >
                  🧾
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14.5px', fontWeight: 600, color: '#6B7280' }}>
                  Nessun lavoro da fatturare al momento.
                </div>
              </div>
            </div>
          ) : (
            <>
              {dati.gruppi.map((g) => (
                <div key={g.mese}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '4px 20px 10px',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {formatMese(g.mese)}
                  </div>
                  {g.lavori.map((r) => {
                    const difforme = r.confermato && r.proposta !== null && r.proposta !== r.decisione
                    return (
                      <div
                        key={r.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: '16px',
                          margin: '0 16px 12px',
                          padding: '14px 16px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11.5px', fontWeight: 600, color: '#9CA3AF', marginBottom: '3px' }}>
                              N. {r.numero_lavoro}
                            </div>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                              {tipoLabels[r.tipo_dispositivo] ?? r.tipo_dispositivo}
                            </div>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px', color: '#6B7280' }}>
                              {r.paziente}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                              {currencyFmt.format(r.prezzo)}
                            </div>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11.5px', color: '#9CA3AF', marginTop: '2px' }}>
                              {formatDataBreve(r.data_consegna)}
                            </div>
                          </div>
                        </div>

                        {r.confermato ? (
                          <>
                            <div
                              style={{
                                marginTop: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: difforme ? '#FEF3C7' : '#F0FDF4',
                                border: `1px solid ${difforme ? '#FDE68A' : '#BBF7D0'}`,
                                borderRadius: '10px',
                                padding: '10px 12px',
                              }}
                            >
                              <span style={{ color: difforme ? '#B45309' : '#16A34A', fontWeight: 700, fontSize: '13px' }}>✓</span>
                              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px', fontWeight: 600, color: difforme ? '#92400E' : '#15803D' }}>
                                Confermato dal laboratorio — {r.decisione ? propostaLabels[r.decisione] : '—'}
                              </span>
                            </div>
                            {difforme && r.proposta && (
                              <div
                                style={{
                                  fontFamily: 'DM Sans, sans-serif',
                                  fontSize: '11.5px',
                                  color: '#A16207',
                                  marginTop: '3px',
                                  textDecoration: 'line-through',
                                  textDecorationColor: '#D9B45C',
                                }}
                              >
                                Proposta iniziale: {propostaLabels[r.proposta]}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ display: 'flex', marginTop: '12px', background: '#F3F4F6', borderRadius: '10px', padding: '3px', gap: '3px' }}>
                            <button
                              type="button"
                              aria-pressed={r.proposta === 'fatturare'}
                              onClick={() => impostaProposta(r.id, 'fatturare')}
                              style={{
                                flex: 1,
                                fontFamily: 'DM Sans, sans-serif',
                                border: 'none',
                                background: r.proposta === 'fatturare' ? '#FFFFFF' : 'transparent',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                color: r.proposta === 'fatturare' ? '#16A34A' : '#6B7280',
                                borderRadius: '8px',
                                padding: '10px 8px',
                                minHeight: '44px',
                                cursor: 'pointer',
                                boxShadow: r.proposta === 'fatturare' ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                              }}
                            >
                              Fatturare
                            </button>
                            <button
                              type="button"
                              aria-pressed={r.proposta === 'non_fatturare'}
                              onClick={() => impostaProposta(r.id, 'non_fatturare')}
                              style={{
                                flex: 1,
                                fontFamily: 'DM Sans, sans-serif',
                                border: 'none',
                                background: r.proposta === 'non_fatturare' ? '#FFFFFF' : 'transparent',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                color: r.proposta === 'non_fatturare' ? '#D90012' : '#6B7280',
                                borderRadius: '8px',
                                padding: '10px 8px',
                                minHeight: '44px',
                                cursor: 'pointer',
                                boxShadow: r.proposta === 'non_fatturare' ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                              }}
                            >
                              Non fatturare
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              <div
                style={{
                  position: 'sticky',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                }}
              >
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Totale da fatturare
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '18px', fontWeight: 700, color: '#D90012' }}>
                  {currencyFmt.format(totale)}
                </span>
              </div>
            </>
          )}

          <FattureStoricoSection token={token} />
        </div>
      </div>

      {/* ─── Layout stampa dedicato (spec §5, mockup pannello 4) ────────── */}
      {!isEmpty && (
        <div className="ua-fatt-print-only">
          <div style={{ borderBottom: '2px solid #111827', paddingBottom: '14px', marginBottom: '18px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
              {nomeLaboratorio ?? 'Laboratorio'}
            </div>
            <div style={{ fontSize: '12.5px', color: '#374151', marginBottom: '6px' }}>
              {dati.studio ?? 'Studio'}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>
              Stampato il {dataLungaFmt.format(new Date())}
            </div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', marginBottom: '12px' }}>
            Lista lavori da fatturare
          </div>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '11px' }}>
            <colgroup>
              <col style={{ width: '17%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>N. lavoro</th>
                <th style={thStyle}>Dispositivo</th>
                <th style={thStyle}>Consegna</th>
                <th style={thStyle}>Esito</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Prezzo</th>
              </tr>
            </thead>
            <tbody>
              {dati.gruppi.flatMap((g) => g.lavori).map((r) => {
                const esito = esitoRiga(r)
                return (
                  <tr key={r.id}>
                    <td style={tdStyle}>{r.numero_lavoro}</td>
                    <td style={tdStyle}>
                      {tipoLabels[r.tipo_dispositivo] ?? r.tipo_dispositivo}
                      <span style={{ display: 'block', fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>{r.paziente}</span>
                    </td>
                    <td style={tdStyle}>{formatDataStampa(r.data_consegna)}</td>
                    <td style={{ ...tdStyle, color: esito === 'non_fatturare' ? '#6B7280' : '#111827' }}>
                      {esito ? propostaLabels[esito] : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {currencyFmt.format(r.prezzo)}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td colSpan={4} style={{ borderTop: '2px solid #111827', borderBottom: 'none', fontWeight: 700, paddingTop: '10px', padding: '10px 3px 8px' }}>
                  Totale da fatturare
                </td>
                <td style={{ borderTop: '2px solid #111827', borderBottom: 'none', fontWeight: 700, textAlign: 'right', paddingTop: '10px', padding: '10px 3px 8px' }}>
                  {currencyFmt.format(totale)}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '18px', fontSize: '10px', color: '#9CA3AF', textAlign: 'center' }}>
            Documento generato dal portale UÀ — solo a scopo informativo, non ha valore fiscale.
          </div>
        </div>
      )}
    </section>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '9px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color: '#6B7280',
  borderBottom: '1px solid #111827',
  padding: '0 3px 6px',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 3px',
  borderBottom: '1px solid #E5E7EB',
  color: '#111827',
  verticalAlign: 'top',
  overflowWrap: 'break-word',
}
