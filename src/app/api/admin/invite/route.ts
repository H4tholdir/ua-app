import 'server-only'
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { upsertInvito } from '@/lib/invito/upsert-invito'
import { sendInvitoEmail } from '@/lib/invito/send-invito-email'
import type { RuoloInvito } from '@/lib/invito/ruoli'

const VALID_ROLES: RuoloInvito[] = ['titolare', 'tecnico', 'front_desk', 'admin_rete']

async function verifyAdmin() {
  const context = await getFreshLabContext()
  return context?.ruolo === 'admin_sistema' ? context : null
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const guard = assertLabOperativo(admin, 'POST')
  if (guard) return guard

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
  const result = await upsertInvito(svc, {
    laboratorioId: laboratorio_id,
    email,
    ruolo,
    createdBy: admin.userId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
  const inviteUrl = `${appUrl}/invite/${result.token}`
  const normalizedEmail = email.toLowerCase().trim()

  const emailResult = await sendInvitoEmail({
    email: normalizedEmail,
    labNome: result.labNome,
    ruolo,
    inviteUrl,
  })

  return NextResponse.json({
    success: true,
    invite_url: process.env.NODE_ENV === 'development' ? inviteUrl : undefined,
    email_sent: emailResult.emailSent,
    email_error: emailResult.emailError,
    message: `Invito creato per ${normalizedEmail} in ${result.labNome}`,
  }, { status: 201 })
}
