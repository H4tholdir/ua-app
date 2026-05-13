import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { stripe } from '@/lib/stripe/server'

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

// GET — lista tutti i laboratori (più recenti prima)
export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const svc = getServiceClient()
  const { data, error } = await svc
    .from('laboratori')
    .select('id, nome, ragione_sociale, partita_iva, stato, piano, trial_ends_at, stripe_subscription_status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — crea nuovo laboratorio (con Stripe customer)
export async function POST(req: Request) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })

  const { nome, ragione_sociale, partita_iva, email_titolare, codice_itca } = body

  if (!nome || !partita_iva || !email_titolare) {
    return NextResponse.json(
      { error: 'Campi obbligatori: nome, partita_iva, email_titolare' },
      { status: 400 }
    )
  }

  const svc = getServiceClient()

  // Anti-trial-abuse: blocca P.IVA già con abbonamento trial/attivo
  const { data: existing } = await svc
    .from('laboratori')
    .select('id')
    .eq('partita_iva', partita_iva)
    .in('stato', ['trial', 'attivo'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'P.IVA già registrata con abbonamento attivo' },
      { status: 409 }
    )
  }

  const customer = await stripe.customers.create({
    email: email_titolare,
    name: ragione_sociale ?? nome,
    metadata: { partita_iva },
  })

  const { data: lab, error: labErr } = await svc
    .from('laboratori')
    .insert({
      nome,
      ragione_sociale: ragione_sociale ?? nome,
      partita_iva,
      codice_itca: codice_itca ?? null,
      stato: 'trial',
      piano: 'lab',
      stripe_customer_id: customer.id,
    })
    .select()
    .single()

  if (labErr) return NextResponse.json({ error: labErr.message }, { status: 500 })
  return NextResponse.json(lab, { status: 201 })
}
