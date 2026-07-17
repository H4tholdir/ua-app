import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

const PATCH_ALLOWLIST = [
  'nome',
  'cognome',
  'sigla',
  'qualifica',
  'numero_albo',
  'prrc',
  'tipo_compenso',
  'compenso_base',
] as const

type AllowedField = (typeof PATCH_ALLOWLIST)[number]

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Solo titolare o admin_rete possono modificare i dati dei tecnici
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const svc = getServiceClient()

  // Verifica che il tecnico appartenga al lab e non sia eliminato
  const { data: existing } = await svc
    .from('tecnici')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Tecnico non trovato' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Allowlist esplicita: accetta solo i campi consentiti
  const updates: Partial<Record<AllowedField, unknown>> = {}
  for (const field of PATCH_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nessun campo valido da aggiornare' }, { status: 422 })
  }

  // Validazione minima: nome e cognome non possono essere stringa vuota se presenti
  if (typeof updates.nome === 'string' && !updates.nome.trim()) {
    return NextResponse.json({ error: 'Il campo "nome" non può essere vuoto' }, { status: 422 })
  }
  if (typeof updates.cognome === 'string' && !updates.cognome.trim()) {
    return NextResponse.json({ error: 'Il campo "cognome" non può essere vuoto' }, { status: 422 })
  }

  // Trim di nome e cognome se presenti
  if (typeof updates.nome === 'string') updates.nome = updates.nome.trim()
  if (typeof updates.cognome === 'string') updates.cognome = updates.cognome.trim()

  const { data: tecnico, error: updateError } = await svc
    .from('tecnici')
    .update(updates)
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .select('id, nome, cognome, sigla, qualifica, prrc, tipo_compenso, compenso_base')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ tecnico })
}
