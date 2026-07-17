import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { validaDecisioneFatturazione } from '@/lib/contabilita/decisione-fatturazione'

type RouteContext = { params: Promise<{ id: string }> }

// ─── PATCH /api/lavori/[id]/decisione-fatturazione ────────────────────────────
// Body: { decisione: 'in_attesa' | 'fatturare' | 'non_fatturare' }
export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

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

  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard

  const svc = getServiceClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const decisione = typeof body.decisione === 'string' ? body.decisione : ''

  const { data: existing } = await svc
    .from('lavori')
    .select('stato, incluso_in_fattura')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  const validazione = validaDecisioneFatturazione(decisione, existing.stato, existing.incluso_in_fattura)
  if (!validazione.ok) {
    const status = validazione.errore?.match(/immutabile/i) ? 409 : 400
    return NextResponse.json({ error: validazione.errore }, { status })
  }

  const updatePayload: Record<string, unknown> = {
    decisione_fatturazione: decisione,
    updated_at: new Date().toISOString(),
  }
  if (decisione === 'in_attesa') {
    // M-3 (spec §8): la riapertura azzera la proposta del dentista — la
    // storia resta in portale_accessi; il dentista riparte da zero.
    updatePayload.proposta_dentista = null
    updatePayload.proposta_at = null
  }

  const { data: lavoro, error } = await svc
    .from('lavori')
    .update(updatePayload)
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .select('id, decisione_fatturazione')
    .single()

  if (error) {
    console.error('[decisione-fatturazione] update:', error.message)
    return NextResponse.json({ error: 'Errore aggiornamento decisione' }, { status: 500 })
  }

  return NextResponse.json({ lavoro })
}
