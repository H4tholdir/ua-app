import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

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

  // Verifica che l'articolo appartenga al laboratorio
  const { data: articolo } = await svc
    .from('magazzino')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()

  if (!articolo) {
    return NextResponse.json({ error: 'Articolo non trovato' }, { status: 404 })
  }

  const { data, error } = await svc
    .from('lotti_magazzino')
    .select(
      'id, numero_lotto, quantita_acquistata, quantita_residua, costo_acquisto, data_acquisto, data_scadenza, data_ricezione, documento_acquisto_url, note, attivo'
    )
    .eq('magazzino_id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .order('data_acquisto', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lotti: data ?? [] })
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params

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
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // Verifica che l'articolo appartenga al laboratorio
  const { data: articolo } = await svc
    .from('magazzino')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()

  if (!articolo) {
    return NextResponse.json({ error: 'Articolo non trovato' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.numero_lotto || typeof body.numero_lotto !== 'string' || !body.numero_lotto.trim()) {
    return NextResponse.json({ error: 'Il campo "numero_lotto" è obbligatorio' }, { status: 422 })
  }
  if (!body.quantita_acquistata || typeof body.quantita_acquistata !== 'number') {
    return NextResponse.json({ error: 'Il campo "quantita_acquistata" è obbligatorio' }, { status: 422 })
  }

  const insertData = {
    laboratorio_id: utente.laboratorio_id,
    magazzino_id: id,
    numero_lotto: (body.numero_lotto as string).trim(),
    quantita_acquistata: body.quantita_acquistata as number,
    quantita_residua: body.quantita_residua ?? body.quantita_acquistata,
    costo_acquisto: body.costo_acquisto ?? null,
    data_acquisto: body.data_acquisto ?? null,
    data_scadenza: body.data_scadenza ?? null,
    data_ricezione: body.data_ricezione ?? new Date().toISOString().split('T')[0],
    documento_acquisto_url: body.documento_acquisto_url ?? null,
    note: body.note ?? null,
    attivo: true,
  }

  const { data: lotto, error: insertError } = await svc
    .from('lotti_magazzino')
    .insert(insertData)
    .select('id, numero_lotto, quantita_acquistata, quantita_residua, data_acquisto')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ lotto }, { status: 201 })
}
