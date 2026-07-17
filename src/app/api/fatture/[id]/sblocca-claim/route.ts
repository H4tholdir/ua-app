import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface RpcEsito {
  esito: string
  stato_corrente?: string
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
// UPDATE fatture + INSERT evento avvengono in un'unica transazione tramite
// la RPC public.sblocca_claim_fattura (Task 12b, migration 20260716110000):
// un INSERT fallito dopo l'UPDATE riuscito lascerebbe il claim sbloccato
// senza audit (dominio ITCA).
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
  if (!RUOLI_SBLOCCA_CLAIM.includes(context.ruolo as (typeof RUOLI_SBLOCCA_CLAIM)[number])) {
    return NextResponse.json({ error: 'Ruolo non autorizzato allo sblocco del claim' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const svc = getServiceClient()

  const labId: string = context.laboratorioId
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
    userId: context.userId,
  })

  try {
    const { data, error: rpcErr } = await svc.rpc('sblocca_claim_fattura', {
      p_fattura_id: fatturaId,
      p_laboratorio_id: labId,
      p_motivo: motivo,
      p_registrato_da: context.userId,
    })
    if (rpcErr) {
      throw new Error(`RPC sblocca_claim_fattura fallita: ${rpcErr.message}`)
    }

    const result = data as RpcEsito | null

    switch (result?.esito) {
      case 'sbloccato':
        return NextResponse.json({ ok: true }, { status: 200 })
      case 'non_in_claim':
        return NextResponse.json(
          { error: 'Fattura non in claim orfano — nessuno sblocco necessario' },
          { status: 409 }
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
    console.error('[SBLOCCA-CLAIM] errore:', err)
    return NextResponse.json({ error: 'Errore durante lo sblocco — riprova' }, { status: 500 })
  }
}
