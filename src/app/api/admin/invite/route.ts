import 'server-only'
import { NextResponse } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { Resend } from 'resend'

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
  const inviteUrl = `${appUrl}/invite/${token}`

  // Invia email di invito via Resend
  let emailError: string | null = null
  if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('INCOLLA_QUI')) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromAddress = process.env.EMAIL_FROM ?? 'noreply@uachelab.com'
      const { error: sendErr } = await resend.emails.send({
        from: `UÀ <${fromAddress}>`,
        to: normalizedEmail,
        subject: `Sei invitato in UÀ — ${lab.nome}`,
        html: `
          <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F5F2EF; border-radius: 16px;">
            <h2 style="font-size: 22px; font-weight: 800; color: #1C1916; margin: 0 0 16px;">Sei invitato in UÀ</h2>
            <p style="font-size: 15px; color: #4A4845; line-height: 1.6; margin: 0 0 12px;">
              Sei stato invitato come <strong>${ruolo}</strong> nel laboratorio <strong>${lab.nome}</strong>.
            </p>
            <p style="font-size: 14px; color: #4A4845; line-height: 1.6; margin: 0 0 24px;">
              Clicca il pulsante per accettare l'invito e configurare il tuo account.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 14px 28px; background: #D90012; color: #fff; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 700;">
              Accetta l'invito →
            </a>
            <p style="font-size: 12px; color: #4A3D33; margin: 24px 0 0; line-height: 1.5;">
              Il link scade tra 72 ore. Se non hai richiesto questo invito, ignora questa email.<br/>
              UÀ — Dalla prescrizione alla consegna, tutto in un tap.
            </p>
          </div>
        `,
      })
      if (sendErr) {
        emailError = sendErr.message
        console.error('[invite] email failed:', sendErr.message)
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Errore invio email'
      console.error('[invite] email exception:', emailError)
    }
  } else {
    console.warn('[invite] RESEND_API_KEY non configurata — email non inviata')
  }

  return NextResponse.json({
    success: true,
    invite_url: process.env.NODE_ENV === 'development' ? inviteUrl : undefined,
    email_sent: !emailError,
    email_error: emailError ?? undefined,
    message: `Invito creato per ${normalizedEmail} in ${lab.nome}`,
  }, { status: 201 })
}
