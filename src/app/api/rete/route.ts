import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'

// GET /api/rete
// Lista reti di cui questo lab e admin o membro
export async function GET() {
  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }
    const labId = context.laboratorioId

    const svc = getServiceClient()
    // Recupera reti dove il lab e admin
    const { data: retiAdmin, error: errAdmin } = await svc
      .from('reti')
      .select('id, nome, admin_laboratorio_id, created_at, updated_at')
      .eq('admin_laboratorio_id', labId)

    if (errAdmin) {
      return NextResponse.json({ error: errAdmin.message }, { status: 500 })
    }

    // Recupera reti dove il lab e membro (potrebbe sovrapporsi con admin, deduplicare)
    const { data: retiMembro, error: errMembro } = await svc
      .from('reti_membri')
      .select('rete_id, ruolo, joined_at, rete:reti(id, nome, admin_laboratorio_id, created_at, updated_at)')
      .eq('laboratorio_id', labId)

    if (errMembro) {
      return NextResponse.json({ error: errMembro.message }, { status: 500 })
    }

    // Costruisci lista reti unificata
    const adminIds = new Set((retiAdmin ?? []).map((r) => r.id))
    const retiMembriFiltered = (retiMembro ?? []).filter((rm) => {
      const rete = Array.isArray(rm.rete) ? rm.rete[0] : rm.rete
      return rete && !adminIds.has(rete.id)
    })

    const retiConRuolo = [
      ...(retiAdmin ?? []).map((r) => ({ ...r, ruolo: 'admin_rete' as const })),
      ...retiMembriFiltered.map((rm) => {
        const rete = Array.isArray(rm.rete) ? rm.rete[0] : rm.rete
        return { ...(rete as Record<string, unknown>), ruolo: rm.ruolo as 'membro' | 'admin_rete' }
      }),
    ]

    return NextResponse.json({ reti: retiConRuolo })
  })
}

// POST /api/rete
// Crea nuova rete (solo admin_rete o titolare)
export async function POST(req: Request) {
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

  // Solo titolare o admin_rete possono creare una rete
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json(
      { error: 'Permesso negato — solo il Titolare puo creare una rete multi-sede' },
      { status: 403 }
    )
  }
  const svc = getServiceClient()
  const labId = context.laboratorioId

  // Un lab amministra al massimo una rete (no vincolo UNIQUE a DB, solo check applicativo)
  const { data: reteEsistente } = await svc
    .from('reti')
    .select('id')
    .eq('admin_laboratorio_id', labId)
    .maybeSingle()

  if (reteEsistente) {
    return NextResponse.json(
      { error: 'Il laboratorio amministra già una rete' },
      { status: 409 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ error: 'Campo "nome" obbligatorio' }, { status: 422 })
  }

  // Crea la rete
  const { data: rete, error: reteError } = await svc
    .from('reti')
    .insert({
      nome: (body.nome as string).trim(),
      admin_laboratorio_id: labId,
    })
    .select('id, nome, admin_laboratorio_id, created_at, updated_at')
    .single()

  if (reteError) {
    return NextResponse.json({ error: reteError.message }, { status: 500 })
  }

  // Inserisci il lab admin come membro admin_rete
  const { error: membroError } = await svc
    .from('reti_membri')
    .insert({
      rete_id: rete.id,
      laboratorio_id: labId,
      ruolo: 'admin_rete',
    })

  if (membroError) {
    // Non bloccare la risposta: rete creata, membro inserimento fallito (log)
    console.error('[RETE] Errore inserimento membro admin:', membroError.message)
  }

  return NextResponse.json({ rete }, { status: 201 })
}
