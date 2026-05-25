import 'server-only'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.token || !body?.nome || !body?.cognome) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }
  const { token, nome, cognome } = body as { token: string; nome: string; cognome: string }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const supabase = getServiceClient()

  // RPC atomica: claim token + verifica lab + provisioning utente in una transazione
  const { data, error } = await supabase.rpc('accept_invite_atomic', {
    p_token_hash: tokenHash,
    p_user_id: user.id,
    p_user_email: user.email ?? '',
    p_nome: nome,
    p_cognome: cognome,
  })

  if (error) {
    console.error('[accept-invite] RPC error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  const result = data as { ok: boolean; error?: string }

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      'Invito non valido, già usato o scaduto': 409,
      'Email non corrisponde': 403,
      'Il laboratorio non è più accessibile': 403,
    }
    const status = statusMap[result.error ?? ''] ?? 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ success: true })
}
