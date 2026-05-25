import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import type { StatoLavoro } from '@/types/domain'
import { transizioneLavoro, TRANSIZIONI_CONSENTITE } from '@/lib/lavori/transizioni'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: RouteContext) {
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

  let body: { stato: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const nuovoStato = body.stato as StatoLavoro
  if (!nuovoStato) {
    return NextResponse.json({ error: 'Campo "stato" obbligatorio' }, { status: 422 })
  }

  const result = await transizioneLavoro(svc, id, utente.laboratorio_id, nuovoStato)

  if (!result.ok) {
    const statusCode = result.status === 409 ? 422 : result.status
    const extra = result.status === 409
      ? { consentiti: TRANSIZIONI_CONSENTITE[nuovoStato] ?? [] }
      : {}
    return NextResponse.json({ error: result.error, ...extra }, { status: statusCode })
  }

  const { data: updated } = await svc
    .from('lavori')
    .select('id, numero_lavoro, stato, updated_at')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()

  return NextResponse.json({ lavoro: updated })
}
