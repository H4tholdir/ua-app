import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { risolviNomePaziente, cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'

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

    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

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
      // G9 — mai il testo grezzo del DB al client (nomi di vincoli, di
      // colonne, di indici: superficie di ricognizione gratuita).
      console.error('GET /api/pazienti — lettura fallita:', error.message)
      return NextResponse.json({ error: 'Non è stato possibile leggere i pazienti' }, { status: 500 })
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
  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard
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

  // La regola §5 (`risolviNomePaziente`) — MAI una coppia grezza: `nome`
  // null farebbe fallire il NOT NULL su `nome_cognome`, e una coppia vuota
  // comporrebbe `' '`, che blocca la consegna (precheck.ts:40-43). La stessa
  // funzione è applicata dal wizard: è idempotente, riapplicarla non cambia
  // nulla.
  //
  // ⚠️ `cognomeEffettivo` PRIMA, ed è obbligatorio: è la precondizione
  // dichiarata nel JSDoc di `risolviNomePaziente`, che da sola NON può
  // difendere l'invariante 3. Senza, un client che manda
  // `{cognome:'PZ-0042', nome:'Giuseppe', codice_paziente:'PZ-0042'}`
  // produce `PZ-0042 GIUSEPPE` in `nome_cognome`, che `derivaAlias` non
  // annulla → la targa scrive «Pz-0042 Giuseppe», col codice ricasato.
  const codiceGrezzo = typeof body.codice_paziente === 'string' ? body.codice_paziente : null
  const coppia = risolviNomePaziente({
    cognome: cognomeEffettivo(
      typeof body.cognome === 'string' ? body.cognome : null,
      codiceGrezzo
    ),
    nome: typeof body.nome === 'string' ? body.nome : null,
    codice: codiceGrezzo,
  })
  if (!coppia) {
    return NextResponse.json(
      { error: 'Serve almeno il codice paziente' },
      { status: 422 }
    )
  }

  const insertData = {
    laboratorio_id: labId,
    cliente_id: body.cliente_id as string,
    nome: coppia.nome,
    cognome: coppia.cognome,
    // nome_cognome è gestito dal trigger DB — non impostare qui
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
    // G9 — mai il testo grezzo del DB al client (nomi di vincoli, di
    // colonne, di indici: superficie di ricognizione gratuita).
    console.error('POST /api/pazienti — insert fallito:', insertError.message)
    return NextResponse.json({ error: 'Non è stato possibile creare il paziente' }, { status: 500 })
  }

  return NextResponse.json({ paziente }, { status: 201 })
}
