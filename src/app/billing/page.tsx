import { redirect } from 'next/navigation'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import BillingContent from './billing-content'

interface Props {
  searchParams: Promise<{ expired?: string; trial_expired?: string }>
}

// getFreshLabContext: getUser() di rete (pagina di gating abbonamento,
// conservativo) + filtro deleted_at (N11). `context.lab` (stato, nome,
// trial_ends_at) proviene dalla stessa query — nessuna seconda query
// `laboratori` separata: i campi coincidono esattamente con LabContext.lab.
export default async function BillingPage({ searchParams }: Props) {
  const context = await getFreshLabContext()
  if (!context || !context.laboratorioId || !context.lab) redirect('/login?error=no_lab')

  const params = await searchParams
  const lab = context.lab

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
