import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

const ALLOWLIST_FIELDS = [
  'stato',
  'quantita_ricevuta',
  'data_consegna_effettiva',
  'note',
  'whatsapp_inviato',
  'email_inviato',
] as const

type AllowedField = typeof ALLOWLIST_FIELDS[number]

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
  const labId: string = context.laboratorioId

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Allowlist esplicita — mai blocklist
  const updates: Partial<Record<AllowedField, unknown>> = {}
  for (const field of ALLOWLIST_FIELDS) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nessun campo aggiornabile fornito' }, { status: 400 })
  }

  const { data: ordine, error } = await svc
    .from('ordini_fornitori')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!ordine) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 })
  }

  return NextResponse.json({ ordine })
}
