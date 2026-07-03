import { NextResponse } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { isSameOrigin } from '@/lib/utils/csrf'
import { verifyAdminRete } from '@/lib/rete/verify-admin-rete'
import { getServiceClient } from '@/lib/supabase/server-service'
import { sendInvitoReteEmail } from '@/lib/invito/send-invito-rete-email'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params
  const ctx = await verifyAdminRete(id)
  if (!ctx) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
    return NextResponse.json({ error: 'Campo "email" obbligatorio' }, { status: 422 })
  }

  const normalizedEmail = body.email.trim().toLowerCase()
  const svc = getServiceClient()

  // Fail-fast: l'email deve appartenere a un titolare/admin_rete esistente
  // (scope "solo lab già clienti", vedi spec §0)
  const { data: destinatario } = await svc
    .from('utenti')
    .select('id')
    .ilike('email', normalizedEmail)
    .in('ruolo', ['titolare', 'admin_rete'])
    .maybeSingle()

  if (!destinatario) {
    return NextResponse.json(
      { error: 'Nessun account trovato con questa email' },
      { status: 422 }
    )
  }

  // Dedup: riusa invito pendente esistente per rete+email invece di duplicare
  const { data: esistenti } = await svc
    .from('inviti_rete')
    .select('id, accepted_at, revoked_at, expires_at')
    .eq('rete_id', id)
    .eq('email', normalizedEmail)

  const now = new Date()
  const pendente = (esistenti ?? []).find(
    (i) => i.accepted_at === null && i.revoked_at === null && new Date(i.expires_at) > now
  )

  const token = randomUUID()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  if (pendente) {
    const { error } = await svc
      .from('inviti_rete')
      .update({ token_hash: tokenHash, expires_at: expiresAt, invitato_da: ctx.userId })
      .eq('id', pendente.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await svc.from('inviti_rete').insert({
      rete_id: id,
      email: normalizedEmail,
      token_hash: tokenHash,
      invitato_da: ctx.userId,
      expires_at: expiresAt,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
  const inviteUrl = `${appUrl}/rete/invito/${token}`
  await sendInvitoReteEmail({
    email: normalizedEmail,
    reteNome: ctx.rete.nome,
    inviteUrl,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
