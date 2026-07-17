import { NextResponse } from 'next/server'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
    // Recupera il cliente [id] con il suo studio_nome
    const { data: cliente, error: clienteError } = await svc
      .from('clienti')
      .select('id, studio_nome')
      .eq('id', id)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
    }

    // Se studio_nome è null → nessun collega di studio
    if (!cliente.studio_nome) {
      return NextResponse.json([])
    }

    // Recupera gli altri clienti dello stesso lab con lo stesso studio_nome
    const { data: members, error: membersError } = await svc
      .from('clienti')
      .select('id, nome, cognome, studio_nome')
      .eq('laboratorio_id', labId)
      .eq('studio_nome', cliente.studio_nome)
      .neq('id', id)
      .is('deleted_at', null)
      .order('cognome', { ascending: true })

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    return NextResponse.json(members ?? [])
  })
}
