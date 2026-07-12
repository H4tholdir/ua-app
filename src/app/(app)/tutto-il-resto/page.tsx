import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
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
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo, laboratorio_id').eq('id', user.id).is('deleted_at', null).single()
  if (!utente) redirect('/login')
  const { ruolo, laboratorio_id: labId } = utente
  if (!['titolare', 'admin_rete', 'tecnico', 'front_desk'].includes(ruolo)) redirect('/login') // admin_sistema usa /admin

  const sezioni = await getSezioniTuttoIlResto(svc, labId, ruolo)

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      <TuttoIlResto sezioni={sezioni} />
    </div>
  )
}
