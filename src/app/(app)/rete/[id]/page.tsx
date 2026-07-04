import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ReteDettaglio } from '@/components/features/rete/ReteDettaglio'
import type { MembroRete, InvitoPendenteRete } from '@/components/features/rete/ReteDettaglio'
import { RinominaReteSheet } from '@/components/features/rete/RinominaReteSheet'

interface Props { params: Promise<{ id: string }> }

export default async function ReteDettaglioPage({ params }: Props) {
  const { id } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login')

  const { data: rete } = await svc
    .from('reti')
    .select('id, nome, admin_laboratorio_id')
    .eq('id', id)
    .single()

  const isAdminLab = rete?.admin_laboratorio_id === utente.laboratorio_id

  const { data: membriRaw } = await svc
    .from('reti_membri')
    .select('laboratorio_id, ruolo, joined_at')
    .eq('rete_id', id)

  const isMemberLab = (membriRaw ?? []).some(m => m.laboratorio_id === utente.laboratorio_id)

  if (!rete || (!isAdminLab && !isMemberLab)) {
    redirect('/rete')
  }

  const membri: MembroRete[] = await Promise.all(
    (membriRaw ?? []).map(async (m) => {
      const { data: lab } = await svc
        .from('laboratori')
        .select('nome, citta, piano')
        .eq('id', m.laboratorio_id)
        .single()
      return {
        laboratorioId: m.laboratorio_id,
        ruolo: m.ruolo as 'admin_rete' | 'membro',
        joinedAt: m.joined_at,
        nome: lab?.nome ?? 'Laboratorio sconosciuto',
        citta: lab?.citta ?? null,
        piano: lab?.piano ?? null,
      }
    })
  )

  let invitiPendenti: InvitoPendenteRete[] = []
  if (isAdminLab) {
    const { data: invitiRaw } = await svc
      .from('inviti_rete')
      .select('id, email, expires_at')
      .eq('rete_id', id)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    invitiPendenti = (invitiRaw ?? []).map(i => ({
      id: i.id,
      email: i.email,
      expiresAt: i.expires_at,
    }))
  }

  return (
    <>
      <AppHeader
        title={rete.nome}
        subtitle="Rete multi-sede"
        backHref="/rete"
        actions={isAdminLab ? <RinominaReteSheet reteId={rete.id} nomeIniziale={rete.nome} /> : undefined}
      />
      <PageWrapper>
        <ReteDettaglio
          reteId={rete.id}
          isAdminLab={isAdminLab}
          adminLaboratorioId={rete.admin_laboratorio_id}
          membriIniziali={membri}
          invitiPendentiIniziali={invitiPendenti}
        />
      </PageWrapper>
    </>
  )
}
