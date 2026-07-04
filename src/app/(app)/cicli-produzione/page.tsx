import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { CicliProduzioneList } from '@/components/features/cicli/CicliProduzioneList'

export const metadata = { title: 'Cicli di produzione' }

export default async function CicliProduzionePage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) return null

  const { data: cicli } = await svc
    .from('cicli_produzione')
    .select('id, codice, nome, tipo_dispositivo')
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .order('codice', { ascending: true })
    .limit(500)

  return (
    <>
      <AppHeader title="Cicli di produzione" backHref="/dashboard" />
      <PageWrapper>
        <CicliProduzioneList cicli={cicli ?? []} />
      </PageWrapper>
    </>
  )
}
