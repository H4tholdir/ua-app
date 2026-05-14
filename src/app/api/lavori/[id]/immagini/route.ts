import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { uploadToStorage } from '@/lib/storage/upload'

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
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()

  // Ricava laboratorio_id dall'utente
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const { laboratorio_id } = utente

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

  // Limite dimensione: 20MB
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File troppo grande (max 20MB)' }, { status: 413 })
  }

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
      tipo: 'foto',
      ordine: 0,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ immagine }, { status: 201 })
}
