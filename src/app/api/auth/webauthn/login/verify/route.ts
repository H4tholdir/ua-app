import 'server-only'
import { NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { consumeChallenge } from '@/lib/webauthn/challenge'
import { RP_ID, ALLOWED_ORIGINS } from '@/lib/webauthn/config'

export async function POST(req: Request) {
  const body: { response: AuthenticationResponseJSON; challengeId: string; email: string } = await req.json()
  const { response, challengeId, email } = body

  if (!email || !challengeId || !response) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  const svc = getServiceClient()

  // Trova l'utente
  const { data: { users } } = await svc.auth.admin.listUsers()
  const user = users.find(u => u.email === email)
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  // Recupera la credenziale dal DB
  const { data: cred } = await svc
    .from('webauthn_credentials')
    .select('id, public_key, counter, transports')
    .eq('user_id', user.id)
    .eq('credential_id', response.id)
    .single()

  if (!cred) return NextResponse.json({ error: 'Credenziale non trovata' }, { status: 404 })

  let expectedChallenge: string
  try {
    expectedChallenge = await consumeChallenge(challengeId)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ALLOWED_ORIGINS,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      credential: {
        id: response.id,
        publicKey: Buffer.from(cred.public_key, 'base64'),
        counter: cred.counter,
        transports: (cred.transports ?? []) as never[],
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Verifica fallita: ' + (e as Error).message }, { status: 400 })
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Autenticazione non valida' }, { status: 401 })
  }

  // Aggiorna il counter (anti-replay)
  await svc
    .from('webauthn_credentials')
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq('id', cred.id)

  // Crea sessione Supabase via magic link OTP
  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email!,
  })

  if (linkErr || !linkData.properties?.email_otp) {
    return NextResponse.json({ error: 'Errore creazione sessione' }, { status: 500 })
  }

  return NextResponse.json({
    verified: true,
    email,
    otp: linkData.properties.email_otp,
  })
}
