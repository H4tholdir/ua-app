import 'server-only'
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

async function verifyAdmin() {
  const context = await getFreshLabContext()
  return context?.ruolo === 'admin_sistema' ? context : null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body?.laboratorio_id || typeof body.laboratorio_id !== 'string') {
    return NextResponse.json({ error: 'Campo "laboratorio_id" obbligatorio' }, { status: 422 })
  }

  const svc = getServiceClient()
  const labId = body.laboratorio_id as string

  const { data: reteTarget } = await svc.from('reti').select('id').eq('id', id).maybeSingle()
  if (!reteTarget) {
    return NextResponse.json({ error: 'Rete non trovata' }, { status: 404 })
  }

  const { data: gia } = await svc
    .from('reti')
    .select('id')
    .eq('admin_laboratorio_id', labId)
    .maybeSingle()

  if (gia) {
    return NextResponse.json(
      { error: "Il laboratorio amministra già un'altra rete" },
      { status: 409 }
    )
  }

  const { data: giaMembro } = await svc
    .from('reti_membri')
    .select('rete_id')
    .eq('laboratorio_id', labId)
    .maybeSingle()

  if (giaMembro) {
    return NextResponse.json(
      { error: "Il laboratorio è già membro di un'altra rete" },
      { status: 409 }
    )
  }

  const { error } = await svc.from('reti_membri').insert({
    rete_id: id,
    laboratorio_id: labId,
    ruolo: 'membro',
    aggiunto_da_admin: admin.userId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
