import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RuoloInvito } from './ruoli'

export interface InvitoPendente {
  id: string
  email: string
  ruolo: RuoloInvito
  created_at: string
  expires_at: string
}

export async function listInvitiPendenti(
  svc: SupabaseClient,
  laboratorioId: string
): Promise<InvitoPendente[]> {
  const { data } = await svc
    .from('inviti')
    .select('id, email, ruolo, created_at, expires_at')
    .eq('laboratorio_id', laboratorioId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (data ?? []) as InvitoPendente[]
}
