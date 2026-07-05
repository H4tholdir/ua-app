import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type LaboStatoValue = 'trial' | 'attivo' | 'sospeso' | 'scaduto' | 'blacklist'

const ALLOWED_TRANSITIONS: Record<LaboStatoValue, LaboStatoValue[]> = {
  trial:     ['attivo', 'sospeso', 'scaduto', 'blacklist'],
  attivo:    ['sospeso', 'scaduto', 'blacklist'],
  sospeso:   ['attivo', 'scaduto', 'blacklist'],
  scaduto:   ['blacklist'],
  blacklist: [],
}

export function canTransition(from: LaboStatoValue, to: LaboStatoValue): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export async function transitionLabStato(
  supabase: SupabaseClient,
  laboratorioId: string,
  newStato: LaboStatoValue,
  source: 'stripe_webhook' | 'admin' | 'system',
  opts: {
    actor?: string
    stripeEventId?: string
    stripeEventCreatedAt?: Date
    extraFields?: Record<string, unknown>
  } = {}
): Promise<{ success: boolean; error?: string; retryable?: boolean }> {
  const { data: lab, error: fetchErr } = await supabase
    .from('laboratori')
    .select('stato, last_stripe_event_at')
    .eq('id', laboratorioId)
    .single()

  if (fetchErr || !lab) {
    return { success: false, error: 'Lab non trovato', retryable: true }
  }

  const currentStato = lab.stato as LaboStatoValue

  if (currentStato === 'blacklist') {
    return { success: false, error: 'Stato blacklist è terminale' }
  }

  // Same-state: idempotente, nessun aggiornamento DB necessario
  if (currentStato === newStato) {
    return { success: true }
  }

  if (!canTransition(currentStato, newStato)) {
    return { success: false, error: `Transizione ${currentStato}→${newStato} non consentita` }
  }

  // Idempotency: scarta eventi Stripe più vecchi
  if (opts.stripeEventCreatedAt && lab.last_stripe_event_at) {
    if (new Date(lab.last_stripe_event_at) >= opts.stripeEventCreatedAt) {
      return { success: true }
    }
  }

  const updateData: Record<string, unknown> = {
    stato: newStato,
    last_stripe_event_id: opts.stripeEventId ?? null,
    last_stripe_event_at: opts.stripeEventCreatedAt?.toISOString() ?? null,
    ...opts.extraFields,  // metadata Stripe mergiato atomicamente con la transizione stato
  }
  if (newStato === 'sospeso') updateData.suspended_at = new Date().toISOString()
  if (newStato === 'scaduto') updateData.expired_at = new Date().toISOString()

  const { error: updateErr } = await supabase
    .from('laboratori')
    .update(updateData)
    .eq('id', laboratorioId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  const { error: logErr } = await supabase.from('lab_stato_log').insert({
    laboratorio_id: laboratorioId,
    stato_from: currentStato,
    stato_to: newStato,
    source,
    actor: opts.actor ?? null,
    stripe_event_id: opts.stripeEventId ?? null,
  })
  if (logErr) {
    console.error('[state-machine] audit log failed:', logErr.message, { laboratorioId, newStato })
  }

  return { success: true }
}
