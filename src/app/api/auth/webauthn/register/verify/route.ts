import 'server-only'
import { NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { consumeChallenge } from '@/lib/webauthn/challenge'
import { RP_ID, ALLOWED_ORIGINS } from '@/lib/webauthn/config'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // N11: getFreshLabContext filtra deleted_at — chiude l'enrollment WebAuthn
  // per utenti soft-deleted (riserva appsec 3, spec R2 §6).
  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body: { response: RegistrationResponseJSON; challengeId: string; deviceName?: string } = await req.json()
  const { response, challengeId, deviceName } = body

  let expectedChallenge: string
  try {
    expectedChallenge = await consumeChallenge(challengeId)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ALLOWED_ORIGINS,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Verifica fallita: ' + (e as Error).message }, { status: 400 })
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verifica non passata' }, { status: 400 })
  }

  const { credential, credentialDeviceType } = verification.registrationInfo

  const svc = getServiceClient()
  const { error } = await svc.from('webauthn_credentials').insert({
    user_id: context.userId,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
    transports: response.response.transports ?? [],
    device_name: deviceName ?? credentialDeviceType ?? 'Dispositivo',
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Credenziale già registrata' }, { status: 409 })
    return NextResponse.json({ error: 'Errore salvataggio' }, { status: 500 })
  }

  return NextResponse.json({ verified: true })
}
