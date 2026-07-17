import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'

// GET /api/qualita/rischi
// Lista analisi rischi per tipo dispositivo, ordine tipo_dispositivo ASC
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

    const svc = getServiceClient()
    const { data, error } = await svc
      .from('rischi_tipo_dispositivo')
      .select(
        'id, tipo_dispositivo, rischi_json, rischi_residui, misure_controllo, data_ultima_revisione, versione, updated_at'
      )
      .eq('laboratorio_id', context.laboratorioId)
      .order('tipo_dispositivo', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ rischi: data ?? [] })
  })
}

// POST /api/qualita/rischi
// Upsert su unique (laboratorio_id, tipo_dispositivo)
export async function POST(req: Request) {
  // CSRF check
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.tipo_dispositivo || typeof body.tipo_dispositivo !== 'string' || !body.tipo_dispositivo.trim()) {
    return NextResponse.json({ error: 'Campo "tipo_dispositivo" obbligatorio' }, { status: 422 })
  }

  const upsertData = {
    laboratorio_id: utente.laboratorio_id,
    tipo_dispositivo: (body.tipo_dispositivo as string).trim(),
    rischi_json: body.rischi_json ?? [],
    norme_json: body.norme_json ?? [],
    rischi_residui: body.rischi_residui ?? null,
    misure_controllo: body.misure_controllo ?? null,
    data_ultima_revisione: body.data_ultima_revisione ?? new Date().toISOString().slice(0, 10),
    versione: body.versione ?? 1,
  }

  const { data: result, error: upsertError } = await svc
    .from('rischi_tipo_dispositivo')
    .upsert(upsertData, {
      onConflict: 'laboratorio_id,tipo_dispositivo',
    })
    .select('id, tipo_dispositivo, versione, data_ultima_revisione')
    .single()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ rischio: result }, { status: 200 })
}
