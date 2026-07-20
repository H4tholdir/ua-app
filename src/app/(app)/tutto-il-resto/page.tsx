import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getSezioniTuttoIlResto } from '@/lib/dashboard/tutto-il-resto'
import { TuttoIlResto } from '@/components/features/tutto-il-resto/TuttoIlResto'

export const dynamic = 'force-dynamic'

// ☰ «Tutto il resto» (§6.1/§6.2, Task 10) — pagina, NON drawer. Stesso schema
// auth/perimetro delle altre pagine v3 migrate (/dashboard, /lavori, Task
// 7/8): il ruolo va validato qui, non lasciato al database (il service
// client bypassa RLS). A ≥1024 la pagina si nasconde (CSS-driven,
// TuttoIlResto) — le 9 voci vivono già nella nav laterale (Task 9,
// HomeDesktop/NavDesk).
export default async function TuttoIlRestoPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')
  const { ruolo, laboratorioId: labId } = context
  if (!['titolare', 'admin_rete', 'tecnico', 'front_desk'].includes(ruolo)) redirect('/login') // admin_sistema usa /admin

  const svc = getServiceClient()
  const sezioni = await getSezioniTuttoIlResto(svc, labId, ruolo)

  // O1i-1 — firma «Sei {nome} · {labNome}» sopra l'Esci (lacuna §7.16).
  const utenteNome = context.nome ?? context.email?.split('@')[0] ?? 'Utente'
  const labNome = context.lab?.nome ?? ''

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      <TuttoIlResto sezioni={sezioni} utenteNome={utenteNome} labNome={labNome} />
    </div>
  )
}
