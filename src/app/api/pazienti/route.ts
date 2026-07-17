import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cliente_id = searchParams.get('cliente_id')

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
      .from('pazienti')
      .select('id, laboratorio_id, cliente_id, codice_paziente, nome, cognome, nome_cognome, data_nascita, codice_fiscale, sesso, note, archiviato')
      .eq('laboratorio_id', labId)
      .eq('archiviato', false)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
      .limit(500)

    if (cliente_id) {
      query = query.eq('cliente_id', cliente_id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pazienti: data ?? [] })
  })
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.cliente_id || typeof body.cliente_id !== 'string') {
    return NextResponse.json({ error: 'Il campo "cliente_id" è obbligatorio' }, { status: 422 })
  }

  // Verifica che il cliente appartenga a questo laboratorio
  const { data: clienteCheck } = await svc
    .from('clienti')
    .select('id')
    .eq('id', body.cliente_id as string)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!clienteCheck) {
    return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  }

  // Invia solo nome + cognome — il trigger DB sincronizza nome_cognome
  const insertData = {
    laboratorio_id: labId,
    cliente_id: body.cliente_id as string,
    nome: body.nome ?? null,
    cognome: body.cognome ?? null,
    // nome_cognome è gestito da trigger DB — non impostare qui
    codice_paziente: body.codice_paziente ?? null,
    data_nascita: body.data_nascita ?? null,
    codice_fiscale: body.codice_fiscale ?? null,
    sesso: body.sesso ?? null,
    comune_nascita: body.comune_nascita ?? null,
    asl: body.asl ?? null,
    note: body.note ?? null,
    archiviato: false,
  }

  const { data: paziente, error: insertError } = await svc
    .from('pazienti')
    .insert(insertData)
    .select('id, nome, cognome, nome_cognome, cliente_id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ paziente }, { status: 201 })
}
