import 'server-only'
import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getServerUserClient } from '@/lib/supabase/server-user'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 1. CSRF check
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'CSRF' }, { status: 403 })

  // 2. Verifica admin_sistema
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = getServiceClient()
  const { data: me } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  if (me?.ruolo !== 'admin_sistema') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 3. Trova il titolare del lab
  const { id } = await params
  const { data: titolare, error: titErr } = await svc
    .from('utenti')
    .select('id, email, nome, cognome')
    .eq('laboratorio_id', id)
    .eq('ruolo', 'titolare')
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (titErr || !titolare?.email) {
    return NextResponse.json(
      { error: 'Nessun titolare trovato per questo laboratorio' },
      { status: 404 }
    )
  }

  // 4. Genera magic link tramite service-role client (già configurato con service key)
  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: titolare.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'}/dashboard`,
    },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: linkErr?.message ?? 'Impossibile generare il link' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    action_link: linkData.properties.action_link,
    titolare_email: titolare.email,
    titolare_nome: `${titolare.nome ?? ''} ${titolare.cognome ?? ''}`.trim(),
  })
}
