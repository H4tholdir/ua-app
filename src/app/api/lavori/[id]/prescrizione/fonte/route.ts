import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { isSameOrigin } from '@/lib/utils/csrf'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
import { leggiCorpoJson } from '@/lib/api/corpo-json'
// 🛑 Il dizionario si IMPORTA, non si riscrive: la spia
// (`tests/unit/prescrizione-costanti-spia-migration.test.ts`) sorveglia la
// costante e i vincoli SQL, e una lista scritta a mano qui dentro non la
// vedrebbe nessuno — né la spia né `tsc` (R27).
import { isFonteTipo } from '@/lib/domain/prescrizione-costanti'

// POST /api/lavori/[id]/prescrizione/fonte — «allega la fonte» (spec §4.2,
// D202/V7/V8).
//
// Chiama `lavoro_prescrizione_allega_fonte`, che è un UPSERT DELIBERATO: i
// lavori nati prima dell'ondata B non hanno la riga di `lavori_prescrizioni`, e
// allegare la fonte a posteriori la crea con `contenuto '{}'` (D101 — è anche
// la via che rende sanabile il `senza_prescrizione` della route typo; provata a
// banco, sonda S1).
//
// 🔑 LA FONTE SI SOSTITUISCE PER INTERO. L'`ON CONFLICT DO UPDATE` della RPC
//    riscrive tutte e tre le colonne con ciò che riceve. Quindi qui «chiave
//    assente» e «`null` esplicito» dicono la STESSA cosa: nessun valore.
//    ⚠️ ASIMMETRIA DELIBERATA con la route typo, dove `null` è un ATTO
//    (rimuove la chiave dal contenuto) e la chiave assente è un errore: là la
//    scrittura è puntuale, qui è integrale. Chi arriva da una delle due non
//    deve dedurre l'altra per analogia.
//
// 🔑 PERCHÉ IL «CORPO» SI PRETENDE QUI E NON IN SQL. Due buchi diversi, una
//    sola porta che li chiude:
//    ① tutti e tre i parametri NULL: la RPC risponde `ok` e CREA una riga
//      vuota (provato a banco, sonda S2) — che poi mente al precheck della DdC;
//    ② `fonte_tipo` valorizzato senza corpo: lo respinge il CHECK
//      `lavori_prescrizioni_fonte_ck` con un 23514, cioè un 500 illeggibile.
//    La regola unica «almeno uno fra immagine e riferimento» li copre entrambi.

type RouteContext = { params: Promise<{ id: string }> }

const CHIAVI_NOTE = ['fonte_tipo', 'fonte_immagine_id', 'fonte_riferimento'] as const

// Sintassi soltanto: l'ESISTENZA e il tenant li prova il lookup qui sotto.
// Serve perché un `fonte_immagine_id` malformato arriverebbe a PostgREST come
// 22P02 («invalid input syntax for type uuid») → 500 al posto di un 422.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function errore422(messaggio: string, valore?: unknown) {
  return NextResponse.json({ errore: messaggio, valore }, { status: 422 })
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params

  if (!isSameOrigin(req)) {
    return NextResponse.json({ errore: 'Richiesta non consentita' }, { status: 403 })
  }

  // Route mutante → `getFreshLabContext` (getUser di rete), MAI `getLabContext`:
  // questa route non è in `LAB_CONTEXT_ROUTE_ALLOWLIST` e non deve entrarci.
  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ errore: 'Non autorizzato' }, { status: 401 })
  if (!context.laboratorioId) {
    return NextResponse.json({ errore: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const letto = await leggiCorpoJson(req, CHIAVI_NOTE)
  if (!letto.ok) return letto.risposta
  const corpo = letto.corpo
  const labId: string = context.laboratorioId

  // ── fonte_tipo: dal dizionario, oppure niente (V7) ────────────────────────
  let fonteTipo: string | null = null
  if (corpo.fonte_tipo !== undefined && corpo.fonte_tipo !== null) {
    if (!isFonteTipo(corpo.fonte_tipo)) {
      return errore422(
        'fonte_tipo non valido: usa foglio, email, modulo o piattaforma',
        corpo.fonte_tipo
      )
    }
    fonteTipo = corpo.fonte_tipo
  }

  // ── fonte_immagine_id ─────────────────────────────────────────────────────
  let immagineId: string | null = null
  if (corpo.fonte_immagine_id !== undefined && corpo.fonte_immagine_id !== null) {
    if (typeof corpo.fonte_immagine_id !== 'string' || !UUID_RE.test(corpo.fonte_immagine_id)) {
      return errore422('fonte_immagine_id non valido', corpo.fonte_immagine_id)
    }
    immagineId = corpo.fonte_immagine_id
  }

  // ── fonte_riferimento ─────────────────────────────────────────────────────
  // 🔑 Il `.trim()` decide SOLO se la stringa è vuota: il valore spedito non si
  //    normalizza (precedente e ragione: il gettone del PUT denti). Una stringa
  //    vuota è respinta perché `'' IS NOT NULL` è VERO: passerebbe il CHECK e
  //    la riga sembrerebbe avere una fonte che non c'è — la stessa bugia della
  //    riga vuota, detta più piano.
  let riferimento: string | null = null
  if (corpo.fonte_riferimento !== undefined && corpo.fonte_riferimento !== null) {
    if (typeof corpo.fonte_riferimento !== 'string') {
      return errore422('fonte_riferimento non valido: deve essere testo', corpo.fonte_riferimento)
    }
    if (corpo.fonte_riferimento.trim().length === 0) {
      return errore422('fonte_riferimento non può essere vuoto')
    }
    riferimento = corpo.fonte_riferimento
  }

  // ── «almeno un corpo» (v. il cappello: chiude S2 e il CHECK insieme) ──────
  if (immagineId === null && riferimento === null) {
    return errore422(
      'Serve almeno un corpo della fonte: l’immagine del foglio o un riferimento scritto'
    )
  }

  const svc = getServiceClient()

  // ── L'immagine è di questo laboratorio, ED È DI QUESTO LAVORO? ────────────
  // La FK composita `(fonte_immagine_id, laboratorio_id)` morde con un 23503,
  // cioè un 500 illeggibile. Il controllo di appartenenza sta qui, col
  // precedente delle FK del POST /api/lavori (`route.ts:158-174`), che risponde
  // 403. `deleted_at` filtrato per lo stesso motivo: una foto cancellata non è
  // una fonte a cui appoggiare una Dichiarazione.
  //
  // 🔑 IL CONTROLLO SUL LABORATORIO NON BASTA (fix Minor T4, 04/08/2026): la
  //    fonte è la base probatoria della Dichiarazione di Conformità, quindi
  //    l'immagine deve essere di QUESTO lavoro — non solo di un lavoro
  //    qualsiasi dello stesso laboratorio. Senza `lavoro_id` nel confronto,
  //    un'immagine di un ALTRO lavoro dello stesso lab passerebbe come fonte
  //    di questa prescrizione. Il clone del rifacimento condivide
  //    `fonte_immagine_id` via RPC (`crea_rifacimento_atomico`), NON via
  //    questa route: nessun impatto su quel percorso.
  if (immagineId !== null) {
    const { data: img } = await svc
      .from('lavori_immagini')
      .select('laboratorio_id, lavoro_id')
      .eq('id', immagineId)
      .is('deleted_at', null)
      .single()
    if (!img || img.laboratorio_id !== labId) {
      return NextResponse.json(
        { errore: 'fonte_immagine_id non appartiene a questo laboratorio' },
        { status: 403 }
      )
    }
    if (img.lavoro_id !== id) {
      return errore422(
        'fonte_immagine_id non appartiene a questo lavoro: allega un’immagine caricata su questo lavoro',
        immagineId
      )
    }
  }

  // 🛑 I tipi generati NON descrivono questa chiamata, e non ci si appoggia:
  //    `Database['public']['Functions']['lavoro_prescrizione_allega_fonte']`
  //    marca `p_fonte_tipo`/`p_fonte_immagine_id`/`p_fonte_riferimento` come
  //    NOT NULL (`string`), mentre la funzione in banca dati li accetta NULL —
  //    ed è proprio col NULL che si esprimono la V7 e la sostituzione
  //    integrale. Tipizzare la chiamata sui generati vieterebbe qui la forma
  //    che il database considera legittima. (Oggi la questione è comunque
  //    inerte: `getServiceClient()` costruisce il client SENZA il generico
  //    `<Database>`, quindi nessun tipo generato incontra mai questa chiamata —
  //    rilievo R27. Il commento resta per chi un giorno chiuderà R27.)
  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('lavoro_prescrizione_allega_fonte', {
      // laboratorio e lavoro si derivano da sessione e URL: il client non
      // sceglie il proprio tenant (e non potrebbe nemmeno provarci — le chiavi
      // ignote sono un 422).
      p_lab: labId,
      p_lavoro: id,
      p_fonte_tipo: fonteTipo,
      p_fonte_immagine_id: immagineId,
      p_fonte_riferimento: riferimento,
    })
  )

  // postgrest NON lancia: l'errore si controlla, non si aspetta in un catch.
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 })

  const esito = data as { esito?: string } | null

  if (esito?.esito === 'non_trovato') {
    // Anche il caso cross-tenant finisce qui: un lavoro di un altro laboratorio
    // non esiste, non è «vietato». 404, non 403 (R4).
    return NextResponse.json({ errore: 'Lavoro non trovato' }, { status: 404 })
  }
  if (esito?.esito === 'fonte_congelata') {
    return NextResponse.json(
      {
        errore:
          'La fonte è congelata: il lavoro ha una Dichiarazione di Conformità attiva. Per sostituirla, annulla prima la dichiarazione.',
        esito: 'fonte_congelata',
      },
      { status: 409 }
    )
  }
  if (esito?.esito === 'fonte_tipo_non_valido') {
    // Non deve mai accadere: il dizionario morde prima. Se accade, la costante
    // e il database sono divergenti — e la risposta resta un 422, mai un 500.
    // 🔑 L'`esito` c'è apposta: dice al chiamante che il rifiuto viene dal
    //    DATABASE, non dalla porta — cioè che c'è una deriva da riparare.
    return NextResponse.json(
      { errore: 'fonte_tipo non valido', esito: 'fonte_tipo_non_valido', valore: fonteTipo },
      { status: 422 }
    )
  }
  if (esito?.esito !== 'ok') {
    return NextResponse.json({ errore: 'Esito inatteso' }, { status: 500 })
  }

  // Si restituisce la fonte NORMALIZZATA — quella davvero scritta — non l'eco
  // del corpo ricevuto: il chiamante deve poter ridisegnare senza rileggere
  // (precedente: PUT /api/lavori/[id]/denti).
  return NextResponse.json({
    fonte: {
      fonte_tipo: fonteTipo,
      fonte_immagine_id: immagineId,
      fonte_riferimento: riferimento,
    },
  })
}
