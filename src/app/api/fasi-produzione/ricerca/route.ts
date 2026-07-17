import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { pgrestQuote } from '@/lib/utils/escape-postgrest'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }
    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    let query = svc
      .from('fasi_produzione')
      .select('codice_fase, descrizione, attrezzatura, controllo_misura, esito_atteso, materiali_nota, obbligatoria')
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('codice_fase', { ascending: true })
      .limit(8)

    if (q) {
      const pattern = pgrestQuote(`%${q}%`)
      query = query.or(`codice_fase.ilike.${pattern},descrizione.ilike.${pattern}`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Errore nella ricerca fasi' }, { status: 500 })
    }

    return NextResponse.json({ fasi: data ?? [] })
  })
}
