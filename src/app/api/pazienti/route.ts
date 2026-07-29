import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { risolviNomePaziente, cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'
import { pgrestQuote, ilikeLiterale } from '@/lib/utils/escape-postgrest'
import { derivaAlias } from '@/lib/cassette/parco-shared'

// T6 (ondata b) — la ricerca del paziente per il passo «Paziente» del wizard.
//
// 🛑 QUESTA ROTTA NON RISPONDE ALLA DOMANDA «CHI OCCUPA IL CODICE».
// A quella risponde `trovaOccupanteCodice` (`src/lib/domain/codice-paziente-unicita.ts`),
// che rispecchia ALLA LETTERA il predicato dell'indice unico
// `pazienti_codice_lab_uidx`: cieca allo stato (nessun `archiviato`, nessun
// `deleted_at`), larga su TUTTO il laboratorio (nessun `cliente_id`) e senza
// limite di righe. Questa ricerca è l'opposto per costruzione: filtra
// `archiviato = false`, è ristretta a UN solo studio ed è tagliata a dieci
// righe. Usarla come riconoscimento — «non compare, quindi il codice è
// libero» — riaprirebbe esattamente il buco che `trovaOccupanteCodice` esiste
// per chiudere: direbbe «libero» su un codice occupato da una scheda
// archiviata, di un altro dentista, o semplicemente oltre la decima riga.
// Vale per T15 e per ogni chiamante futuro (D46).

/** Tetto duro sulle righe rese al pannello dei suggerimenti (D44). */
const TETTO_RICERCA = 10
/** Tetto del percorso storico «elenco per studio», invariato (voce RATE-1). */
const TETTO_ELENCO = 500
/**
 * Tetto di lunghezza sul termine — 🛑 GUARDIA, NON TRONCAMENTO (D50).
 * Oltre la soglia si risponde `200 { pazienti: [] }` senza toccare il
 * database, esattamente come fa la guardia sul vuoto.
 *
 * 🔑 PERCHÉ NON SI TRONCA. Con i metacaratteri tutti spenti, un termine di 70
 * caratteri non combacia con niente: troncarlo a 64 lo fa combaciare DI PIÙ di
 * quanto l'utente abbia chiesto, cioè restituisce suggerimenti per un testo che
 * non ha scritto, in silenzio. È lo stesso principio con cui D48 vieta di
 * alterare ciò che l'utente ha digitato. (Fino al 29/07 la rotta tagliava con
 * `.slice()`, e il tetto era entrato senza un numero di decisione: ora ha D50,
 * con la forma cambiata.)
 *
 * 🛑 LA MISURA È SUL TERMINE GREZZO RIPULITO AI BORDI, PRIMA DELL'ESCAPE, e la
 * scelta è dichiarata perché le due letture non danno lo stesso esito:
 *   · misurando DOPO l'escape, 40 `%` (40 caratteri digitati) diventano 80 e
 *     sparirebbero dietro la guardia — cioè la rotta risponderebbe «niente» a
 *     una ricerca legittima, che è il difetto che D50 esiste per chiudere;
 *   · misurando dopo la rimozione degli `*`, 40 lettere più 30 asterischi
 *     passerebbero: ma per saperlo la rotta dovrebbe rifare in casa ciò che fa
 *     `ilikeLiterale`, e due copie della stessa regola divergono.
 * Si conta quindi ciò che l'utente ha digitato, asterischi compresi: oltre 64
 * caratteri in ingresso la guardia scatta a prescindere da cosa siano.
 *
 * ⚠️ Il tetto NON entra nella scelta del ramo, che resta su `q !== null`: un
 * termine lungo senza `cliente_id` prende comunque il 400 di portata, perché
 * quel controllo viene prima.
 */
const MAX_CARATTERI_Q = 64

/**
 * La riga come esce dal database — DIVERSA dalla riga che esce dalla rotta.
 * `nome_cognome` si seleziona come INGRESSO di `derivaAlias` e non esce mai
 * (T6 punto 10): non è una violazione di B2, che parla della risposta.
 */
type RigaPazienteDB = {
  id: string
  codice_paziente: string | null
  nome_cognome: string | null
  lavori: { data_ingresso: string }[] | null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cliente_id = searchParams.get('cliente_id')
  // 🛑 `q` si legge GREZZO e il ramo si sceglie su `q !== null`, MAI su
  // `if (q)`: `searchParams.get('q')` restituisce `''` per `?q=`, e `''` è
  // falso. Con `if (q)` una casella di ricerca SVUOTATA cadrebbe nel ramo
  // storico — dove `cliente_id` non serve e il tetto è 500 — e il vincolo di
  // portata si aggirerebbe togliendo un carattere (D46).
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

    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

    const labId: string = context.laboratorioId

    // Portata (D11/D46): con `q` lo studio è OBBLIGATORIO. Non è isolamento —
    // l'isolamento è il solo `laboratorio_id` qui sotto, e questa rotta usa
    // `getServiceClient()`, quindi aggira la RLS e gli `.eq()` espliciti sono
    // l'unico argine. È portata: senza studio, un termine di due lettere
    // aprirebbe l'anagrafica dell'intero laboratorio a ogni tasto premuto.
    //
    // ⚠️ 400 e non 422: il precedente in casa per un parametro di QUERY
    // mancante è `impostazioni/pec/verify-status/route.ts:11`; i 422 del
    // progetto sono tutti semantica di CORPO, e una GET non ha corpo.
    // 🔑 Il `motivo` è leggibile a macchina, mai una frase (le frasi cambiano):
    // si chiama `studio_mancante` e non `cliente_id_mancante` perché
    // `cliente_id` è un nome di colonna, e per G9 dal corpo di una risposta
    // non esce nessun nome di colonna.
    if (q !== null && !cliente_id) {
      return NextResponse.json(
        { error: 'Serve prima lo studio per cercare un paziente.', motivo: 'studio_mancante' },
        { status: 400 }
      )
    }

    // L'escape del termine, nell'ordine di D48 — e prima di toccare il
    // database, perché la guardia sul vuoto deve poter chiudere qui.
    let filtroRicerca: string | null = null
    if (q !== null) {
      // `.trim()` come in `fasi-produzione/ricerca/route.ts:9`. Il valore
      // grezzo resta quello letto sopra: la scelta del ramo non dipende da
      // questa ripulitura.
      const grezzo = q.trim()
      // 🛑 GUARDIA SUL TERMINE TROPPO LUNGO (D50) — stessa uscita della
      // guardia sul vuoto, e per la stessa ragione: si risponde «nessun
      // risultato», non un risultato che l'utente non ha chiesto. Si misura
      // QUI, sul digitato, prima che l'escape ne cambi la lunghezza.
      if (grezzo.length > MAX_CARATTERI_Q) {
        return NextResponse.json({ pazienti: [] })
      }
      const termine = ilikeLiterale(grezzo)
      // 🛑 GUARDIA SUL VUOTO, e sta DOPO l'escape, mai prima: `q='*'` è
      // non-vuoto in ingresso e collassa a `''` uscendo da `ilikeLiterale`.
      // Senza questa riga il pattern diventerebbe `%%` e la risposta sarebbe
      // l'anagrafica intera dello studio (provato, D48).
      if (termine === '') {
        return NextResponse.json({ pazienti: [] })
      }
      const pattern = pgrestQuote(`%${termine}%`)
      // Quattro colonne (D47, che emenda D44). `nome_cognome` rientra perché
      // è l'unica che contiene il nome COME LO SI LEGGE a schermo
      // (`'bagheria giuseppe'`: 0 righe senza, 1 con); `cognome` e `nome`
      // restano perché il soprainsieme non è garantito — il trigger
      // `sync_paziente_nome_cognome` ricompone solo se ENTRAMBI sono non-null
      // (`002_fase2_schema.sql:124`), e nessun vincolo lo fa rispettare.
      filtroRicerca =
        `codice_paziente.ilike.${pattern},` +
        `nome_cognome.ilike.${pattern},` +
        `cognome.ilike.${pattern},` +
        `nome.ilike.${pattern}`
    }

    const svc = getServiceClient()
    let query = svc
      .from('pazienti')
      // Proiezione stretta SEMPRE, non condizionale: in casa non esiste un
      // solo precedente di risposta che cambia forma col parametro (D46).
      // 🛑 `laboratorio_id`, `cliente_id` e `archiviato` restano FILTRI: `.eq()`
      // non richiede la colonna in `select`. `nome`, `cognome`,
      // `data_nascita`, `codice_fiscale`, `sesso` e `note` non hanno alcun
      // lettore (P3) e smettono di scorrere verso il browser.
      .select('id, codice_paziente, nome_cognome, lavori(data_ingresso)')
      .eq('laboratorio_id', labId)
      .eq('archiviato', false)
      // Ordine TOTALE, e il terzo criterio non è eleganza: 911 righe su 916
      // hanno `cognome` e `nome` entrambi NULL (misurato) e in ASC i NULL
      // vanno in fondo — senza `id`, QUALI righe finiscono nelle dieci non è
      // deterministico fra due chiamate, e il pannello si ridisegna a ogni
      // tasto. Un tetto duro senza un ordine totale non è un tetto, è un
      // campione.
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
      .order('id', { ascending: true })
      // 🛑 L'innesto «ultimo lavoro» in UNA sola andata (P6-forma): `order` +
      // `limit` PER PADRE, grafia `referencedTable` (non `foreignTable`,
      // deprecata). Senza il limite per padre ogni riga porterebbe TUTTE le
      // date d'ingresso: non sarebbe `ultimoLavoro`, sarebbe la cronologia
      // delle prestazioni di dieci pazienti a ogni richiesta — Art. 9 GDPR.
      // 🛑 Innesto SEMPLICE, MAI `!inner`: `!inner` restituirebbe `[]` e
      // cancellerebbe dal risultato i pazienti senza lavori.
      //
      // 🔑 SONO DUE COPIE, ED È DELIBERATO — l'handoff dell'ondata (b) avvisava
      // di «non farne due copie che decidono diversamente». L'altra è in
      // `src/lib/domain/codice-paziente-unicita.ts` (T7). Restano separate
      // perché sono due cose diverse: là una funzione di libreria con `svc`
      // iniettato, cieca allo stato e larga su TUTTO il laboratorio (rispecchia
      // l'indice unico), che ritorna `dataUltimoLavoro`; qui una rotta ristretta
      // a uno studio, che filtra `archiviato` e ritorna `ultimoLavoro`. Unirle
      // significherebbe dare all'una la portata dell'altra.
      // 🛑 MA DEVONO CONTINUARE A DECIDERE UGUALE, e oggi lo fanno alla lettera
      // (verificato il 29/07, tutti e cinque i punti): stessa `select`, stesso
      // `order` discendente su `data_ingresso`, stesso `limit(1)` per padre,
      // stesso `is('lavori.deleted_at', null)`, stessa estrazione
      // `lavori?.[0]?.data_ingresso ?? null`. Chi tocca uno dei cinque QUI, li
      // tocca anche LÀ — altrimenti due schermate diranno due date diverse per
      // lo stesso paziente, e nessun test se ne accorgerà: i due file non si
      // incontrano mai.
      .order('data_ingresso', { referencedTable: 'lavori', ascending: false })
      // 🔑 Il tetto sta FUORI dal ramo `if`, non dentro: è il precedente che
      // degrada in sicurezza (`fasi-produzione/ricerca/route.ts:32`). Dentro
      // il ramo, un percorso dimenticato resterebbe senza tetto.
      .limit(q !== null ? TETTO_RICERCA : TETTO_ELENCO)
      .limit(1, { referencedTable: 'lavori' })
      // L'ultimo lavoro non può essere uno cancellato — e l'indice esistente
      // su `lavori(paziente_id)` è parziale proprio su questo predicato.
      .is('lavori.deleted_at', null)

    if (cliente_id) {
      query = query.eq('cliente_id', cliente_id)
    }

    if (filtroRicerca) {
      // 🔑 Il gruppo `.or()` finisce in un parametro SEPARATO della query
      // string, che PostgREST unisce agli `.eq()` con un AND e parentesizza
      // per conto suo: il termine non può evadere dal laboratorio nemmeno
      // provandoci (provato in attacco, D48).
      query = query.or(filtroRicerca)
    }

    const { data, error } = await query

    if (error) {
      // G9 — mai il testo grezzo del DB al client (nomi di vincoli, di
      // colonne, di indici: superficie di ricognizione gratuita).
      console.error('GET /api/pazienti — lettura fallita:', error.message)
      return NextResponse.json({ error: 'Non è stato possibile leggere i pazienti' }, { status: 500 })
    }

    const righe = (data ?? []) as unknown as RigaPazienteDB[]
    const pazienti = righe.map((p) => ({
      id: p.id,
      codice_paziente: p.codice_paziente,
      // `derivaAlias` e non `cognomeEffettivo`: il secondo è l'attrezzo di
      // SCRITTURA e sulle 911 righe senza nome restituisce `''`, cioè una
      // terza convenzione per «nessun nome». `derivaAlias` restituisce `null`
      // quando il nome visibile È il codice travestito (D44).
      alias: derivaAlias({ codice_paziente: p.codice_paziente, nome_cognome: p.nome_cognome }),
      // `lavori.data_ingresso`, MAI `updated_at`: una correzione lo alzerebbe
      // e un lavoro vecchio corretto ieri risulterebbe il più recente.
      // 🛑 La chiave c'è SEMPRE: `null` significa una cosa sola — «questo
      // paziente non ha lavori». Un `null` che significhi anche «non
      // calcolato» sarebbe un valore che mente (D46).
      ultimoLavoro: p.lavori?.[0]?.data_ingresso ?? null,
    }))

    return NextResponse.json({ pazienti })
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
