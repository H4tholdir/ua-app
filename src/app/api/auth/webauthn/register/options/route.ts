import 'server-only'
import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { storeChallenge } from '@/lib/webauthn/challenge'
import { RP_ID, RP_NAME } from '@/lib/webauthn/config'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // N11: getFreshLabContext filtra deleted_at — chiude l'enrollment WebAuthn
  // per utenti soft-deleted (riserva appsec 3, spec R2 §6).
  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const svc = getServiceClient()

  // Recupera credenziali già registrate per escluderle
  const { data: existingCreds } = await svc
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('user_id', context.userId)

  const displayName = `${context.nome ?? ''} ${context.cognome ?? ''}`.trim()

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(context.userId),
    userName: context.email!,
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

  const challengeId = await storeChallenge(options.challenge, context.userId)

  return NextResponse.json({ options, challengeId })
}
