import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { RischiEditor } from '@/components/features/qualita/RischiEditor'
import type { RischioItem, NormaItem } from '@/components/features/qualita/RischiEditor'
import { LABEL_MACRO } from '@/lib/domain/tipi-lavoro'

interface Props { params: Promise<{ id: string }> }

// B4: consolidata su LABEL_MACRO (unica fonte) — src/lib/domain/tipi-lavoro.ts
function formatTipoDispositivo(tipo: string): string {
  return LABEL_MACRO[tipo as keyof typeof LABEL_MACRO] ?? tipo
}

export default async function RischiDetailPage({ params }: Props) {
  const { id } = await params
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login?error=no_lab')

  const svc = getServiceClient()
  const { data: rischio } = await svc
    .from('rischi_tipo_dispositivo')
    .select('id, tipo_dispositivo, rischi_json, norme_json, rischi_residui, misure_controllo, data_ultima_revisione, versione')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
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
          normeIniziali={(Array.isArray(rischio.norme_json) ? rischio.norme_json : []) as unknown as NormaItem[]}
        />
      </PageWrapper>
    </>
  )
}
