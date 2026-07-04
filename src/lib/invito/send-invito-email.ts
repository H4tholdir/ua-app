import 'server-only'
import { Resend } from 'resend'
import type { RuoloInvito } from './ruoli'
import { escapeHtml } from '@/lib/utils/escape-html'

export interface SendInvitoEmailParams {
  email: string
  labNome: string
  ruolo: RuoloInvito
  inviteUrl: string
}

export interface SendInvitoEmailResult {
  emailSent: boolean
  emailError?: string
}

export async function sendInvitoEmail(params: SendInvitoEmailParams): Promise<SendInvitoEmailResult> {
  const { email, labNome, ruolo, inviteUrl } = params

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('INCOLLA_QUI')) {
    console.warn('[invito] RESEND_API_KEY non configurata — email non inviata')
    return { emailSent: false, emailError: 'RESEND_API_KEY non configurata' }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromAddress = process.env.EMAIL_FROM ?? 'noreply@uachelab.com'
    const labNomeSafe = escapeHtml(labNome)
    const ruoloSafe = escapeHtml(ruolo)
    const inviteUrlSafe = escapeHtml(inviteUrl)
    const { error } = await resend.emails.send({
      from: `UÀ <${fromAddress}>`,
      to: email,
      subject: `Sei invitato in UÀ — ${labNome}`,
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F5F2EF; border-radius: 16px;">
          <h2 style="font-size: 22px; font-weight: 800; color: #1C1916; margin: 0 0 16px;">Sei invitato in UÀ</h2>
          <p style="font-size: 15px; color: #4A4845; line-height: 1.6; margin: 0 0 12px;">
            Sei stato invitato come <strong>${ruoloSafe}</strong> nel laboratorio <strong>${labNomeSafe}</strong>.
          </p>
          <p style="font-size: 14px; color: #4A4845; line-height: 1.6; margin: 0 0 24px;">
            Clicca il pulsante per accettare l'invito e configurare il tuo account.
          </p>
          <a href="${inviteUrlSafe}" style="display: inline-block; padding: 14px 28px; background: #D90012; color: #fff; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 700;">
            Accetta l'invito →
          </a>
          <p style="font-size: 12px; color: #4A3D33; margin: 24px 0 0; line-height: 1.5;">
            Il link scade tra 7 giorni. Se non hai richiesto questo invito, ignora questa email.<br/>
            UÀ — Dalla prescrizione alla consegna, tutto in un tap.
          </p>
        </div>
      `,
    })
    if (error) {
      console.error('[invito] email failed:', error.message)
      return { emailSent: false, emailError: error.message }
    }
    return { emailSent: true }
  } catch (err) {
    const emailError = err instanceof Error ? err.message : 'Errore invio email'
    console.error('[invito] email exception:', emailError)
    return { emailSent: false, emailError }
  }
}
