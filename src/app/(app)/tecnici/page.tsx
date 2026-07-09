import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { TecnicoEditInline } from '@/components/features/tecnici/TecnicoEditInline'
import { TecnicoDeactivateButton } from '@/components/features/tecnici/TecnicoDeactivateButton'
import { InvitaCollaboratoreSheet } from '@/components/features/tecnici/InvitaCollaboratoreSheet'

type TecnicoRow = {
  id: string
  nome: string
  cognome: string
  sigla: string | null
  qualifica: string | null
  prrc: boolean
  compenso_base: number | null
  tipo_compenso: string | null
}

export default async function TechniciPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  const labId: string = utente?.laboratorio_id ?? ''
  const ruolo: string = utente?.ruolo ?? ''
  const canViewProduttivita = ruolo === 'titolare' || ruolo === 'admin_rete'

  let tecnici: TecnicoRow[] = []
  if (labId) {
    const { data } = await svc
      .from('tecnici')
      .select('id, nome, cognome, sigla, qualifica, prrc, compenso_base, tipo_compenso')
      .eq('laboratorio_id', labId)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
    tecnici = (data ?? []) as TecnicoRow[]
  }

  const invitaButton = ruolo === 'titolare' ? <InvitaCollaboratoreSheet variant="header" /> : null

  return (
    <PageWrapper>
      <AppHeader title="Tecnici" actions={invitaButton} />

      <section style={{ padding: '0 20px' }}>
        {tecnici.length === 0 ? (
          <div
            style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              boxShadow: 'var(--sh-b)',
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--t1, #1C1916)',
                margin: '0 0 10px',
              }}
            >
              Nessun tecnico registrato
            </p>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--t2, #4A3D33)',
                margin: '0 0 16px',
                lineHeight: 1.6,
              }}
            >
              Invita un collaboratore per assegnargli lavori e tracciare la produttività.
            </p>
            {ruolo === 'titolare' && <InvitaCollaboratoreSheet variant="cta" />}
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
                    background: 'var(--surface, #E4DFD9)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    boxShadow: 'var(--sh-b, var(--sh-b))',
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
                        background: 'var(--elv, #EDEDEA)',
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
                          color: 'var(--c-amber, #F59E0B)',
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
                          color: 'var(--t1, #1C1916)',
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
                            color: 'var(--success, #16A34A)',
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
                          color: 'var(--t2, #4A3D33)',
                          margin: 0,
                        }}
                      >
                        {tecnico.qualifica}
                      </p>
                    )}
                  </div>

                  {/* Modifica + Disattiva tecnico — solo titolare/admin_rete */}
                  {canViewProduttivita && (
                    <TecnicoEditInline tecnico={tecnico} />
                  )}
                  {canViewProduttivita && (
                    <TecnicoDeactivateButton
                      tecnicoId={tecnico.id}
                      tecnicoNome={`${tecnico.nome ?? ''} ${tecnico.cognome ?? ''}`.trim()}
                    />
                  )}

                  {/* Link produttività — solo titolare/admin_rete */}
                  {canViewProduttivita && (
                    <Link
                      href={`/tecnici/${tecnico.id}/produttivita`}
                      aria-label={`Produttività di ${tecnico.nome} ${tecnico.cognome}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        minHeight: '44px',
                        borderRadius: '10px',
                        background: 'var(--elv, #EDEDEA)',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--t2, #4A3D33)',
                        textDecoration: 'none',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span aria-hidden="true">📊</span>
                      Produttività
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageWrapper>
  )
}
