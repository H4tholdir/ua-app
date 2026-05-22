import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = getServiceClient()
  const { data: caller } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!caller?.laboratorio_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (caller.ruolo !== 'titolare' && caller.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Solo il titolare può disattivare un tecnico' }, { status: 403 })
  }

  // Recupera utente_id (FK → auth.users) dal record tecnici
  const { data: tecnico } = await svc
    .from('tecnici')
    .select('utente_id, laboratorio_id')
    .eq('id', id)
    .eq('laboratorio_id', caller.laboratorio_id)
    .single()

  if (!tecnico) return NextResponse.json({ error: 'Tecnico non trovato' }, { status: 404 })
  if (!tecnico.utente_id) {
    return NextResponse.json({ error: 'Tecnico non ancora registrato — non ha ancora accesso' }, { status: 400 })
  }

  // Sicurezza: non puoi disattivare te stesso
  if (tecnico.utente_id === user.id) {
    return NextResponse.json({ error: 'Non puoi disattivare il tuo account' }, { status: 400 })
  }

  const { error } = await svc
    .from('lab_memberships')
    .update({ attivo: false }, { count: 'exact' })
    .eq('user_id', tecnico.utente_id)
    .eq('laboratorio_id', caller.laboratorio_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
