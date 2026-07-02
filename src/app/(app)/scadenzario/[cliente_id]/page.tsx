import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EstrattoContoView } from '@/components/features/scadenzario/EstrattoContoView'
import { getContabilitaCliente } from '@/lib/contabilita/queries'
import type { EstrattoContoResponse } from '@/app/api/scadenzario/[cliente_id]/route'

interface Props {
  params: Promise<{ cliente_id: string }>
}

export async function generateMetadata() {
  return { title: 'Contabilità cliente | UÀ' }
}

export default async function EstrattoContoPage({ params }: Props) {
  const { cliente_id } = await params

  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) redirect('/login')

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const labId: string = utente.laboratorio_id

  const { data: clienteRow } = await svc
    .from('clienti')
    .select('id, nome, cognome, studio_nome, telefono, indirizzo, cap, citta')
    .eq('id', cliente_id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!clienteRow) redirect('/scadenzario')

  const { dovuti, lavoriInAttesa, creditoCliente } = await getContabilitaCliente(svc, labId, cliente_id)

  const dati: EstrattoContoResponse = {
    cliente: {
      id: clienteRow.id,
      nome: clienteRow.nome,
      cognome: clienteRow.cognome,
      studio_nome: clienteRow.studio_nome,
      telefono: clienteRow.telefono,
      indirizzo: clienteRow.indirizzo,
      cap: clienteRow.cap,
      citta: clienteRow.citta,
    },
    dovuti,
    lavoriInAttesa,
    creditoCliente,
  }

  const nomeDisplay = clienteRow.studio_nome ?? `${clienteRow.nome} ${clienteRow.cognome}`

  return (
    <PageWrapper>
      <AppHeader
        title={nomeDisplay}
        subtitle="Contabilità cliente"
        backHref="/scadenzario"
      />
      <EstrattoContoView dati={dati} />
    </PageWrapper>
  )
}
