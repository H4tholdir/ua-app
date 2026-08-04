import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { isCategoriaFoto } from '@/lib/domain/categorie-foto'
import {
  MESSAGGIO_FONTE_ALTRO_LAVORO,
  MESSAGGIO_FONTE_FILE_PERSO,
  MESSAGGIO_FONTE_QUESTO_LAVORO,
  MOTIVO_FONTE_IN_USO,
  MOTIVO_FONTE_IN_USO_FILE_PERSO,
} from '@/lib/domain/immagini-eliminazione-messaggi'

type RouteContext = { params: Promise<{ id: string; imgId: string }> }

// Campi aggiornabili via PATCH (allowlist esplicita — mai blocklist)
// 🔑 `tipo` è USCITA da qui e la sua destinazione è scritta: la colonna è stata
//    ELIMINATA dalla tabella da T1 (D73). Lasciarla nell'allowlist avrebbe
//    voluto dire spedire al database una colonna inesistente — e su questo repo
//    non lo scoprirebbe nessuno prima della produzione (R27).
// 🔑 `descrizione` RESTA patchabile ma non è più la categoria: fino al
//    30/07/2026 ci viveva impropriamente, ora la categoria ha la sua colonna.
const ALLOWED_PATCH_FIELDS = ['descrizione', 'categoria', 'ordine'] as const
type AllowedField = (typeof ALLOWED_PATCH_FIELDS)[number]

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id: lavoro_id, imgId } = await params

  // CSRF check
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

  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard

  const svc = getServiceClient()

  const laboratorio_id = context.laboratorioId

  // Verifica che l'immagine appartenga al lavoro di questo lab e non sia già
  // stata cancellata (D52-a: dal minuto in cui il DELETE esiste, una guardia
  // senza questo filtro modificherebbe allegramente una riga già cancellata
  // e risponderebbe 200 OK su un fantasma).
  const { data: existing } = await svc
    .from('lavori_immagini')
    .select('id')
    .eq('id', imgId)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Applica solo campi nella allowlist.
  // 🛑 L'allowlist controlla i NOMI; da T3 la `categoria` porta anche il
  //    controllo del VALORE. Prima, `if (field in body)` copiava qualunque cosa
  //    e il rifiuto arrivava dal database: un errore del CLIENT usciva 500.
  //    Ora esce 422, e la riga non viene nemmeno sfiorata.
  const patch: Partial<Record<AllowedField, unknown>> = {}
  for (const field of ALLOWED_PATCH_FIELDS) {
    if (field in body) {
      if (field === 'categoria' && !isCategoriaFoto(body[field])) {
        return NextResponse.json(
          { error: 'Categoria della foto non valida', motivo: 'categoria_non_valida' },
          { status: 422 }
        )
      }
      patch[field] = body[field]
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nessun campo aggiornabile fornito' }, { status: 400 })
  }

  // R26 — la mutazione prende la STESSA forma del DELETE qui sotto: TRE .eq()
  // sulla update() stessa (la rotta usa il client di servizio, la RLS è
  // aggirata, e questi tre confronti sono l'unico controllo di appartenenza che
  // esiste), il filtro su `deleted_at`, e il CONTEGGIO delle righe toccate al
  // posto di .single().
  // 🔑 È la corsa D52-a, rimasta aperta fino a oggi: fra la guardia di
  //    esistenza qui sopra e questo update, una cancellazione concorrente
  //    lasciava rispondere 200 su un fantasma.
  const { data: righe, error: updateError } = await svc
    .from('lavori_immagini')
    .update(patch)
    .eq('id', imgId)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .select()

  if (updateError) {
    // D52-b (G9-76): il messaggio grezzo del database non esce verso il
    // client — il dettaglio resta nel registro del server. Precedente in
    // casa: `api/pazienti/route.ts:227-228`.
    console.error('PATCH /api/lavori/[id]/immagini/[imgId] — aggiornamento fallito:', updateError.message)
    return NextResponse.json({ error: 'Non è stato possibile aggiornare la foto' }, { status: 500 })
  }

  // Il conteggio delle righe — stessa scala del DELETE. 0: qualcuno l'ha tolta
  // nel frattempo → 404, come la guardia di esistenza. Più di una: impossibile
  // per chiave primaria, ma fail-closed → 500, mai un successo silenzioso.
  const righeToccate = righe?.length ?? 0
  if (righeToccate === 0) {
    return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 })
  }
  if (righeToccate > 1) {
    console.error(`PATCH /api/lavori/[id]/immagini/[imgId] — righe toccate inattese: ${righeToccate}`)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  return NextResponse.json({ immagine: righe[0] })
}

// DELETE — cancellazione VERA (D61, 30/07/2026): il file esce dall'archivio e
// la riga esce dalla tabella, in quest'ordine. 🔧 Fino a T4 queste righe
// dicevano «cancellazione MORBIDA: scrive `deleted_at`, il file nello storage
// NON si tocca (conservazione deliberata)» — descrizione ora FALSA, ed è per
// questo che viene riscritta invece di lasciata lì a ingannare chi legge.
//
// Perché è cambiato: la cancellazione morbida lasciava il file nell'archivio,
// e il file nell'archivio è la foto — una foto che l'utente crede eliminata e
// che continua a esistere. D61 dice che «elimina» deve voler dire eliminare.
//
// Cosa resta: la colonna `deleted_at` e gli otto filtri che la leggono NON si
// toccano — li usano la RLS, l'indice parziale e le migrazioni di
// cancellazione totale del laboratorio. Cambia COME si cancella, non CHI legge.
//
// Cosa nasce: `lavori_immagini_eliminazioni` (D63) — chi, quando, quale
// lavoro, quale percorso. Mai l'immagine.
//
// Nessun gate di ruolo (D-3: non ce l'ha nemmeno la consegna, che emette la
// dichiarazione di conformità).
export async function DELETE(req: Request, { params }: RouteContext) {
  const { id: lavoro_id, imgId } = await params

  // CSRF check
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

  const guard = assertLabOperativo(context, 'DELETE')
  if (guard) return guard

  const svc = getServiceClient()
  const laboratorio_id = context.laboratorioId

  // 1. Guardia di esistenza — id + lavoro_id + laboratorio_id + deleted_at IS NULL.
  // 🔑 T4 aggiunge `storage_path` alla proiezione: è l'UNICO punto in cui la
  //    rotta lo conosce, e senza di esso non saprebbe quale file togliere né
  //    cosa scrivere nella traccia. (Il piano scriveva `immagine.storage_path`
  //    dando per fatta questa lettura — non c'era: difetto riferito.)
  const { data: existing } = await svc
    .from('lavori_immagini')
    .select('id, storage_path')
    .eq('id', imgId)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 })
  }

  // 2. La finestra — si può eliminare finché il lavoro non è consegnato.
  const { data: lavoro } = await svc
    .from('lavori')
    .select('stato')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  if (lavoro.stato === 'consegnato') {
    return NextResponse.json(
      { error: 'Lavoro già consegnato — non è più possibile eliminare le foto' },
      { status: 409 }
    )
  }

  // 3. T8 (S7, D214) — pre-check: questa immagine è la FONTE di una
  // prescrizione? La FK `lavori_prescrizioni_fonte_img_fk` (NO ACTION) morde
  // con 23503 — ma morde SOLO alla `.delete()` di `lavori_immagini`, cioè
  // DOPO che `storage.remove` (sotto) ha già distrutto il file. Un file
  // distrutto non si ripristina: il controllo deve stare PRIMA, non dopo, e
  // senza toccare niente se la risposta è «sì, è una fonte».
  // 🔑 CONSAPEVOLE DEL CLONE: il rifacimento clona `fonte_immagine_id` per
  //    intero via RPC (`lavoro_prescrizione_allega_fonte` chiamata da
  //    `crea_rifacimento_atomico`), quindi la fonte può appartenere alla
  //    prescrizione di UN ALTRO lavoro (un rifacimento di questo). La query
  //    NON filtra su `lavoro_id`: un filtro lì cercherebbe solo la
  //    prescrizione di QUESTO lavoro e lascerebbe passare dritto sull'archivio
  //    proprio il caso che il pre-check esiste per fermare.
  // 🔑 `laboratorio_id` resta nel filtro per lo stesso motivo della FK
  //    composita che lo impone in banca dati: difesa in profondità, anche se
  //    `imgId` è già stato scoperto di questo laboratorio al punto 1.
  const { data: righeFonte } = await svc
    .from('lavori_prescrizioni')
    .select('lavoro_id')
    .eq('fonte_immagine_id', imgId)
    .eq('laboratorio_id', laboratorio_id)

  if (righeFonte && righeFonte.length > 0) {
    // Riporta la VERITÀ: se la riga trovata è di QUESTO lavoro (caso comune —
    // la prescrizione del lavoro che si sta guardando) oppure di un ALTRO
    // lavoro (il rifacimento che ha clonato la fonte) — mai lo stesso
    // messaggio per due fatti diversi.
    const diQuestoLavoro = righeFonte.some((r) => r.lavoro_id === lavoro_id)
    return NextResponse.json(
      {
        error: diQuestoLavoro ? MESSAGGIO_FONTE_QUESTO_LAVORO : MESSAGGIO_FONTE_ALTRO_LAVORO,
        motivo: MOTIVO_FONTE_IN_USO,
      },
      { status: 409 }
    )
  }

  // 4. D61 — il FILE prima, la RIGA dopo. L'ordine non è di stile: se cadesse
  // la riga prima del file, un guasto fra le due lascerebbe nell'archivio un
  // file orfano che nessuna query può più raggiungere — invisibile e non
  // ritentabile. Nell'ordine giusto, un file già tolto con la riga ancora viva
  // è un caso VISIBILE (la foto compare rotta) e l'eliminazione si ripete.
  // 🛑 Fail-closed: se il file non se ne va, la riga NON si tocca. Meglio una
  //    foto ancora elencata che una riga sparita su un file che resta.
  const { error: erroreFile } = await svc.storage.from('documenti').remove([existing.storage_path])
  if (erroreFile) {
    // G9: il messaggio dell'archivio non esce verso il browser.
    console.error('DELETE /api/lavori/[id]/immagini/[imgId] — rimozione del file fallita:', erroreFile.message)
    return NextResponse.json({ error: 'Non è stato possibile eliminare la foto' }, { status: 500 })
  }

  // 5. La mutazione — ora una cancellazione VERA (.delete(), non più
  // .update({deleted_at})), con la stessa forma di sempre: TRE .eq() sulla
  // delete() stessa (non solo sul pre-controllo), perché la rotta usa il client
  // di servizio, la RLS è aggirata, e questi tre confronti sono l'unico
  // controllo di appartenenza che esiste. + .is('deleted_at', null) e .select()
  // per contare le righe toccate.
  const { data: deletedRows, error: deleteError } = await svc
    .from('lavori_immagini')
    .delete()
    .eq('id', imgId)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .select()

  if (deleteError) {
    // T8 — cintura e bretelle: il pre-check qui sopra copre il caso normale,
    // ma non chiude una CORSA (una prescrizione allegata proprio fra il
    // pre-check e questa `.delete()`). Se sfugge, la FK morde qui con 23503 —
    // e a questo punto `storage.remove` è GIÀ passato: il file è perso
    // davvero. Il messaggio lo dice onestamente, mai un finto successo né un
    // 500 che suggerisce «riprova» (riprovare non cambia niente: il file non
    // c'è più).
    if (deleteError.code === '23503') {
      console.error(
        'DELETE /api/lavori/[id]/immagini/[imgId] — 23503 sulla delete: la fonte è diventata in uso fra il pre-check e la mutazione (corsa) — file già perso:',
        deleteError.message
      )
      return NextResponse.json(
        { error: MESSAGGIO_FONTE_FILE_PERSO, motivo: MOTIVO_FONTE_IN_USO_FILE_PERSO },
        { status: 409 }
      )
    }
    console.error('DELETE /api/lavori/[id]/immagini/[imgId] — cancellazione fallita:', deleteError.message)
    return NextResponse.json({ error: 'Non è stato possibile eliminare la foto' }, { status: 500 })
  }

  // 6. Il conteggio delle righe — non si prosegue in silenzio se non è
  // esattamente una. 0 righe: qualcuno l'ha già tolta nel frattempo (race) →
  // 404, stesso esito della guardia di esistenza. Più di una riga: impossibile
  // per chiave primaria, ma fail-closed → 500, mai un successo silenzioso.
  const righeToccate = deletedRows?.length ?? 0
  if (righeToccate === 0) {
    return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 })
  }
  if (righeToccate > 1) {
    console.error(`DELETE /api/lavori/[id]/immagini/[imgId] — righe toccate inattese: ${righeToccate}`)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  // 7. D63 — la traccia. 🔧 Qui stava scritto «Il blob NON si tocca: nessuna
  // chiamata a storage.remove — conservazione del file deliberata
  // (soft-delete)»: da D61 è falso, e al suo posto c'è quello che il codice fa
  // davvero.
  // 🔑 FAIL-SOFT, e dichiarato: se questa scrittura fallisce, la risposta resta
  //    200. La foto è già uscita dall'archivio E dalla tabella; far fallire la
  //    risposta ora non la riporterebbe indietro — direbbe solo una bugia al
  //    client, che riproverebbe su qualcosa che non c'è più. L'errore si
  //    registra sul server, dove qualcuno può leggerlo.
  // 🛑 Quello che questa riga NON contiene, e non conterrà: nessun byte
  //    dell'immagine, nessuna URL firmata, nessun dato del paziente. Un
  //    registro di cancellazioni che conservasse la cosa cancellata sarebbe la
  //    cancellazione annullata (Art. 5(1)(c) GDPR, minimizzazione).
  const { error: erroreTraccia } = await svc.from('lavori_immagini_eliminazioni').insert({
    laboratorio_id,
    lavoro_id,
    lavori_immagine_id: imgId,
    storage_path: existing.storage_path,
    eliminata_da: context.userId,
  })
  if (erroreTraccia) {
    console.error('DELETE /api/lavori/[id]/immagini/[imgId] — traccia non scritta:', erroreTraccia.message)
  }

  // 8. Successo (precedente: `api/cicli/[id]/route.ts:170`).
  return NextResponse.json({ ok: true })
}
