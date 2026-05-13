import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { transitionLabStato, type LaboStatoValue } from '@/lib/stripe/state-machine'
import { isSameOrigin } from '@/lib/utils/csrf'

const VALID_STATES: LaboStatoValue[] = ['trial', 'attivo', 'sospeso', 'scaduto', 'blacklist']

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

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

  const { stato } = body
  if (!VALID_STATES.includes(stato)) {
    return NextResponse.json({ error: 'Stato non valido' }, { status: 400 })
  }

  const svc = getServiceClient()
  const result = await transitionLabStato(svc, id, stato as LaboStatoValue, 'admin', {
    actor: admin.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
