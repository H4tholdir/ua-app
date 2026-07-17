import 'server-only'
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

async function verifyAdmin() {
  const context = await getFreshLabContext()
  return context?.ruolo === 'admin_sistema' ? context : null
}

function getRequestOrigin(req: Request): string {
  const origin = req.headers.get('origin')
  if (origin) return origin

  const host = req.headers.get('host')
  if (host) {
    const protocol = host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
      ? 'http'
      : 'https'
    return `${protocol}://${host}`
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const guard = assertLabOperativo(admin, 'POST')
  if (guard) return guard

  const { id } = await params
  const svc = getServiceClient()

  // Trova il titolare del laboratorio
  const { data: titolare } = await svc
    .from('utenti')
    .select('id, nome, cognome, email')
    .eq('laboratorio_id', id)
    .eq('ruolo', 'titolare')
    .maybeSingle()

  if (!titolare?.email) {
    return NextResponse.json({ error: 'Nessun titolare con email trovato per questo laboratorio' }, { status: 404 })
  }

  // Usa un origin assoluto per supportare sia localhost che production.
  const requestOrigin = getRequestOrigin(req)

  // Genera un token monouso via Supabase Auth Admin. Non restituiamo il raw
  // action_link Supabase: passa da /auth/v1/verify e rientra con hash/OTP,
  // incompatibile con il callback SSR/PKCE dell'app.
  const { data, error } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: titolare.email,
  })

  if (error || !data?.properties?.hashed_token) {
    console.error('[impersonate] generateLink error:', error?.message)
    return NextResponse.json({ error: error?.message ?? 'Impossibile generare il link' }, { status: 500 })
  }

  const impersonationUrl = new URL('/auth/callback', requestOrigin)
  impersonationUrl.searchParams.set('token_hash', data.properties.hashed_token)
  impersonationUrl.searchParams.set('type', 'email')
  impersonationUrl.searchParams.set('next', '/dashboard')

  const nomeTitolare = `${titolare.nome ?? ''} ${titolare.cognome ?? ''}`.trim() || titolare.email

  return NextResponse.json({
    action_link: impersonationUrl.toString(),
    titolare_nome: nomeTitolare,
    titolare_email: titolare.email,
  })
}
