import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { FINESTRA_ANNULLO_MS } from '@/lib/consegna/costanti'

// Tutta la logica transazionale (gate stato/finestra, doppio gate fiscale,
// ripristino lavoro, annullo DdC fail-closed) vive nella RPC
// annulla_consegna_atomica (Ondata 0 spec §3 punto 4). La route mappa solo
// gli esiti su HTTP.
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
    case 'ok':
      return NextResponse.json({ ok: true, messaggio: 'Consegna annullata — lavoro riportato a Pronto' })
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
