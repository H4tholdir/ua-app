import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Auth
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard

  const svc = getServiceClient()

  // Verifica che il lavoro appartenga al lab
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // Segna come risolta
  const { error, count: risolviUpdateCount } = await svc
    .from('lavori')
    .update({ segnalazione_risolta: true }, { count: 'exact' })
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)

  if (error) {
    console.error('[PATCH /api/lavori/[id]/segnala/risolvi] error:', error)
    return NextResponse.json({ error: 'Errore durante il salvataggio' }, { status: 500 })
  }

  if (risolviUpdateCount === 0) {
    return NextResponse.json({ error: 'Lavoro non trovato nel laboratorio corrente' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
