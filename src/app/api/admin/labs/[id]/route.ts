import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

const PATCHABLE = [
  // Anagrafica
  'nome', 'ragione_sociale', 'partita_iva', 'codice_fiscale',
  'indirizzo', 'cap', 'citta', 'provincia',
  'telefono', 'email', 'pec',
  // MDR / Normativo
  'codice_itca', 'srn_eudamed', 'numero_rea', 'numero_albo',
  'prrc_nome', 'prrc_qualifica', 'anno_prima_marcatura',
  // Fatturazione
  'regime_fiscale', 'codice_iva_default', 'soglia_bollo', 'importo_bollo', 'bollo_default_attivo',
  // Piano e Stato
  'piano', 'trial_ends_at',
  // Legacy fields kept for compatibility
  'sito_web', 'indirizzo_legale', 'indirizzo_operativo', 'forma_giuridica', 'numero_ministeriale',
] as const

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
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
