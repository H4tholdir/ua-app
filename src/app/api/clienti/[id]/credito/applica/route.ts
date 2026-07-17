import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { calcolaCreditoDisponibile } from '@/lib/contabilita/saldo'
import { fetchMovimentiCreditoValidi } from '@/lib/contabilita/queries'

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST /api/clienti/[id]/credito/applica ────────────────────────────────
// Body: { fattura_id? | lavoro_id?, importo }
// Crea un movimento 'applicazione' — NON genera una riga in `pagamenti`
// (evita il doppio conteggio del contante, spec B2 §"Punto critico").
export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: cliente_id } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (context.ruolo !== 'titolare' && context.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }
  const svc = getServiceClient()

  const { data: cliente } = await svc
    .from('clienti')
    .select('id')
    .eq('id', cliente_id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const fattura_id = typeof body.fattura_id === 'string' ? body.fattura_id : null
  const lavoro_id = typeof body.lavoro_id === 'string' ? body.lavoro_id : null
  const importo = typeof body.importo === 'number' ? body.importo : NaN

  if ((fattura_id == null) === (lavoro_id == null)) {
    return NextResponse.json({ error: 'Specificare esattamente uno tra fattura_id e lavoro_id' }, { status: 400 })
  }
  if (!(importo > 0)) {
    return NextResponse.json({ error: 'Importo deve essere positivo' }, { status: 400 })
  }

  // Verifica che il dovuto target appartenga a QUESTO cliente e laboratorio
  if (fattura_id) {
    const { data: fattura } = await svc
      .from('fatture')
      .select('id, stornata_at, tipo_documento')
      .eq('id', fattura_id)
      .eq('cliente_id', cliente_id)
      .eq('laboratorio_id', context.laboratorioId)
      .is('deleted_at', null)
      .single()
    if (!fattura) {
      return NextResponse.json({ error: 'Fattura non trovata per questo cliente' }, { status: 404 })
    }
    // Task 5b: una fattura stornata non è più un dovuto (Task 5) — applicarle
    // credito creerebbe un doppio movimento contabile su un documento annullato.
    if ((fattura as { stornata_at: string | null }).stornata_at != null) {
      return NextResponse.json({ error: 'Fattura stornata: applicazione credito non consentita' }, { status: 400 })
    }
    // Il TD04 (nota di credito) è un documento di storno: non è MAI pagabile.
    if ((fattura as { tipo_documento: string }).tipo_documento === 'TD04') {
      return NextResponse.json({ error: 'Nota di credito (TD04): applicazione credito non consentita' }, { status: 400 })
    }
  } else {
    const { data: lavoro } = await svc
      .from('lavori')
      .select('id')
      .eq('id', lavoro_id as string)
      .eq('cliente_id', cliente_id)
      .eq('laboratorio_id', context.laboratorioId)
      .is('deleted_at', null)
      .single()
    if (!lavoro) {
      return NextResponse.json({ error: 'Lavoro non trovato per questo cliente' }, { status: 404 })
    }
  }

  // fetchMovimentiCreditoValidi è fail-closed (follow-up Ondata 3): su errore
  // di lettura lancia — risposta JSON pulita, mai messaggi Postgres.
  let movimentiValidi
  try {
    movimentiValidi = await fetchMovimentiCreditoValidi(svc, context.laboratorioId, cliente_id)
  } catch (err) {
    console.error('[credito applica] lettura movimenti:', err)
    return NextResponse.json({ error: 'Errore lettura credito' }, { status: 500 })
  }
  const disponibile = calcolaCreditoDisponibile(movimentiValidi)

  if (importo > disponibile) {
    return NextResponse.json({ error: `Credito disponibile insufficiente (disponibile: ${disponibile})` }, { status: 400 })
  }

  const { data: movimento, error } = await svc
    .from('credito_clienti_movimenti')
    .insert({
      laboratorio_id: context.laboratorioId,
      cliente_id,
      tipo: 'applicazione',
      fattura_id,
      lavoro_id,
      importo,
      registrato_da: context.userId,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ movimento })
}
