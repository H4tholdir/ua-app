import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

type TecnicoRow = {
  id: string
  nome: string
  cognome: string
  sigla: string | null
  qualifica: string | null
  prrc: boolean
}

export default async function TechniciPage() {
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

  let tecnici: TecnicoRow[] = []
  if (labId) {
    const { data } = await svc
      .from('tecnici')
      .select('id, nome, cognome, sigla, qualifica, prrc')
      .eq('laboratorio_id', labId)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
    tecnici = (data ?? []) as TecnicoRow[]
  }

  return (
    <PageWrapper>
      <AppHeader title="Tecnici" />

      <section style={{ padding: '0 20px' }}>
        {tecnici.length === 0 ? (
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
              Nessun tecnico trovato
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
            {tecnici.map((tecnico) => (
              <li key={tecnico.id}>
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
                  {/* Sigla avatar */}
                  {tecnico.sigla && (
                    <div
                      aria-hidden="true"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: '#243580',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#D4A843',
                        }}
                      >
                        {tecnico.sigla}
                      </span>
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '2px',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#F0F4FF',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {tecnico.cognome} {tecnico.nome}
                      </p>

                      {tecnico.prrc && (
                        <span
                          role="img"
                          aria-label="PRRC — Responsabile della Conformità"
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#2ECC9A',
                            background: 'hsl(159 63% 49% / 0.15)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            flexShrink: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          PRRC
                        </span>
                      )}
                    </div>

                    {tecnico.qualifica && (
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '13px',
                          color: '#8899CC',
                          margin: 0,
                        }}
                      >
                        {tecnico.qualifica}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageWrapper>
  )
}
