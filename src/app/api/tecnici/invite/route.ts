import 'server-only'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { verifyTitolare } from '@/lib/invito/verify-titolare'
import { upsertInvito } from '@/lib/invito/upsert-invito'
import { sendInvitoEmail } from '@/lib/invito/send-invito-email'
import { listInvitiPendenti } from '@/lib/invito/list-inviti-pendenti'
import { isRuoloInvitabileDaTitolare } from '@/lib/invito/ruoli'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const titolare = await verifyTitolare()
  if (!titolare) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.ruolo) {
    return NextResponse.json({ error: 'Campi obbligatori: email, ruolo' }, { status: 400 })
  }
  if (!isRuoloInvitabileDaTitolare(body.ruolo)) {
    return NextResponse.json(
      { error: 'Ruolo non valido. Valori: tecnico, front_desk, titolare' },
      { status: 400 }
    )
  }

  // laboratorio_id è SEMPRE quello del chiamante (mai letto dal body — anti tenant-leak)
  const svc = getServiceClient()
  const result = await upsertInvito(svc, {
    laboratorioId: titolare.laboratorioId,
    email: body.email,
    ruolo: body.ruolo,
    createdBy: titolare.userId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
  const inviteUrl = `${appUrl}/invite/${result.token}`
  const normalizedEmail = String(body.email).toLowerCase().trim()

  const emailResult = await sendInvitoEmail({
    email: normalizedEmail,
    labNome: result.labNome,
    ruolo: body.ruolo,
    inviteUrl,
  })

  return NextResponse.json({
    success: true,
    email_sent: emailResult.emailSent,
    email_error: emailResult.emailError,
    message: `Invito creato per ${normalizedEmail}`,
  }, { status: 201 })
}

export async function GET() {
  const titolare = await verifyTitolare()
  if (!titolare) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const svc = getServiceClient()
  const inviti = await listInvitiPendenti(svc, titolare.laboratorioId)
  return NextResponse.json({ inviti })
}
