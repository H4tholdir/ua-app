import 'server-only'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import {
  handleCheckoutCompleted,
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

  const supabase = getServiceClient()

  // Atomic idempotency: try INSERT — if the event was already processed the
  // unique constraint fires and we get an error; return 200 to stop Stripe retrying.
  const { error: insertErr } = await supabase
    .from('stripe_events')
    .insert({ id: event.id, processed_at: new Date().toISOString() })

  if (insertErr) {
    // Unique constraint violation → already processed
    if (insertErr.code === '23505') {
      return new NextResponse('Already processed', { status: 200 })
    }
    // Any other DB error: let Stripe retry
    console.error('[webhook] Failed to record event:', insertErr)
    return new NextResponse('DB error', { status: 500 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event, supabase)
        break
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
        console.log(`[webhook] Evento non gestito: ${event.type}`)
    }
  } catch (err) {
    console.error(`[webhook] Errore processando ${event.type}:`, err)
    // Delete the idempotency record so Stripe can retry successfully
    await supabase.from('stripe_events').delete().eq('id', event.id)
    return new NextResponse('Internal error processing webhook', { status: 500 })
  }

  return new NextResponse('OK', { status: 200 })
}
