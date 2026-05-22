import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

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

  // Solo titolare o admin_rete possono archiviare pazienti
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Verifica che il paziente appartenga al lab e non sia già archiviato
  const { data: existing } = await svc
    .from('pazienti')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
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
    .eq('laboratorio_id', utente.laboratorio_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
