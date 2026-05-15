import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { KpiStrip } from '@/components/features/dashboard/KpiStrip'
import type { DashboardStats, StatoLavoro } from '@/types/domain'

// ─── Greeting contestuale (ora server) ───────────────────────
function getGreeting(): string {
  const ora = new Date().getHours()
  if (ora >= 6 && ora < 12) return 'Buongiorno'
  if (ora >= 12 && ora < 17) return 'Buon pomeriggio'
  return 'Buonasera'
}

// ─── Etichette stato lavoro ───────────────────────────────────
const statoLabels: Record<StatoLavoro, string> = {
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

const statoColors: Record<StatoLavoro, string> = {
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

// ─── Formato data italiana ────────────────────────────────────
function formatDataIT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

const defaultStats: DashboardStats = {
  consegne_oggi: 0,
  lavori_in_ritardo: 0,
  pronti_non_fatturati: 0,
  tecnico_piu_saturo: null,
  mdr_incompleti: 0,
  spedizioni_in_ritardo: 0,
  is_rifacimento_count: 0,
  stl_non_assegnati: 0,
  lavori_attivi: 0,
  fatturato_mese: 0,
}

export default async function DashboardPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()

  const svc = getServiceClient()

  // ─── 1. Dati utente e laboratorio ────────────────────────────
  const { data: utente } = await svc
    .from('utenti')
    .select('nome, cognome, ruolo, laboratorio_id')
    .eq('id', user!.id)
    .single()

  const labId: string | null = utente?.laboratorio_id ?? null

  // ─── 2. Nome laboratorio per il saluto ───────────────────────
  let labNome: string | undefined
  if (labId) {
    const { data: lab } = await svc
      .from('laboratori')
      .select('nome')
      .eq('id', labId)
      .single()
    labNome = lab?.nome ?? undefined
  }

  // ─── 3. KPI cache ─────────────────────────────────────────────
  let stats: DashboardStats = defaultStats
  if (labId) {
    const { data: cache } = await svc
      .from('dashboard_kpi_cache')
      .select('*')
      .eq('laboratorio_id', labId)
      .maybeSingle()

    if (cache) {
      stats = {
        ...defaultStats,
        consegne_oggi: cache.consegne_oggi ?? 0,
        lavori_in_ritardo: cache.lavori_in_ritardo ?? 0,
        pronti_non_fatturati: cache.pronti_non_fatturati ?? 0,
        mdr_incompleti: cache.mdr_incompleti ?? 0,
        spedizioni_in_ritardo: cache.spedizioni_in_ritardo ?? 0,
        is_rifacimento_count: cache.is_rifacimento_count ?? 0,
        stl_non_assegnati: cache.stl_non_assegnati ?? 0,
        lavori_attivi: cache.lavori_attivi ?? 0,
        fatturato_mese: Number(cache.fatturato_mese ?? 0),
        tecnico_piu_saturo: cache.tecnico_saturo_id
          ? { nome: '', sigla: null, lavori_attivi: cache.tecnico_saturo_count ?? 0 }
          : null,
      }
    }
  }

  // ─── 4. Lavori prossimi 2 giorni ─────────────────────────────
  const oggi = new Date()
  const tra2Giorni = new Date(oggi)
  tra2Giorni.setDate(tra2Giorni.getDate() + 2)
  const oggiISO = oggi.toISOString().split('T')[0]
  const tra2GiorniISO = tra2Giorni.toISOString().split('T')[0]

  type LavoroProssimo = {
    id: string
    numero_lavoro: string
    stato: StatoLavoro
    tipo_dispositivo: string
    descrizione: string
    data_consegna_prevista: string
    paziente_nome_snapshot: string | null
    clienti: { nome: string; cognome: string; studio_nome: string | null } | null
  }

  let lavoriProssimi: LavoroProssimo[] = []
  if (labId) {
    const { data: lavori } = await svc
      .from('lavori')
      .select(
        'id, numero_lavoro, stato, tipo_dispositivo, descrizione, data_consegna_prevista, paziente_nome_snapshot, clienti(nome, cognome, studio_nome)'
      )
      .eq('laboratorio_id', labId)
      .not('stato', 'in', '("consegnato","annullato")')
      .gte('data_consegna_prevista', oggiISO)
      .lte('data_consegna_prevista', tra2GiorniISO)
      .order('data_consegna_prevista', { ascending: true })
      .limit(20)

    lavoriProssimi = (lavori ?? []) as unknown as LavoroProssimo[]
  }

  const greeting = getGreeting()
  const nomeDisplay = utente?.nome ?? user?.email ?? 'Lab'

  return (
    <PageWrapper>
      <AppHeader
        title={`${greeting}, ${nomeDisplay}`}
        subtitle={labNome}
      />

      {/* KPI Strip */}
      <KpiStrip stats={stats} />

      {/* Sezione consegne prossimi 2 giorni */}
      <section style={{ padding: '16px 20px 0' }}>
        <h2
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            color: '#8899CC',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 12px',
          }}
        >
          Consegne prossimi 2 giorni
        </h2>

        {lavoriProssimi.length === 0 ? (
          <div
            style={{
              background: '#1B2D6B',
              borderRadius: '16px',
              padding: '28px 20px',
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
              Nessuna consegna nei prossimi 2 giorni
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
            {lavoriProssimi.map((lavoro) => {
              const clienteNome = lavoro.clienti
                ? lavoro.clienti.studio_nome ??
                  `${lavoro.clienti.nome} ${lavoro.clienti.cognome}`
                : '—'
              const statoColor = statoColors[lavoro.stato] ?? '#8899CC'
              const statoLabel = statoLabels[lavoro.stato] ?? lavoro.stato

              return (
                <li key={lavoro.id}>
                  <a
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
                    {/* Indicatore colore stato */}
                    <div
                      aria-hidden="true"
                      style={{
                        width: '4px',
                        height: '48px',
                        borderRadius: '2px',
                        background: statoColor,
                        flexShrink: 0,
                      }}
                    />

                    {/* Contenuto principale */}
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#8899CC',
                          }}
                        >
                          #{lavoro.numero_lavoro}
                        </span>
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: statoColor,
                            background: `${statoColor}1A`,
                            borderRadius: '6px',
                            padding: '2px 8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}
                          aria-label={`Stato: ${statoLabel}`}
                        >
                          {statoLabel}
                        </span>
                      </div>

                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#F0F4FF',
                          margin: '0 0 2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {lavoro.paziente_nome_snapshot ?? lavoro.descrizione}
                      </p>

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
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </PageWrapper>
  )
}
