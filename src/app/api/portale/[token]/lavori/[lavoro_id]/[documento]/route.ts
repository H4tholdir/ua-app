import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getSignedUrl } from '@/lib/storage/signed-url'

type RouteContext = {
  params: Promise<{ token: string; lavoro_id: string; documento: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { token, lavoro_id, documento } = await params

  if (documento !== 'ddc' && documento !== 'buono') {
    return NextResponse.json({ error: 'Documento non valido' }, { status: 400 })
  }

  const svc = getServiceClient()

  const { data: cliente } = await svc
    .from('clienti')
    .select('id, laboratorio_id, portale_token_scade_at')
    .eq('portale_token', token)
    .is('deleted_at', null)
    .single()

  if (!cliente) {
    return NextResponse.json({ error: 'Link non valido' }, { status: 404 })
  }

  const scadenza = (cliente as { portale_token_scade_at: string | null }).portale_token_scade_at
  if (scadenza && new Date(scadenza) < new Date()) {
    return NextResponse.json({ error: 'Link scaduto' }, { status: 403 })
  }

  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, buono_storage_path')
    .eq('id', lavoro_id)
    .eq('cliente_id', cliente.id)
    .eq('laboratorio_id', cliente.laboratorio_id)
    .eq('stato', 'consegnato')
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  let storagePath: string | null = null

  if (documento === 'buono') {
    storagePath = (lavoro as { buono_storage_path: string | null }).buono_storage_path
  } else {
    const { data: ddc } = await svc
      .from('dichiarazioni_conformita')
      .select('storage_path_pdf')
      .eq('lavoro_id', lavoro_id)
      .neq('stato', 'annullata')
      .maybeSingle()
    storagePath = (ddc as { storage_path_pdf: string | null } | null)?.storage_path_pdf ?? null
  }

  if (!storagePath) {
    return NextResponse.json({ error: 'Documento non disponibile' }, { status: 404 })
  }

  const signedUrl = await getSignedUrl(svc, 'documenti', storagePath, 300)

  if (!signedUrl) {
    return NextResponse.json({ error: 'Errore nella generazione del link' }, { status: 500 })
  }

  await svc.from('portale_accessi').insert({
    cliente_id: cliente.id,
    laboratorio_id: cliente.laboratorio_id,
    azione: documento === 'ddc' ? 'download_ddc' : 'download_buono',
  })

  return NextResponse.redirect(signedUrl, 307)
}
