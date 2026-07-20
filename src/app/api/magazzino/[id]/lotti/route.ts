import { NextResponse } from 'next/server'
import { oggiRomaISO } from '@/lib/utils/data-roma'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

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
    // Verifica che l'articolo appartenga al laboratorio
    const { data: articolo } = await svc
      .from('magazzino')
      .select('id')
      .eq('id', id)
      .eq('laboratorio_id', labId)
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
      .eq('laboratorio_id', labId)
      .order('data_acquisto', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ lotti: data ?? [] })
  })
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params

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
  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard
  const svc = getServiceClient()

  // Verifica che l'articolo appartenga al laboratorio
  const { data: articolo } = await svc
    .from('magazzino')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
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
    laboratorio_id: context.laboratorioId,
    magazzino_id: id,
    numero_lotto: (body.numero_lotto as string).trim(),
    quantita_acquistata: body.quantita_acquistata as number,
    quantita_residua: body.quantita_residua ?? body.quantita_acquistata,
    costo_acquisto: body.costo_acquisto ?? null,
    data_acquisto: body.data_acquisto ?? null,
    data_scadenza: body.data_scadenza ?? null,
    data_ricezione: body.data_ricezione ?? oggiRomaISO(),
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
