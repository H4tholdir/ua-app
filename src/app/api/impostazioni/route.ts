import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { isPublicStorageUrl } from '@/lib/utils/storage-url'

export async function GET() {
  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }
    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard
    const labId: string = context.laboratorioId

    const svc = getServiceClient()
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
        pec_sdi_address,
        piano,
        created_at,
        updated_at
      `)
      .eq('id', labId)
      .single()

    if (error || !lab) {
      return NextResponse.json({ error: error?.message ?? 'Laboratorio non trovato' }, { status: 500 })
    }

    // Non esponiamo pec_vault_key_id né password PEC
    return NextResponse.json({ laboratorio: lab })
  })
}

export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // Solo titolare può modificare impostazioni lab
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato — ruolo insufficiente' }, { status: 403 })
  }
  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard
  const svc = getServiceClient()

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

  // Review Bundle T (A18): questi URL vengono poi FETCHATI dal server (hash
  // firma DdC, immagini react-pdf in DdcTemplate) — l'allowlist copre il CAMPO,
  // qui si valida il VALORE: solo storage pubblico Supabase del progetto, o null.
  const URL_STORAGE_FIELDS = ['logo_url', 'logo_print_url', 'firma_ddc_url', 'sfondo_ddc_url'] as const
  for (const field of URL_STORAGE_FIELDS) {
    if (field in body && body[field] !== null && !isPublicStorageUrl(body[field])) {
      return NextResponse.json(
        { error: `Il campo "${field}" deve essere un file dello storage UÀ` },
        { status: 422 },
      )
    }
  }

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
    .eq('id', context.laboratorioId)
    .select('id, nome, updated_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ laboratorio: lab })
}
