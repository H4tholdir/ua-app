/**
 * POST /api/notifications/subscribe
 * Salva o aggiorna la push subscription del browser per l'utente corrente.
 *
 * Nota: la tabella push_subscriptions è definita in
 *   supabase/migrations/20260521_push_subscriptions.sql
 * Dopo `supabase db push` rigenera i tipi con:
 *   npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
 * Poi rimuovi il @ts-expect-error sotto.
 */
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import type { PushSubscriptionData } from '@/lib/notifications/push'

export async function POST(req: Request) {
  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  // Auth
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // Recupera laboratorio_id dal profilo utente (stessa logica di (app)/layout.tsx)
  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

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
      user_id: user.id,
      laboratorio_id: utente.laboratorio_id,
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
