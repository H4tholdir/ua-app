import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }

    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    let query = svc
      .from('ordini_fornitori')
      .select(`
        id,
        numero_ordine,
        stato,
        quantita_ordinata,
        unita_misura,
        quantita_ricevuta,
        data_ordine,
        data_consegna_richiesta,
        data_consegna_effettiva,
        note,
        whatsapp_inviato,
        email_inviato,
        created_at,
        fornitore_id,
        magazzino_id
      `)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (stato) {
      query = query.eq('stato', stato)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ordini: data ?? [] })
  })
}

export async function POST(req: Request) {
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
  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Genera numero_ordine progressivo: ORD/YYYY/NNN
  const anno = new Date().getFullYear()
  const { count } = await svc
    .from('ordini_fornitori')
    .select('id', { count: 'exact', head: true })
    .eq('laboratorio_id', labId)
    .like('numero_ordine', `ORD/${anno}/%`)

  const progressivo = (count ?? 0) + 1
  const numeroOrdine = `ORD/${anno}/${String(progressivo).padStart(3, '0')}`

  const insertData = {
    laboratorio_id: labId,
    numero_ordine: numeroOrdine,
    fornitore_id: body.fornitore_id ?? null,
    magazzino_id: body.magazzino_id ?? null,
    stato: 'bozza',
    quantita_ordinata: body.quantita_ordinata ?? null,
    unita_misura: body.unita_misura ?? 'pz',
    data_ordine: new Date().toISOString().split('T')[0],
    data_consegna_richiesta: body.data_consegna_richiesta ?? null,
    note: body.note ?? null,
  }

  const { data: ordine, error: insertError } = await svc
    .from('ordini_fornitori')
    .insert(insertData)
    .select()
    .single()

  if (insertError) {
    // Gestisci race condition numero_ordine duplicato
    if (insertError.code === '23505') {
      const progressivo2 = (count ?? 0) + 2
      const numeroOrdine2 = `ORD/${anno}/${String(progressivo2).padStart(3, '0')}`
      const { data: ordine2, error: insertError2 } = await svc
        .from('ordini_fornitori')
        .insert({ ...insertData, numero_ordine: numeroOrdine2 })
        .select()
        .single()
      if (insertError2) {
        return NextResponse.json({ error: insertError2.message }, { status: 500 })
      }
      return NextResponse.json({ ordine: ordine2 }, { status: 201 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ordine }, { status: 201 })
}
