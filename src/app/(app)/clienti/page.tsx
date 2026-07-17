import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ClientiSearchList } from '@/components/features/clienti/ClientiSearchList'
import { EmptyState } from '@/components/ui/EmptyState'

type ClienteRow = {
  id: string
  studio_nome: string | null
  nome: string
  cognome: string
  telefono: string | null
  citta: string | null
}

export default async function ClientiPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

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

      {clienti.length === 0 ? (
        <section style={{ padding: '0 20px' }}>
          <EmptyState
            icon="🦷"
            title="Nessun cliente ancora"
            description="Aggiungi il tuo primo studio dentistico per iniziare a ricevere lavori."
            cta={{ label: '+ Aggiungi cliente', href: '/clienti/nuovo' }}
          />
        </section>
      ) : (
        /* Search + lista lato client — i dati sono già caricati */
        <ClientiSearchList clienti={clienti} />
      )}
    </PageWrapper>
  )
}
