import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { isSameOrigin } from '@/lib/utils/csrf'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
// 🔑 La validazione del dente è UNA SOLA e vive in `lib/domain`: la chiamano
// questa sostituzione e la creazione (`POST /api/lavori`). Fino al 28/07/2026
// viveva solo qui e il POST passava alla RPC l'oggetto grezzo: le due porte
// rispondevano in modo diverso allo stesso corpo, e dalla parte del POST la
// risposta era un 500 col lavoro che non nasceva (rilievo G2). Due copie della
// stessa regola — una che si aggiorna e l'altra no — sono la classe R3.
import { validaDenti } from '@/lib/domain/denti-validazione'

// PUT a SOSTITUZIONE INTEGRALE (spec §4): il client manda la lista che vuole
// vedere, non un delta. Idempotente per costruzione; 6 denti = 1 chiamata.
//
// La validazione vive in una porta e non nei soli CHECK del database perché un
// CHECK produrrebbe un 500 illeggibile: chi sbaglia un dente deve sapere QUALE.
// L'elenco dei controlli, e il suo gemello in
// `20260727120100_lavori_denti_tabella.sql`, stanno adesso in
// `src/lib/domain/denti-validazione.ts` — insieme alla ragione per cui i due
// elenchi devono dire la stessa cosa.

type RouteContext = { params: Promise<{ id: string }> }

function errore422(messaggio: string, valore?: unknown) {
  return NextResponse.json({ error: messaggio, valore }, { status: 422 })
}

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })

  const guard = assertLabOperativo(context, 'PUT')
  if (guard) return guard

  let grezzo: unknown
  try {
    grezzo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  // ⚠️ `JSON.stringify(null)` è la stringa "null": `req.json()` la parsa senza
  // lanciare, quindi il `catch` qui sopra NON scatta e un `body.denti` su null
  // sarebbe un TypeError → 500 non gestito. Stessa classe del difetto
  // «Important #1» già corretto in `lavori/[id]/cassetta/route.ts`: un corpo
  // che non è un oggetto è un errore di richiesta, e va detto.
  if (grezzo === null || typeof grezzo !== 'object' || Array.isArray(grezzo)) {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  const body = grezzo as Record<string, unknown>

  // 🔑 IL GETTONE DI CONCORRENZA È OBBLIGATORIO (rilievo M1 della revisione
  // pre-merge, 28/07/2026). Prima era facoltativo, e questo PUT è a
  // SOSTITUZIONE INTEGRALE: chi non mandava la chiave CANCELLAVA la lista denti
  // scritta da un collega e riceveva 200. Riprodotto sul database vero, in una
  // transazione annullata: due chiamate consecutive con
  // `p_atteso_updated_at := NULL` tornano ENTRAMBE `{"esito":"ok"}` e alla fine
  // resta un dente solo — nessun 409. E quella lista alimenta la
  // denormalizzazione che la Dichiarazione di Conformità stampa.
  //
  // 🛑 LA GUARDIA VIVE QUI, E LA RPC RESTA PERMISSIVA — scelta, non dimenticanza.
  //    `20260727120300_lavori_denti_rpc.sql:61` salta il confronto quando
  //    `p_atteso_updated_at IS NULL`, e continua a farlo. La ragione è di
  //    vocabolario, non di comodità: la RPC conosce tre esiti — `non_trovato`,
  //    `conflitto`, `ok` — e «non hai mandato la chiave» non è nessuno dei tre.
  //    Farle rispondere `conflitto` significherebbe far dire a questa route «Il
  //    lavoro è stato modificato da qualcun altro» a chi ha solo sbagliato la
  //    richiesta: una bugia. Darle un quarto esito vorrebbe dire cambiare anche
  //    il chiamante, cioè un intervento più grande del difetto.
  //    Il perimetro regge: la funzione è in REVOKE da PUBLIC/anon/authenticated
  //    e in GRANT al solo `service_role` (stessa migration, righe 223-226), e il
  //    censimento del catalogo vivo dice che NESSUNA funzione in banca dati la
  //    chiama — `SELECT proname FROM pg_proc WHERE prosrc ILIKE
  //    '%lavoro_denti_sostituisci_atomica%'` dà 1 sola riga, `lavoro_crea_atomico`,
  //    e lì il nome compare in un COMMENTO, non in una chiamata. Questa route è
  //    l'unica porta che esiste. Se un domani ne nascesse una seconda, la
  //    guardia va ricopiata lì — oppure si dà alla RPC il suo quarto esito.
  //
  // 🔑 Il valore viaggia COSÌ COM'È, senza mai passare da un `new Date(...)`:
  // `timestamptz` ha precisione al microsecondo, `Date` di JS al millisecondo.
  // Un solo giro di riparsing troncherebbe `.123456` a `.123` e il confronto
  // `IS DISTINCT FROM` dentro la RPC non tornerebbe MAI uguale: 409 permanente,
  // che nemmeno ricaricando la pagina si sana. Il `.trim()` qui sotto serve
  // SOLO a decidere se la stringa è vuota — non tocca il valore spedito.
  //
  // La stringa vuota è respinta perché `''::timestamptz` è un errore di cast
  // (SQLSTATE 22007, provato: «invalid input syntax for type timestamp with
  // time zone: ""»), cioè un 500 illeggibile al posto di un 422. Stesso motivo
  // per cui si rifiuta un numero.
  //
  // ⚠️ LIMITE DICHIARATO: una stringa non vuota ma non interpretabile come
  // istante (`'pippo'`) supera questa porta e sbatte sullo stesso 22007 → 500.
  // Chiuderlo vorrebbe dire riconoscere qui tutte le forme che Postgres accetta:
  // non è nel perimetro di questa correzione, ed è meglio scritto che dedotto.
  const attesoGrezzo = body.atteso_updated_at
  if (typeof attesoGrezzo !== 'string' || attesoGrezzo.trim().length === 0) {
    return errore422(
      'atteso_updated_at obbligatorio: è updated_at del lavoro che stai sostituendo',
      attesoGrezzo
    )
  }
  const atteso = attesoGrezzo

  // 🔑 Qui la lista è IL CORPO della richiesta: la sua assenza è un errore, e
  // `undefined` non è un array, quindi cade sullo stesso messaggio di sempre.
  // Sul POST la stessa chiave è facoltativa e la sua assenza vuol dire «nessun
  // dente»: è l'unica differenza fra le due porte, e vive qui — alle porte —
  // apposta perché si veda (v. `denti-validazione.ts`).
  const esitoDenti = validaDenti(body.denti)
  if (!esitoDenti.ok) return errore422(esitoDenti.errore, esitoDenti.valore)
  const denti = esitoDenti.denti

  // ⚠️ LIMITE DICHIARATO, ora scritto una volta sola per tutte e due le porte:
  // una coppia (scala, codice) sintatticamente valida ma inesistente in
  // `colori_dentali` viola `lavori_denti_colore_fk` e torna 500, non 422. Il
  // perché non è chiuso qui sta in testa a `denti-validazione.ts`: la chiusura
  // vuole due esiti DIVERSI sulle due porte, e quindi un progetto, non
  // un'estrazione.

  // laboratorio_id e lavoro_id eventualmente presenti nel body si IGNORANO:
  // si derivano da sessione e URL. Il client non sceglie il proprio tenant.
  const svc = getServiceClient()
  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('lavoro_denti_sostituisci_atomica', {
      p_lab: context.laboratorioId as string,
      p_lavoro: id,
      p_denti: denti,
      // `p_atteso_updated_at` non ha DEFAULT in SQL e PostgREST risolve
      // l'overload sull'INSIEME delle chiavi del body: la chiave va mandata
      // SEMPRE. Ometterla darebbe PGRST202 «function not found» sul percorso più
      // comune di tutti. Da quando il gettone è obbligatorio (M1) qui arriva
      // sempre una stringa non vuota — il ramo `null` non esiste più.
      p_atteso_updated_at: atteso,
    })
  )

  // postgrest NON lancia: l'errore si controlla, non si aspetta in un catch.
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const esito = data as { esito: string; updated_at?: string } | null
  if (esito?.esito === 'non_trovato') {
    // Anche il caso cross-tenant finisce qui: un lavoro di un altro laboratorio
    // non esiste, non è «vietato». 404, non 403 (R4).
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }
  if (esito?.esito === 'conflitto') {
    return NextResponse.json(
      { error: 'Il lavoro è stato modificato da qualcun altro', updated_at: esito.updated_at },
      { status: 409 }
    )
  }
  if (esito?.esito !== 'ok') {
    return NextResponse.json({ error: 'Esito inatteso' }, { status: 500 })
  }

  // Si restituisce la lista NORMALIZZATA — quella davvero scritta, con i
  // default di `ruolo`/`provenienza` applicati — non l'eco del corpo ricevuto:
  // il chiamante deve poter ridisegnare da questa risposta senza rileggere.
  return NextResponse.json({ denti, updated_at: esito.updated_at })
}
