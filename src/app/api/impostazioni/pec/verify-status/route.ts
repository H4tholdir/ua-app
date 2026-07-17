import 'server-only'
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Token mancante' }, { status: 400 })

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'Lab non trovato' }, { status: 403 })

  const svc = getServiceClient()
  const { data: lab } = await svc
    .from('laboratori')
    .select('pec_verificata, pec_verified_at, pec_verify_token')
    .eq('id', context.laboratorioId)
    .single()

  if (!lab) return NextResponse.json({ error: 'Lab non trovato' }, { status: 404 })

  const tokenMatches = lab.pec_verify_token === token || lab.pec_verificata

  return NextResponse.json({
    verified: lab.pec_verificata && tokenMatches,
    verified_at: lab.pec_verified_at,
  })
}
