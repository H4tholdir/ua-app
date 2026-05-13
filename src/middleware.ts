// RESPONSABILITÀ: redirect visivi UX only — non è un confine di sicurezza.
// L'autorizzazione reale è in RLS + Server Component layouts.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'

const PUBLIC_ROUTES = ['/login', '/invite', '/forgot-password', '/reset-password', '/blocked', '/billing']
const AUTH_CALLBACK = '/auth/callback'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const { pathname } = request.nextUrl

  // Auth callback: lascia passare sempre per completare PKCE exchange
  if (pathname.startsWith(AUTH_CALLBACK)) return response

  // Refresh della sessione (necessario per SSR)
  const supabase = createMiddlewareClient(request, response)
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  // Non autenticato su route protetta → login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Autenticato su route auth → dashboard (eccetto /blocked e /billing che restano accessibili)
  if (user && isPublicRoute && pathname !== '/blocked' && pathname !== '/billing') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Escludi: static, api/*, favicon, immagini
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
