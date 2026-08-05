import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { isCategoriaFoto } from '@/lib/domain/categorie-foto'
import { creaPermessoCaricamento } from '@/lib/storage/caricamento-diretto'
import {
  MAX_UPLOAD_DIRETTO_BYTES,
  MAX_UPLOAD_DIRETTO_ETICHETTA,
  pesoLeggibile,
} from '@/lib/storage/limite-caricamento'
import { ALLOWED_MIME } from '@/lib/storage/tipi-immagine'

/**
 * `POST /api/lavori/[id]/immagini/firma` — il permesso di scrivere UN file in
 * UN percorso, e poi il browser va dritto al magazzino.
 *
 * 🔑 PERCHÉ ESISTE: il tetto della piattaforma sul corpo di una richiesta è
 *    ~4,2 MB (misurato in produzione: 4,10 arriva, 4,30 no) e **non si compra**
 *    — è uguale su ogni piano. Il bucket accetta già 50 MB. Il collo di
 *    bottiglia è il corridoio, non la destinazione.
 *
 * 🔒 QUESTA ROTTA È UN CANCELLO, e va letta così. Finché i byte passavano di
 *    qui, chi non superava i controlli non scriveva niente: il controllo e la
 *    scrittura erano lo stesso atto. Ora sono due atti separati, quindi OGNI
 *    controllo che prima proteggeva l'upload deve proteggere la FIRMA — non
 *    c'è un secondo posto in cui recuperarlo.
 *
 * 🛑 IL PERCORSO NON ARRIVA MAI DAL CLIENT. Lo compone il server da
 *    `laboratorio_id` (sessione) e `lavoro_id` (già verificato come suo). Un
 *    percorso scelto da fuori sarebbe scrittura — e, alla conferma, lettura —
 *    arbitraria fra laboratori. Il permesso poi resta **inchiodato** a quel
 *    percorso (provato: usato altrove risponde «Invalid signature»).
 */

type RouteContext = { params: Promise<{ id: string }> }

/** Quante immagini può registrare un laboratorio in un'ora. Generoso: una
 *  sessione di lavoro vera ne fa poche decine.
 *  ⚠️ **Limite dichiarato di questa misura:** conta le immagini CONFERMATE,
 *     quindi non vede le firme chieste e mai usate. Quelle lasciano file senza
 *     riga, ed è il mietitore degli orfani (T6) a raccoglierli entro 24h. Un
 *     conteggio delle firme richiederebbe una tabella sua: non c'è, e fingere
 *     che questo la sostituisca sarebbe peggio che scriverlo qui. */
const MAX_IMMAGINI_ORA = 120

export async function POST(req: Request, { params }: RouteContext) {
  const { id: lavoro_id } = await params

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const svc = getServiceClient()
  const laboratorio_id = context.laboratorioId

  // Il lavoro è suo? Stessi tre filtri della rotta che riceveva i byte.
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })

  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta non valido' }, { status: 400 })
  }
  const dati = (corpo ?? {}) as Record<string, unknown>

  // ─── Tipo ───────────────────────────────────────────────────────────────
  // 🔑 L'elenco è lo STESSO della rotta che riceve i byte, importato da un
  //    posto solo: due elenchi che si scostano vorrebbero dire che un file
  //    ammesso da un corridoio è rifiutato dall'altro, e nessuno se ne
  //    accorgerebbe finché non capita a un utente.
  const tipo = typeof dati.tipo === 'string' ? dati.tipo : null
  const ext = tipo ? ALLOWED_MIME[tipo] : undefined
  if (!ext) {
    return NextResponse.json(
      { error: `Tipo file non consentito: ${tipo ?? '(assente)'}` },
      { status: 415 },
    )
  }

  // ─── Categoria ──────────────────────────────────────────────────────────
  if (!isCategoriaFoto(dati.categoria)) {
    return NextResponse.json(
      { error: 'Categoria della foto mancante o non valida', motivo: 'categoria_non_valida' },
      { status: 422 },
    )
  }

  // ─── Peso DICHIARATO ────────────────────────────────────────────────────
  // 🛑 Dichiarato, non provato: un client può dire 1 KB e caricarne 40 MB. Qui
  //    serve solo a dire no SUBITO su ciò che è palesemente fuori misura —
  //    altrimenti il rifiuto arriverebbe dopo decine di MB su rete mobile. Il
  //    peso VERO lo rilegge la conferma dal magazzino (condizione C2).
  const byte = typeof dati.byte === 'number' && Number.isFinite(dati.byte) ? dati.byte : null
  if (byte === null || byte <= 0) {
    return NextResponse.json({ error: 'Peso del file mancante o non valido' }, { status: 400 })
  }
  if (byte > MAX_UPLOAD_DIRETTO_BYTES) {
    return NextResponse.json(
      {
        error: `Questo file pesa ${pesoLeggibile(byte)} e il massimo è ${MAX_UPLOAD_DIRETTO_ETICHETTA}.`,
      },
      { status: 413 },
    )
  }

  // ─── Limite di frequenza ────────────────────────────────────────────────
  const unOraFa = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: erroreConteggio } = await svc
    .from('lavori_immagini')
    .select('id', { count: 'exact', head: true })
    .eq('laboratorio_id', laboratorio_id)
    .gte('created_at', unOraFa)

  if (erroreConteggio) {
    // Fail-closed sarebbe sproporzionato (bloccherebbe il lavoro vero per un
    // guasto di una query secondaria), ma il fatto si registra: un conteggio
    // che smette di funzionare è un limite che smette di esistere.
    console.error('[immagini/firma] conteggio del limite fallito:', erroreConteggio.message)
  } else if ((count ?? 0) >= MAX_IMMAGINI_ORA) {
    return NextResponse.json(
      { error: 'Troppi caricamenti in poco tempo. Riprova fra un po\'.' },
      { status: 429 },
    )
  }

  // ─── Il percorso, deciso QUI ────────────────────────────────────────────
  const percorso = `${laboratorio_id}/lavori/${lavoro_id}/${crypto.randomUUID()}.${ext}`

  try {
    const permesso = await creaPermessoCaricamento(svc, 'documenti', percorso)
    return NextResponse.json({ percorso: permesso.percorso, gettone: permesso.gettone })
  } catch (err) {
    // R28: il messaggio grezzo non esce verso il browser.
    console.error(
      '[immagini/firma] permesso non concesso:',
      err instanceof Error ? err.message : err,
    )
    return NextResponse.json({ error: 'Non è stato possibile avviare il caricamento' }, { status: 500 })
  }
}
