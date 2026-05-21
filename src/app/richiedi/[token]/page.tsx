import { notFound } from 'next/navigation'
import { getServiceClient } from '@/lib/supabase/server-service'
import { RichiestaClientForm } from '@/components/features/portale/RichiestaClientForm'

type PageProps = { params: Promise<{ token: string }> }

export default async function RichiestaPage({ params }: PageProps) {
  const { token } = await params

  if (!token || typeof token !== 'string') {
    notFound()
  }

  const svc = getServiceClient()

  // 1. Fetch cliente by portale_token
  const { data: cliente, error } = await svc
    .from('clienti')
    .select('id, nome, cognome, studio_nome, laboratorio_id, portale_token, portale_token_scade_at')
    .eq('portale_token', token)
    .is('deleted_at', null)
    .single()

  if (error || !cliente) {
    notFound()
  }

  // 2. Check token TTL (stesso check della pagina portale)
  const tokenScadenza = (cliente as Record<string, unknown>).portale_token_scade_at as string | null
  if (tokenScadenza && new Date(tokenScadenza) < new Date()) {
    notFound()
  }

  // 3. Fetch laboratorio
  const { data: lab } = await svc
    .from('laboratori')
    .select('nome, logo_url')
    .eq('id', cliente.laboratorio_id)
    .single()

  const nomeCompostoRaw = `${cliente.cognome ?? ''} ${cliente.nome ?? ''}`.trim()
  const nomeCliente = cliente.studio_nome ?? (nomeCompostoRaw || 'Dott.')

  return (
    <RichiestaClientForm
      token={token}
      clienteId={cliente.id}
      labNome={lab?.nome ?? 'Laboratorio'}
      labLogoUrl={lab?.logo_url ?? null}
      nomeCliente={nomeCliente}
    />
  )
}
