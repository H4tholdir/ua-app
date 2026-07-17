import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!context.laboratorioId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Solo il titolare può disattivare un tecnico' }, { status: 403 })
  }
  const svc = getServiceClient()

  // Recupera utente_id (FK → auth.users) dal record tecnici
  const { data: tecnico } = await svc
    .from('tecnici')
    .select('utente_id, laboratorio_id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .single()

  if (!tecnico) return NextResponse.json({ error: 'Tecnico non trovato' }, { status: 404 })
  if (!tecnico.utente_id) {
    return NextResponse.json({ error: 'Tecnico non ancora registrato — non ha ancora accesso' }, { status: 400 })
  }

  // Sicurezza: non puoi disattivare te stesso
  if (tecnico.utente_id === context.userId) {
    return NextResponse.json({ error: 'Non puoi disattivare il tuo account' }, { status: 400 })
  }

  const { error } = await svc
    .from('lab_memberships')
    .update({ attivo: false }, { count: 'exact' })
    .eq('user_id', tecnico.utente_id)
    .eq('laboratorio_id', context.laboratorioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
