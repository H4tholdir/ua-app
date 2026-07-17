import 'server-only'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { stripe } from '@/lib/stripe/server'
import { isPriceAllowed } from '@/lib/stripe/products'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

async function getUserAndLab() {
  const context = await getFreshLabContext()
  if (!context || !context.laboratorioId) return null

  const svc = getServiceClient()
  const { data: lab } = await svc
    .from('laboratori')
    .select('id, nome, stato, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, partita_iva')
    .eq('id', context.laboratorioId)
    .single()

  return lab ? { user: { email: context.email, id: context.userId }, lab } : null
}

// GET /api/stripe/checkout?price=price_xxx
// Called from billing page <a href> — creates session and redirects to Stripe
export async function GET(req: NextRequest) {
  const ctx = await getUserAndLab()
  if (!ctx) return NextResponse.redirect(new URL('/login', APP_URL))

  const { user, lab } = ctx

  if (lab.stato === 'blacklist') return NextResponse.redirect(new URL('/blocked', APP_URL))

  const priceId = req.nextUrl.searchParams.get('price')
  if (!priceId || !isPriceAllowed(priceId)) {
    return NextResponse.redirect(new URL('/billing?error=invalid_plan', APP_URL))
  }

  // Block if already active subscription
  if (
    lab.stripe_subscription_id &&
    ['active', 'trialing'].includes(lab.stripe_subscription_status ?? '')
  ) {
    return NextResponse.redirect(new URL('/dashboard', APP_URL))
  }

  // Create or reuse Stripe customer
  const svc = getServiceClient()
  let customerId = lab.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: lab.nome,
      metadata: {
        laboratorio_id: lab.id,
        partita_iva: lab.partita_iva ?? '',
      },
    })
    customerId = customer.id
    await svc
      .from('laboratori')
      .update({ stripe_customer_id: customerId })
      .eq('id', lab.id)
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${APP_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}/billing?checkout=cancelled`,
      client_reference_id: lab.id,
      metadata: { laboratorio_id: lab.id },
      subscription_data: {
        metadata: { laboratorio_id: lab.id },
      },
      payment_method_collection: 'always',
    })
    return NextResponse.redirect(session.url!)
  } catch (err) {
    console.error('[checkout] Stripe error:', err)
    return NextResponse.redirect(new URL('/billing?error=checkout_unavailable', APP_URL))
  }
}
