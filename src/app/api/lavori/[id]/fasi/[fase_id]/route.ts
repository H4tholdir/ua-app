import { NextRequest, NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string; fase_id: string }> }

const ALLOWED_FIELDS = [
  'esito',
  'eseguita_at',
  'note',
  'materiali_usati',
  'valore_misurato',
  'non_conforme',
  'azione_correttiva',
] as const

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const { id: lavoro_id, fase_id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nessun campo aggiornabile fornito' }, { status: 400 })
  }

  const { data, error } = await svc
    .from('lavori_fasi')
    .update(updates)
    .eq('id', fase_id)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json(data)
}
