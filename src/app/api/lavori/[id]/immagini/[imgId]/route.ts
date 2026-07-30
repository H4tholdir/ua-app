import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { isCategoriaFoto } from '@/lib/domain/categorie-foto'

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

// DELETE — cancellazione MORBIDA: scrive `deleted_at`, il file nello storage
// NON si tocca (conservazione deliberata). Nessun gate di ruolo (D-3: non ce
// l'ha nemmeno la consegna, che emette la dichiarazione di conformità).
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

  // 3. La mutazione — TRE .eq() sulla update() stessa (non solo sul
  // pre-controllo): la rotta usa il client di servizio, la RLS è aggirata, e
  // questi tre confronti sono l'unico controllo di appartenenza che esiste.
  // + .is('deleted_at', null) e .select() per contare le righe toccate.
  const { data: deletedRows, error: deleteError } = await svc
    .from('lavori_immagini')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', imgId)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .select()

  if (deleteError) {
    console.error('DELETE /api/lavori/[id]/immagini/[imgId] — cancellazione fallita:', deleteError.message)
    return NextResponse.json({ error: 'Non è stato possibile eliminare la foto' }, { status: 500 })
  }

  // 4. Il conteggio delle righe — non si prosegue in silenzio se non è
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

  // 5. Il blob NON si tocca: nessuna chiamata a storage.remove — conservazione
  // del file deliberata (soft-delete).
  // 6. Successo (precedente: `api/cicli/[id]/route.ts:170`).
  return NextResponse.json({ ok: true })
}
