import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function GET() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const { data: lab, error } = await svc
    .from('laboratori')
    .select(`
      id,
      nome,
      ragione_sociale,
      partita_iva,
      codice_fiscale,
      indirizzo,
      cap,
      citta,
      provincia,
      telefono,
      email,
      pec,
      logo_url,
      logo_print_url,
      codice_itca,
      srn_eudamed,
      prrc_nome,
      prrc_qualifica,
      firma_ddc_url,
      sfondo_ddc_url,
      intestazione_ddc,
      intestazione_fattura,
      intestazione_buono,
      regime_fiscale,
      codice_iva_default,
      pec_smtp_configurata,
      piano,
      created_at,
      updated_at
    `)
    .eq('id', utente.laboratorio_id)
    .single()

  if (error || !lab) {
    return NextResponse.json({ error: error?.message ?? 'Laboratorio non trovato' }, { status: 500 })
  }

  // Non esponiamo pec_vault_key_id né password PEC
  return NextResponse.json({ laboratorio: lab })
}

export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // Solo titolare può modificare impostazioni lab
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato — ruolo insufficiente' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Blocca campi non modificabili via API
  const BLOCKED = [
    'id',
    'piano',
    'stato',
    'trial_ends_at',
    'stripe_customer_id',
    'stripe_subscription_id',
    'pec_vault_key_id',       // Gestita solo tramite admin
    'pec_password',           // Non esiste in DB — blocca per sicurezza
    'created_at',
    'deleted_at',
  ]
  for (const field of BLOCKED) {
    delete body[field]
  }

  body.updated_at = new Date().toISOString()

  const { data: lab, error: updateError } = await svc
    .from('laboratori')
    .update(body)
    .eq('id', utente.laboratorio_id)
    .select('id, nome, updated_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ laboratorio: lab })
}
