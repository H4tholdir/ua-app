import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = await params
  const svc = getServiceClient()

  // Trova il titolare del laboratorio
  const { data: titolare } = await svc
    .from('utenti')
    .select('id, nome, cognome, email')
    .eq('laboratorio_id', id)
    .eq('ruolo', 'titolare')
    .maybeSingle()

  if (!titolare?.email) {
    return NextResponse.json({ error: 'Nessun titolare con email trovato per questo laboratorio' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'

  // Genera magic link monouso via Supabase Auth Admin
  const { data, error } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: titolare.email,
    options: {
      redirectTo: `${appUrl}/dashboard`,
    },
  })

  if (error || !data?.properties?.action_link) {
    console.error('[impersonate] generateLink error:', error?.message)
    return NextResponse.json({ error: error?.message ?? 'Impossibile generare il link' }, { status: 500 })
  }

  const nomeTitolare = `${titolare.nome ?? ''} ${titolare.cognome ?? ''}`.trim() || titolare.email

  return NextResponse.json({
    action_link: data.properties.action_link,
    titolare_nome: nomeTitolare,
    titolare_email: titolare.email,
  })
}
