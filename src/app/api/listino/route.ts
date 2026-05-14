import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get('categoria')
  const q = searchParams.get('q')

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

  let query = svc
    .from('listino')
    .select(
      'id, codice, nome, descrizione, categoria, prezzo_1, prezzo_2, prezzo_3, prezzo_4, unita_misura, tipo_dispositivo_mdr, classe_rischio, da_conformare, attivo, codice_iva'
    )
    .eq('laboratorio_id', labId)
    .eq('attivo', true)
    .order('categoria', { ascending: true })
    .order('nome', { ascending: true })
    .limit(1000)

  if (categoria) {
    query = query.eq('categoria', categoria)
  }

  if (q) {
    query = query.or(`nome.ilike.%${q}%,codice.ilike.%${q}%,descrizione.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ voci: data ?? [] })
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.codice || typeof body.codice !== 'string' || !body.codice.trim()) {
    return NextResponse.json({ error: 'Il campo "codice" è obbligatorio' }, { status: 422 })
  }
  if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ error: 'Il campo "nome" è obbligatorio' }, { status: 422 })
  }
  if (!body.categoria || typeof body.categoria !== 'string' || !body.categoria.trim()) {
    return NextResponse.json({ error: 'Il campo "categoria" è obbligatorio' }, { status: 422 })
  }

  const insertData = {
    laboratorio_id: labId,
    codice: (body.codice as string).trim().toUpperCase(),
    nome: (body.nome as string).trim(),
    descrizione: body.descrizione ?? null,
    categoria: (body.categoria as string).trim(),
    prezzo_1: body.prezzo_1 ?? null,
    prezzo_2: body.prezzo_2 ?? null,
    prezzo_3: body.prezzo_3 ?? null,
    prezzo_4: body.prezzo_4 ?? null,
    unita_misura: body.unita_misura ?? 'pz',
    tipo_dispositivo_mdr: body.tipo_dispositivo_mdr ?? null,
    classe_rischio: body.classe_rischio ?? null,
    da_conformare: body.da_conformare ?? true,
    norma_riferimento: body.norma_riferimento ?? null,
    ciclo_id: body.ciclo_id ?? null,
    codice_iva: body.codice_iva ?? 'N4',
    compenso_tecnico: body.compenso_tecnico ?? null,
    attivo: true,
  }

  const { data: voce, error: insertError } = await svc
    .from('listino')
    .insert(insertData)
    .select('id, codice, nome, categoria, prezzo_1')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ voce }, { status: 201 })
}
