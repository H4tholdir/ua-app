import 'server-only'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getServerUserClient } from '@/lib/supabase/server-user'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || !body.token || !body.nome || !body.cognome) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }
  const { token, nome, cognome } = body as { token: string; nome: string; cognome: string }

  // Must be authenticated at this point (signUp/signIn completed client-side)
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const supabase = getServiceClient()

  const { data: invite } = await supabase
    .from('inviti')
    .select('id, email, ruolo, laboratorio_id, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!invite)            return NextResponse.json({ error: 'Invito non valido' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'Invito già utilizzato' }, { status: 409 })
  if (new Date(invite.expires_at) <= new Date()) {
    return NextResponse.json({ error: 'Invito scaduto' }, { status: 410 })
  }

  // Email must match
  if (user.email?.toLowerCase().trim() !== invite.email.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Email non corrisponde all\'invito' }, { status: 403 })
  }

  // ATOMIC CLAIM — prevents two parallel requests both passing the accepted_at IS NULL check
  const { data: claimedInvite } = await supabase
    .from('inviti')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id')
    .single()

  if (!claimedInvite) {
    return NextResponse.json({ error: 'Invito già accettato o scaduto' }, { status: 409 })
  }

  // Create utenti record
  const { error: utentiErr } = await supabase
    .from('utenti')
    .upsert({
      id: user.id,
      laboratorio_id: invite.laboratorio_id,
      nome,
      cognome,
      email: invite.email,
      ruolo: invite.ruolo,
    }, { onConflict: 'id' })

  if (utentiErr) {
    return NextResponse.json({ error: 'Errore creazione profilo utente' }, { status: 500 })
  }

  // Create membership record
  await supabase.from('lab_memberships').upsert({
    user_id: user.id,
    laboratorio_id: invite.laboratorio_id,
    ruolo: invite.ruolo,
  }, { onConflict: 'user_id,laboratorio_id' })

  return NextResponse.json({ success: true })
}
