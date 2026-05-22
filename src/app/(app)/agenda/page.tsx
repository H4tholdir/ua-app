import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

type AppuntamentoRow = {
  id: string
  data: string
  ora_inizio: string | null
  tipo: string
  descrizione: string | null
  lavoro: {
    id: string
    numero_lavoro: string
    paziente_nome_snapshot: string | null
    descrizione: string
  } | null
  cliente: {
    id: string
    nome: string
    cognome: string
    studio_nome: string | null
  } | null
}

const tipoLabels: Record<string, string> = {
  consegna: 'Consegna',
  prova: 'Prova',
  appuntamento: 'Appuntamento',
  urgente: 'Urgente',
  altro: 'Altro',
}

const tipoColors: Record<string, string> = {
  consegna: 'var(--success, #16A34A)',
  prova: 'var(--amber, #FD7E14)',
  appuntamento: 'var(--info, #2563EB)',
  urgente: 'var(--primary, #D90012)',
  altro: 'var(--t2, #96918D)',
}

function formatGiornoIT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatOra(time: string | null): string | null {
  if (!time) return null
  return time.slice(0, 5) // "HH:MM"
}

export default async function AgendaPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  const labId: string = utente?.laboratorio_id ?? ''

  let appuntamenti: AppuntamentoRow[] = []

  if (labId) {
    const oggi = new Date()
    const tra7Giorni = new Date(oggi)
    tra7Giorni.setDate(tra7Giorni.getDate() + 7)
    const oggiISO = oggi.toISOString().split('T')[0]
    const tra7ISO = tra7Giorni.toISOString().split('T')[0]

    const { data } = await svc
      .from('appuntamenti')
      .select(`
        id,
        data,
        ora_inizio,
        tipo,
        descrizione,
        lavoro:lavori(id, numero_lavoro, paziente_nome_snapshot, descrizione),
        cliente:clienti(id, nome, cognome, studio_nome)
      `)
      .eq('laboratorio_id', labId)
      .gte('data', oggiISO)
      .lte('data', tra7ISO)
      .is('deleted_at', null)
      .order('data', { ascending: true })
      .order('ora_inizio', { ascending: true })
      .limit(100)

    appuntamenti = (data ?? []) as unknown as AppuntamentoRow[]
  }

  // Raggruppa per data
  const perData = appuntamenti.reduce<Record<string, AppuntamentoRow[]>>((acc, apt) => {
    if (!acc[apt.data]) acc[apt.data] = []
    acc[apt.data].push(apt)
    return acc
  }, {})

  const date = Object.keys(perData).sort()

  return (
    <PageWrapper>
      <AppHeader title="Agenda" subtitle="Prossimi 7 giorni" />

      <div style={{ padding: '0 20px 32px' }}>
        {date.length === 0 ? (
          <div
            style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                color: 'var(--t2, #96918D)',
                margin: 0,
              }}
            >
              Nessun appuntamento nei prossimi 7 giorni
            </p>
          </div>
        ) : (
          date.map((giorno) => (
            <section key={giorno} style={{ marginBottom: '20px' }}>
              {/* Header data in oro con Playfair Display */}
              <h2
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--gold, #D4A843)',
                  margin: '0 0 10px',
                  textTransform: 'capitalize',
                }}
              >
                {formatGiornoIT(giorno)}
              </h2>

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
                {perData[giorno].map((apt) => {
                  const tipoColor = tipoColors[apt.tipo] ?? 'var(--t2, #96918D)'
                  const tipoLabel = tipoLabels[apt.tipo] ?? apt.tipo
                  const ora = formatOra(apt.ora_inizio)

                  const clienteNome = apt.cliente
                    ? apt.cliente.studio_nome ??
                      `${apt.cliente.nome} ${apt.cliente.cognome}`
                    : null

                  const pazienteLabel = apt.lavoro?.paziente_nome_snapshot ?? null
                  const descrizioneLabel =
                    apt.descrizione ??
                    apt.lavoro?.descrizione ??
                    null

                  return (
                    <li key={apt.id}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'stretch',
                          gap: '12px',
                          background: 'var(--surface, #E4DFD9)',
                          borderRadius: '16px',
                          padding: '14px 16px',
                          boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
                        }}
                      >
                        {/* Barra colore tipo */}
                        <div
                          aria-hidden="true"
                          style={{
                            width: '4px',
                            minHeight: '48px',
                            borderRadius: '2px',
                            background: tipoColor,
                            flexShrink: 0,
                          }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Tipo + ora */}
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
                                fontWeight: 700,
                                color: tipoColor,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {tipoLabel}
                            </span>
                            {ora && (
                              <time
                                style={{
                                  fontFamily: 'Playfair Display, serif',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: 'var(--gold, #D4A843)',
                                  flexShrink: 0,
                                }}
                              >
                                {ora}
                              </time>
                            )}
                          </div>

                          {/* Paziente o descrizione */}
                          {(pazienteLabel ?? descrizioneLabel) && (
                            <p
                              style={{
                                fontFamily: 'DM Sans, sans-serif',
                                fontSize: '15px',
                                fontWeight: 600,
                                color: 'var(--t1, #1C1916)',
                                margin: '0 0 2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {pazienteLabel ?? descrizioneLabel}
                            </p>
                          )}

                          {/* Cliente a destra */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            {apt.lavoro && (
                              <span
                                style={{
                                  fontFamily: 'DM Sans, sans-serif',
                                  fontSize: '12px',
                                  color: 'var(--t2, #96918D)',
                                }}
                              >
                                #{apt.lavoro.numero_lavoro}
                              </span>
                            )}
                            {clienteNome && (
                              <span
                                style={{
                                  fontFamily: 'DM Sans, sans-serif',
                                  fontSize: '13px',
                                  color: 'var(--t2, #96918D)',
                                  flexShrink: 0,
                                  marginLeft: 'auto',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '60%',
                                }}
                              >
                                {clienteNome}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </PageWrapper>
  )
}
