import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

interface RouteContext {
  params: Promise<{ id: string }>
}

// SOLO titolare — si sta sbloccando manualmente un lock anti-doppio-invio
// fiscale sulla base di una verifica umana fuori dal sistema.
const RUOLI_SBLOCCA_CLAIM = ['titolare'] as const

// ─── POST /api/fatture/[id]/sblocca-claim ─────────────────────────────────
// Sblocco titolare-only del claim anti-doppio-invio PEC (src/lib/fattura/
// invio-claim.ts: smtp_inviata_at usato come lock atomico da claimInvioPec).
// Un claim ORFANO è una fattura 'generata' con smtp_inviata_at valorizzato
// ma senza prova d'invio (crash del processo tra claim e invio reale — vedi
// il commento su invio-claim.ts). NON è sicuro sbloccarlo senza aver
// verificato a mano nella cartella «inviata» della casella PEC che la mail
// NON sia partita: per questo il body richiede una conferma esplicita,
// oltre al motivo (audit, CHECK a livello DB su fatture_sdi_eventi — Task 2).
export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
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
  if (!RUOLI_SBLOCCA_CLAIM.includes(utente.ruolo as (typeof RUOLI_SBLOCCA_CLAIM)[number])) {
    return NextResponse.json({ error: 'Ruolo non autorizzato allo sblocco del claim' }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id
  const { id: fatturaId } = await params

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    // body assente/non JSON → trattato come campi mancanti sotto (fail-closed).
  }

  const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : ''
  if (!motivo) {
    return NextResponse.json({ error: 'Motivo obbligatorio' }, { status: 422 })
  }
  if (body.verificata_cartella_inviata !== true) {
    return NextResponse.json(
      {
        error:
          'Conferma esplicita obbligatoria — verifica la cartella «inviata» della casella PEC prima di sbloccare (verificata_cartella_inviata: true)',
      },
      { status: 422 }
    )
  }

  const { data: fattura } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi, smtp_inviata_at')
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!fattura) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  if (fattura.stato_sdi !== 'generata' || !fattura.smtp_inviata_at) {
    return NextResponse.json(
      { error: 'Fattura non in claim orfano — nessuno sblocco necessario' },
      { status: 409 }
    )
  }

  // Audit operatore: CHI ha sbloccato il claim (pattern invia-pec, righe ~94-100).
  console.log('[SBLOCCA-CLAIM] sblocco', {
    fatturaId,
    numero: fattura.numero,
    labId,
    userId: user.id,
  })

  const { data: updateRows, error: updateErr } = await svc
    .from('fatture')
    .update({ smtp_inviata_at: null })
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .eq('stato_sdi', 'generata')
    .not('smtp_inviata_at', 'is', null)
    .select('id')

  if (updateErr) {
    console.error('[SBLOCCA-CLAIM] update fallito (Postgres):', updateErr)
    return NextResponse.json({ error: 'Errore durante lo sblocco — riprova' }, { status: 500 })
  }
  if (!updateRows || updateRows.length === 0) {
    return NextResponse.json(
      { error: 'Fattura non più in claim orfano — ricarica e riprova' },
      { status: 409 }
    )
  }

  const { error: insertErr } = await svc.from('fatture_sdi_eventi').insert({
    laboratorio_id: labId,
    fattura_id: fatturaId,
    origine: 'sblocco_claim',
    motivo,
    registrato_da: user.id,
  })

  if (insertErr) {
    console.error('[SBLOCCA-CLAIM] insert evento fallito (Postgres):', insertErr)
    return NextResponse.json({ error: 'Errore durante la registrazione audit — riprova' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
