import 'server-only'
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { stripe } from '@/lib/stripe/server'
import { isSameOrigin } from '@/lib/utils/csrf'

async function verifyAdmin() {
  const context = await getFreshLabContext()
  return context?.ruolo === 'admin_sistema' ? context : null
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
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

  // Anti-trial-abuse: blocca P.IVA già con abbonamento trial/attivo.
  // Fast-path applicativo — il backstop reale è l'indice UNIQUE parziale
  // laboratori_partita_iva_attivi_key (stato IN ('trial','attivo') AND
  // deleted_at IS NULL), che protegge dalla race tra due richieste
  // concorrenti che superano entrambe questo check prima che l'altra abbia
  // completato l'insert.
  const { data: existing } = await svc
    .from('laboratori')
    .select('id')
    .eq('partita_iva', partita_iva)
    .in('stato', ['trial', 'attivo'])
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'P.IVA già registrata con abbonamento attivo' },
      { status: 409 }
    )
  }

  // Insert PRIMA della creazione del cliente Stripe: se la richiesta perde
  // la race sul vincolo UNIQUE (23505), nessun cliente Stripe orfano viene
  // creato per una richiesta che finirà comunque rifiutata.
  const { data: lab, error: labErr } = await svc
    .from('laboratori')
    .insert({
      nome,
      ragione_sociale: ragione_sociale ?? nome,
      partita_iva,
      codice_itca: codice_itca ?? null,
      stato: 'trial',
      piano: 'lab',
    })
    .select()
    .single()

  if (labErr) {
    if (labErr.code === '23505') {
      return NextResponse.json(
        { error: 'P.IVA già registrata con abbonamento attivo' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: labErr.message }, { status: 500 })
  }

  const customer = await stripe.customers.create({
    email: email_titolare,
    name: ragione_sociale ?? nome,
    metadata: { partita_iva, laboratorio_id: lab.id },
  })

  const { data: labConStripe, error: updateErr } = await svc
    .from('laboratori')
    .update({ stripe_customer_id: customer.id })
    .eq('id', lab.id)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json(labConStripe, { status: 201 })
}

// PATCH /api/admin/labs/[id] — update lab fields (trial_ends_at, anagrafica)
// Note: this is on the collection route; the [id] variant handles stato transitions.
// We also export a general PATCH for direct field updates.
