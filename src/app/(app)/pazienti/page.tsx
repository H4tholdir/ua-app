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
                      background: 'var(--surface, #E4DFD9)',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--t1, #1C1916)',
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
                          color: 'var(--t2, #96918D)',
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
                            background: 'var(--elv, #EDEDEA)',
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
