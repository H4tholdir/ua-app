import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PazientiSearchList } from '@/components/features/pazienti/PazientiSearchList'

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

      {pazienti.length === 0 ? (
        <section style={{ padding: '0 20px' }}>
          {/* Empty state con nota GDPR + CTA — BUG #8 */}
          <div
            style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
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
              Nessun paziente trovato
            </p>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--t2, #96918D)',
                margin: '0 0 16px',
                lineHeight: 1.6,
              }}
            >
              I pazienti vengono aggiunti automaticamente quando crei un nuovo lavoro.
              Ogni paziente è pseudonimizzato per la privacy (GDPR).
            </p>
            <Link
              href="/lavori/nuovo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 22px',
                borderRadius: '32px',
                background: 'var(--primary, #D90012)',
                color: '#fff',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                minHeight: '44px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), 0 5px 14px -2px rgba(180,0,0,.38)',
              }}
            >
              Crea il tuo primo lavoro →
            </Link>
          </div>
        </section>
      ) : (
        /* Search + lista lato client — BUG #13 */
        <PazientiSearchList pazienti={pazienti} />
      )}
    </PageWrapper>
  )
}
