import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const q = searchParams.get('q')

  // Authenticate via user client — get session
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // Resolve laboratorio_id via service client (bypasses RLS)
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

  let query = svc
    .from('lavori')
    .select(`
      id,
      numero_lavoro,
      stato,
      priorita,
      tipo_dispositivo,
      descrizione,
      data_consegna_prevista,
      ora_consegna,
      paziente_nome_snapshot,
      conformato,
      incluso_in_fattura,
      spedizione_stato,
      spedizione_tracking,
      cliente:clienti(id, nome, cognome, studio_nome, telefono),
      tecnico:tecnici(id, nome, cognome, sigla)
    `)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .order('data_consegna_prevista', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200)

  if (stato) {
    query = query.eq('stato', stato)
  }

  if (q) {
    query = query.ilike('descrizione', `%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lavori: data ?? [] })
}

export async function POST(req: Request) {
  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  // Authenticate
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

  const labId: string = utente.laboratorio_id

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Validazione server-side campi obbligatori
  if (!body.cliente_id || typeof body.cliente_id !== 'string') {
    return NextResponse.json({ error: 'cliente_id obbligatorio' }, { status: 422 })
  }
  if (!body.tipo_dispositivo || typeof body.tipo_dispositivo !== 'string') {
    return NextResponse.json({ error: 'tipo_dispositivo obbligatorio' }, { status: 422 })
  }
  if (!body.descrizione || typeof body.descrizione !== 'string') {
    return NextResponse.json({ error: 'descrizione obbligatoria' }, { status: 422 })
  }
  if (!body.data_consegna_prevista || typeof body.data_consegna_prevista !== 'string') {
    return NextResponse.json({ error: 'data_consegna_prevista obbligatoria' }, { status: 422 })
  }

  // Validate FK tenant ownership BEFORE generating progressivo
  // (avoids burning sequence numbers on rejected requests)
  const FK_FIELDS_INSERT: { field: string; table: string }[] = [
    { field: 'cliente_id', table: 'clienti' },
    { field: 'paziente_id', table: 'pazienti' },
    { field: 'tecnico_id', table: 'tecnici' },
  ]
  const fkCandidates: Record<string, unknown> = {
    cliente_id: body.cliente_id,
    paziente_id: body.paziente_id ?? null,
    tecnico_id: body.tecnico_id ?? null,
  }
  for (const { field, table } of FK_FIELDS_INSERT) {
    const fkId = fkCandidates[field]
    if (fkId && typeof fkId === 'string') {
      const { data: fkRow } = await svc
        .from(table)
        .select('laboratorio_id')
        .eq('id', fkId)
        .is('deleted_at', null)
        .single()
      if (!fkRow || fkRow.laboratorio_id !== labId) {
        return NextResponse.json(
          { error: `${field} non appartiene a questo laboratorio` },
          { status: 403 }
        )
      }
    }
  }

  // Genera progressivo numero lavoro (race-safe via DB function)
  const anno = new Date().getFullYear()
  const { data: progressivo, error: rpcError } = await svc.rpc('genera_progressivo', {
    p_laboratorio_id: labId,
    p_tipo: 'lavoro',
    p_anno: anno,
  })

  if (rpcError || progressivo == null) {
    return NextResponse.json(
      { error: `Impossibile generare numero lavoro: ${rpcError?.message ?? 'null'}` },
      { status: 500 }
    )
  }

  const numero_lavoro = `${anno}/${String(progressivo).padStart(4, '0')}`

  // Build insert payload — whitelist safe fields from body
  const insertData = {
    laboratorio_id: labId,
    numero_lavoro,
    anno_lavoro: anno,
    stato: 'ricevuto' as const,
    tipo_dispositivo: body.tipo_dispositivo,
    descrizione: body.descrizione,
    data_consegna_prevista: body.data_consegna_prevista,
    ora_consegna: body.ora_consegna ?? null,
    richiedente_nome: body.richiedente_nome ?? null,
    priorita: body.priorita ?? 'normale',
    dispositivo_semilavorato: body.dispositivo_semilavorato ?? false,
    note_interne: body.note_interne ?? null,
    cliente_id: body.cliente_id,
    paziente_id: body.paziente_id ?? null,
    tecnico_id: body.tecnico_id ?? null,
    classe_rischio: body.classe_rischio ?? 'classe_i',
    da_conformare: body.da_conformare ?? true,
    codice_iva: body.codice_iva ?? 'N4',
    natura_iva: body.natura_iva ?? 'N4',
    data_ingresso: new Date().toISOString().split('T')[0],
  }

  const { data: lavoro, error: insertError } = await svc
    .from('lavori')
    .insert(insertData)
    .select('id, numero_lavoro, stato')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ lavoro }, { status: 201 })
}
