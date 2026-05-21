/**
 * Server-side Web Push utility — Task B7
 *
 * Nota: push_subscriptions è definita in:
 *   supabase/migrations/20260521_push_subscriptions.sql
 * Dopo `supabase db push` rigenera i tipi con:
 *   npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
 */
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:support@uachelab.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/** Struttura JSONB memorizzata in push_subscriptions.subscription */
export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export async function sendPushToSubscription(
  subscription: PushSubscriptionData,
  payload: PushPayload,
): Promise<void> {
  await webpush.sendNotification(
    subscription as webpush.PushSubscription,
    JSON.stringify(payload),
  )
}
