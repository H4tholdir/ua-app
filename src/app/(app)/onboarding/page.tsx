import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import OnboardingWizard from './wizard'

export default async function OnboardingPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id, nome, cognome').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: lab } = await svc.from('laboratori')
    .select('id, nome, ragione_sociale, partita_iva, indirizzo, cap, citta, provincia, telefono, email, pec, codice_itca, prrc_nome, prrc_qualifica, pec_smtp_configurata, onboarding_completato')
    .eq('id', utente.laboratorio_id).single()

  if (!lab) redirect('/login?error=no_lab')

  const nomeTitolare = `${utente.nome ?? ''} ${utente.cognome ?? ''}`.trim()

  return (
    <OnboardingWizard
      labId={utente.laboratorio_id}
      nomeTitolare={nomeTitolare}
      initialData={lab as Record<string, string | boolean | null>}
    />
  )
}
