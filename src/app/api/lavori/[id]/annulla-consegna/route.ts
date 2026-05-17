import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

const GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minuti

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: lavoro_id } = await params
  const svc = getServiceClient()

  // Verifica appartenenza al lab
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  // Legge il lavoro con i campi necessari
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, stato, data_consegna_effettiva')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })

  // Deve essere consegnato
  if (lavoro.stato !== 'consegnato') {
    return NextResponse.json(
      { error: 'Il lavoro non è in stato consegnato' },
      { status: 400 }
    )
  }

  // Verifica finestra di 5 minuti
  const consegnaAt = lavoro.data_consegna_effettiva
    ? new Date(lavoro.data_consegna_effettiva).getTime()
    : 0

  if (Date.now() - consegnaAt > GRACE_PERIOD_MS) {
    return NextResponse.json(
      { error: 'La finestra di annullamento è scaduta (5 minuti dalla consegna)' },
      { status: 400 }
    )
  }

  // Ripristina lo stato a pronto e resetta i campi di consegna
  const { error: updateErr } = await svc
    .from('lavori')
    .update({
      stato: 'pronto',
      conformato: false,
      data_conformazione: null,
      data_consegna_effettiva: null,
      consegna_completata_at: null,
      consegna_in_corso: false,
    })
    .eq('id', lavoro_id)
    .eq('laboratorio_id', utente.laboratorio_id)

  if (updateErr) {
    return NextResponse.json({ error: 'Errore durante l\'annullamento' }, { status: 500 })
  }

  // Annulla la DdC associata (se esiste)
  await svc
    .from('dichiarazioni_conformita')
    .update({ stato: 'annullata' })
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .in('stato', ['bozza', 'firmata'])

  return NextResponse.json({ ok: true, messaggio: 'Consegna annullata — lavoro riportato a Pronto' })
}
