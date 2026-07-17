import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PazientiSearchList } from '@/components/features/pazienti/PazientiSearchList'
import { EmptyState } from '@/components/ui/EmptyState'

type PazienteRow = {
  id: string
  nome: string | null
  cognome: string | null
  nome_cognome: string
  codice_paziente: string | null
  cliente: { id: string; nome: string; cognome: string; studio_nome: string | null } | null
}

export default async function PazientiPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

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
          <EmptyState
            icon="👤"
            title="Nessun paziente"
            description="I pazienti vengono registrati automaticamente quando crei un lavoro."
            cta={{ label: 'Crea il tuo primo lavoro →', href: '/lavori/nuovo' }}
          />
        </section>
      ) : (
        /* Search + lista lato client — BUG #13 */
        <PazientiSearchList pazienti={pazienti} />
      )}
    </PageWrapper>
  )
}
