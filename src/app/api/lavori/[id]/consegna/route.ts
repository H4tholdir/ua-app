import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { orchestraConsegna } from '@/lib/consegna/orchestrate'
import { getServerUserClient } from '@/lib/supabase/server-user'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const supabase = await getServerUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: lavoro_id } = await params
  const result = await orchestraConsegna(lavoro_id)

  return NextResponse.json(result, {
    status: result.ok ? 200 : 422,
  })
}
