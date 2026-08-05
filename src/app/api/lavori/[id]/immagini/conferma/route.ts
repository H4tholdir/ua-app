import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { isCategoriaFoto } from '@/lib/domain/categorie-foto'
import { trovaOggetto, togliOggetto } from '@/lib/storage/caricamento-diretto'
import { getSignedUrl } from '@/lib/storage/signed-url'
import { ALLOWED_MIME, TIPI_AMMESSI_ETICHETTA } from '@/lib/storage/tipi-immagine'
import {
  MAX_UPLOAD_DIRETTO_BYTES,
  MAX_UPLOAD_DIRETTO_ETICHETTA,
  pesoLeggibile,
} from '@/lib/storage/limite-caricamento'

/**
 * `POST /api/lavori/[id]/immagini/conferma` — il file è atterrato: adesso si
 * scrive la riga che lo rappresenta.
 *
 * 🔒 È QUI CHE VIVE IL RISCHIO NUOVO DELL'INTERA MODIFICA. Spezzare il
 *    caricamento in due atti significa che, a questo punto, è il BROWSER a dire
 *    «ho caricato lì». Se il server gli credesse, una riga avvelenata —
 *    `{lavoro_id: <mio>, storage_path: '<altro-lab>/ddc/2026/DDC-2026-0002.pdf'}`
 *    — diventerebbe una **URL firmata valida sul documento di un altro
 *    laboratorio**: la scheda firma qualunque `storage_path` trovi in riga, col
 *    client di servizio e senza chiedere a chi appartiene. E il gemello in
 *    scrittura: la DELETE delle immagini cancellerebbe quel file.
 *
 * 🔑 LE DUE CONDIZIONI, che non sono raccomandazioni:
 *    · **C1** — il percorso NON si prende dal client. Del corpo si legge solo
 *      il NOME del file, lo si valida (uuid + estensione ammessa), e il
 *      percorso si RICOSTRUISCE da `laboratorio_id` (sessione) e `lavoro_id`
 *      (già verificato). Se ciò che il client ha mandato non coincide con
 *      quello ricostruito, si rifiuta.
 *    · **C2** — si PROVA che il file c'è, e se ne leggono peso e tipo VERI dal
 *      magazzino, mai quelli dichiarati. Ragione misurata: `storage.remove` su
 *      una chiave inesistente **non dà errore** — una riga che punta al nulla
 *      verrebbe un giorno cancellata «con successo», traccia compresa. Una
 *      bugia silenziosa dentro il meccanismo costruito per non mentire.
 *
 * 🛑 E LA PULIZIA NON DEVE DIVENTARE UN'ARMA. Il piano diceva «su qualunque
 *    rifiuto, `storage.remove` del percorso»: applicato al percorso RICEVUTO
 *    sarebbe il modo di farci cancellare il documento di un altro laboratorio.
 *    Qui si toglie **solo** ciò che è già passato da C1 — cioè solo file dentro
 *    il proprio recinto, atterrati adesso.
 *
 * 🔑 PERCHÉ TUTTI I CONTROLLI SI RIPETONO: fra la firma e la conferma passano
 *    fino a **2 ore** (misurato leggendo la scadenza dentro il permesso). In
 *    due ore il lavoro può essere cancellato e l'abbonamento sospeso.
 */

type RouteContext = { params: Promise<{ id: string }> }

const BUCKET = 'documenti'

/** Il nome che il server accetta: uuid + estensione ammessa. È la forma che il
 *  server stesso produce alla firma, e nient'altro. */
const ESTENSIONI = Object.values(ALLOWED_MIME)
const NOME_ATTESO = new RegExp(
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${ESTENSIONI.join('|')})$`,
  'i',
)

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

  const percorsoRicevuto = typeof dati.percorso === 'string' ? dati.percorso : null
  if (!percorsoRicevuto) {
    return NextResponse.json({ error: 'Percorso del file mancante' }, { status: 400 })
  }

  // ═══ C1 — il percorso si RICOSTRUISCE, non si accetta ══════════════════
  // Del ricevuto si guarda solo l'ultimo segmento, e solo per confrontarlo:
  // qualunque cosa ci sia prima è irrilevante, perché il prefisso lo mette il
  // server. Il confronto finale è sull'INTERA stringa — `startsWith` da solo
  // lascerebbe passare `…/<lavoro>/../../<altro-lab>/ddc/x.pdf`.
  const nome = percorsoRicevuto.slice(percorsoRicevuto.lastIndexOf('/') + 1)
  const percorso = `${laboratorio_id}/lavori/${lavoro_id}/${nome}`
  if (!NOME_ATTESO.test(nome) || percorso !== percorsoRicevuto) {
    // 🛑 NIENTE viene toccato qui: il percorso ricevuto potrebbe essere di un
    //    altro laboratorio, e la pulizia diventerebbe l'arma.
    return NextResponse.json(
      { error: 'Percorso del file non valido', motivo: 'percorso_non_valido' },
      { status: 422 },
    )
  }

  // ═══ C2 — il file c'è davvero? e che cos'è? ════════════════════════════
  let oggetto
  try {
    oggetto = await trovaOggetto(svc, BUCKET, percorso)
  } catch (err) {
    console.error(
      '[immagini/conferma] verifica del file fallita:',
      err instanceof Error ? err.message : err,
    )
    return NextResponse.json({ error: 'Non è stato possibile verificare il file' }, { status: 500 })
  }

  if (!oggetto.esiste) {
    return NextResponse.json(
      { error: 'Il file non risulta caricato', motivo: 'file_assente' },
      { status: 422 },
    )
  }

  // Da qui in avanti il file è nostro e sta nel recinto: la pulizia è lecita.
  if (oggetto.byte !== null && oggetto.byte > MAX_UPLOAD_DIRETTO_BYTES) {
    await togliOggetto(svc, BUCKET, percorso)
    return NextResponse.json(
      { error: `Questo file pesa ${pesoLeggibile(oggetto.byte)} e il massimo è ${MAX_UPLOAD_DIRETTO_ETICHETTA}.` },
      { status: 413 },
    )
  }

  if (oggetto.tipo !== null && !ALLOWED_MIME[oggetto.tipo]) {
    await togliOggetto(svc, BUCKET, percorso)
    return NextResponse.json(
      { error: `Formato non supportato: usa ${TIPI_AMMESSI_ETICHETTA}.` },
      { status: 415 },
    )
  }

  // ─── La categoria (D73/D74: obbligatoria, il server non indovina) ───────
  if (!isCategoriaFoto(dati.categoria)) {
    await togliOggetto(svc, BUCKET, percorso)
    return NextResponse.json(
      { error: 'Categoria della foto mancante o non valida', motivo: 'categoria_non_valida' },
      { status: 422 },
    )
  }

  const nomeFile = typeof dati.nome_file === 'string' && dati.nome_file ? dati.nome_file : null
  const descrizione = typeof dati.descrizione === 'string' && dati.descrizione ? dati.descrizione : null

  const { data: immagine, error: insertError } = await svc
    .from('lavori_immagini')
    .insert({
      laboratorio_id,
      lavoro_id,
      storage_path: percorso,
      nome_file: nomeFile,
      descrizione,
      categoria: dati.categoria,
      ordine: 0,
    })
    .select()
    .single()

  if (insertError) {
    // Il file resterebbe senza riga: lo togliamo noi adesso, invece di
    // lasciarlo al mietitore (T6). R28: il messaggio grezzo non esce.
    await togliOggetto(svc, BUCKET, percorso)
    console.error('[immagini/conferma] inserimento fallito:', insertError.message)
    return NextResponse.json({ error: 'Non è stato possibile salvare la foto' }, { status: 500 })
  }

  // D236 — la URL si firma per la risposta e non si salva.
  const urlFirmata = await getSignedUrl(svc, BUCKET, percorso, 3600)

  return NextResponse.json({ immagine: { ...immagine, url: urlFirmata } }, { status: 201 })
}
