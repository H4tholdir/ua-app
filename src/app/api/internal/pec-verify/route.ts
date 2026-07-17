import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'

// N13 (appsec R7): confronto in tempo costante — il digest SHA-256 normalizza
// le lunghezze, timingSafeEqual evita l'oracolo di timing del !== su stringhe.
function secretValido(candidato: string | null): boolean {
  const atteso = process.env.INTERNAL_SECRET
  if (!candidato || !atteso) return false
  const a = createHash('sha256').update(candidato).digest()
  const b = createHash('sha256').update(atteso).digest()
  return timingSafeEqual(a, b)
}

// Chiamata da Cloudflare Email Worker quando arriva l'email di verifica
// Autenticazione: header x-internal-secret
export async function POST(req: Request) {
  if (!secretValido(req.headers.get('x-internal-secret'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { token?: string } | null = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body?.token || typeof body.token !== 'string') {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 })
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(body.token)) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 400 })
  }

  const svc = getServiceClient()
  const { data, error } = await svc
    .from('laboratori')
    .update({
      pec_verificata: true,
      pec_verified_at: new Date().toISOString(),
      pec_verify_token: null,
      pec_smtp_configurata: true,
    })
    .eq('pec_verify_token', body.token)
    .select('id')

  if (error) {
    console.error('[pec-verify-callback] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, reason: 'token_not_found' })
  }

  console.log('[pec-verify-callback] Verified lab with token:', body.token.slice(0, 8))
  return NextResponse.json({ ok: true })
}
