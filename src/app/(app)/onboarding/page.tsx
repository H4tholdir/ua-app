import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import OnboardingWizard from './wizard'

export default async function OnboardingPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login?error=no_lab')

  const svc = getServiceClient()
  // ragione_sociale/partita_iva/... e onboarding_completato NON sono nel
  // LabContext — query locale mirata (1 RT).
  const { data: lab } = await svc.from('laboratori')
    .select('id, nome, ragione_sociale, partita_iva, indirizzo, cap, citta, provincia, telefono, email, pec, codice_itca, prrc_nome, prrc_qualifica, pec_smtp_configurata, onboarding_completato')
    .eq('id', context.laboratorioId).single()

  if (!lab) redirect('/login?error=no_lab')

  const nomeTitolare = `${context.nome ?? ''} ${context.cognome ?? ''}`.trim()

  return (
    <OnboardingWizard
      labId={context.laboratorioId}
      nomeTitolare={nomeTitolare}
      initialData={lab as Record<string, string | boolean | null>}
    />
  )
}
