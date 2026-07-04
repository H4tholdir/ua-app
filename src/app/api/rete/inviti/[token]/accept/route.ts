import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getServerUserClient } from '@/lib/supabase/server-user'
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

  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('ruolo')
    .eq('id', user.id)
    .single()

  if (utente?.ruolo !== 'titolare' && utente?.ruolo !== 'admin_rete') {
    return NextResponse.json(
      { error: 'Solo il titolare del laboratorio può accettare questo invito' },
      { status: 403 }
    )
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data, error } = await svc.rpc('accept_invito_rete_atomic', {
    p_token_hash: tokenHash,
    p_user_id: user.id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data.ok) {
    return NextResponse.json({ error: data.error }, { status: 422 })
  }

  return NextResponse.json({ rete_id: data.rete_id })
}
