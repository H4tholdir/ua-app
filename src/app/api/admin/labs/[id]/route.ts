import 'server-only'
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

const PATCHABLE = ['trial_ends_at', 'nome', 'piano', 'ragione_sociale', 'partita_iva', 'codice_itca',
  'pec', 'email', 'telefono', 'sito_web', 'indirizzo_legale', 'indirizzo_operativo',
  'codice_fiscale', 'numero_rea', 'forma_giuridica', 'numero_ministeriale'] as const

async function verifyAdmin() {
  const context = await getFreshLabContext()
  return context?.ruolo === 'admin_sistema' ? context : null
}

// PATCH /api/admin/labs/[id] — update safe fields (not stato — use /stato route)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })

  // Only allow patchable fields
  const updates: Record<string, unknown> = {}
  for (const key of PATCHABLE) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nessun campo aggiornabile fornito' }, { status: 400 })
  }

  const svc = getServiceClient()
  const { error } = await svc.from('laboratori').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/labs/[id] — soft delete (sets deleted_at)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = await params
  const svc = getServiceClient()

  // Safety: refuse to delete labs in stato 'attivo' or 'blacklist'
  const { data: lab } = await svc.from('laboratori').select('stato').eq('id', id).single()
  if (!lab) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 404 })
  if (lab.stato === 'attivo') return NextResponse.json({ error: 'Non è possibile eliminare un laboratorio attivo' }, { status: 409 })
  if (lab.stato === 'blacklist') return NextResponse.json({ error: 'Non è possibile eliminare un laboratorio in blacklist' }, { status: 409 })

  const { error } = await svc.from('laboratori')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
