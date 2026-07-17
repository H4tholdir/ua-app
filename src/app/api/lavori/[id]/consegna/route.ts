import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { orchestraConsegna } from '@/lib/consegna/orchestrate'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const { id: lavoro_id } = await params

  // Verifica che il lavoro appartenga al lab dell'utente (guard cross-tenant)
  const supabaseService = getServiceClient()
  const { data: lavoro } = await supabaseService
    .from('lavori')
    .select('id')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

  const result = await orchestraConsegna(lavoro_id, context.laboratorioId)

  return NextResponse.json(result, {
    status: result.ok ? 200 : 422,
  })
}
