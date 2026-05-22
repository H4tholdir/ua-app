import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { triggerPushByRole } from '@/lib/notifications/trigger'
import type { TipoSegnalazione } from '@/types/domain'

const TIPI_VALIDI: TipoSegnalazione[] = [
  'impronta_non_idonea',
  'colore_mancante',
  'istruzione_poco_chiara',
  'materiale_esaurito',
  'altro',
]

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
    .select('ruolo, laboratorio_id, nome')
    .eq('id', user.id)
    .is('deleted_at', null)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  if (utente.ruolo !== 'tecnico' && utente.ruolo !== 'titolare') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  // Valida body
  let body: { tipo: TipoSegnalazione; nota?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { tipo, nota } = body

  if (!tipo || !TIPI_VALIDI.includes(tipo)) {
    return NextResponse.json(
      { error: `Tipo segnalazione non valido. Valori ammessi: ${TIPI_VALIDI.join(', ')}` },
      { status: 400 }
    )
  }

  // Verifica che il lavoro appartenga al lab dell'utente
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

  // PATCH lavoro con segnalazione
  const { error, count: segnalaUpdateCount } = await svc
    .from('lavori')
    .update({
      segnalazione_tipo: tipo,
      segnalazione_nota: nota ?? null,
      segnalazione_at: new Date().toISOString(),
      segnalazione_by: user.id,
      segnalazione_risolta: false,
    }, { count: 'exact' })
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)

  if (error) {
    console.error('[POST /api/lavori/[id]/segnala] error:', error)
    return NextResponse.json({ error: 'Errore durante il salvataggio' }, { status: 500 })
  }

  if (segnalaUpdateCount === 0) {
    return NextResponse.json({ error: 'Lavoro non trovato nel laboratorio corrente' }, { status: 404 })
  }

  // Push notification — problema segnalato → titolare (fire-and-forget safe)
  await triggerPushByRole(utente.laboratorio_id, 'titolare', {
    title: '⚠️ Problema segnalato',
    body: `${utente.nome ?? 'Un tecnico'} ha segnalato un problema sul lavoro`,
    url: `/lavori/${id}`,
  })

  return NextResponse.json({ ok: true })
}
