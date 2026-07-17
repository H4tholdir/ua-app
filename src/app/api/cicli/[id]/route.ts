import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { TIPO_DISPOSITIVO_CICLO_OPTIONS, CLASSE_RISCHIO_CICLO_OPTIONS } from '@/lib/domain/cicli-produzione'

type RouteContext = { params: Promise<{ id: string }> }

const PATCH_ALLOWLIST = ['nome', 'codice', 'tipo_dispositivo', 'classe_rischio', 'attivo'] as const

export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = context.laboratorioId
  const svc = getServiceClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {}
  for (const field of PATCH_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field]
    }
  }

  if (typeof payload.nome === 'string') payload.nome = payload.nome.trim()
  if (typeof payload.codice === 'string') payload.codice = payload.codice.trim()
  if (typeof payload.tipo_dispositivo === 'string') payload.tipo_dispositivo = payload.tipo_dispositivo.trim()
  if (Object.prototype.hasOwnProperty.call(payload, 'classe_rischio') && payload.classe_rischio === '') {
    payload.classe_rischio = null
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'nome') && payload.nome === '') {
    return NextResponse.json({ error: 'Il campo "nome" è obbligatorio' }, { status: 400 })
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'codice') && payload.codice === '') {
    return NextResponse.json({ error: 'Il campo "codice" è obbligatorio' }, { status: 400 })
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'tipo_dispositivo')) {
    if (!(TIPO_DISPOSITIVO_CICLO_OPTIONS as readonly string[]).includes(payload.tipo_dispositivo as string)) {
      return NextResponse.json({ error: 'Tipo dispositivo non valido' }, { status: 400 })
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'classe_rischio') && payload.classe_rischio != null) {
    if (!(CLASSE_RISCHIO_CICLO_OPTIONS as readonly string[]).includes(payload.classe_rischio as string)) {
      return NextResponse.json({ error: 'Classe di rischio non valida' }, { status: 400 })
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'attivo') && typeof payload.attivo !== 'boolean') {
    return NextResponse.json({ error: 'Il campo "attivo" deve essere booleano' }, { status: 400 })
  }

  payload.updated_by = context.userId

  const { data: ciclo, error: updateError } = await svc
    .from('cicli_produzione')
    .update(payload)
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .select('id, codice, nome, tipo_dispositivo, classe_rischio, attivo')
    .single()

  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json({ error: 'Esiste già un ciclo con questo codice in questo laboratorio' }, { status: 409 })
    }
    if (updateError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Ciclo non trovato' }, { status: 404 })
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ciclo })
}

export async function DELETE(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = context.laboratorioId
  const svc = getServiceClient()

  const { data: existing } = await svc
    .from('cicli_produzione')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Ciclo non trovato' }, { status: 404 })
  }

  // Nessun filtro su lavori.deleted_at: anche un lavoro storico/soft-cancellato
  // deve continuare a bloccare la cancellazione, per non rompere retroattivamente
  // un documento QMS (Scheda di Fabbricazione, Art. 10(9) MDR) già emesso.
  const { count, error: countError } = await svc
    .from('lavori')
    .select('id', { count: 'exact', head: true })
    .eq('ciclo_id', id)
    .eq('laboratorio_id', labId)

  if (countError) {
    return NextResponse.json({ error: 'Errore durante la verifica dei lavori collegati' }, { status: 500 })
  }

  if (count && count > 0) {
    const label = count === 1 ? 'lavoro' : 'lavori'
    return NextResponse.json(
      { error: `Ciclo in uso da ${count} ${label} — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.` },
      { status: 409 }
    )
  }

  // listino.ciclo_id è un default suggerito su un template di listino, non un
  // record storico MDR — va nullato, non blocca la cancellazione (a differenza
  // di lavori.ciclo_id sopra).
  const { error: listinoError } = await svc
    .from('listino')
    .update({ ciclo_id: null })
    .eq('ciclo_id', id)
    .eq('laboratorio_id', labId)

  if (listinoError) {
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento del listino' }, { status: 500 })
  }

  const { error: deleteError } = await svc
    .from('cicli_produzione')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('laboratorio_id', labId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
