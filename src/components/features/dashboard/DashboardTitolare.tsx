import { KpiStrip } from './KpiStrip'
import type { DashboardStats, StatoLavoro } from '@/types/domain'
import type { PagamentoScaduto, MaterialeEsaurimento, LavoroInProva } from '@/lib/dashboard/queries'

// ─── Colori per stato lavoro ─────────────────────────────────────────────────

const statoColors: Record<string, string> = {
  ricevuto: '#8899CC',
  in_lavorazione: '#4C6EF5',
  in_prova: '#FD7E14',
  in_prova_esterna: '#E67700',
  pronto: '#2ECC9A',
  consegnato: '#2ECC9A',
  annullato: '#FA5252',
  sospeso: '#868E96',
  in_ritardo: '#FA5252',
}

const statoLabels: Record<string, string> = {
  ricevuto: 'Ricevuto',
  in_lavorazione: 'In lavorazione',
  in_prova: 'In prova',
  in_prova_esterna: 'In prova esterna',
  pronto: 'Pronto',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
  sospeso: 'Sospeso',
  in_ritardo: 'In ritardo',
}

// ─── Tipi props ──────────────────────────────────────────────────────────────

interface ConsegnaOggi {
  id: string
  numero_lavoro: string
  stato: string
  tipo_dispositivo: string
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  cliente_display: string
  cliente_telefono: string | null
}

interface LavoroInRitardo {
  id: string
  numero_lavoro: string
  stato: string
  priorita: string
  tipo_dispositivo: string
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  cliente_display: string
}

interface DashboardTitolareProps {
  stats: DashboardStats
  consegneOggi: ConsegnaOggi[]
  lavoriInRitardo: LavoroInRitardo[]
  inProvaRientro: LavoroInProva[]
  materialiEsaurimento: MaterialeEsaurimento[]
  pagamentiTop: PagamentoScaduto[]
  nomeUtente: string
  labName: string
  aggiornatoAt: string | null
}

// ─── Helper: sezione label ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '11px',
        fontWeight: 600,
        color: '#8899CC',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        margin: '0',
        padding: '16px 20px 8px',
      }}
    >
      {children}
    </h2>
  )
}

// ─── Helper: riga lavoro ──────────────────────────────────────────────────────

function LavoroRow({
  id,
  numero_lavoro,
  stato,
  descrizione,
  paziente_nome_snapshot,
  cliente_display,
  ora_consegna,
  data_consegna_prevista,
  showData = false,
}: {
  id: string
  numero_lavoro: string
  stato: string
  descrizione: string
  paziente_nome_snapshot: string | null
  cliente_display: string
  ora_consegna: string | null
  data_consegna_prevista: string
  showData?: boolean
}) {
  const color = statoColors[stato] ?? '#8899CC'

  return (
    <a
      href={`/lavori/${id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        textDecoration: 'none',
        borderBottom: '1px solid rgba(136,153,204,0.12)',
        color: 'inherit',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: '4px',
          borderRadius: '2px',
          background: color,
          flexShrink: 0,
          alignSelf: 'stretch',
          minHeight: '44px',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            color: '#F0F4FF',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '3px',
          }}
        >
          {paziente_nome_snapshot ?? descrizione}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#8899CC',
            }}
          >
            #{numero_lavoro}
            {cliente_display ? ` · ${cliente_display}` : ''}
          </span>
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              color: '#D4A843',
              flexShrink: 0,
            }}
          >
            {showData
              ? new Date(data_consegna_prevista + 'T00:00:00').toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                })
              : ora_consegna
              ? `ore ${ora_consegna.slice(0, 5)}`
              : 'oggi'}
          </span>
        </div>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0, color: '#8899CC' }}
      >
        <path
          d="M6 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  )
}

// ─── Helper: card container ───────────────────────────────────────────────────

function DataCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#1B2D6B',
        borderRadius: '20px',
        margin: '0 20px 10px',
        overflow: 'hidden',
        boxShadow:
          '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
      }}
    >
      {children}
    </div>
  )
}

// ─── Helper: empty state ──────────────────────────────────────────────────────

function EmptyCard({ message }: { message: string }) {
  return (
    <div
      style={{
        background: '#1B2D6B',
        borderRadius: '16px',
        margin: '0 20px 10px',
        padding: '24px 20px',
        textAlign: 'center',
        boxShadow:
          '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
      }}
    >
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          color: '#8899CC',
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  )
}

// ─── Componente principale ────────────────────────────────────────────────────

export function DashboardTitolare({
  stats,
  consegneOggi,
  lavoriInRitardo,
  inProvaRientro,
  materialiEsaurimento,
  pagamentiTop,
  nomeUtente,
  labName,
  aggiornatoAt,
}: DashboardTitolareProps) {
  const ora = new Date().getHours()
  const greeting =
    ora >= 6 && ora < 12
      ? 'Buongiorno'
      : ora >= 12 && ora < 17
      ? 'Buon pomeriggio'
      : 'Buonasera'

  return (
    <div
      style={{
        background: '#0F1E52',
        minHeight: '100dvh',
        color: '#F0F4FF',
        fontFamily: 'DM Sans, sans-serif',
        paddingBottom: '40px',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 20px 4px' }}>
        <h1
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            color: '#F0F4FF',
            margin: 0,
          }}
        >
          {greeting}, {nomeUtente}
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#8899CC',
            margin: '4px 0 0',
          }}
        >
          {labName}
        </p>
        {aggiornatoAt && (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              color: 'rgba(136,153,204,0.6)',
              margin: '4px 0 0',
            }}
          >
            Aggiornato{' '}
            {new Date(aggiornatoAt).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* KPI Strip */}
      <SectionLabel>Situazione operativa</SectionLabel>
      <KpiStrip stats={stats} />

      {/* Consegne oggi */}
      <SectionLabel>Da consegnare oggi ({consegneOggi.length})</SectionLabel>
      {consegneOggi.length === 0 ? (
        <EmptyCard message="Nessuna consegna programmata oggi" />
      ) : (
        <DataCard>
          {consegneOggi.map(l => (
            <LavoroRow
              key={l.id}
              id={l.id}
              numero_lavoro={l.numero_lavoro}
              stato={l.stato}
              descrizione={l.descrizione}
              paziente_nome_snapshot={l.paziente_nome_snapshot}
              cliente_display={l.cliente_display}
              ora_consegna={l.ora_consegna}
              data_consegna_prevista={l.data_consegna_prevista}
            />
          ))}
        </DataCard>
      )}

      {/* Lavori in ritardo */}
      {lavoriInRitardo.length > 0 && (
        <>
          <SectionLabel>In ritardo ({lavoriInRitardo.length})</SectionLabel>
          <DataCard>
            {lavoriInRitardo.map(l => (
              <LavoroRow
                key={l.id}
                id={l.id}
                numero_lavoro={l.numero_lavoro}
                stato={l.stato}
                descrizione={l.descrizione}
                paziente_nome_snapshot={l.paziente_nome_snapshot}
                cliente_display={l.cliente_display}
                ora_consegna={l.ora_consegna}
                data_consegna_prevista={l.data_consegna_prevista}
                showData
              />
            ))}
          </DataCard>
        </>
      )}

      {/* In prova — rientro atteso */}
      {inProvaRientro.length > 0 && (
        <>
          <SectionLabel>In prova — rientro atteso ({inProvaRientro.length})</SectionLabel>
          <DataCard>
            {inProvaRientro.map(l => (
              <a
                key={l.id}
                href={`/lavori/${l.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(136,153,204,0.12)',
                  color: 'inherit',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: '4px',
                    borderRadius: '2px',
                    background: '#FD7E14',
                    flexShrink: 0,
                    alignSelf: 'stretch',
                    minHeight: '44px',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#F0F4FF',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '3px',
                    }}
                  >
                    {l.paziente_nome_snapshot ?? l.descrizione}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#8899CC' }}>
                      #{l.numero_lavoro} · {l.cliente_display}
                    </span>
                    <span style={{ fontSize: '12px', color: '#FD7E14', flexShrink: 0 }}>
                      {l.data_prima_prova
                        ? new Date(l.data_prima_prova + 'T00:00:00').toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : '—'}
                    </span>
                  </div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  style={{ flexShrink: 0, color: '#8899CC' }}
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ))}
          </DataCard>
        </>
      )}

      {/* Materiali sotto scorta */}
      {materialiEsaurimento.length > 0 && (
        <>
          <SectionLabel>Materiali sotto scorta</SectionLabel>
          <DataCard>
            {materialiEsaurimento.map(m => (
              <div
                key={m.id ?? m.nome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(136,153,204,0.12)',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#FA5252',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#F0F4FF',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.nome}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FA5252',
                    flexShrink: 0,
                  }}
                >
                  {m.scorta_attuale} / {m.scorta_minima} {m.um_acquisto}
                </span>
              </div>
            ))}
          </DataCard>
        </>
      )}

      {/* Pagamenti in attesa */}
      {pagamentiTop.length > 0 && (
        <>
          <SectionLabel>Saldi aperti — top clienti</SectionLabel>
          <DataCard>
            {pagamentiTop.map((p, i) => (
              <div
                key={p.cliente_id ?? i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  gap: '12px',
                  borderBottom: '1px solid rgba(136,153,204,0.12)',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#F0F4FF',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {p.studio_nome ?? p.cliente_nome ?? '—'}
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#FA5252',
                    flexShrink: 0,
                  }}
                >
                  €{((p.saldo_aperto ?? 0) / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </DataCard>
        </>
      )}
    </div>
  )
}
