import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { verifyAdminRete } from '@/lib/rete/verify-admin-rete'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; laboratorioId: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id, laboratorioId } = await params
  const svc = getServiceClient()

  // Doppio percorso di autorizzazione: admin di rete oppure admin_sistema.
  // Il contesto di fallback è hoistato così la guard è SEMPRE chiamata
  // (bypass admin_sistema e fail-closed su null vivono dentro la guard).
  const ctx = await verifyAdminRete(id)
  const fallback = ctx ? null : await getFreshLabContext()
  const autorizzato = ctx !== null || fallback?.ruolo === 'admin_sistema'

  if (!autorizzato) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const guard = assertLabOperativo(ctx ?? fallback, 'DELETE')
  if (guard) return guard

  const { data: rete } = await svc.from('reti').select('admin_laboratorio_id').eq('id', id).single()
  if (!rete) {
    return NextResponse.json({ error: 'Rete non trovata' }, { status: 404 })
  }

  if (laboratorioId === rete.admin_laboratorio_id) {
    return NextResponse.json(
      { error: 'Non è possibile rimuovere il laboratorio amministratore dalla rete' },
      { status: 400 }
    )
  }

  const { error } = await svc
    .from('reti_membri')
    .delete()
    .eq('rete_id', id)
    .eq('laboratorio_id', laboratorioId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
