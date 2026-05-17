// src/app/api/pec/test/route.ts
// Verifica la configurazione PEC del laboratorio.
//
// V1: valida che email e provider SMTP siano configurati correttamente.
//     Non testa la connessione SMTP reale (richiede credenziali da Vault — V2).
//
// V2: usa nodemailer/smtp client con password decifrata da Supabase Vault
//     per inviare un messaggio di prova all'indirizzo PEC del laboratorio stesso.

import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { detectPecProvider } from '@/lib/pec/providers'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function POST(req: Request): Promise<NextResponse> {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, message: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Non autenticato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ ok: false, message: 'Laboratorio non trovato' }, { status: 404 })
  }
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json(
      { ok: false, message: 'Solo il titolare può testare la PEC' },
      { status: 403 }
    )
  }

  const { data: lab } = await svc
    .from('laboratori')
    .select('pec, pec_smtp_configurata')
    .eq('id', utente.laboratorio_id as string)
    .single()

  if (!lab?.pec) {
    return NextResponse.json(
      { ok: false, message: 'PEC non configurata. Vai su Impostazioni e inserisci le credenziali PEC.' },
      { status: 400 }
    )
  }

  if (!(lab.pec_smtp_configurata as boolean)) {
    return NextResponse.json(
      { ok: false, message: 'PEC non ancora configurata. Salva le credenziali prima di eseguire il test.' },
      { status: 400 }
    )
  }

  const detected = detectPecProvider(lab.pec as string)
  if (!detected) {
    return NextResponse.json({
      ok: false,
      message:
        'Provider PEC non supportato automaticamente. Usa la configurazione SMTP avanzata e ricontatta il supporto se il problema persiste.',
    }, { status: 400 })
  }

  // V1: test strutturale — verifica che provider sia rilevato correttamente.
  // Il test di connessione SMTP reale (V2) richiede le credenziali dal Vault.
  return NextResponse.json({
    ok: true,
    message: `Configurazione strutturale valida. Provider: ${detected.display_name} — ${detected.host}:${detected.port} (${detected.secure ? 'SSL/TLS' : 'STARTTLS'}). Il test di invio reale sarà disponibile in V2 dopo la configurazione del Vault.`,
    provider: {
      display_name: detected.display_name,
      host: detected.host,
      port: detected.port,
      secure: detected.secure,
    },
  })
}
