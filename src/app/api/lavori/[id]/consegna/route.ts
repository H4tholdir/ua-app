import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { orchestraConsegna } from '@/lib/consegna/orchestrate'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const supabase = await getServerUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: lavoro_id } = await params

  // Verifica che il lavoro appartenga al lab dell'utente (guard cross-tenant)
  const supabaseService = getServiceClient()
  const { data: utente } = await supabaseService
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const { data: lavoro } = await supabaseService
    .from('lavori')
    .select('id')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

  const result = await orchestraConsegna(lavoro_id, utente.laboratorio_id)

  return NextResponse.json(result, {
    status: result.ok ? 200 : 422,
  })
}
