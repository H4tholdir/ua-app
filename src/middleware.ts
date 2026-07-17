// RESPONSABILITÀ: redirect visivi UX only — non è un confine di sicurezza.
// L'autorizzazione reale è nel contesto server-side (getLabContext/getFreshLabContext,
// query utenti fresca per-request) + scoping laboratorio_id. R2b′: getClaims()
// verifica ES256 locale (JWKS in cache) — zero rete a token valido; a token
// scaduto passa dal refresh di rete e riscrive i cookie via setAll (invariato).
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'

const PUBLIC_ROUTES = ['/login', '/invite', '/forgot-password', '/reset-password', '/blocked', '/billing', '/portale', '/richiedi', '/ds-v3-catalogo']
const AUTH_CALLBACK = '/auth/callback'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // x-pathname: il layout (app) non può leggere il pathname (gotcha CLAUDE.md §9);
  // lo inoltriamo come request header per il log strutturato (spec R2 §D-6).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  const response = NextResponse.next({ request: { headers: requestHeaders } })

  if (pathname.startsWith(AUTH_CALLBACK)) return response

  const t0 = Date.now()
  const supabase = createMiddlewareClient(request, response)
  const { data } = await supabase.auth.getClaims()
  const authMs = Date.now() - t0
  const claims = data?.claims ?? null

  // Server-Timing anche sui redirect (riserva SRE R6b). Se il ramo finale è un
  // redirect diverso da `response`, i cookie eventualmente riscritti da setAll
  // (refresh token) su `response` NON vengono ereditati automaticamente dal
  // nuovo NextResponse.redirect(...) — vanno copiati esplicitamente.
  const withTiming = (res: NextResponse) => {
    if (res !== response) {
      response.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c))
    }
    res.headers.set('Server-Timing', `auth;dur=${authMs}`)
    return res
  }

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  if (!claims && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('next', pathname)
    }
    return withTiming(NextResponse.redirect(loginUrl))
  }

  if (
    claims &&
    isPublicRoute &&
    pathname !== '/blocked' &&
    pathname !== '/billing' &&
    !pathname.startsWith('/ds-v3-catalogo')
  ) {
    return withTiming(NextResponse.redirect(new URL('/dashboard', request.url)))
  }

  return withTiming(response)
}

export const config = {
  matcher: [
    // Escludi: static Next.js, api/*, favicon, file statici pubblici, portale dentista
    '/((?!_next/static|_next/image|favicon.ico|api/|portale/|richiedi/|sw\\.js|manifest\\.json|offline\\.html|icons/|sounds/|fonts/|animations/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav)$).*)',
  ],
}
