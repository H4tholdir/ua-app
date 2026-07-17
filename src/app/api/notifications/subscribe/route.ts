/**
 * POST /api/notifications/subscribe
 * Salva o aggiorna la push subscription del browser per l'utente corrente.
 *
 * Nota: la tabella push_subscriptions è definita in
 *   supabase/migrations/20260521000001_push_subscriptions.sql
 * Dopo `supabase db push` rigenera i tipi con:
 *   npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
 * Poi rimuovi il @ts-expect-error sotto.
 */
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import type { PushSubscriptionData } from '@/lib/notifications/push'

export async function POST(req: Request) {
  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  // Auth
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const svc = getServiceClient()

  let body: PushSubscriptionData
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Validazione minima della subscription
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: 'Subscription non valida' }, { status: 422 })
  }

  const { error } = await svc.from('push_subscriptions').upsert(
    {
      user_id: context.userId,
      laboratorio_id: context.laboratorioId,
      subscription: body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,laboratorio_id' },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
