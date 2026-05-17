// src/app/api/pec/config/route.ts
// Salva la configurazione PEC del laboratorio.
//
// V1: persiste email + pec_smtp_configurata=true.
//     La password viene ricevuta ma NON persistita in chiaro.
//     In V2 la password verrà cifrata via Supabase Vault (pgsodium)
//     e il vault_key_id verrà salvato in laboratori.pec_vault_key_id.
//
// Richiede ruolo titolare o admin_rete.

import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { savePecConfig } from '@/lib/pec/config'
import { isSameOrigin } from '@/lib/utils/csrf'

interface PecConfigBody {
  email: string
  password: string
  smtp_host?: string
  smtp_port?: number
  smtp_secure?: boolean
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Non autenticato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ ok: false, error: 'Laboratorio non trovato' }, { status: 404 })
  }
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json(
      { ok: false, error: 'Solo il titolare può configurare la PEC' },
      { status: 403 }
    )
  }

  let body: PecConfigBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON non valido' }, { status: 400 })
  }

  const { email, password, smtp_host, smtp_port, smtp_secure } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ ok: false, error: 'Campo email obbligatorio' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 1) {
    return NextResponse.json({ ok: false, error: 'Campo password obbligatorio' }, { status: 400 })
  }

  // Salva email + smtp metadata (senza password in chiaro)
  const result = await savePecConfig(svc, utente.laboratorio_id as string, {
    email,
    smtp_host,
    smtp_port,
    smtp_secure,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 })
  }

  // TODO (V2): cifrare `password` con pgsodium vault.secrets e salvare
  // vault_key_id in laboratori.pec_vault_key_id — mai persistire in chiaro.
  // La password non viene mai loggata né esposta nella risposta.

  // V1: password ricevuta ma non persistita — in V2 va in Supabase Vault.
  // Non usare la password nel log, non includerla nella risposta.
  return NextResponse.json({
    ok: true,
    provider: result.smtpConfig
      ? {
          display_name: result.smtpConfig.display_name,
          host: result.smtpConfig.host,
          port: result.smtpConfig.port,
          secure: result.smtpConfig.secure,
        }
      : { display_name: 'Configurazione manuale', host: smtp_host, port: smtp_port, secure: smtp_secure },
    // Messaggio onesto: le credenziali non sono ancora operative.
    message:
      'Indirizzo PEC e provider salvati. Le credenziali saranno attive dopo la configurazione del Vault (V2) — il supporto UÀ completa il setup.',
  })
}
