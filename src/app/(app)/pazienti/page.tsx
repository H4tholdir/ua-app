import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

type PazienteRow = {
  id: string
  nome: string | null
  cognome: string | null
  nome_cognome: string
  codice_paziente: string | null
  cliente: { id: string; nome: string; cognome: string; studio_nome: string | null } | null
}

export default async function PazientiPage() {
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

  let pazienti: PazienteRow[] = []
  if (labId) {
    const { data } = await svc
      .from('pazienti')
      .select(`
        id,
        nome,
        cognome,
        nome_cognome,
        codice_paziente,
        cliente:clienti(id, nome, cognome, studio_nome)
      `)
      .eq('laboratorio_id', labId)
      .eq('archiviato', false)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
      .limit(500)
    pazienti = (data ?? []) as unknown as PazienteRow[]
  }

  return (
    <PageWrapper>
      <AppHeader title="Pazienti" />

      <section style={{ padding: '0 20px' }}>
        {pazienti.length === 0 ? (
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
              Nessun paziente trovato
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
            {pazienti.map((paziente) => {
              const clienteNome = paziente.cliente
                ? paziente.cliente.studio_nome ??
                  `${paziente.cliente.nome} ${paziente.cliente.cognome}`
                : '—'

              const nomePaziente =
                paziente.cognome && paziente.nome
                  ? `${paziente.cognome} ${paziente.nome}`
                  : paziente.nome_cognome

              return (
                <li key={paziente.id}>
                  <div
                    style={{
                      background: '#1B2D6B',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      boxShadow: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#F0F4FF',
                        margin: '0 0 4px',
                      }}
                    >
                      {nomePaziente}
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
                        }}
                      >
                        {clienteNome}
                      </span>
                      {paziente.codice_paziente && (
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#6677AA',
                            background: '#243580',
                            borderRadius: '6px',
                            padding: '2px 8px',
                          }}
                        >
                          {paziente.codice_paziente}
                        </span>
                      )}
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
