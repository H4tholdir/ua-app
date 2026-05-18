import 'server-only'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import nodemailer from 'nodemailer'

async function getLabId(userId: string): Promise<string | null> {
  const svc = getServiceClient()
  const { data } = await svc.from('utenti').select('laboratorio_id, ruolo').eq('id', userId).single()
  if (!data || !['titolare', 'admin_rete'].includes(data.ruolo ?? '')) return null
  return data.laboratorio_id ?? null
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const labId = await getLabId(user.id)
  if (!labId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let body: {
    pec_host?: string; pec_port?: number; pec_user?: string; pec_password?: string
  } | null = null
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { pec_host, pec_port, pec_user, pec_password } = body ?? {}
  if (!pec_host || !pec_port || !pec_user || !pec_password) {
    return NextResponse.json({ error: 'Tutti i campi SMTP sono obbligatori' }, { status: 422 })
  }

  const svc = getServiceClient()

  // 1. Salva campi non sensibili e resetta verifica precedente
  const { error: updateErr } = await svc.from('laboratori').update({
    pec_host, pec_port, pec_user,
    pec_verificata: false,
    pec_verify_token: null,
  }).eq('id', labId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 2. Salva password in Vault
  const { error: vaultErr } = await svc.rpc('upsert_pec_vault_secret', {
    p_lab_id: labId, p_password: pec_password,
  })
  if (vaultErr) return NextResponse.json({ error: 'Errore salvataggio password: ' + vaultErr.message }, { status: 500 })

  // 3. Testa connessione SMTP
  const transporter = nodemailer.createTransport({
    host: pec_host, port: pec_port,
    secure: pec_port === 465,
    auth: { user: pec_user, pass: pec_password },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  })

  try {
    await transporter.verify()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore connessione'
    return NextResponse.json({ error: msg, phase: 'smtp_connect' }, { status: 422 })
  }

  // 4. Genera token univoco e invia email di verifica
  const token = randomUUID()
  const verifyTo = `verify+${token}@uachelab.com`

  try {
    await transporter.sendMail({
      from: pec_user,
      to: verifyTo,
      subject: `UÀ verify ${token}`,
      text: `Verifica PEC lab ${labId} token ${token}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore invio'
    return NextResponse.json({ error: msg, phase: 'smtp_send' }, { status: 422 })
  }

  // 5. Salva token nel DB
  await svc.from('laboratori').update({ pec_verify_token: token }).eq('id', labId)

  return NextResponse.json({ token, verifyTo })
}
