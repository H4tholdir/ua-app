import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  // Recupera il cliente [id] con il suo studio_nome
  const { data: cliente, error: clienteError } = await svc
    .from('clienti')
    .select('id, studio_nome')
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (clienteError || !cliente) {
    return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  }

  // Se studio_nome è null → nessun collega di studio
  if (!cliente.studio_nome) {
    return NextResponse.json([])
  }

  // Recupera gli altri clienti dello stesso lab con lo stesso studio_nome
  const { data: members, error: membersError } = await svc
    .from('clienti')
    .select('id, nome, cognome, studio_nome')
    .eq('laboratorio_id', labId)
    .eq('studio_nome', cliente.studio_nome)
    .neq('id', id)
    .is('deleted_at', null)
    .order('cognome', { ascending: true })

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  return NextResponse.json(members ?? [])
}
