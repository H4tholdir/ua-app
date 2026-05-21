import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(_req: Request, { params }: RouteContext) {
  const { id } = await params

  // Auth
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()

  // Ottieni ruolo e lab dell'utente
  const { data: utente } = await svc
    .from('utenti')
    .select('ruolo, laboratorio_id')
    .eq('id', user.id)
    .is('deleted_at', null)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  // Verifica che il lavoro appartenga al lab
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // Segna come risolta
  const { error } = await svc
    .from('lavori')
    .update({ segnalazione_risolta: true })
    .eq('id', id)

  if (error) {
    console.error('[PATCH /api/lavori/[id]/segnala/risolvi] error:', error)
    return NextResponse.json({ error: 'Errore durante il salvataggio' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
