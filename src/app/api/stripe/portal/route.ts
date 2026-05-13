import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { stripe } from '@/lib/stripe/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

// GET /api/stripe/portal
// Called from billing page <a href> — redirects to Stripe Customer Portal
export async function GET() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', APP_URL))

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente) return NextResponse.redirect(new URL('/login?error=no_lab', APP_URL))

  const { data: lab } = await svc
    .from('laboratori')
    .select('stato, stripe_customer_id')
    .eq('id', utente.laboratorio_id)
    .single()

  if (!lab || lab.stato === 'blacklist') {
    return NextResponse.redirect(new URL('/blocked', APP_URL))
  }

  // No Stripe customer yet → send to plan selection
  if (!lab.stripe_customer_id) {
    return NextResponse.redirect(new URL('/billing', APP_URL))
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: lab.stripe_customer_id,
    return_url: `${APP_URL}/dashboard`,
  })

  return NextResponse.redirect(session.url)
}
