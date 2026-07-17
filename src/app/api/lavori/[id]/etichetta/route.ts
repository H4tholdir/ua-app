import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { generateEtichettaBuffer } from '@/lib/pdf/generate-etichetta'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lavoro_id } = await params

  return withServerTiming(async (t) => {
    // DEVIAZIONE DICHIARATA (spec R2 Task 9): !user (401 Unauthorized) e
    // !utente (404 Utente non trovato) collassano entrambi su context null
    // → 401 Unauthorized (getLabContext è fail-closed sia su auth che su
    // lookup profilo, vedi lab-context.ts).
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!context.laboratorioId) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

    const supabaseService = getServiceClient()
    // Verifica appartenenza al lab (guard cross-tenant)
    const { data: lavoro } = await supabaseService
      .from('lavori')
      .select('id, numero_lavoro')
      .eq('id', lavoro_id)
      .eq('laboratorio_id', context.laboratorioId)
      .is('deleted_at', null)
      .single()
    if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

    try {
      const buffer = await generateEtichettaBuffer(lavoro_id, context.laboratorioId)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Etichetta_${lavoro.numero_lavoro}.pdf"`,
        },
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Errore imprevisto'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  })
}
