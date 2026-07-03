import 'server-only'
import { randomUUID, createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RuoloInvito } from './ruoli'

export interface InvitoEsistente {
  id: string
  accepted_at: string | null
  expires_at: string
}

/**
 * Tra gli inviti esistenti per la stessa email+lab, trova quello ancora
 * pendente (non accettato, non scaduto) da riusare invece di duplicare.
 */
export function trovaInvitoPendente(inviti: InvitoEsistente[], now: Date): string | null {
  const match = inviti.find((i) => i.accepted_at === null && new Date(i.expires_at) > now)
  return match ? match.id : null
}

export interface UpsertInvitoParams {
  laboratorioId: string
  email: string
  ruolo: RuoloInvito
  createdBy: string
}

export type UpsertInvitoResult =
  | { ok: true; token: string; labNome: string }
  | { ok: false; status: number; error: string }

const LAB_STATI_BLOCCATI = ['blacklist', 'scaduto']

export async function upsertInvito(
  svc: SupabaseClient,
  params: UpsertInvitoParams
): Promise<UpsertInvitoResult> {
  const normalizedEmail = params.email.toLowerCase().trim()

  const { data: lab } = await svc
    .from('laboratori')
    .select('stato, nome')
    .eq('id', params.laboratorioId)
    .single()

  if (!lab) return { ok: false, status: 404, error: 'Laboratorio non trovato' }
  if (LAB_STATI_BLOCCATI.includes(lab.stato)) {
    return { ok: false, status: 403, error: 'Impossibile invitare utenti in un lab inattivo' }
  }

  const { data: esistenti } = await svc
    .from('inviti')
    .select('id, accepted_at, expires_at')
    .eq('laboratorio_id', params.laboratorioId)
    .eq('email', normalizedEmail)

  const token = randomUUID()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const pendenteId = trovaInvitoPendente((esistenti ?? []) as InvitoEsistente[], new Date())

  if (pendenteId) {
    const { error } = await svc
      .from('inviti')
      .update({ token_hash: tokenHash, ruolo: params.ruolo, expires_at: expiresAt, created_by: params.createdBy })
      .eq('id', pendenteId)
    if (error) return { ok: false, status: 500, error: error.message }
  } else {
    const { error } = await svc.from('inviti').insert({
      token_hash: tokenHash,
      laboratorio_id: params.laboratorioId,
      email: normalizedEmail,
      ruolo: params.ruolo,
      created_by: params.createdBy,
    })
    if (error) return { ok: false, status: 500, error: error.message }
  }

  return { ok: true, token, labNome: lab.nome }
}
