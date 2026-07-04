import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function GET() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id

  const { data, error } = await svc
    .from('fornitori')
    .select('id, ragione_sociale, telefono, email')
    .eq('laboratorio_id', labId)
    .eq('attivo', true)
    .is('deleted_at', null)
    .order('ragione_sociale', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const fornitori = (data ?? []).map((f) => ({
    id: f.id,
    nome: f.ragione_sociale,
    telefono: f.telefono,
    email: f.email,
  }))

  return NextResponse.json({ fornitori })
}
