import { redirect } from 'next/navigation'
import { createHash } from 'crypto'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { AccettaInvitoReteForm } from '@/components/features/rete/AccettaInvitoReteForm'

interface Props { params: Promise<{ token: string }> }

const fontFamily = "'DM Sans', system-ui, sans-serif"

function MessaggioInvito({ testo }: { testo: string }) {
  return (
    <PageWrapper>
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--t2, #4A3D33)', fontSize: 14, fontFamily }}>{testo}</p>
      </div>
    </PageWrapper>
  )
}

export default async function AccettaInvitoRetePage({ params }: Props) {
  const { token } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data: invito } = await svc
    .from('inviti_rete')
    .select('id, email, rete_id, expires_at, accepted_at, revoked_at, rete:reti(nome)')
    .eq('token_hash', tokenHash)
    .single()

  if (!invito || invito.accepted_at || invito.revoked_at || new Date(invito.expires_at) < new Date()) {
    return (
      <>
        <AppHeader title="Invito rete" backHref="/rete" />
        <MessaggioInvito testo="Invito non valido o scaduto." />
      </>
    )
  }

  const { data: utente } = await svc.from('utenti').select('email, ruolo').eq('id', user.id).single()

  if (!utente?.email || utente.email.toLowerCase().trim() !== invito.email.toLowerCase().trim()) {
    return (
      <>
        <AppHeader title="Invito rete" backHref="/rete" />
        <MessaggioInvito testo="Questo invito è per un altro indirizzo email." />
      </>
    )
  }

  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return (
      <>
        <AppHeader title="Invito rete" backHref="/rete" />
        <MessaggioInvito testo="Solo il titolare del laboratorio può accettare questo invito." />
      </>
    )
  }

  const reteRaw = invito.rete
  const rete = (Array.isArray(reteRaw) ? reteRaw[0] : reteRaw) as { nome: string } | null

  return (
    <>
      <AppHeader title="Invito rete" backHref="/rete" />
      <PageWrapper>
        <AccettaInvitoReteForm token={token} reteNome={rete?.nome ?? 'rete'} />
      </PageWrapper>
    </>
  )
}
