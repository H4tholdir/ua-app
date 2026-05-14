import 'server-only'
import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { storeChallenge } from '@/lib/webauthn/challenge'
import { RP_ID, RP_NAME } from '@/lib/webauthn/config'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('nome, cognome').eq('id', user.id).single()

  // Recupera credenziali già registrate per escluderle
  const { data: existingCreds } = await svc
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('user_id', user.id)

  const displayName = utente ? `${utente.nome ?? ''} ${utente.cognome ?? ''}`.trim() : user.email!

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email!,
    userDisplayName: displayName,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'required',
    },
    excludeCredentials: (existingCreds ?? []).map(c => ({
      id: c.credential_id,
      transports: (c.transports ?? []) as never[],
    })),
  })

  const challengeId = await storeChallenge(options.challenge, user.id)

  return NextResponse.json({ options, challengeId })
}
