import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { sendFatturaPEC } from '@/lib/fattura/send-pec'
import {
  RUOLI_INVIO_PEC,
  claimInvioPec,
  releaseInvioPec,
  messaggioStatoNonInviabile,
} from '@/lib/fattura/invio-claim'

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── POST /api/fatture/[id]/invia-pec ─────────────────────────────────────────
// Invia a SdI (sdi01@pec.fatturapa.it) l'XML GIÀ CONGELATO di una fattura in
// stato 'generata' — TD01 mai partita/PEC fallita (N9) o TD04 (N10). Nessuna
// rigenerazione XML, nessun progressivo consumato. Spec 2026-07-15 rev.2.
export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (!RUOLI_INVIO_PEC.includes(utente.ruolo as (typeof RUOLI_INVIO_PEC)[number])) {
    return NextResponse.json({ error: "Ruolo non autorizzato all'invio fiscale" }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id
  const { id: fatturaId } = await params

  const { data: fattura } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi, xml_storage_path, nome_file_xml, tipo_documento, laboratorio:laboratori(pec_smtp_configurata)')
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!fattura) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  if (fattura.stato_sdi !== 'generata') {
    return NextResponse.json(
      { error: messaggioStatoNonInviabile(fattura.stato_sdi, fattura.tipo_documento) },
      { status: 409 }
    )
  }

  if (!fattura.xml_storage_path || !fattura.nome_file_xml) {
    return NextResponse.json(
      { error: 'XML congelato mancante — rigenerare la fattura' },
      { status: 422 }
    )
  }

  // Precheck PEC pre-claim (la UI disabilita già il bottone; qui per caller API diretti).
  const lab = Array.isArray(fattura.laboratorio) ? fattura.laboratorio[0] : fattura.laboratorio
  if (lab?.pec_smtp_configurata !== true) {
    return NextResponse.json(
      { error: 'PEC non configurata — configurala nelle Impostazioni' },
      { status: 422 }
    )
  }

  const { claimed, error: claimErr } = await claimInvioPec(svc, fatturaId, labId)
  if (claimErr) {
    console.error('[INVIA-PEC] claim fallito (Postgres):', claimErr)
    return NextResponse.json({ error: "Errore durante l'invio — riprova" }, { status: 500 })
  }
  if (!claimed) {
    return NextResponse.json({ error: 'Invio già in corso o già effettuato' }, { status: 409 })
  }

  // Audit operatore: CHI ha scatenato l'atto fiscale (nessuna migration → log strutturato).
  console.log('[INVIA-PEC] invio', {
    fatturaId,
    numero: fattura.numero,
    labId,
    userId: user.id,
    ruolo: utente.ruolo,
  })

  try {
    await sendFatturaPEC(fatturaId)
  } catch (err) {
    // Dettaglio (host SMTP, Vault, Postgres) SOLO nei log server.
    console.error('[INVIA-PEC] invio fallito:', err)
    await releaseInvioPec(svc, fatturaId, labId)
    return NextResponse.json(
      { error: 'Invio PEC fallito — riprova o verifica la configurazione PEC' },
      { status: 502 }
    )
  }

  // Re-fetch: riflette lo stato REALE anche nel ramo degradato (mail partita ma
  // UPDATE interno di send-pec fallito → resta 'generata'+claim; tap successivo → 409).
  const { data: aggiornata } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi, inviata_at, pec_message_id')
    .eq('id', fatturaId)
    .single()

  return NextResponse.json({ fattura: aggiornata })
}
