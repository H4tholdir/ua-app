import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { generateNominaPrrc } from '@/lib/pdf/generate-nomina-prrc'

export async function GET() {
  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  const guard = assertLabOperativo(context, 'GET')
  if (guard) return guard

  try {
    const buffer = await generateNominaPrrc(context.laboratorioId)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="NominaPRRC.pdf"',
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Errore imprevisto'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
