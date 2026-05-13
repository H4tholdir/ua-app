import 'server-only'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { transitionLabStato } from './state-machine'

// Handles checkout.session.completed — binds stripe_subscription_id to the lab
// MUST run before any invoice.* handlers can find the lab.
export async function handleCheckoutCompleted(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session
  const labId = session.client_reference_id ?? session.metadata?.laboratorio_id
  if (!labId) return

  const subId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id ?? null
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id ?? null
  const priceId = session.line_items?.data[0]?.price?.id ?? null

  await supabase
    .from('laboratori')
    .update({
      stripe_subscription_id: subId,
      stripe_customer_id: customerId ?? undefined,
      stripe_price_id: priceId,
      stripe_subscription_status: 'active',
    })
    .eq('id', labId)

  await transitionLabStato(supabase, labId, 'attivo', 'stripe_webhook', stripeOpts(event))
}

async function findLabBySubscription(
  supabase: SupabaseClient,
  subId: string
): Promise<{ id: string; stato: string } | null> {
  const { data } = await supabase
    .from('laboratori')
    .select('id, stato')
    .eq('stripe_subscription_id', subId)
    .single()
  return data ?? null
}

function stripeOpts(event: Stripe.Event) {
  return {
    stripeEventId: event.id,
    stripeEventCreatedAt: new Date(event.created * 1000),
    actor: 'stripe',
  }
}

function getInvoiceSubId(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details
  if (!details) return null
  const sub = details.subscription
  return typeof sub === 'string' ? sub : (sub?.id ?? null)
}

export async function handlePaymentSucceeded(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  const subId = getInvoiceSubId(invoice)
  if (!subId) return

  const lab = await findLabBySubscription(supabase, subId)
  if (!lab) return

  await supabase
    .from('laboratori')
    .update({ stripe_subscription_status: 'active' })
    .eq('id', lab.id)

  await transitionLabStato(supabase, lab.id, 'attivo', 'stripe_webhook', stripeOpts(event))
}

export async function handlePaymentFailed(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice

  // Sospendi solo quando i retry Stripe sono esauriti (next_payment_attempt = null)
  if (invoice.next_payment_attempt !== null) return

  const subId = getInvoiceSubId(invoice)
  if (!subId) return

  const lab = await findLabBySubscription(supabase, subId)
  if (!lab) return

  await supabase
    .from('laboratori')
    .update({ stripe_subscription_status: 'past_due' })
    .eq('id', lab.id)

  await transitionLabStato(supabase, lab.id, 'sospeso', 'stripe_webhook', stripeOpts(event))
}

export async function handleSubscriptionDeleted(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription

  const lab = await findLabBySubscription(supabase, subscription.id)
  if (!lab) return

  await supabase
    .from('laboratori')
    .update({ stripe_subscription_status: 'canceled' })
    .eq('id', lab.id)

  await transitionLabStato(supabase, lab.id, 'scaduto', 'stripe_webhook', stripeOpts(event))
}

export async function handleSubscriptionUpdated(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription

  const lab = await findLabBySubscription(supabase, subscription.id)
  if (!lab) return

  // Aggiorna sempre lo status Stripe canonico + price ID corrente
  await supabase
    .from('laboratori')
    .update({
      stripe_subscription_status: subscription.status,
      stripe_price_id: subscription.items.data[0]?.price.id ?? null,
    })
    .eq('id', lab.id)

  // Reactive: se Stripe torna active e il lab era sospeso, ripristina
  if (subscription.status === 'active' && lab.stato === 'sospeso') {
    await transitionLabStato(supabase, lab.id, 'attivo', 'stripe_webhook', stripeOpts(event))
  }
}
