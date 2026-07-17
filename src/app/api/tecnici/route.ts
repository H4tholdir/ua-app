import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
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
      .from('tecnici')
      .select('id, nome, cognome, sigla, qualifica, numero_albo, prrc, tipo_compenso, compenso_base')
      .eq('laboratorio_id', labId)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tecnici: data ?? [] })
  })
}

export async function POST(req: Request) {
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

  const labId: string = utente.laboratorio_id

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ error: 'Il campo "nome" è obbligatorio' }, { status: 422 })
  }
  if (!body.cognome || typeof body.cognome !== 'string' || !body.cognome.trim()) {
    return NextResponse.json({ error: 'Il campo "cognome" è obbligatorio' }, { status: 422 })
  }

  const insertData = {
    laboratorio_id: labId,
    nome: (body.nome as string).trim(),
    cognome: (body.cognome as string).trim(),
    sigla: body.sigla ?? null,
    qualifica: body.qualifica ?? null,
    numero_albo: body.numero_albo ?? null,
    prrc: body.prrc ?? false,
    utente_id: body.utente_id ?? null,
    tipo_compenso: body.tipo_compenso ?? null,
    compenso_base: body.compenso_base ?? null,
  }

  const { data: tecnico, error: insertError } = await svc
    .from('tecnici')
    .insert(insertData)
    .select('id, nome, cognome, sigla, qualifica, prrc')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ tecnico }, { status: 201 })
}
