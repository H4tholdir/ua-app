import 'server-only'
import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServiceClient } from '@/lib/supabase/server-service'
import { verifyTitolare } from '@/lib/invito/verify-titolare'
import { revocaInvito } from '@/lib/invito/revoca-invito'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const titolare = await verifyTitolare()
  if (!titolare) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = await params
  const svc = getServiceClient()
  const result = await revocaInvito(svc, { inviteId: id, laboratorioId: titolare.laboratorioId })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ success: true })
}
