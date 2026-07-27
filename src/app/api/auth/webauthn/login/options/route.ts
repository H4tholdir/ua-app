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

  // Normalizzazione SERVER-SIDE (28/07/2026). Il confronto sotto è lettera per lettera e il
  // client spedisce l'email come è stata digitata: `Mario@Studio.it`, o lo spazio che la tastiera
  // del telefono aggiunge dopo il suggerimento, davano 404 «Nessuna credenziale registrata» a chi
  // la passkey ce l'ha eccome — e siccome la password continuava a funzionare, sembrava rotta la
  // biometria. Si normalizza qui e non nel client perché il client non è l'unico chiamante
  // possibile. Sicuro: in `auth.users` le email sono tutte minuscole (GoTrue normalizza
  // server-side; misurato il 28/07/2026, 7 su 7), quindi questo non può perdere corrispondenze.
  const emailNorm = email.trim().toLowerCase()

  const svc = getServiceClient()

  // Trova l'utente
  const { data: { users }, error: userErr } = await svc.auth.admin.listUsers()
  if (userErr) return NextResponse.json({ error: 'Errore utente' }, { status: 500 })
  const user = users.find(u => u.email === emailNorm)
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
