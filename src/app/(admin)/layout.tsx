import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

// Admin role is verified from DB — not from JWT claims (which can be stale)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('ruolo')
    .eq('id', user.id)
    .single()

  if (utente?.ruolo !== 'admin_sistema') redirect('/dashboard')

  return <>{children}</>
}
