import 'server-only'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export interface AdminReteContext {
  userId: string
  laboratorioId: string
  rete: { id: string; nome: string; admin_laboratorio_id: string }
}

export async function verifyAdminRete(reteId: string): Promise<AdminReteContext | null> {
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

  if (!utente?.laboratorio_id) return null
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') return null

  const { data: rete } = await svc
    .from('reti')
    .select('id, nome, admin_laboratorio_id')
    .eq('id', reteId)
    .single()

  if (!rete || rete.admin_laboratorio_id !== utente.laboratorio_id) return null

  return { userId: user.id, laboratorioId: utente.laboratorio_id, rete }
}
