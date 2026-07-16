import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
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
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const pendenze = await fetchPendenzeRiconciliazione(svc, utente.laboratorio_id)

  const ruolo: string = (utente.ruolo as string) ?? ''
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
