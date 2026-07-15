import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import type { StatoSDI } from '@/types/domain'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Override manuale: SOLO titolare (a differenza dell'invio PEC, dove
// front_desk è ammesso — qui si sta forzando un dato fiscale a mano).
const RUOLI_OVERRIDE_SDI = ['titolare'] as const

// Allowlist ESPLICITA dei nuovi stati raggiungibili via override — MAI
// 'ricevuta_sdi'/'scaduta'/altro: sono esiti intermedi/timeout che il
// sistema deve derivare da una ricevuta reale, non da un click manuale.
const NUOVO_STATO_ALLOWLIST = ['pec_consegnata', 'accettata', 'rifiutata'] as const
type NuovoStatoOverride = (typeof NUOVO_STATO_ALLOWLIST)[number]

function isNuovoStatoOverride(value: unknown): value is NuovoStatoOverride {
  return (
    typeof value === 'string' &&
    (NUOVO_STATO_ALLOWLIST as readonly string[]).includes(value)
  )
}

// Replica client-side di rank_stato_sdi (migration 20260716100000_ricevute_sdi_rpc.sql).
// L'UPDATE qui è diretto (non passa dalla RPC applica_ricevuta_sdi), quindi la
// monotonia stretta va riapplicata anche lato route — fail-closed.
const RANK_STATO_SDI: Record<StatoSDI, number> = {
  draft: 0,
  generata: 1,
  smtp_inviata: 2,
  pec_consegnata: 3,
  ricevuta_sdi: 4,
  scaduta: 5,
  accettata: 6,
  rifiutata: 6,
}

// ─── POST /api/fatture/[id]/stato-sdi-override ────────────────────────────
// Override manuale titolare-only di uno stato SdI quando l'operatore ha
// verificato l'esito reale sul portale SdI/nella PEC ma il sistema non ha
// (ancora) ricevuto/applicato la ricevuta corrispondente (Task 9-11).
// INSERT su fatture_sdi_eventi (Task 2) con origine='override_manuale' e
// motivo obbligatorio (audit — CHECK a livello DB). Un TD04 portato a
// 'rifiutata' fa scattare il trigger di contro-movimento storno (migration
// 20260716091000): richiede conferma esplicita nel body.
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
  if (!RUOLI_OVERRIDE_SDI.includes(utente.ruolo as (typeof RUOLI_OVERRIDE_SDI)[number])) {
    return NextResponse.json({ error: "Ruolo non autorizzato all'override stato SdI" }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id
  const { id: fatturaId } = await params

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    // body assente/non JSON → trattato come campi mancanti sotto (fail-closed).
  }

  const nuovoStato = body.nuovo_stato
  if (!isNuovoStatoOverride(nuovoStato)) {
    return NextResponse.json(
      { error: 'nuovo_stato non valido — valori ammessi: pec_consegnata, accettata, rifiutata' },
      { status: 422 }
    )
  }

  const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : ''
  if (!motivo) {
    return NextResponse.json({ error: 'Motivo obbligatorio' }, { status: 422 })
  }

  const statoAtteso = body.stato_sdi_atteso
  if (typeof statoAtteso !== 'string' || statoAtteso.length === 0) {
    return NextResponse.json({ error: 'stato_sdi_atteso obbligatorio' }, { status: 422 })
  }

  const confermaEffettiStorno = body.conferma_effetti_storno === true
  // importo_storno_visto: confermato dalla UI (payload anti-stale, spec §7),
  // NON persistito — lista_errori è riservato agli errori NS (Array<{codice,
  // descrizione}>: producer ingest-ricevuta.ts, consumer applica_ricevuta_sdi).

  const { data: fattura } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi, tipo_documento')
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!fattura) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  const statoCorrente = fattura.stato_sdi as StatoSDI

  // Anti-stale-read: il chiamante deve aver letto lo stato REALE prima di
  // decidere l'override. L'enforcement definitivo resta comunque l'UPDATE
  // guardato sotto (difesa in profondità contro race tra questa SELECT e
  // l'UPDATE).
  if (statoAtteso !== statoCorrente) {
    return NextResponse.json(
      { error: 'Stato SdI atteso non corrisponde allo stato corrente — ricarica e riprova' },
      { status: 409 }
    )
  }

  if (RANK_STATO_SDI[nuovoStato] <= RANK_STATO_SDI[statoCorrente]) {
    return NextResponse.json(
      { error: 'Transizione non valida — il nuovo stato non è successivo a quello corrente' },
      { status: 409 }
    )
  }

  if (fattura.tipo_documento === 'TD04' && nuovoStato === 'rifiutata' && !confermaEffettiStorno) {
    return NextResponse.json(
      {
        error:
          'Conferma esplicita obbligatoria — il rifiuto di un TD04 annulla gli effetti dello storno (conferma_effetti_storno: true)',
      },
      { status: 422 }
    )
  }

  // Audit operatore: CHI ha forzato la transizione (pattern invia-pec, righe ~94-100).
  console.log('[STATO-SDI-OVERRIDE] override', {
    fatturaId,
    numero: fattura.numero,
    labId,
    userId: user.id,
    statoDa: statoCorrente,
    statoA: nuovoStato,
  })

  const { data: updateRows, error: updateErr } = await svc
    .from('fatture')
    .update({ stato_sdi: nuovoStato })
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .eq('stato_sdi', statoAtteso)
    .select('id')

  if (updateErr) {
    console.error('[STATO-SDI-OVERRIDE] update fallito (Postgres):', updateErr)
    return NextResponse.json({ error: "Errore durante l'override — riprova" }, { status: 500 })
  }
  if (!updateRows || updateRows.length === 0) {
    return NextResponse.json(
      { error: 'Stato SdI modificato nel frattempo — ricarica e riprova' },
      { status: 409 }
    )
  }

  const { error: insertErr } = await svc.from('fatture_sdi_eventi').insert({
    laboratorio_id: labId,
    fattura_id: fatturaId,
    origine: 'override_manuale',
    stato_da: statoCorrente,
    stato_a: nuovoStato,
    motivo,
    registrato_da: user.id,
  })

  if (insertErr) {
    console.error('[STATO-SDI-OVERRIDE] insert evento fallito (Postgres):', insertErr)
    return NextResponse.json({ error: 'Errore durante la registrazione audit — riprova' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, stato_da: statoCorrente, stato_a: nuovoStato })
}
