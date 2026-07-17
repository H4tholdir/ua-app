import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
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
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  if (context.ruolo !== 'tecnico' && context.ruolo !== 'titolare') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const svc = getServiceClient()

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
    .eq('laboratorio_id', context.laboratorioId)
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
      segnalazione_by: context.userId,
      segnalazione_risolta: false,
    }, { count: 'exact' })
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)

  if (error) {
    console.error('[POST /api/lavori/[id]/segnala] error:', error)
    return NextResponse.json({ error: 'Errore durante il salvataggio' }, { status: 500 })
  }

  if (segnalaUpdateCount === 0) {
    return NextResponse.json({ error: 'Lavoro non trovato nel laboratorio corrente' }, { status: 404 })
  }

  // Push notification — problema segnalato → titolare (fire-and-forget safe)
  await triggerPushByRole(context.laboratorioId, 'titolare', {
    title: '⚠️ Problema segnalato',
    body: `${context.nome ?? 'Un tecnico'} ha segnalato un problema sul lavoro`,
    url: `/lavori/${id}`,
  })

  return NextResponse.json({ ok: true })
}
