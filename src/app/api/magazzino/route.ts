import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'

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

    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    const { data, error } = await svc
      .from('magazzino')
      .select(`
        id,
        codice_articolo,
        nome,
        produttore,
        categoria,
        sotto_categoria,
        um_acquisto,
        um_scarico,
        scorta_attuale,
        scorta_minima,
        dispositivo_medico,
        traccia_lotto,
        codice_ce,
        costo_unitario,
        attivo,
        fornitore:fornitori(id, ragione_sociale)
      `)
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('nome', { ascending: true })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flag alert scorta
    const articoli = (data ?? []).map((a) => ({
      ...a,
      scorta_alert: a.scorta_attuale < a.scorta_minima,
    }))

    return NextResponse.json({ articoli })
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

  if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ error: 'Il campo "nome" è obbligatorio' }, { status: 422 })
  }
  if (!body.codice_articolo || typeof body.codice_articolo !== 'string') {
    return NextResponse.json({ error: 'Il campo "codice_articolo" è obbligatorio' }, { status: 422 })
  }

  const insertData = {
    laboratorio_id: labId,
    codice_articolo: (body.codice_articolo as string).trim(),
    nome: (body.nome as string).trim(),
    produttore: body.produttore ?? null,
    categoria: body.categoria ?? null,
    sotto_categoria: body.sotto_categoria ?? null,
    fornitore_id: body.fornitore_id ?? null,
    um_acquisto: body.um_acquisto ?? 'pz',
    um_scarico: body.um_scarico ?? 'pz',
    quantita_per_confezione: body.quantita_per_confezione ?? 1,
    costo_unitario: body.costo_unitario ?? null,
    prezzo_unitario: body.prezzo_unitario ?? null,
    scorta_attuale: body.scorta_attuale ?? 0,
    scorta_minima: body.scorta_minima ?? 0,
    dispositivo_medico: body.dispositivo_medico ?? false,
    traccia_lotto: body.traccia_lotto ?? false,
    codice_ce: body.codice_ce ?? null,
    scheda_tecnica_url: body.scheda_tecnica_url ?? null,
    scheda_sicurezza_url: body.scheda_sicurezza_url ?? null,
    attivo: true,
  }

  const { data: articolo, error: insertError } = await svc
    .from('magazzino')
    .insert(insertData)
    .select('id, codice_articolo, nome, scorta_attuale, scorta_minima')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Esiste già un articolo con questo codice in magazzino' }, { status: 409 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ articolo }, { status: 201 })
}
