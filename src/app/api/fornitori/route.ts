import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'

export async function GET() {
  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }

    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    const { data, error } = await svc
      .from('fornitori')
      .select('id, ragione_sociale, telefono, email')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .is('deleted_at', null)
      .order('ragione_sociale', { ascending: true })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: 'Errore nel recupero dei fornitori' }, { status: 500 })
    }

    const fornitori = (data ?? []).map((f) => ({
      id: f.id,
      nome: f.ragione_sociale,
      telefono: f.telefono,
      email: f.email,
    }))

    return NextResponse.json({ fornitori })
  })
}
