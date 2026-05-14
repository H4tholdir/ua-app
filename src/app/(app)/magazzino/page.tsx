import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

type ArticoloRow = {
  id: string
  codice_articolo: string
  nome: string
  produttore: string | null
  categoria: string | null
  um_scarico: string
  scorta_attuale: number
  scorta_minima: number
  dispositivo_medico: boolean
}

export default async function MagazzinoPage() {
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

  let articoli: ArticoloRow[] = []
  if (labId) {
    const { data } = await svc
      .from('magazzino')
      .select('id, codice_articolo, nome, produttore, categoria, um_scarico, scorta_attuale, scorta_minima, dispositivo_medico')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('nome', { ascending: true })
      .limit(500)
    articoli = (data ?? []) as ArticoloRow[]
  }

  const articoliAlert = articoli.filter((a) => a.scorta_attuale < a.scorta_minima)

  return (
    <PageWrapper>
      <AppHeader
        title="Magazzino"
        subtitle={articoliAlert.length > 0 ? `${articoliAlert.length} sotto scorta minima` : undefined}
      />

      <section style={{ padding: '0 20px 32px' }}>
        {articoli.length === 0 ? (
          <div
            style={{
              background: '#1B2D6B',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              boxShadow: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
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
              Nessun articolo in magazzino
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
            {articoli.map((articolo) => {
              const scorteAlert = articolo.scorta_attuale < articolo.scorta_minima

              return (
                <li key={articolo.id}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: '#1B2D6B',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      boxShadow: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Nome + badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <p
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#F0F4FF',
                            margin: 0,
                            flex: 1,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {articolo.nome}
                        </p>

                        {articolo.dispositivo_medico && (
                          <span
                            aria-label="Dispositivo medico"
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#4C6EF5',
                              background: 'hsl(228 89% 63% / 0.15)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              flexShrink: 0,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            DM
                          </span>
                        )}

                        {scorteAlert && (
                          <span
                            aria-label="Scorta sotto il minimo"
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#FA5252',
                              background: 'hsl(0 95% 64% / 0.15)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              flexShrink: 0,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Scorta bassa
                          </span>
                        )}
                      </div>

                      {/* Produttore */}
                      {articolo.produttore && (
                        <p
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '12px',
                            color: '#8899CC',
                            margin: '0 0 4px',
                          }}
                        >
                          {articolo.produttore}
                        </p>
                      )}

                      {/* Scorte */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: scorteAlert ? '#FA5252' : '#2ECC9A',
                          }}
                        >
                          {articolo.scorta_attuale}
                        </span>
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '12px',
                            color: '#6677AA',
                          }}
                        >
                          / {articolo.scorta_minima} {articolo.um_scarico}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </PageWrapper>
  )
}
