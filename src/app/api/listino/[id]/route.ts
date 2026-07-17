import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'

const PATCH_ALLOWLIST = [
  'nome',
  'codice',
  'categoria',
  'unita_misura',
  'descrizione',
  'prezzo_1',
  'prezzo_2',
  'prezzo_3',
  'prezzo_4',
  'compenso_tecnico',
  'costo_materiali_estimated',
] as const

type AllowedField = (typeof PATCH_ALLOWLIST)[number]

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
    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    const { data: voce, error } = await svc
      .from('listino')
      .select(
        'id, codice, nome, descrizione, categoria, prezzo_1, prezzo_2, prezzo_3, prezzo_4, compenso_tecnico, unita_misura, attivo'
      )
      .eq('id', id)
      .eq('laboratorio_id', labId)
      .single()

    if (error || !voce) {
      return NextResponse.json({ error: 'Voce non trovata' }, { status: 404 })
    }

    return NextResponse.json({ voce })
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
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

  // Solo titolare o admin_rete possono modificare il listino
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Verifica che la voce appartenga al lab
  const { data: existing } = await svc
    .from('listino')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Voce non trovata' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Allowlist esplicita: accetta solo i campi consentiti
  const updates: Partial<Record<AllowedField, unknown>> = {}
  for (const field of PATCH_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nessun campo valido da aggiornare' }, { status: 422 })
  }

  const { data: voce, error: updateError } = await svc
    .from('listino')
    .update(updates)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .select('id, codice, nome, prezzo_1, compenso_tecnico')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ voce })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
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

  // Solo titolare o admin_rete possono eliminare voci dal listino
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Verifica che la voce appartenga al lab
  const { data: existing } = await svc
    .from('listino')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Voce non trovata' }, { status: 404 })
  }

  // Soft-delete: imposta attivo = false
  const { error: deleteError } = await svc
    .from('listino')
    .update({ attivo: false })
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
