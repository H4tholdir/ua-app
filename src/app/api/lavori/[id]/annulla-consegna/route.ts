import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { FINESTRA_ANNULLO_MS } from '@/lib/consegna/costanti'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'

// Tutta la logica transazionale (gate stato/finestra, doppio gate fiscale,
// ripristino lavoro, annullo DdC fail-closed) vive nella RPC
// annulla_consegna_atomica (Ondata 0 spec §3 punto 4). La route mappa solo
// gli esiti su HTTP.

type RiassegnazioneCassetta = { riassegnata: boolean; nome: string }

/**
 * Task 8: dopo un annullo consegna riuscito, prova a riassegnare al lavoro
 * la cassetta che aveva prima della consegna, via
 * `cassetta_riassegna_post_annullo(p_lab, p_lavoro)` (Task 1; contratto
 * ratificato 21/07 — 3 esiti, non 4: vedi la NOTA in testa a
 * `.superpowers/sdd/task-8-brief.md`), avvolta in `callRpcWithRetry` (coda di
 * deadlock 40P01 documentata in testa alla migration — la stessa che il
 * Task 4/5/9 condividono, non un'invenzione di questo task).
 *
 * **Fail-soft ASSOLUTO** (vincolo più importante — stiamo agganciandoci DOPO
 * l'esito `ok` di una RPC fiscale in produzione): l'annullo consegna non
 * deve MAI fallire, degradare o cambiare esito per colpa della
 * riassegnazione. Stessa FORMA di `liberaCassettaAllaConsegna` (Task 7,
 * `src/lib/consegna/orchestrate.ts`) — non lo stesso codice, riusata la
 * forma: l'intero corpo vive dentro un try/catch e la funzione non può mai
 * lanciare, ritorna sempre un valore:
 *  - `error` non-null (postgrest-js NON lancia sugli errori del database —
 *    torna `{data:null, error:{...}}` — un `try/catch` da solo non lo
 *    intercetterebbe) → log, `null` (niente campo `cassetta` in response);
 *  - `esito === 'riassegnata'` → `{riassegnata:true, nome}`;
 *  - `esito === 'occupata_nel_frattempo'` → `{riassegnata:false, nome}`;
 *  - `esito === 'niente_da_riassegnare'` → `null`, MA LOGGATO: il commento a
 *    `supabase/migrations/20260721090000_parete_cassette.sql:510-511`
 *    dichiara questo esito DIAGNOSTICO, non un non-evento — su un lavoro che
 *    dovrebbe essere stato appena riaperto dall'annullo, significa che
 *    l'annullo non ha riaperto il lavoro (un difetto altrove, da inseguire);
 *  - esito ignoto (un esito futuro non mappato qui) → log, `null` — mai un
 *    successo silenzioso (stessa guardia del Minor #4 chiuso nel Task 4);
 *  - eccezione di rete vera → `try/catch` esterno, ultima difesa, non
 *    l'unica.
 */
async function riassegnaCassettaAllAnnullo(
  svc: ReturnType<typeof getServiceClient>,
  laboratorio_id: string,
  lavoro_id: string
): Promise<RiassegnazioneCassetta | null> {
  try {
    const { data, error } = await callRpcWithRetry(() =>
      svc.rpc('cassetta_riassegna_post_annullo', {
        p_lab: laboratorio_id,
        p_lavoro: lavoro_id,
      })
    )

    if (error) {
      console.error('[ANNULLA-CONSEGNA] riassegnazione cassetta fail-soft — RPC in errore:', error)
      return null
    }

    const esito = (data as { esito?: string; nome?: string } | null)?.esito
    const nome = (data as { nome?: string } | null)?.nome as string

    switch (esito) {
      case 'riassegnata':
        return { riassegnata: true, nome }
      case 'occupata_nel_frattempo':
        return { riassegnata: false, nome }
      case 'niente_da_riassegnare':
        // Diagnostico, non un non-evento (vedi commento sopra e il commento
        // nella migration): un lavoro appena riaperto dall'annullo che non
        // trova niente da riassegnare segnala che l'annullo non ha
        // (ri)aperto il lavoro.
        console.error('[ANNULLA-CONSEGNA] niente da riassegnare su un lavoro appena riaperto — possibile difetto nell\'annullo consegna:', data)
        return null
      default:
        console.error('[ANNULLA-CONSEGNA] riassegnazione cassetta — esito inatteso dalla RPC:', data)
        return null
    }
  } catch (err) {
    console.error('[ANNULLA-CONSEGNA] riassegnazione cassetta fail-soft — eccezione:', err)
    return null
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const { id: lavoro_id } = await params
  const svc = getServiceClient()

  const { data, error } = await svc.rpc('annulla_consegna_atomica', {
    p_lavoro_id: lavoro_id,
    p_laboratorio_id: context.laboratorioId,
    p_finestra_ms: FINESTRA_ANNULLO_MS,
  })

  if (error) {
    console.error('[ANNULLA-CONSEGNA] RPC error:', error.message)
    return NextResponse.json({ error: 'Errore durante l\'annullamento' }, { status: 500 })
  }

  const esito = (data as { esito: string; ddc_assente?: boolean } | null)?.esito

  switch (esito) {
    case 'ok': {
      // Task 8: riassegnazione cassetta DOPO l'esito ok della RPC fiscale —
      // response ADDITIVA, `cassetta` opzionale (nessun client esistente se
      // ne accorge). Fail-soft assoluto: vedi riassegnaCassettaAllAnnullo.
      const cassetta = await riassegnaCassettaAllAnnullo(svc, context.laboratorioId, lavoro_id)
      return NextResponse.json({
        ok: true,
        messaggio: 'Consegna annullata — lavoro riportato a Pronto',
        ...(cassetta ? { cassetta } : {}),
      })
    }
    case 'non_trovato':
      return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
    case 'non_consegnato':
      return NextResponse.json({ error: 'Il lavoro non è in stato consegnato' }, { status: 400 })
    case 'finestra_scaduta':
      return NextResponse.json({ error: 'La finestra di annullamento è scaduta (10 minuti dalla consegna)' }, { status: 400 })
    case 'fattura_gia_emessa':
      return NextResponse.json({ error: 'Esiste già una fattura per questo lavoro: per stornare serve una nota di credito' }, { status: 409 })
    default:
      console.error('[ANNULLA-CONSEGNA] esito RPC inatteso:', esito)
      return NextResponse.json({ error: 'Errore durante l\'annullamento' }, { status: 500 })
  }
}
