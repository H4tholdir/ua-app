import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { RischiEditor } from '@/components/features/qualita/RischiEditor'
import type { RischioItem } from '@/components/features/qualita/RischiEditor'

interface Props { params: Promise<{ id: string }> }

function formatTipoDispositivo(tipo: string): string {
  const map: Record<string, string> = {
    protesi_fissa: 'Protesi Fissa',
    protesi_mobile: 'Protesi Mobile',
    implantologia: 'Implantologia',
    cad_cam: 'CAD/CAM',
    scheletrato: 'Scheletrato',
    ortodonzia: 'Ortodonzia',
    provvisorio: 'Provvisorio',
    riparazione: 'Riparazione',
    altro: 'Altro',
  }
  return map[tipo] ?? tipo
}

export default async function RischiDetailPage({ params }: Props) {
  const { id } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: rischio } = await svc
    .from('rischi_tipo_dispositivo')
    .select('id, tipo_dispositivo, rischi_json, rischi_residui, misure_controllo, data_ultima_revisione, versione')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()

  if (!rischio) redirect('/qualita/rischi')

  return (
    <>
      <AppHeader
        title={formatTipoDispositivo(rischio.tipo_dispositivo)}
        subtitle="Analisi rischi — ISO 14971"
        backHref="/qualita/rischi"
      />
      <PageWrapper>
        <RischiEditor
          rischioId={rischio.id}
          tipoDispositivoLabel={formatTipoDispositivo(rischio.tipo_dispositivo)}
          versioneIniziale={rischio.versione}
          dataRevisioneIniziale={rischio.data_ultima_revisione ?? '—'}
          rischiIniziali={(Array.isArray(rischio.rischi_json) ? rischio.rischi_json : []) as unknown as RischioItem[]}
          rischiResiduiIniziali={rischio.rischi_residui}
          misureControlloIniziali={rischio.misure_controllo}
        />
      </PageWrapper>
    </>
  )
}
