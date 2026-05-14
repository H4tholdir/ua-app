import 'server-only'
import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { storeChallenge } from '@/lib/webauthn/challenge'
import { RP_ID } from '@/lib/webauthn/config'

export async function POST(req: Request) {
  const body: { email: string } = await req.json()
  const { email } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email mancante' }, { status: 400 })
  }

  const svc = getServiceClient()

  // Trova l'utente
  const { data: { users }, error: userErr } = await svc.auth.admin.listUsers()
  if (userErr) return NextResponse.json({ error: 'Errore utente' }, { status: 500 })
  const user = users.find(u => u.email === email)
  if (!user) {
    // Non rivelare se l'email esiste o meno — rispondi normalmente
    return NextResponse.json({ error: 'Nessuna credenziale registrata' }, { status: 404 })
  }

  const { data: creds } = await svc
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('user_id', user.id)

  if (!creds || creds.length === 0) {
    return NextResponse.json({ error: 'Nessuna credenziale registrata' }, { status: 404 })
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: creds.map(c => ({
      id: c.credential_id,
      transports: (c.transports ?? []) as never[],
    })),
  })

  const challengeId = await storeChallenge(options.challenge, user.id)

  return NextResponse.json({ options, challengeId })
}
