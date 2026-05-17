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
        background: 'var(--primary, #D90012)',
        color: '#fff',
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
                    background: 'var(--surface, #E4DFD9)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    textDecoration: 'none',
                    boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Nome principale */}
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--t1, #1C1916)',
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
                          color: 'var(--t2, #96918D)',
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
                    style={{ flexShrink: 0, color: 'var(--t2, #96918D)' }}
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
