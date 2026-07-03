import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface RevocaInvitoParams {
  inviteId: string
  laboratorioId: string
}

export type RevocaInvitoResult = { ok: true } | { ok: false; status: number; error: string }

export async function revocaInvito(
  svc: SupabaseClient,
  params: RevocaInvitoParams
): Promise<RevocaInvitoResult> {
  const { data: invito, error: lookupError } = await svc
    .from('inviti')
    .select('id')
    .eq('id', params.inviteId)
    .eq('laboratorio_id', params.laboratorioId)
    .is('accepted_at', null)
    .single()

  if (lookupError && lookupError.code !== 'PGRST116') {
    return { ok: false, status: 500, error: lookupError.message }
  }

  if (!invito) return { ok: false, status: 404, error: 'Invito non trovato' }

  const { error } = await svc
    .from('inviti')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', params.inviteId)

  if (error) return { ok: false, status: 500, error: error.message }
  return { ok: true }
}
