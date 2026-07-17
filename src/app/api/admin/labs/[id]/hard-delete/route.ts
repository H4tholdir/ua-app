import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (context.ruolo !== 'admin_sistema') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { confirm_nome?: string }
  const svc = getServiceClient()

  const { data: lab } = await svc
    .from('laboratori').select('nome, stato').eq('id', id).single()

  if (!lab) return NextResponse.json({ error: 'Lab non trovato' }, { status: 404 })

  if (!body.confirm_nome || body.confirm_nome.trim() !== lab.nome.trim()) {
    return NextResponse.json({
      error: `Nome non corrisponde. Digita esattamente: "${lab.nome}"`,
    }, { status: 400 })
  }

  const { data, error } = await svc.rpc('admin_delete_laboratorio', { p_lab_id: id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
