import 'server-only'
import { NextResponse } from 'next/server'
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

// PATCH /api/impostazioni/pec — salva host/port/user + password in vault
export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const labId = await getLabId(user.id)
  if (!labId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let body: { pec_host?: string; pec_port?: number; pec_user?: string; pec_password?: string; pec_sdi_address?: string } | null = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  if (!body) return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  const svc = getServiceClient()

  // Aggiorna campi non-sensibili tramite allowlist
  const updateFields: Record<string, unknown> = {}
  if (body.pec_host !== undefined) updateFields.pec_host = body.pec_host || null
  if (body.pec_port !== undefined) updateFields.pec_port = body.pec_port || null
  if (body.pec_user !== undefined) updateFields.pec_user = body.pec_user || null
  if (body.pec_sdi_address !== undefined) {
    const trimmed = body.pec_sdi_address.trim()
    if (trimmed === '') {
      updateFields.pec_sdi_address = null
    } else if (/^sdi\d{2}@pec\.fatturapa\.it$/.test(trimmed)) {
      updateFields.pec_sdi_address = trimmed
    } else {
      return NextResponse.json({ error: 'pec_sdi_address non valido: formato atteso sdiNN@pec.fatturapa.it' }, { status: 400 })
    }
  }

  if (Object.keys(updateFields).length > 0) {
    const { error } = await svc.from('laboratori').update(updateFields).eq('id', labId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Salva password in Vault se fornita
  if (body.pec_password) {
    const { error } = await svc.rpc('upsert_pec_vault_secret', {
      p_lab_id: labId,
      p_password: body.pec_password,
    })
    if (error) return NextResponse.json({ error: 'Errore salvataggio password: ' + error.message }, { status: 500 })
  }

  // Aggiorna flag pec_smtp_configurata
  const { data: lab } = await svc.from('laboratori')
    .select('pec_host, pec_port, pec_user, pec_vault_key_id').eq('id', labId).single()
  if (lab) {
    const configured = !!(lab.pec_host && lab.pec_port && lab.pec_user && lab.pec_vault_key_id)
    await svc.from('laboratori').update({ pec_smtp_configurata: configured }).eq('id', labId)
  }

  return NextResponse.json({ success: true })
}

// POST /api/impostazioni/pec — invia email di test SMTP
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const labId = await getLabId(user.id)
  if (!labId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const svc = getServiceClient()
  const { data: lab } = await svc.from('laboratori')
    .select('pec_host, pec_port, pec_user, pec_vault_key_id, pec').eq('id', labId).single()

  if (!lab?.pec_host || !lab?.pec_port || !lab?.pec_user || !lab?.pec_vault_key_id) {
    return NextResponse.json({ error: 'PEC non configurata. Compila tutti i campi prima.' }, { status: 400 })
  }

  const { data: secret } = await svc.rpc('get_pec_vault_secret', { p_lab_id: labId })
  if (!secret) return NextResponse.json({ error: 'Password PEC non trovata nel vault.' }, { status: 400 })

  try {
    const transporter = nodemailer.createTransport({
      host: lab.pec_host,
      port: lab.pec_port,
      secure: lab.pec_port === 465,
      auth: { user: lab.pec_user, pass: secret as string },
    })
    await transporter.verify()
    await transporter.sendMail({
      from: lab.pec_user,
      to: lab.pec ?? lab.pec_user,
      subject: 'UÀ — Test PEC',
      text: 'Configurazione PEC verificata con successo. Questo messaggio è stato inviato da UÀ.',
    })
    return NextResponse.json({ success: true, message: 'Email di test inviata correttamente.' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore connessione SMTP'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
