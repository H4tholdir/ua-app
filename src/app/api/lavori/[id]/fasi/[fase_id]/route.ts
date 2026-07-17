import { NextRequest, NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
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

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard

  const labId: string = context.laboratorioId
  const svc = getServiceClient()

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

  // tecnico_id non è mai fidato dal client: si risolve qui, dal record `tecnici`
  // collegato all'utente loggato, solo quando si sta registrando un esito
  // (altrimenti non tocchiamo l'assegnazione già presente sulla riga).
  if ('esito' in updates && updates.esito != null) {
    const { data: tecnico } = await svc
      .from('tecnici')
      .select('id')
      .eq('utente_id', context.userId)
      .eq('laboratorio_id', labId)
      .single()
    if (tecnico?.id) {
      updates.tecnico_id = tecnico.id
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nessun campo aggiornabile fornito' }, { status: 400 })
  }

  const { data, error } = await svc
    .from('lavori_fasi')
    .update(updates)
    .eq('id', fase_id)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json(data)
}
