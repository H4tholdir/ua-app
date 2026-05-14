import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import AdminNav from './admin-nav'
import './admin.css'

// Admin role is verified from DB — not from JWT claims (which can be stale)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('ruolo, nome, cognome')
    .eq('id', user.id)
    .single()

  if (utente?.ruolo !== 'admin_sistema') redirect('/dashboard')

  const displayName = utente?.nome
    ? `${utente.nome} ${utente.cognome ?? ''}`.trim()
    : (user.email ?? 'Admin')

  return (
    <div className="adm-body">
      <AdminNav userDisplay={displayName} />
      {children}
    </div>
  )
}
