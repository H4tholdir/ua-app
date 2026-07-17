import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard
  const svc = getServiceClient()

  const body = await req.json()

  // Allowlist — solo campi sicuri da modificare
  const ALLOWED = ['codice_paziente', 'note', 'anamnesi', 'asl', 'sesso', 'data_nascita'] as const
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of ALLOWED) {
    if (field in body) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  const { error } = await svc
    .from('pazienti')
    .update(updates)
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Solo titolare o admin_rete possono archiviare pazienti
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const guard = assertLabOperativo(context, 'DELETE')
  if (guard) return guard
  const svc = getServiceClient()

  // Verifica che il paziente appartenga al lab e non sia già archiviato
  const { data: existing } = await svc
    .from('pazienti')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .eq('archiviato', false)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Paziente non trovato' }, { status: 404 })
  }

  // Soft-delete: imposta archiviato = true
  const { error: deleteError } = await svc
    .from('pazienti')
    .update({ archiviato: true })
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
