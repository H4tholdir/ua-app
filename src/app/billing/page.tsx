import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import BillingContent from './billing-content'

interface Props {
  searchParams: Promise<{ expired?: string; trial_expired?: string }>
}

export default async function BillingPage({ searchParams }: Props) {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, nome')
    .eq('id', user.id)
    .single()

  if (!utente) redirect('/login?error=no_lab')

  const { data: lab } = await svc
    .from('laboratori')
    .select('stato, nome, trial_ends_at')
    .eq('id', utente.laboratorio_id)
    .single()

  if (!lab) redirect('/login?error=no_lab')

  // Blacklist never lands here — app layout redirects to /blocked
  if (lab.stato === 'blacklist') redirect('/blocked')

  const reason =
    params.trial_expired === 'true' ? 'trial_expired' :
    params.expired === 'true'       ? 'expired' :
    lab.stato === 'sospeso'         ? 'sospeso' :
    'trial_expired'

  return (
    <BillingContent
      labNome={lab.nome}
      reason={reason as 'trial_expired' | 'expired' | 'sospeso'}
    />
  )
}
