import 'server-only'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'

export interface AdminReteContext {
  userId: string
  laboratorioId: string
  rete: { id: string; nome: string; admin_laboratorio_id: string }
}

export async function verifyAdminRete(reteId: string): Promise<AdminReteContext | null> {
  const context = await getFreshLabContext()
  if (!context?.laboratorioId) return null
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') return null

  const svc = getServiceClient()
  const { data: rete } = await svc
    .from('reti')
    .select('id, nome, admin_laboratorio_id')
    .eq('id', reteId)
    .single()

  if (!rete || rete.admin_laboratorio_id !== context.laboratorioId) return null

  return { userId: context.userId, laboratorioId: context.laboratorioId, rete }
}
