import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string; imgId: string }> }

// Campi aggiornabili via PATCH (allowlist esplicita — mai blocklist)
const ALLOWED_PATCH_FIELDS = ['descrizione', 'tipo', 'ordine'] as const
type AllowedField = (typeof ALLOWED_PATCH_FIELDS)[number]

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id: lavoro_id, imgId } = await params

  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

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

  const laboratorio_id = context.laboratorioId

  // Verifica che l'immagine appartenga al lavoro di questo lab
  const { data: existing } = await svc
    .from('lavori_immagini')
    .select('id')
    .eq('id', imgId)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Applica solo campi nella allowlist
  const patch: Partial<Record<AllowedField, unknown>> = {}
  for (const field of ALLOWED_PATCH_FIELDS) {
    if (field in body) {
      patch[field] = body[field]
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nessun campo aggiornabile fornito' }, { status: 400 })
  }

  const { data: immagine, error: updateError } = await svc
    .from('lavori_immagini')
    .update(patch)
    .eq('id', imgId)
    .eq('laboratorio_id', laboratorio_id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ immagine })
}
