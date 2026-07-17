import 'server-only'
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { transitionLabStato, type LaboStatoValue } from '@/lib/stripe/state-machine'
import { revocaSessioniLaboratorio } from '@/lib/auth/revoca-sessioni'
import { isSameOrigin } from '@/lib/utils/csrf'

const VALID_STATES: LaboStatoValue[] = ['trial', 'attivo', 'sospeso', 'scaduto', 'blacklist']

async function verifyAdmin() {
  const context = await getFreshLabContext()
  return context?.ruolo === 'admin_sistema' ? context : null
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const guard = assertLabOperativo(admin, 'PATCH')
  if (guard) return guard

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })

  const { stato } = body
  if (!VALID_STATES.includes(stato)) {
    return NextResponse.json({ error: 'Stato non valido' }, { status: 400 })
  }

  const svc = getServiceClient()
  const result = await transitionLabStato(svc, id, stato as LaboStatoValue, 'admin', {
    actor: admin.userId,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // N13 (appsec R5): blacklist è terminale — revoca best-effort delle sessioni
  // degli utenti del lab. Non blocca mai la risposta: la guard lab-guard resta
  // il muro primario a ogni request.
  if (stato === 'blacklist') {
    await revocaSessioniLaboratorio(svc, id)
  }

  return NextResponse.json({ success: true })
}
