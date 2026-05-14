import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

// ─── GET /api/fatture ─────────────────────────────────────────────────────────
// Lista fatture con join cliente, ordinate per data DESC, max 100
export async function GET() {
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

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

  const labId: string = utente.laboratorio_id

  const { data, error } = await svc
    .from('fatture')
    .select(
      `
      id,
      numero,
      anno,
      progressivo,
      data,
      tipo_documento,
      stato_sdi,
      imponibile,
      totale,
      bollo,
      iva_importo,
      nome_file_xml,
      xml_url,
      inviata_via,
      inviata_at,
      note,
      cliente:clienti(
        id,
        nome,
        cognome,
        studio_nome,
        partita_iva,
        codice_sdi
      )
    `
    )
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .order('data', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ fatture: data ?? [] })
}

// ─── POST /api/fatture ────────────────────────────────────────────────────────
// Crea fattura manuale (richiede CSRF + auth)
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

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

  const labId: string = utente.laboratorio_id

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.cliente_id) {
    return NextResponse.json({ error: 'cliente_id obbligatorio' }, { status: 400 })
  }

  // Genera progressivo fattura
  const anno = new Date().getFullYear()
  const { data: progressivo, error: rpcError } = await svc.rpc('genera_progressivo', {
    p_laboratorio_id: labId,
    p_tipo: 'fattura',
    p_anno: anno,
  })

  if (rpcError || progressivo == null) {
    return NextResponse.json(
      { error: `Impossibile generare numero fattura: ${rpcError?.message ?? 'null'}` },
      { status: 500 }
    )
  }

  const numero = `${anno}/${String(progressivo).padStart(4, '0')}`
  const oggi = new Date().toISOString().split('T')[0]

  const insertData = {
    laboratorio_id: labId,
    cliente_id: body.cliente_id,
    numero,
    anno,
    progressivo,
    data: (body.data as string) ?? oggi,
    tipo_documento: (body.tipo_documento as string) ?? 'TD01',
    stato_sdi: 'draft',
    imponibile: (body.imponibile as number) ?? 0,
    iva_percentuale: 0,
    iva_importo: 0,
    bollo: 0,
    totale: (body.totale as number) ?? 0,
    codice_iva: 'N4',
    natura_iva: 'N4',
    note: (body.note as string) ?? null,
    // Snapshot cliente — il chiamante deve fornire questi dati
    cliente_denominazione: (body.cliente_denominazione as string) ?? '',
    cliente_piva: (body.cliente_piva as string) ?? null,
    cliente_cf: (body.cliente_cf as string) ?? null,
    cliente_indirizzo: (body.cliente_indirizzo as string) ?? '',
    cliente_codice_sdi: (body.cliente_codice_sdi as string) ?? null,
    cliente_pec: (body.cliente_pec as string) ?? null,
  }

  const { data: fattura, error: insertError } = await svc
    .from('fatture')
    .insert(insertData as Record<string, unknown>)
    .select('id, numero, stato_sdi, data')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ fattura }, { status: 201 })
}
