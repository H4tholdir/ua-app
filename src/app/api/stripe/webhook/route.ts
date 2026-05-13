import 'server-only'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import {
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '@/lib/stripe/webhook-handlers'

// Raw body richiesto da Stripe per la verifica della firma HMAC
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET non configurato')
    return new NextResponse('Server misconfigured', { status: 500 })
  }
  if (!sig) {
    return new NextResponse('Missing stripe-signature header', { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Firma non valida:', msg)
    return new NextResponse(`Webhook error: ${msg}`, { status: 400 })
  }

  // Idempotency: scarta eventi già processati
  const supabase = getServiceClient()
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single()

  if (existing) {
    return new NextResponse('Already processed', { status: 200 })
  }

  // Registra l'evento prima di processarlo (best-effort)
  await supabase
    .from('stripe_events')
    .insert({ id: event.id, processed_at: new Date().toISOString() })

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event, supabase)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event, supabase)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, supabase)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, supabase)
        break
      default:
        // Evento non gestito — log silenzioso, risposta 200 per non triggerare retry Stripe
        console.log(`[webhook] Evento non gestito: ${event.type}`)
    }
  } catch (err) {
    console.error(`[webhook] Errore processando ${event.type}:`, err)
    // 500 → Stripe riprova con backoff esponenziale
    return new NextResponse('Internal error processing webhook', { status: 500 })
  }

  return new NextResponse('OK', { status: 200 })
}
