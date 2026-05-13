import { redirect } from 'next/navigation'
import { createHash } from 'crypto'
import { getServiceClient } from '@/lib/supabase/server-service'
import InviteForm from './invite-form'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const supabase = getServiceClient()
  const { data: invite } = await supabase
    .from('inviti')
    .select('id, email, ruolo, laboratorio_id, expires_at, accepted_at, laboratori(stato, nome)')
    .eq('token_hash', tokenHash)
    .single()

  if (!invite)                         redirect('/login?error=invite_invalid')
  if (invite.accepted_at)              redirect('/login?error=invite_used')
  if (new Date(invite.expires_at) < new Date()) redirect('/login?error=invite_expired')

  const labRaw = invite.laboratori
  const lab = (Array.isArray(labRaw) ? labRaw[0] : labRaw) as { stato: string; nome: string } | null
  if (!lab || !['trial', 'attivo'].includes(lab.stato)) {
    redirect('/login?error=lab_inactive')
  }

  return (
    <InviteForm
      inviteId={invite.id}
      email={invite.email}
      labNome={lab.nome}
      token={token}
    />
  )
}
