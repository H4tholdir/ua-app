import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export default async function DashboardPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('nome, cognome, ruolo, laboratorio_id')
    .eq('id', user!.id)
    .single()

  return (
    <main style={{ minHeight: '100dvh', padding: '40px 24px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>UÀ!</h1>
      <p style={{ color: '#666' }}>
        Ciao, {utente?.nome ?? user?.email} — Dashboard in costruzione. Infrastruttura attiva ✓
      </p>
    </main>
  )
}
