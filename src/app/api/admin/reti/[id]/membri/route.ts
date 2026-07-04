import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return null
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
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

  const { data: gia } = await svc
    .from('reti')
    .select('id')
    .eq('admin_laboratorio_id', labId)
    .maybeSingle()

  const { data: giaMembro } = await svc
    .from('reti_membri')
    .select('rete_id')
    .eq('laboratorio_id', labId)
    .maybeSingle()

  if (gia || giaMembro) {
    return NextResponse.json(
      { error: "Il laboratorio è già in un'altra rete" },
      { status: 409 }
    )
  }

  const { error } = await svc.from('reti_membri').insert({
    rete_id: id,
    laboratorio_id: labId,
    ruolo: 'membro',
    aggiunto_da_admin: admin.id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
