import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Token mancante' }, { status: 400 })

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) return NextResponse.json({ error: 'Lab non trovato' }, { status: 403 })

  const { data: lab } = await svc
    .from('laboratori')
    .select('pec_verificata, pec_verified_at, pec_verify_token')
    .eq('id', utente.laboratorio_id)
    .single()

  if (!lab) return NextResponse.json({ error: 'Lab non trovato' }, { status: 404 })

  const tokenMatches = lab.pec_verify_token === token || lab.pec_verificata

  return NextResponse.json({
    verified: lab.pec_verificata && tokenMatches,
    verified_at: lab.pec_verified_at,
  })
}
