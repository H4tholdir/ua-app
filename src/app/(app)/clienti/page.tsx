import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

type ClienteRow = {
  id: string
  studio_nome: string | null
  nome: string
  cognome: string
  telefono: string | null
  citta: string | null
}

export default async function ClientiPage() {
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

  let clienti: ClienteRow[] = []
  if (labId) {
    const { data } = await svc
      .from('clienti')
      .select('id, studio_nome, nome, cognome, telefono, citta')
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
      .limit(500)
    clienti = (data ?? []) as ClienteRow[]
  }

  const addButton = (
    <Link
      href="/clienti/nuovo"
      aria-label="Nuovo cliente"
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Nuovo
    </Link>
  )

  return (
    <PageWrapper>
      <AppHeader title="Clienti" actions={addButton} />

      <section style={{ padding: '0 20px' }}>
        {clienti.length === 0 ? (
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
              Nessun cliente trovato
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {clienti.map((cliente) => (
              <li key={cliente.id}>
                <Link
                  href={`/clienti/${cliente.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#1B2D6B',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    textDecoration: 'none',
                    boxShadow: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Nome principale */}
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
                      {cliente.cognome} {cliente.nome}
                    </p>

                    {/* Studio e città */}
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
                        {cliente.studio_nome ?? '—'}
                      </span>
                      {cliente.citta && (
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '12px',
                            color: '#6677AA',
                            flexShrink: 0,
                          }}
                        >
                          {cliente.citta}
                        </span>
                      )}
                    </div>

                    {/* Telefono */}
                    {cliente.telefono && (
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '12px',
                          color: '#D4A843',
                          margin: '2px 0 0',
                        }}
                      >
                        {cliente.telefono}
                      </p>
                    )}
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
            ))}
          </ul>
        )}
      </section>
    </PageWrapper>
  )
}
