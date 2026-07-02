import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
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

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

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
    .eq('laboratorio_id', utente.laboratorio_id)
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

  const { data: lavoro, error } = await svc
    .from('lavori')
    .update({ decisione_fatturazione: decisione, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .select('id, decisione_fatturazione')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lavoro })
}
