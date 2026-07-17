import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { CicliProduzioneList } from '@/components/features/cicli/CicliProduzioneList'
import { CicloNuovoSheet } from '@/components/features/cicli/CicloNuovoSheet'

export const metadata = { title: 'Cicli di produzione' }

export default async function CicliProduzionePage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) return null

  const svc = getServiceClient()
  const { data: cicli } = await svc
    .from('cicli_produzione')
    .select('id, codice, nome, tipo_dispositivo')
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .order('codice', { ascending: true })
    .limit(500)

  return (
    <>
      <AppHeader title="Cicli di produzione" backHref="/dashboard" actions={<CicloNuovoSheet mode="create" />} />
      <PageWrapper>
        <CicliProduzioneList cicli={cicli ?? []} />
      </PageWrapper>
    </>
  )
}
