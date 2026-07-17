import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { pgrestQuote } from '@/lib/utils/escape-postgrest'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }
    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    let query = svc
      .from('clienti')
      .select(
        'id, studio_nome, nome, cognome, telefono, email, citta, provincia, partita_iva, codice_fiscale, codice_sdi, pec, listino_numero, sconto_percentuale, note, portale_token'
      )
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
      .limit(500)

    if (q) {
      const pattern = pgrestQuote(`%${q}%`)
      query = query.or(`cognome.ilike.${pattern},nome.ilike.${pattern},studio_nome.ilike.${pattern}`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ clienti: data ?? [] })
  })
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

  // Validazione campi obbligatori
  if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ error: 'Il campo "nome" è obbligatorio' }, { status: 422 })
  }
  if (!body.cognome || typeof body.cognome !== 'string' || !body.cognome.trim()) {
    return NextResponse.json({ error: 'Il campo "cognome" è obbligatorio' }, { status: 422 })
  }

  const insertData = {
    laboratorio_id: labId,
    nome: (body.nome as string).trim(),
    cognome: (body.cognome as string).trim(),
    studio_nome: body.studio_nome ?? null,
    telefono: body.telefono ?? null,
    email: body.email ?? null,
    partita_iva: body.partita_iva ?? null,
    codice_fiscale: body.codice_fiscale ?? null,
    codice_sdi: body.codice_sdi ?? null,
    pec: body.pec ?? null,
    indirizzo: body.indirizzo ?? null,
    cap: body.cap ?? null,
    citta: body.citta ?? null,
    provincia: body.provincia ?? null,
    paese: (body.paese as string) ?? 'IT',
    listino_numero: body.listino_numero ?? 1,
    sconto_percentuale: body.sconto_percentuale ?? 0,
    tecnico_default_id: body.tecnico_default_id ?? null,
    modalita_pagamento: body.modalita_pagamento ?? null,
    non_soggetto_fe: body.non_soggetto_fe ?? false,
    note: body.note ?? null,
  }

  const { data: cliente, error: insertError } = await svc
    .from('clienti')
    .insert(insertData)
    .select('id, nome, cognome, studio_nome')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ cliente }, { status: 201 })
}
