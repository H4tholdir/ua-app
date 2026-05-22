import webpush from 'web-push'

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// Lazy init — evita crash al module evaluation se le chiavi mancano (es. CI build)
let _configured = false
function ensureVapid(): boolean {
  if (_configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails('mailto:support@uachelab.com', pub, priv)
  _configured = true
  return true
}

export async function sendPushToSubscription(
  subscription: PushSubscriptionData,
  payload: PushPayload,
): Promise<void> {
  if (!ensureVapid()) return // Push disabilitato se chiavi mancanti
  await webpush.sendNotification(
    subscription as webpush.PushSubscription,
    JSON.stringify(payload),
  )
}
