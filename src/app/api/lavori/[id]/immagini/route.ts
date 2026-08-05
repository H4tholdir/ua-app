import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { uploadToStorage } from '@/lib/storage/upload'
import { isCategoriaFoto } from '@/lib/domain/categorie-foto'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_ETICHETTA } from '@/lib/storage/limite-caricamento'

type RouteContext = { params: Promise<{ id: string }> }

// Estensioni consentite
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id: lavoro_id } = await params

  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  // Autenticazione
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

  const laboratorio_id = context.laboratorioId

  // Verifica che il lavoro appartenga al laboratorio
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // Leggi FormData
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData non valido' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo "file" mancante o non valido' }, { status: 400 })
  }

  const contentType = file.type || 'application/octet-stream'
  const ext = ALLOWED_MIME[contentType]
  if (!ext) {
    return NextResponse.json(
      { error: `Tipo file non consentito: ${contentType}` },
      { status: 415 }
    )
  }

  // Limite dimensione — il numero e la sua ragione vivono in UN posto solo
  // (`limite-caricamento.ts`): la coppia precedente diceva 20MB qui e «20MB»
  // all'utente, d'accordo fra loro e sbagliate entrambe, perché la piattaforma
  // taglia a ~4,2MB PRIMA di arrivare qui (misurato sul deployment vivo).
  // ⚠️ Questo controllo resta utile anche se la piattaforma taglia prima: è la
  //    rete per ogni altro ambiente di esecuzione (banco locale, prova, un
  //    domani un runtime diverso) e per un client che non controlli da sé.
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File troppo grande (max ${MAX_UPLOAD_ETICHETTA})` },
      { status: 413 }
    )
  }

  // La categoria si chiede allo SCATTO (D65) e arriva col caricamento.
  // 🛑 Obbligatoria: la colonna è NOT NULL senza ripiego (D73), quindi qui non
  //    si indovina. Se il foglio viene chiuso senza scegliere, è il CLIENT che
  //    manda 'altro' esplicitamente (D74) — il server non decide al posto suo.
  // 🛑 SI IMPORTA `isCategoriaFoto`, non si ricopia l'elenco: la spia di T2
  //    (`tests/unit/categorie-foto-spia-migration.test.ts`) sorveglia DUE copie
  //    dell'elenco (sette voci da D91) — il CHECK della migration e la costante TypeScript — e
  //    una terza copia scritta a mano qui non la vedrebbe nessuno, né la spia
  //    né `tsc` (R27: il client non porta il generico `<Database>`).
  // 🔑 E il controllo sta QUI, PRIMA del caricamento su Storage: un rifiuto
  //    dopo l'upload lascerebbe nell'archivio un file orfano che nessuna riga
  //    referenzia e che nessuno cancellerà mai.
  const categoria = formData.get('categoria')
  if (!isCategoriaFoto(categoria)) {
    return NextResponse.json(
      { error: 'Categoria della foto mancante o non valida', motivo: 'categoria_non_valida' },
      { status: 422 }
    )
  }

  // Descrizione: testo libero e OPZIONALE. Fino al 30/07/2026 ci viveva
  // impropriamente la categoria (D73): ora ha una colonna sua.
  const descrizione = formData.get('descrizione')
  const descrizioneValue = typeof descrizione === 'string' && descrizione ? descrizione : null

  // Upload su Storage
  const path = `lavori/${lavoro_id}/${Date.now()}.${ext}`
  let url: string

  try {
    const arrayBuffer = await file.arrayBuffer()
    url = await uploadToStorage(svc, 'documenti', path, arrayBuffer, contentType)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload fallito'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // INSERT in lavori_immagini
  const { data: immagine, error: insertError } = await svc
    .from('lavori_immagini')
    .insert({
      laboratorio_id,
      lavoro_id,
      storage_path: path,
      url,
      nome_file: file.name || null,
      descrizione: descrizioneValue,
      categoria,
      ordine: 0,
    })
    .select()
    .single()

  if (insertError) {
    // R28 (G9): il messaggio grezzo del database non esce verso il browser —
    // porta nomi di vincoli, di colonne e di indici, cioè ricognizione gratuita
    // per chi sonda l'app. Il dettaglio resta nel registro del server.
    // Precedente in casa: `[imgId]/route.ts:84`, `api/pazienti/route.ts:227-228`.
    console.error('POST /api/lavori/[id]/immagini — inserimento fallito:', insertError.message)
    return NextResponse.json({ error: 'Non è stato possibile salvare la foto' }, { status: 500 })
  }

  return NextResponse.json({ immagine }, { status: 201 })
}
