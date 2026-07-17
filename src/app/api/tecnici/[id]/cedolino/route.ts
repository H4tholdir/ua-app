import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generateCedolinoTecnico } from '@/lib/pdf/generate-cedolino-tecnico'


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tecnicoId } = await params
  const { searchParams } = new URL(req.url)

  // Validazione mese
  const meseCorrente = new Date().toISOString().slice(0, 7)
  const meseParam = searchParams.get('mese') ?? meseCorrente
  const mese = /^\d{4}-\d{2}$/.test(meseParam) ? meseParam : meseCorrente

  // ─── Auth ────────────────────────────────────────────────────────────────
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  // ─── RBAC ────────────────────────────────────────────────────────────────
  // Il tecnico può scaricare solo il proprio cedolino.
  if (context.ruolo === 'tecnico') {
    const { data: mioTecnico } = await svc
      .from('tecnici')
      .select('id')
      .eq('laboratorio_id', labId)
      .eq('utente_id', context.userId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!mioTecnico || mioTecnico.id !== tecnicoId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }
  } else if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'GET')
  if (guard) return guard

  // ─── Verifica tecnico appartiene al lab ───────────────────────────────────
  const { data: tecnico } = await svc
    .from('tecnici')
    .select('id, nome, cognome')
    .eq('id', tecnicoId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!tecnico) {
    return NextResponse.json({ error: 'Tecnico non trovato' }, { status: 404 })
  }

  try {
    const buffer = await generateCedolinoTecnico(tecnicoId, labId, mese)
    const filename = `Cedolino_${tecnico.cognome}_${tecnico.nome}_${mese}.pdf`
      .replace(/\s+/g, '_')

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore generazione PDF'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
