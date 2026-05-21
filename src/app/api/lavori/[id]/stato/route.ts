import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import type { StatoLavoro } from '@/types/domain'

// Transizioni consentite: stati successivi validi per ciascuno stato corrente.
// "consegnato" è escluso: passa obbligatoriamente per orchestraConsegna.
const TRANSIZIONI_CONSENTITE: Partial<Record<StatoLavoro, StatoLavoro[]>> = {
  ricevuto:         ['in_lavorazione'],
  in_lavorazione:   ['pronto', 'in_prova_esterna', 'sospeso'],
  in_prova_esterna: ['in_lavorazione', 'pronto'],
  in_prova:         ['in_lavorazione', 'pronto'],
  sospeso:          ['in_lavorazione'],
  in_ritardo:       ['in_lavorazione'],
  pronto:           ['in_lavorazione'],
}

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params

  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

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
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  let body: { stato: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const nuovoStato = body.stato as StatoLavoro
  if (!nuovoStato) {
    return NextResponse.json({ error: 'Campo "stato" obbligatorio' }, { status: 422 })
  }

  // Legge stato corrente
  const { data: lavoro } = await svc
    .from('lavori')
    .select('stato')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  const statoCorrente = lavoro.stato as StatoLavoro
  const consentiti = TRANSIZIONI_CONSENTITE[statoCorrente] ?? []

  if (!consentiti.includes(nuovoStato)) {
    return NextResponse.json(
      {
        error: `Transizione non consentita: ${statoCorrente} → ${nuovoStato}`,
        consentiti,
      },
      { status: 422 }
    )
  }

  const { data: updated, error: updateError } = await svc
    .from('lavori')
    .update({ stato: nuovoStato, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .select('id, numero_lavoro, stato, updated_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ lavoro: updated })
}
