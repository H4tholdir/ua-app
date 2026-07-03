import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { verifyAdminRete } from '@/lib/rete/verify-admin-rete'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; laboratorioId: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id, laboratorioId } = await params
  const svc = getServiceClient()

  const ctx = await verifyAdminRete(id)
  let autorizzato = ctx !== null

  if (!autorizzato) {
    const userClient = await getServerUserClient()
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (user) {
      const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
      autorizzato = utente?.ruolo === 'admin_sistema'
    }
  }

  if (!autorizzato) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

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
