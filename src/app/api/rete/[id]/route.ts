import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { verifyAdminRete } from '@/lib/rete/verify-admin-rete'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params
  const ctx = await verifyAdminRete(id)
  if (!ctx) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ error: 'Campo "nome" obbligatorio' }, { status: 422 })
  }

  const svc = getServiceClient()
  const { data: rete, error } = await svc
    .from('reti')
    .update({ nome: (body.nome as string).trim() })
    .eq('id', id)
    .select('id, nome')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rete })
}
