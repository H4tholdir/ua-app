import 'server-only'
import { NextResponse } from 'next/server'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { generateDpa } from '@/lib/pdf/generate-dpa'

// GET /api/clienti/[id]/dpa
// Genera e scarica il DPA GDPR Art. 28 per il cliente specificato
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clienteId } = await params

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    if (!context.laboratorioId) return NextResponse.json({ error: 'Lab non trovato' }, { status: 403 })
    if (!['titolare', 'admin_rete', 'admin_sistema'].includes(context.ruolo ?? '')) {
      return NextResponse.json({ error: 'Non autorizzato — solo titolari' }, { status: 403 })
    }
    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard
    const labId: string = context.laboratorioId

    try {
      const buffer = await generateDpa(labId, clienteId)
      const filename = `DPA-${clienteId.slice(0, 8).toUpperCase()}.pdf`

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Errore generazione DPA'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  })
}
