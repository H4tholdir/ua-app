import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { fetchPendenzeRiconciliazione } from '@/lib/fattura/ricevute/queries-riconciliazioni'
import { RUOLI_INVIO_PEC } from '@/lib/fattura/invio-claim'
import { RiconciliazioniClient } from '@/components/features/fatture/RiconciliazioniClient'

// «Da sistemare» (Task 16, variante A approvata — docs/design/decisions/
// 2026-07-16-riconciliazioni.md): Server Component sottile, auth + fetch
// aggregato (Task 14) qui, tutta l'interattività (sheet, ruoli) nel client
// component. Fail-closed pattern coerente col resto di /fatture: se la
// lettura fallisce si propaga (nessuna lista parziale silenziosa).
export default async function RiconciliazioniPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login?error=no_lab')

  const svc = getServiceClient()
  const pendenze = await fetchPendenzeRiconciliazione(svc, context.laboratorioId)

  const ruolo: string = context.ruolo ?? ''
  // Gate UI upload/conferma ricevute (QA FASE 9, scenario 8): stessa allowlist
  // della route (RUOLI_INVIO_PEC — MAI hardcodare la lista qui). Calcolato nel
  // Server Component perché invio-claim.ts è 'server-only': il client riceve
  // il flag già risolto. Per i ruoli fuori allowlist (es. tecnico) la pagina
  // resta consultabile in sola lettura: gruppi visibili, azioni nascoste.
  const puoCaricareRicevute = (RUOLI_INVIO_PEC as readonly string[]).includes(ruolo)

  return (
    <>
      <AppHeader title="Da sistemare" subtitle="Fatture e ricevute che hanno bisogno di te" backHref="/fatture" />
      <PageWrapper>
        <RiconciliazioniClient pendenze={pendenze} ruolo={ruolo} puoCaricareRicevute={puoCaricareRicevute} />
      </PageWrapper>
    </>
  )
}
