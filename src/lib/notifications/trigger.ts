import { getServiceClient } from '@/lib/supabase/server-service'
import { sendPushToSubscription, type PushPayload, type PushSubscriptionData } from './push'

type Ruolo = 'titolare' | 'tecnico' | 'front_desk' | 'admin_rete'

/**
 * Send a push notification to all users of a specific role in a lab.
 * Silent on error — push failures should never break the main flow.
 */
export async function triggerPushByRole(
  laboratorio_id: string,
  ruolo: Ruolo,
  payload: PushPayload
): Promise<void> {
  try {
    const svc = getServiceClient()

    // Get all active users of this role in this lab
    const { data: members } = await svc
      .from('utenti')
      .select('id')
      .eq('laboratorio_id', laboratorio_id)
      .eq('ruolo', ruolo)
      .eq('attivo', true)
      .is('deleted_at', null)

    if (!members?.length) return

    const userIds = members.map(m => m.id)

    const { data: subs } = await svc
      .from('push_subscriptions')
      .select('subscription')
      .eq('laboratorio_id', laboratorio_id)
      .in('user_id', userIds)

    if (!subs?.length) return

    await Promise.allSettled(
      subs.map(row =>
        sendPushToSubscription(
          row.subscription as PushSubscriptionData,
          payload
        )
      )
    )
  } catch {
    // Never throw — push failures are non-critical
  }
}

/**
 * Send a push notification to a specific user.
 * Silent on error — push failures should never break the main flow.
 */
export async function triggerPushToUser(
  user_id: string,
  laboratorio_id: string,
  payload: PushPayload
): Promise<void> {
  try {
    const svc = getServiceClient()

    const { data: subs } = await svc
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .eq('laboratorio_id', laboratorio_id)

    if (!subs?.length) return

    await Promise.allSettled(
      subs.map(row =>
        sendPushToSubscription(
          row.subscription as PushSubscriptionData,
          payload
        )
      )
    )
  } catch {
    // Never throw
  }
}
