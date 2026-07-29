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
  //
  // Z2 — il codice si NORMALIZZA in scrittura: spazi ai bordi via, e una
  // casella lasciata vuota vale ASSENZA (`null`), non stringa vuota. Il
  // valore normalizzato è UNO SOLO e alimenta entrambe le destinazioni (la
  // regola del nome qui sotto e la colonna a `:139`).
  //   🛑 La MAIUSCOLA non si tocca. L'indice unico previsto da T5 confronterà
  //   con `lower(btrim(...))`, ma il codice si CONSERVA come l'utente l'ha
  //   scritto: è un identificativo che finisce su documenti conservati per
  //   legge (Art. 10(5) + Allegato XIII p.4), e riscriverlo sarebbe alterare
  //   un dato dell'utente per comodità nostra.
  //   ⚠️ `trim()` di JavaScript toglie PIÙ di `btrim()` di Postgres (tab,
  //   a-capo, spazi unicode). Divergenza voluta e dalla parte sicura, come in
  //   `dati-wizard.ts:50-53`: scrivendo il valore ripulito, due codici che
  //   differiscono solo per un tab COLLIDONO all'indice invece di convivere
  //   sotto chiavi diverse.
  //   🔑 La guardia di tipo resta ESTERNA al `trim()`: un `codice_paziente`
  //   non-stringa (`42`) collassa a `null` come prima, contratto 🟠 ALTO 1.
  const codiceNormalizzato =
    typeof body.codice_paziente === 'string' ? body.codice_paziente.trim() || null : null
  const coppia = risolviNomePaziente({
    cognome: cognomeEffettivo(
      typeof body.cognome === 'string' ? body.cognome : null,
      codiceNormalizzato
    ),
    nome: typeof body.nome === 'string' ? body.nome : null,
    codice: codiceNormalizzato,
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
    // 🟠 ALTO 1 — `codiceNormalizzato` è lo stesso valore già usato sopra per
    // alimentare `cognomeEffettivo`/`risolviNomePaziente`: scriverlo qui
    // (invece del `body.codice_paziente` grezzo) evita che la colonna
    // diverga da ciò su cui la regola del nome si è basata. Con un codice
    // non-stringa, prima la regola lo trattava come assente (null) mentre la
    // colonna riceveva comunque il valore grezzo — la guardia del «codice
    // travestito» a valle non riconosceva più il valore scritto.
    // (Z2, 30/07: la variabile si chiamava `codiceGrezzo` finché era grezza;
    // ora porta il valore normalizzato, e la divergenza che questo commento
    // descrive si estende agli spazi ai bordi.)
    codice_paziente: codiceNormalizzato,
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

    // Z1 (30/07) — un codice occupato è un fatto raccontabile, non un guasto.
    //
    // 🛑 SI GUARDA SOLO `insertError.code`, MAI `insertError.message`: il
    // messaggio di Postgres porta il nome dell'indice, le colonne e perfino il
    // valore che ha fatto collidere («Key (laboratorio_id,
    // lower(btrim(codice_paziente)))=(…) already exists»). Leggerlo per
    // decidere sarebbe già mezzo passo
    // fuori da G9, e la riga dopo qualcuno lo rimanderebbe al client.
    //
    // 🔑 PERCHÉ ANCHE `codiceNormalizzato !== null`, e non il solo `23505`.
    // `23505` è «un vincolo di unicità ha morso», non «il TUO vincolo ha
    // morso»: può nascere da un vincolo che non è il nostro. Non potendo
    // distinguerli dal lato del database senza leggere il messaggio, si
    // distingue dal lato NOSTRO — da ciò che stavamo scrivendo: se in questa
    // richiesta il codice era assente (`null`), la collisione non può
    // riguardarlo e il messaggio «il codice è già di un altro» sarebbe FALSO.
    // Il guardiano è quindi sul nostro input, mai sul testo altrui.
    //   Stato dei vincoli oggi (verificato il 30/07 su `pg_constraint`): su
    //   `pazienti` l'unico vincolo unico è `pazienti_pkey` su `id`, un uuid
    //   generato dal database e che non mandiamo mai — quindi oggi questo ramo
    //   è INERTE, e lo resta finché T5 non crea l'indice sul codice. Provato
    //   dai test (`tests/unit/api-pazienti-post.test.ts`), non «in produzione».
    if (insertError.code === '23505' && codiceNormalizzato !== null) {
      return NextResponse.json(
        {
          error: 'Questo codice è già di un altro paziente. Scrivine un altro.',
          // Il motivo è ciò che il client guarda per decidere: nessun
          // chiamante deve mai fare confronti su una frase (D36 le cambia).
          // 🔑 Si chiama `codice_gia_in_uso` e NON `codice_paziente_occupato`
          // (l'esempio del piano) per un motivo solo: `codice_paziente` è un
          // nome di colonna, e G9 dice che dal corpo di una risposta non esce
          // nessun nome di colonna. Così l'asserzione G9 dei test può essere
          // la più stretta possibile, senza eccezioni per noi stessi.
          motivo: 'codice_gia_in_uso',
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Non è stato possibile creare il paziente' }, { status: 500 })
  }

  return NextResponse.json({ paziente }, { status: 201 })
}
