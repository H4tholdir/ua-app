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

  // Allowlist esplicita — solo questi campi sono modificabili via API
  const ALLOWED: (keyof typeof body)[] = [
    'nome', 'ragione_sociale', 'partita_iva', 'codice_fiscale',
    'indirizzo', 'cap', 'citta', 'provincia',
    'telefono', 'email', 'pec',
    'codice_itca', 'srn_eudamed',
    'prrc_nome', 'prrc_qualifica',
    'regime_fiscale', 'codice_iva_default',
    'intestazione_ddc', 'intestazione_fattura', 'intestazione_buono',
    'logo_url', 'logo_print_url', 'firma_ddc_url', 'sfondo_ddc_url',
    'onboarding_completato',
  ]

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of ALLOWED) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length <= 1) {
    return NextResponse.json({ error: 'Nessun campo valido da aggiornare' }, { status: 400 })
  }

  const { data: lab, error: updateError } = await svc
    .from('laboratori')
    .update(updateData)
    .eq('id', utente.laboratorio_id)
    .select('id, nome, updated_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ laboratorio: lab })
}
