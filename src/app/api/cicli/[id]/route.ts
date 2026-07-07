import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { TIPO_DISPOSITIVO_CICLO_OPTIONS, CLASSE_RISCHIO_CICLO_OPTIONS } from '@/lib/domain/cicli-produzione'

type RouteContext = { params: Promise<{ id: string }> }

const PATCH_ALLOWLIST = ['nome', 'codice', 'tipo_dispositivo', 'classe_rischio', 'attivo'] as const

export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (utenteError) {
    return NextResponse.json({ error: 'Errore nel recupero del laboratorio' }, { status: 500 })
  }
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

  const payload: Record<string, unknown> = {}
  for (const field of PATCH_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field]
    }
  }

  if (typeof payload.nome === 'string') payload.nome = payload.nome.trim()
  if (typeof payload.codice === 'string') payload.codice = payload.codice.trim()
  if (typeof payload.tipo_dispositivo === 'string') payload.tipo_dispositivo = payload.tipo_dispositivo.trim()

  if (Object.prototype.hasOwnProperty.call(payload, 'tipo_dispositivo')) {
    if (!(TIPO_DISPOSITIVO_CICLO_OPTIONS as readonly string[]).includes(payload.tipo_dispositivo as string)) {
      return NextResponse.json({ error: 'Tipo dispositivo non valido' }, { status: 400 })
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'classe_rischio') && payload.classe_rischio != null) {
    if (!(CLASSE_RISCHIO_CICLO_OPTIONS as readonly string[]).includes(payload.classe_rischio as string)) {
      return NextResponse.json({ error: 'Classe di rischio non valida' }, { status: 400 })
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'attivo') && typeof payload.attivo !== 'boolean') {
    return NextResponse.json({ error: 'Il campo "attivo" deve essere booleano' }, { status: 400 })
  }

  payload.updated_by = user.id

  const { data: ciclo, error: updateError } = await svc
    .from('cicli_produzione')
    .update(payload)
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .select('id, codice, nome, tipo_dispositivo, classe_rischio, attivo')
    .single()

  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json({ error: 'Esiste già un ciclo con questo codice in questo laboratorio' }, { status: 409 })
    }
    if (updateError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Ciclo non trovato' }, { status: 404 })
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ciclo })
}
