import 'server-only'
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

async function verifyAdmin() {
  const context = await getFreshLabContext()
  return context?.ruolo === 'admin_sistema' ? context : null
}

// DELETE /api/admin/invites/[id] — revoke a pending invite
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const guard = assertLabOperativo(admin, 'DELETE')
  if (guard) return guard

  const { id } = await params
  const svc = getServiceClient()

  // Mark as accepted (soft delete) to prevent use without deleting audit trail
  const { error } = await svc
    .from('inviti')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', id)
    .is('accepted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
