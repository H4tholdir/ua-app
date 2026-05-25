import { NextRequest, NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function PATCH(req: NextRequest) {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const ALLOWLIST = ['preferenza_dashboard'] as const
  const allowed: Record<string, unknown> = {}
  for (const key of ALLOWLIST) {
    if (key in body) allowed[key] = body[key]
  }
  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  if ('preferenza_dashboard' in allowed && !['ibrido', 'gestione_solo'].includes(allowed.preferenza_dashboard as string))
    return NextResponse.json({ error: 'Invalid preferenza_dashboard' }, { status: 400 })

  const svc = getServiceClient()
  const { error } = await svc
    .from('utenti')
    .update(allowed)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
