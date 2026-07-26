import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getParete } from '@/lib/cassette/parco'
import { PareteClient } from '@/components/features/cassette/PareteClient'

export const dynamic = 'force-dynamic'

// «Le cassette» (§5, Task 11) — la parete del laboratorio: una cella per cassetta, nell'ordine
// del tuo muro. Stesso schema auth/perimetro delle altre pagine v3 (/tutto-il-resto, /lavori):
// il ruolo si valida QUI, non lo si lascia al database — il service client bypassa RLS.
// `admin_sistema` (laboratorio_id NULL) non ha una parete: usa /admin.
//
// La lettura è auto-riparante (`getParete`, D-5): le cassette rimaste "occupate" da un lavoro
// consegnato o annullato si liberano alla prima apertura di questa pagina.
export default async function CassettePage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')
  const { ruolo, laboratorioId: labId } = context
  if (!['titolare', 'admin_rete', 'tecnico', 'front_desk'].includes(ruolo)) redirect('/login')

  const svc = getServiceClient()
  const parete = await getParete(svc, labId)

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      <PareteClient parete={parete} />
    </div>
  )
}
