import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (utenteError) {
    return NextResponse.json({ error: 'Errore nel recupero del laboratorio' }, { status: 500 })
  }
  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = utente.laboratorio_id

  let query = svc
    .from('cicli_produzione')
    .select('id, codice, nome, tipo_dispositivo')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .order('codice', { ascending: true })
    .limit(8)

  if (q) {
    query = query.or(`codice.ilike.%${q}%,nome.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei cicli' }, { status: 500 })
  }

  return NextResponse.json({ cicli: data ?? [] })
}
