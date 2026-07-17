import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { token } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json(
      { error: 'Solo il titolare del laboratorio può accettare questo invito' },
      { status: 403 }
    )
  }
  const svc = getServiceClient()

  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data, error } = await svc.rpc('accept_invito_rete_atomic', {
    p_token_hash: tokenHash,
    p_user_id: context.userId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data.ok) {
    return NextResponse.json({ error: data.error }, { status: 422 })
  }

  return NextResponse.json({ rete_id: data.rete_id })
}
