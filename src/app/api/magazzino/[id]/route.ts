import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

const PATCH_ALLOWLIST = [
  'nome',
  'codice_articolo',
  'produttore',
  'categoria',
  'sotto_categoria',
  'fornitore_id',
  'um_acquisto',
  'um_scarico',
  'quantita_per_confezione',
  'costo_unitario',
  'prezzo_unitario',
  'scorta_attuale',
  'scorta_minima',
  'dispositivo_medico',
  'traccia_lotto',
  'codice_ce',
  'note',
  'aliquota_iva',
] as const

type AllowedField = (typeof PATCH_ALLOWLIST)[number]

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

  // Solo titolare o admin_rete possono modificare il magazzino
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard
  const svc = getServiceClient()

  // Verifica che l'articolo appartenga al lab
  const { data: existing } = await svc
    .from('magazzino')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .eq('attivo', true)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Articolo non trovato' }, { status: 404 })
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

  const { data: articolo, error: updateError } = await svc
    .from('magazzino')
    .update(updates)
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .select('id, codice_articolo, nome, scorta_attuale, scorta_minima')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ articolo })
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

  // Solo titolare o admin_rete possono eliminare articoli dal magazzino
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const guard = assertLabOperativo(context, 'DELETE')
  if (guard) return guard
  const svc = getServiceClient()

  // Verifica che l'articolo appartenga al lab
  const { data: existing } = await svc
    .from('magazzino')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .eq('attivo', true)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Articolo non trovato' }, { status: 404 })
  }

  // Soft-delete: imposta attivo = false
  const { error: deleteError } = await svc
    .from('magazzino')
    .update({ attivo: false })
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
