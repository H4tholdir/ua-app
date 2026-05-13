import 'server-only'
import { NextResponse } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

const VALID_ROLES = ['titolare', 'tecnico', 'front_desk', 'admin_rete'] as const

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })

  const { laboratorio_id, email, ruolo } = body

  if (!laboratorio_id || !email || !ruolo) {
    return NextResponse.json(
      { error: 'Campi obbligatori: laboratorio_id, email, ruolo' },
      { status: 400 }
    )
  }

  if (!VALID_ROLES.includes(ruolo)) {
    return NextResponse.json({ error: `Ruolo non valido. Valori: ${VALID_ROLES.join(', ')}` }, { status: 400 })
  }

  const svc = getServiceClient()

  const { data: lab } = await svc
    .from('laboratori')
    .select('stato, nome')
    .eq('id', laboratorio_id)
    .single()

  if (!lab) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 404 })

  if (['blacklist', 'scaduto'].includes(lab.stato)) {
    return NextResponse.json(
      { error: 'Impossibile invitare utenti in un lab inattivo' },
      { status: 403 }
    )
  }

  const token = randomUUID()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const normalizedEmail = email.toLowerCase().trim()

  const { error } = await svc.from('inviti').insert({
    token_hash: tokenHash,
    laboratorio_id,
    email: normalizedEmail,
    ruolo,
    created_by: admin.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const inviteUrl = `${appUrl}/invite/${token}`

  // TODO Task 16: invia via Resend — per ora URL in risposta per test manuale
  return NextResponse.json({
    success: true,
    invite_url: process.env.NODE_ENV === 'development' ? inviteUrl : undefined,
    message: `Invito creato per ${normalizedEmail} in ${lab.nome}`,
  }, { status: 201 })
}
