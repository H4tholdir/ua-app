import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import type { StatoSDI } from '@/types/domain'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface RpcEsito {
  esito: string
  stato_da?: string
  stato_a?: string
  stato_corrente?: string
}

// Rank sotto al quale uno stato non ha ancora superato l'invio (spec §4.4,
// migration 20260716100000: smtp_inviata = rank 2). Finding 4 (review
// finale Task 17): sotto questa soglia l'override è ammesso SOLO da
// 'generata' con prova d'invio reale (smtp_inviata_at NOT NULL — claim
// orfano, stessa semantica D-3 di applica_ricevuta_sdi) — MAI da 'draft' o
// da 'generata' mai inviata. Replica client-side della guardia sorgente
// aggiunta a public.override_stato_sdi (migration
// 20260716130000_override_guardia_sorgente.sql).
const RANK_SMTP_INVIATA = 2

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
// UPDATE fatture + INSERT su fatture_sdi_eventi (origine='override_manuale',
// motivo obbligatorio — CHECK a livello DB) avvengono in un'unica
// transazione tramite la RPC public.override_stato_sdi (Task 12b, migration
// 20260716110000): un INSERT fallito dopo l'UPDATE riuscito lascerebbe lo
// stato fiscale cambiato senza audit (dominio ITCA). Le validazioni sotto
// (ruolo, allowlist, rank client-side, anti-stale-read, guardia sorgente —
// Finding 4 review finale Task 17, migration
// 20260716130000_override_guardia_sorgente) restano come difesa in
// profondità — la RPC replica le stesse guardie sul dato persistito. Un
// TD04 portato a 'rifiutata' fa scattare il trigger di contro-movimento
// storno (migration 20260716091000): richiede conferma esplicita nel body.
export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (!RUOLI_OVERRIDE_SDI.includes(context.ruolo as (typeof RUOLI_OVERRIDE_SDI)[number])) {
    return NextResponse.json({ error: "Ruolo non autorizzato all'override stato SdI" }, { status: 403 })
  }
  const svc = getServiceClient()

  const labId: string = context.laboratorioId
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
    .select('id, numero, stato_sdi, tipo_documento, smtp_inviata_at')
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

  // Guardia sorgente (Finding 4): niente override da uno stato che non ha
  // mai superato l'invio, a meno che non sia un claim orfano reale
  // (generata + smtp_inviata_at valorizzato — prova d'invio, D-3). Blocca
  // sia 'draft' sia 'generata' mai inviata, coerentemente con
  // applica_ricevuta_sdi (che rifiuta le stesse ricevute con
  // 'stato_incompatibile').
  if (
    RANK_STATO_SDI[statoCorrente] < RANK_SMTP_INVIATA &&
    !(statoCorrente === 'generata' && fattura.smtp_inviata_at != null)
  ) {
    return NextResponse.json(
      {
        error:
          'Fattura mai inviata — non è possibile forzare uno stato SdI senza prova che la mail sia partita',
      },
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
    userId: context.userId,
    statoDa: statoCorrente,
    statoA: nuovoStato,
  })

  try {
    const { data, error: rpcErr } = await svc.rpc('override_stato_sdi', {
      p_fattura_id: fatturaId,
      p_laboratorio_id: labId,
      p_stato_atteso: statoAtteso,
      p_nuovo_stato: nuovoStato,
      p_motivo: motivo,
      p_registrato_da: context.userId,
    })
    if (rpcErr) {
      throw new Error(`RPC override_stato_sdi fallita: ${rpcErr.message}`)
    }

    const result = data as RpcEsito | null

    switch (result?.esito) {
      case 'applicato':
        return NextResponse.json(
          { ok: true, stato_da: result.stato_da, stato_a: result.stato_a },
          { status: 200 }
        )
      case 'stato_stantio':
        return NextResponse.json(
          { error: 'Stato SdI modificato nel frattempo — ricarica e riprova' },
          { status: 409 }
        )
      case 'stato_incompatibile':
        return NextResponse.json(
          { error: 'Transizione non valida — il nuovo stato non è successivo a quello corrente' },
          { status: 409 }
        )
      case 'mai_inviata':
        return NextResponse.json(
          {
            error:
              'Fattura mai inviata — non è possibile forzare uno stato SdI senza prova che la mail sia partita',
          },
          { status: 409 }
        )
      case 'non_ammesso':
        return NextResponse.json(
          { error: 'nuovo_stato non valido — valori ammessi: pec_consegnata, accettata, rifiutata' },
          { status: 422 }
        )
      case 'motivo_mancante':
        return NextResponse.json({ error: 'Motivo obbligatorio' }, { status: 422 })
      case 'non_trovato':
        return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
      default:
        throw new Error(`esito RPC inatteso: ${JSON.stringify(result)}`)
    }
  } catch (err) {
    // Dettaglio (Postgres) SOLO nei log server — fail-closed su ogni errore
    // inatteso, mai un 200/leak del messaggio.
    console.error('[STATO-SDI-OVERRIDE] errore:', err)
    return NextResponse.json({ error: "Errore durante l'override — riprova" }, { status: 500 })
  }
}
