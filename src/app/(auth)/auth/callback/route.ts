import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { safeRedirectPath } from '@/lib/utils/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeRedirectPath(searchParams.get('next'), '/dashboard')
  const supabase = await getServerUserClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
