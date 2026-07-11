'use client'
// Situazione economica del portale (spec Ondata 3) — fedele al mockup approvato:
// docs/design/mockups/2026-07-11-portale-situazione-economica.html
// (decisione: docs/design/decisions/2026-07-11-portale-situazione-economica.md)
// Montato da FatturazioneSection SOLO in fase 'lista' (sessione economica già
// validata): il PIN gate vive nel padre. Stile: pattern FattureStoricoSection.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

type Dovuto = {
  origine: 'fattura' | 'lavoro_diretto'
  numero: string
  data: string
  totale: number
  residuo: number
  pagata: boolean
  giorni_ritardo: number
}
type Pagamento = {
  data: string
  importo: number
  metodo: string
  destinazione: { tipo: 'fattura' | 'lavoro'; numero: string }
}
type Dati = {
  studio: string | null
  saldo: { confermato: number; potenziale: number; disponibile: number; totale: number }
  dovuti: Dovuto[]
  pagamenti: Pagamento[]
}

type Stato =
  | { fase: 'caricamento' }
  | { fase: 'errore' }
  | { fase: 'dati'; dati: Dati }

const currencyFmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const dataFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const metodoLabels: Record<string, string> = {
  contanti: 'Contanti',
  bonifico: 'Bonifico',
  pos: 'POS',
  assegno: 'Assegno',
}

const FONT = 'DM Sans, sans-serif'
const CARD: CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '16px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
}

function etichettaDovuto(d: Dovuto): string {
  return d.origine === 'fattura' ? `Fattura ${d.numero}` : `Lavoro ${d.numero}`
}

function etichettaDestinazione(dest: { tipo: 'fattura' | 'lavoro'; numero: string }): string {
  return dest.tipo === 'fattura' ? `Fattura ${dest.numero}` : `Lavoro ${dest.numero}`
}

function BloccoCollassabile({ titolo, pannelloId, children }: { titolo: string; pannelloId: string; children: ReactNode }) {
  const [aperto, setAperto] = useState(false)
  return (
    <div style={{ ...CARD, margin: '0 16px 16px', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        aria-expanded={aperto}
        aria-controls={pannelloId}
        style={{
          width: '100%', minHeight: '44px', padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: FONT, fontSize: '15px', fontWeight: 700, color: '#111827',
          textAlign: 'left',
        }}
      >
        {titolo}
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
          style={{ flexShrink: 0, transition: 'transform 0.18s cubic-bezier(0.2,0,0,1)', transform: aperto ? 'rotate(90deg)' : 'none' }}
        >
          <path d="M6 12l4-4-4-4" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {aperto && <div id={pannelloId} style={{ padding: '0 0 6px' }}>{children}</div>}
    </div>
  )
}

export function SituazioneEconomicaSection({ token }: { token: string }) {
  const [stato, setStato] = useState<Stato>({ fase: 'caricamento' })

  useEffect(() => {
    let attivo = true
    async function carica() {
      try {
        const res = await fetch(`/api/portale/${token}/situazione`, { credentials: 'same-origin' })
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
    return () => { attivo = false }
  }, [token])

  if (stato.fase === 'caricamento') return null

  if (stato.fase === 'errore') {
    return (
      <div className="ua-fatt-no-print">
        <div style={{ height: '1px', background: '#E5E7EB', margin: '16px 20px 24px' }} />
        <div style={{ padding: '0 20px 20px' }}>
          <div role="alert" style={{
            background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px',
            padding: '10px 14px', fontFamily: FONT, fontSize: '12.5px', fontWeight: 600, color: '#92400E',
          }}>
            Impossibile caricare la situazione economica. Ricarica la pagina.
          </div>
        </div>
      </div>
    )
  }

  const { dati } = stato
  const vuoto = dati.dovuti.length === 0 && dati.pagamenti.length === 0 && dati.saldo.totale === 0

  const anniPagamenti = new Map<number, Pagamento[]>()
  for (const p of dati.pagamenti) {
    const anno = Number((p.data ?? '').slice(0, 4)) || 0
    const gruppo = anniPagamenti.get(anno) ?? []
    gruppo.push(p)
    anniPagamenti.set(anno, gruppo)
  }
  const gruppiPagamenti = [...anniPagamenti.entries()].sort(([a], [b]) => b - a)

  return (
    <div className="ua-fatt-no-print">
      {/* Separatore tra «Fatture» e «Situazione economica» — mockup .se-divider */}
      <div style={{ height: '1px', background: '#E5E7EB', margin: '16px 20px 24px' }} />

      <div style={{ padding: '20px 20px 14px' }}>
        <h2 style={{ fontFamily: FONT, fontSize: '19px', fontWeight: 700, color: '#111827', margin: 0 }}>
          Situazione economica
        </h2>
      </div>

      {vuoto ? (
        <div style={{ padding: '0 20px' }}>
          <div style={{ ...CARD, padding: '44px 24px', textAlign: 'center' }}>
            <div aria-hidden="true" style={{
              width: '56px', height: '56px', borderRadius: '50%', background: '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '24px',
            }}>
              ⚖️
            </div>
            <div style={{ fontFamily: FONT, fontSize: '14.5px', fontWeight: 600, color: '#6B7280' }}>
              Nessun movimento economico registrato.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ paddingBottom: '4px' }}>
          {/* Card saldo */}
          <div style={{ ...CARD, margin: '0 16px 16px' }}>
            <RigaSaldo etichetta="Da saldare" valore={dati.saldo.confermato} bordo={false} />
            {dati.saldo.potenziale > 0 && (
              <RigaSaldo
                etichetta="In attesa di tua decisione"
                valore={dati.saldo.potenziale}
                nota="I lavori nella sezione «Da fatturare» qui sopra"
              />
            )}
            {dati.saldo.disponibile > 0 && (
              <RigaSaldo etichetta="Tuo credito" valore={dati.saldo.disponibile} colore="#15803D" />
            )}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              padding: '16px 18px', borderTop: '1px solid #E5E7EB',
            }}>
              <span style={{ fontFamily: FONT, fontSize: '15px', fontWeight: 700, color: '#111827' }}>Totale</span>
              <span style={{ fontFamily: FONT, fontSize: '19px', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>
                {currencyFmt.format(dati.saldo.totale)}
              </span>
            </div>
          </div>

          {/* Dettaglio dovuti */}
          {dati.dovuti.length > 0 && (
            <BloccoCollassabile titolo="Dettaglio dovuti" pannelloId="se-dettaglio-dovuti">
              {dati.dovuti.map((d, i) => (
                <div key={`${d.origine}-${d.numero}-${i}`} style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
                  padding: '12px 18px', borderTop: '1px solid #F3F4F6',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: FONT, fontSize: '14.5px', fontWeight: 600,
                      color: d.pagata ? '#9CA3AF' : '#111827', marginBottom: '2px',
                    }}>
                      {etichettaDovuto(d)}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: '12px', color: '#9CA3AF' }}>
                      {d.data ? dataFmt.format(new Date(`${d.data}T00:00:00`)) : '—'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    {d.pagata ? (
                      <>
                        <div style={{
                          fontFamily: FONT, fontSize: '15.5px', fontWeight: 600, color: '#9CA3AF',
                          textDecoration: 'line-through', whiteSpace: 'nowrap',
                        }}>
                          {currencyFmt.format(d.totale)}
                        </div>
                        <span style={{
                          fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: '#9CA3AF',
                          background: '#F3F4F6', borderRadius: '999px', padding: '3px 9px', whiteSpace: 'nowrap',
                        }}>
                          Saldata
                        </span>
                      </>
                    ) : (
                      <>
                        <div style={{ fontFamily: FONT, fontSize: '15.5px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                          {currencyFmt.format(d.residuo)}
                        </div>
                        {d.giorni_ritardo > 0 && (
                          <span style={{
                            fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: '#B45309',
                            background: '#FEF3C7', borderRadius: '999px', padding: '3px 9px', whiteSpace: 'nowrap',
                          }}>
                            in ritardo di {d.giorni_ritardo} gg
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </BloccoCollassabile>
          )}

          {/* Pagamenti registrati */}
          {dati.pagamenti.length > 0 && (
            <BloccoCollassabile titolo="Pagamenti registrati" pannelloId="se-pagamenti-registrati">
              {gruppiPagamenti.map(([anno, pagamenti]) => (
                <div key={anno}>
                  <div style={{
                    fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: '#9CA3AF',
                    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 18px 6px',
                  }}>
                    {anno}
                  </div>
                  {pagamenti.map((p, i) => (
                    <div key={`${p.data}-${i}`} style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
                      padding: '10px 18px', borderTop: '1px solid #F3F4F6',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: FONT, fontSize: '14.5px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                          {metodoLabels[p.metodo] ?? p.metodo}
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: '12px', color: '#9CA3AF' }}>
                          {p.data ? dataFmt.format(new Date(`${p.data}T00:00:00`)) : '—'}
                          {' — per '}
                          {etichettaDestinazione(p.destinazione)}
                        </div>
                      </div>
                      <div style={{
                        flexShrink: 0, fontFamily: FONT, fontSize: '15.5px', fontWeight: 700,
                        color: '#111827', whiteSpace: 'nowrap',
                      }}>
                        {currencyFmt.format(p.importo)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </BloccoCollassabile>
          )}
        </div>
      )}
    </div>
  )
}

function RigaSaldo({ etichetta, valore, nota, colore, bordo = true }: {
  etichetta: string
  valore: number
  nota?: string
  colore?: string
  bordo?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
      padding: '14px 18px', borderTop: bordo ? '1px solid #F3F4F6' : 'none',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: '13.5px', fontWeight: 600, color: colore ?? '#374151' }}>
          {etichetta}
        </div>
        {nota && (
          <div style={{ fontFamily: FONT, fontSize: '12px', color: '#9CA3AF', marginTop: '3px', maxWidth: '200px' }}>
            {nota}
          </div>
        )}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: '17px', fontWeight: 700,
        color: colore ?? '#111827', whiteSpace: 'nowrap',
      }}>
        {currencyFmt.format(valore)}
      </div>
    </div>
  )
}
