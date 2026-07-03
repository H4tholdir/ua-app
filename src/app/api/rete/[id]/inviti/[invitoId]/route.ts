import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { verifyAdminRete } from '@/lib/rete/verify-admin-rete'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; invitoId: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id, invitoId } = await params
  const ctx = await verifyAdminRete(id)
  if (!ctx) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const svc = getServiceClient()
  const { data: invito } = await svc
    .from('inviti_rete')
    .select('id')
    .eq('id', invitoId)
    .eq('rete_id', id)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .maybeSingle()

  if (!invito) {
    return NextResponse.json({ error: 'Invito non trovato' }, { status: 404 })
  }

  const { error } = await svc
    .from('inviti_rete')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitoId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
