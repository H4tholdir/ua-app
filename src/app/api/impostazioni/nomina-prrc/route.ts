import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'

export async function GET() {
  // Stub — il generatore PDF reale arriva con Task 26
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  return NextResponse.json({
    message: 'Funzionalità disponibile in Fase 3',
  })
}
