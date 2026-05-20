import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

// ─── PATCH /api/fatture/[id] ─────────────────────────────────────────────────
// Allowlist: solo campo `pagata` — nessun altro campo modificabile qui
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Auth
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()

  // Recupera laboratorio_id
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id

  // Parsing body — allowlist esplicita: solo `pagata`
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('pagata' in body) ||
    typeof (body as Record<string, unknown>).pagata !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Campo `pagata` richiesto (boolean)' }, { status: 400 })
  }

  const { pagata } = body as { pagata: boolean }

  // Update — verifica che la fattura appartenga al laboratorio
  const { data, error } = await svc
    .from('fatture')
    .update({ pagata })
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .select('id, pagata')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  return NextResponse.json(data)
}
