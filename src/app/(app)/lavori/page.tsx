import Link from 'next/link'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatoBadge } from '@/components/features/lavori/StatoBadge'
import type { StatoLavoro, TipoDispositivo } from '@/types/domain'

// ─── Formato data italiana ────────────────────────────────────
function formatDataIT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// ─── Etichette tipo dispositivo ───────────────────────────────
const tipoLabels: Record<TipoDispositivo, string> = {
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

interface PageProps {
  searchParams: Promise<{ stato?: string }>
}

type LavoroRow = {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  tipo_dispositivo: TipoDispositivo
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  cliente: { id: string; nome: string; cognome: string; studio_nome: string | null } | null
  tecnico: { id: string; nome: string; cognome: string; sigla: string | null } | null
}

export default async function LavoriPage({ searchParams }: PageProps) {
  const params = await searchParams
  const statoFiltro = params.stato as StatoLavoro | undefined

  // Auth
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user!.id)
    .single()

  const labId: string = utente?.laboratorio_id ?? ''

  let lavori: LavoroRow[] = []

  if (labId) {
    let query = svc
      .from('lavori')
      .select(`
        id,
        numero_lavoro,
        stato,
        tipo_dispositivo,
        descrizione,
        data_consegna_prevista,
        ora_consegna,
        paziente_nome_snapshot,
        cliente:clienti(id, nome, cognome, studio_nome),
        tecnico:tecnici(id, nome, cognome, sigla)
      `)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('data_consegna_prevista', { ascending: true })
      .limit(200)

    if (statoFiltro) {
      query = query.eq('stato', statoFiltro)
    }

    const { data } = await query
    lavori = (data ?? []) as unknown as LavoroRow[]
  }

  // Tab filtri stato
  const filtriStato: Array<{ value: string; label: string }> = [
    { value: '', label: 'Tutti' },
    { value: 'ricevuto', label: 'Ricevuti' },
    { value: 'in_lavorazione', label: 'In lavorazione' },
    { value: 'in_prova', label: 'In prova' },
    { value: 'pronto', label: 'Pronti' },
    { value: 'in_ritardo', label: 'In ritardo' },
    { value: 'consegnato', label: 'Consegnati' },
  ]

  // Pulsante "+ Nuovo lavoro" nell'header
  const addButton = (
    <Link
      href="/lavori/nuovo"
      aria-label="Nuovo lavoro"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: '40px',
        minHeight: '52px',
        padding: '0 16px',
        borderRadius: '12px',
        background: '#D4A843',
        color: '#0F1E52',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 700,
        fontSize: '14px',
        textDecoration: 'none',
        boxShadow: '0 0 16px hsl(43 65% 55% / 0.3)',
        flexShrink: 0,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 3v10M3 8h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      Nuovo
    </Link>
  )

  return (
    <PageWrapper>
      <AppHeader title="Lavori" actions={addButton} />

      {/* Filtri stato */}
      <div
        role="navigation"
        aria-label="Filtra per stato"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '0 20px 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {filtriStato.map(({ value, label }) => {
          const isActive = (statoFiltro ?? '') === value
          return (
            <Link
              key={value}
              href={value ? `/lavori?stato=${value}` : '/lavori'}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '34px',
                padding: '0 14px',
                borderRadius: 100,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                background: isActive ? '#D4A843' : '#1B2D6B',
                color: isActive ? '#0F1E52' : '#8899CC',
                boxShadow: isActive
                  ? '0 0 12px hsl(43 65% 55% / 0.25)'
                  : '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
                flexShrink: 0,
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Lista lavori */}
      <section style={{ padding: '0 20px' }}>
        {lavori.length === 0 ? (
          <div
            style={{
              background: '#1B2D6B',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              boxShadow:
                '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                color: '#8899CC',
                margin: 0,
              }}
            >
              {statoFiltro
                ? 'Nessun lavoro con questo stato'
                : 'Nessun lavoro trovato'}
            </p>
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {lavori.map((lavoro) => {
              const clienteNome = lavoro.cliente
                ? lavoro.cliente.studio_nome ??
                  `${lavoro.cliente.nome} ${lavoro.cliente.cognome}`
                : '—'

              const pazienteLabel = lavoro.paziente_nome_snapshot ?? null
              const tipoLabel = tipoLabels[lavoro.tipo_dispositivo] ?? lavoro.tipo_dispositivo

              return (
                <li key={lavoro.id}>
                  <Link
                    href={`/lavori/${lavoro.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: '#1B2D6B',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      textDecoration: 'none',
                      boxShadow:
                        '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
                    }}
                  >
                    {/* Contenuto */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Riga 1: numero + badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#8899CC',
                          }}
                        >
                          #{lavoro.numero_lavoro}
                        </span>
                        <StatoBadge stato={lavoro.stato} />
                      </div>

                      {/* Riga 2: paziente (se presente) o descrizione */}
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#F0F4FF',
                          margin: '0 0 2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {pazienteLabel ?? lavoro.descrizione}
                      </p>

                      {/* Riga 3: cliente, tipo, data */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '13px',
                            color: '#8899CC',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {clienteNome}
                          {' · '}
                          <span style={{ color: '#6677AA' }}>{tipoLabel}</span>
                        </span>
                        <time
                          dateTime={lavoro.data_consegna_prevista}
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#D4A843',
                            flexShrink: 0,
                          }}
                        >
                          {formatDataIT(lavoro.data_consegna_prevista)}
                        </time>
                      </div>
                    </div>

                    {/* Chevron */}
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
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </PageWrapper>
  )
}
