import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const origin = req.headers.get('origin') ?? ''
  const host   = req.headers.get('host') ?? ''
  if (!origin.includes(host.split(':')[0])) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = getServiceClient()
  const { data: me } = await svc
    .from('utenti').select('ruolo').eq('id', user.id).single()
  if (me?.ruolo !== 'admin_sistema') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { confirm_nome?: string }

  const { data: lab } = await svc
    .from('laboratori').select('nome, stato').eq('id', id).single()

  if (!lab) return NextResponse.json({ error: 'Lab non trovato' }, { status: 404 })

  // Blocca se il lab contiene utenti admin_sistema (impossibile eliminare senza rompere FK)
  const { data: adminUsers } = await svc
    .from('utenti')
    .select('id')
    .eq('laboratorio_id', id)
    .eq('ruolo', 'admin_sistema')
    .limit(1)

  if (adminUsers && adminUsers.length > 0) {
    return NextResponse.json({
      error: 'Impossibile eliminare: il laboratorio contiene utenti admin_sistema. Rimuovi prima gli utenti di sistema.',
    }, { status: 409 })
  }

  if (!body.confirm_nome || body.confirm_nome.trim() !== lab.nome.trim()) {
    return NextResponse.json({
      error: `Nome non corrisponde. Digita esattamente: "${lab.nome}"`,
    }, { status: 400 })
  }

  const { data, error } = await svc.rpc('admin_delete_laboratorio', { p_lab_id: id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
