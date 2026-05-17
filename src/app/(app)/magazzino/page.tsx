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
                      background: 'var(--surface, #E4DFD9)',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
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
                            color: 'var(--t1, #1C1916)',
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
                              color: 'var(--info, #2563EB)',
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
                              color: 'var(--primary, #D90012)',
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
                            color: 'var(--t2, #96918D)',
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
                            color: scorteAlert ? 'var(--primary, #D90012)' : 'var(--success, #16A34A)',
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
