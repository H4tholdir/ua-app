import 'server-only'
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { stripe } from '@/lib/stripe/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

// GET /api/stripe/portal
// Called from billing page <a href> — redirects to Stripe Customer Portal
export async function GET() {
  // N11: context null copre sia "non autenticato" sia "profilo soft-deleted"
  // (fail-closed getFreshLabContext) — entrambi → /login, coerente col
  // trattamento di un utente non attendibile. /login?error=no_lab resta
  // per il caso distinto "profilo trovato ma senza laboratorio assegnato".
  const context = await getFreshLabContext()
  if (!context) return NextResponse.redirect(new URL('/login', APP_URL))
  if (!context.laboratorioId) return NextResponse.redirect(new URL('/login?error=no_lab', APP_URL))

  const svc = getServiceClient()

  const { data: lab } = await svc
    .from('laboratori')
    .select('stato, stripe_customer_id')
    .eq('id', context.laboratorioId)
    .single()

  if (!lab || lab.stato === 'blacklist') {
    return NextResponse.redirect(new URL('/blocked', APP_URL))
  }

  // No Stripe customer yet → send to plan selection
  if (!lab.stripe_customer_id) {
    return NextResponse.redirect(new URL('/billing', APP_URL))
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: lab.stripe_customer_id,
      return_url: `${APP_URL}/dashboard`,
    })
    return NextResponse.redirect(session.url)
  } catch (err) {
    console.error('[portal] Stripe error:', err)
    return NextResponse.redirect(new URL('/billing?error=portal_unavailable', APP_URL))
  }
}
