import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

const MOTIVI_VALIDI = [
  'colore_sbagliato',
  'misura_errata',
  'fusione_difettosa',
  'rottura_produzione',
  'non_confortevole',
  'errore_prescrizione',
  'altro',
] as const

const RILEVATO_IN_VALIDI = ['produzione', 'prova_1', 'prova_2', 'prova_3', 'post_consegna']

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: lavoro_id } = await params
  const svc = getServiceClient()

  // Cross-tenant guard — verifica appartenenza laboratorio
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, stato')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // State guard: blocca solo annullati (il rifacimento avviene post-consegna o su sospeso/pronto)
  if (lavoro.stato === 'annullato') {
    return NextResponse.json(
      { error: `Impossibile creare rifacimento per lavoro annullato` },
      { status: 409 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { motivo, rilevato_in, costo_interno, note } = body as {
    motivo?: string
    rilevato_in?: string
    costo_interno?: number | string
    note?: string
  }

  if (!motivo || !(MOTIVI_VALIDI as readonly string[]).includes(motivo)) {
    return NextResponse.json(
      { error: `motivo non valido: ${motivo}` },
      { status: 400 }
    )
  }

  if (note !== undefined && note !== null && typeof note !== 'string') {
    return NextResponse.json({ error: 'note deve essere una stringa' }, { status: 400 })
  }
  if (note && note.length > 1000) {
    return NextResponse.json({ error: 'note troppo lunghe (max 1000 caratteri)' }, { status: 400 })
  }

  if (rilevato_in !== undefined && rilevato_in !== null && !RILEVATO_IN_VALIDI.includes(rilevato_in)) {
    return NextResponse.json({ error: `rilevato_in non valido: ${rilevato_in}` }, { status: 400 })
  }

  const costoNum = costo_interno != null && costo_interno !== '' ? parseFloat(String(costo_interno)) : null
  if (costoNum !== null && (!Number.isFinite(costoNum) || costoNum < 0)) {
    return NextResponse.json({ error: 'costo_interno non valido' }, { status: 400 })
  }

  // RPC atomica — nessun INSERT separato (MDR-safe)
  const { data, error } = await svc.rpc('crea_rifacimento_atomico', {
    p_lavoro_originale_id: lavoro_id,
    p_motivo: motivo,
    p_rilevato_in: rilevato_in ?? null,
    p_costo_interno: costoNum,
    p_note: note ?? null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data as { lavoro_nuovo_id: string; numero_lavoro: string })
}
