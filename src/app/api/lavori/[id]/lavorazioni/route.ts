import { NextRequest, NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const { id: lavoro_id } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const svc = getServiceClient()

  let rows: Array<{
    codice: string
    descrizione: string
    quantita: number
    unita_misura: string
    prezzo_unitario: number
    sconto_percentuale: number
    importo: number
    codice_iva: string
    natura_iva: string
    ordine: number
    listino_id?: string | null
  }>

  try {
    rows = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Verifica che il lavoro appartenga al lab corrente
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, laboratorio_id, incluso_in_fattura')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  if (lavoro.incluso_in_fattura) {
    return NextResponse.json(
      { error: 'Lavoro già fatturato — lavorazioni non modificabili' },
      { status: 409 }
    )
  }

  // Soft-delete delle lavorazioni esistenti
  await svc
    .from('lavori_lavorazioni')
    .update({ deleted_at: new Date().toISOString() })
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)

  if (rows.length === 0) {
    return NextResponse.json([])
  }

  // Insert nuove lavorazioni — solo colonne presenti nello schema DB
  const { data: inserted, error } = await svc
    .from('lavori_lavorazioni')
    .insert(
      rows.map(r => ({
        laboratorio_id: lavoro.laboratorio_id,
        lavoro_id,
        listino_id: r.listino_id ?? null,
        codice: r.codice,
        descrizione: r.descrizione,
        quantita: r.quantita,
        unita_misura: r.unita_misura,
        prezzo_unitario: r.prezzo_unitario,
        sconto_percentuale: r.sconto_percentuale,
        importo: r.importo,
        codice_iva: r.codice_iva ?? 'N4',
        natura_iva: r.natura_iva ?? 'N4',
        ordine: r.ordine,
      }))
    )
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(inserted)
}
