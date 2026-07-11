'use client'
// Storico fatture del portale (spec §3 Ondata 2) — fedele al mockup approvato:
// docs/design/mockups/2026-07-11-portale-storico-fatture.html
// (decisione: docs/design/decisions/2026-07-11-portale-storico-fatture.md)
// Montato da FatturazioneSection SOLO in fase 'lista' (sessione economica già
// validata): il PIN gate vive nel padre, qui nessun tastierino.
// Stile: CSS inline esadecimale, pattern del portale (vedi FatturazioneSection).
import { useEffect, useState } from 'react'

type RigaFattura = {
  id: string
  numero: string
  data: string
  tipo_documento: string
  totale: number
  pdf: boolean
}
type Gruppo = { anno: number; fatture: RigaFattura[] }
type Dati = { studio: string | null; gruppi: Gruppo[] }

type Stato =
  | { fase: 'caricamento' }
  | { fase: 'errore' }
  | { fase: 'dati'; dati: Dati }

const currencyFmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const dataFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const tipoDocLabels: Record<string, string> = {
  TD01: 'Fattura',
  TD02: 'Fattura di acconto',
  TD04: 'Nota di credito',
  TD05: 'Nota di debito',
  TD06: 'Parcella',
}

// Nota di credito (TD04): colore ambra (non rosso primario, per non creare
// ambiguità semantica col rosso UÀ) e importo mostrato negativo — decisione
// approvata in docs/design/decisions/2026-07-11-portale-storico-fatture.md.
// `totale` arriva sempre positivo dall'API: il segno è solo di presentazione.
const COLORE_NOTA_CREDITO = '#B45309'

export function FattureStoricoSection({ token }: { token: string }) {
  const [stato, setStato] = useState<Stato>({ fase: 'caricamento' })

  useEffect(() => {
    let attivo = true
    async function carica() {
      try {
        const res = await fetch(`/api/portale/${token}/fatture`, { credentials: 'same-origin' })
        if (!attivo) return
        if (!res.ok) {
          setStato({ fase: 'errore' })
          return
        }
        const dati = (await res.json()) as Dati
        if (attivo) setStato({ fase: 'dati', dati })
      } catch {
        if (attivo) setStato({ fase: 'errore' })
      }
    }
    carica()
    return () => {
      attivo = false
    }
  }, [token])

  if (stato.fase === 'caricamento') return null

  if (stato.fase === 'errore') {
    return (
      <div className="ua-fatt-no-print">
        <div style={{ height: '1px', background: '#E5E7EB', margin: '16px 20px 24px' }} />
        <div style={{ padding: '0 20px 20px' }}>
          <div
            role="alert"
            style={{
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
            Impossibile caricare le fatture. Ricarica la pagina.
          </div>
        </div>
      </div>
    )
  }

  const { dati } = stato
  const vuoto = dati.gruppi.length === 0 || dati.gruppi.every((g) => g.fatture.length === 0)

  return (
    <div className="ua-fatt-no-print">
      {/* Separatore tra «Da fatturare» e «Fatture» — stesso contenitore, mockup .sf-divider */}
      <div style={{ height: '1px', background: '#E5E7EB', margin: '16px 20px 24px' }} />

      <div style={{ padding: '4px 20px 16px' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '19px', fontWeight: 700, color: '#111827', margin: 0 }}>
          Fatture
        </h2>
      </div>

      {vuoto ? (
        <div style={{ padding: '0 20px' }}>
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
              Nessuna fattura emessa finora.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ paddingBottom: '4px' }}>
          {dati.gruppi.map((g) => (
            <div key={g.anno}>
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
                {g.anno}
              </div>
              {g.fatture.map((f) => {
                const notaCredito = f.tipo_documento === 'TD04'
                const etichetta = tipoDocLabels[f.tipo_documento] ?? 'Documento'
                return (
                  <div
                    key={f.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      margin: '0 16px 12px',
                      padding: '14px 16px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: notaCredito ? COLORE_NOTA_CREDITO : '#111827',
                          marginBottom: '3px',
                        }}
                      >
                        {etichetta} {f.numero}
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px', color: '#6B7280' }}>
                        {f.data ? dataFmt.format(new Date(`${f.data}T00:00:00`)) : '—'}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <div
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '16px',
                          fontWeight: 700,
                          color: notaCredito ? COLORE_NOTA_CREDITO : '#111827',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notaCredito ? '-' : ''}
                        {currencyFmt.format(f.totale)}
                      </div>
                      {f.pdf && (
                        <a
                          href={`/api/portale/${token}/fatture/${f.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Scarica PDF ${etichetta} ${f.numero}`}
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
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            textDecoration: 'none',
                          }}
                        >
                          📄 PDF
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
