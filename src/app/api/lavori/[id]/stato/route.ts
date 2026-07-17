import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
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

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard

  const svc = getServiceClient()

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

  const result = await transizioneLavoro(svc, id, context.laboratorioId, nuovoStato)

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
    .eq('laboratorio_id', context.laboratorioId)
    .single()

  return NextResponse.json({ lavoro: updated })
}
