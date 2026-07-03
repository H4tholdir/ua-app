import 'server-only'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export interface TitolareContext {
  userId: string
  laboratorioId: string
}

export async function verifyTitolare(): Promise<TitolareContext | null> {
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return null

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (utente?.ruolo !== 'titolare' || !utente.laboratorio_id) return null
  return { userId: user.id, laboratorioId: utente.laboratorio_id }
}
