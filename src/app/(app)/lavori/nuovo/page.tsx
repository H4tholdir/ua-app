import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getDatiWizard } from '@/lib/wizard/dati-wizard'
import { WizardNuovoLavoro } from '@/components/features/wizard/WizardNuovoLavoro'

export const dynamic = 'force-dynamic'

// /lavori/nuovo v3 (§7.3, Ondata 2 Task 8) — QUI muore il form multi-tab
// v2.3 (LavoroFormShell/TabDati/TabAccettazione): nasce il wizard «una
// domanda alla volta» (dentista → tipo lavoro → paziente). Stesso schema
// auth/perimetro delle altre pagine v3 migrate (/dashboard, /lavori, Task
// 7/8): il ruolo va validato qui, non lasciato al database (il service
// client bypassa RLS). `getDatiWizard` (Task 7) prepara dentisti per
// frequenza, tipi per frequenza, prossimo codice paziente e tempi medi.
export default async function NuovoLavoroPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')
  const { ruolo, laboratorioId: labId, userId } = context
  if (!['titolare', 'admin_rete', 'tecnico', 'front_desk'].includes(ruolo)) redirect('/login') // admin_sistema usa /admin

  const svc = getServiceClient()
  const dati = await getDatiWizard(svc, labId)

  return <WizardNuovoLavoro dati={dati} contesto={{ userId, labId }} />
}
