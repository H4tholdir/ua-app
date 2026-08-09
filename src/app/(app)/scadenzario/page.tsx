import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ScadenzarioList } from '@/components/features/scadenzario/ScadenzarioList'
import { getLabContext } from '@/lib/supabase/lab-context'

export const metadata = { title: 'Scadenzario | UÀ' }

export default async function ScadenzarioPage() {
  // ⚖️ D345 — il sollecito di pagamento si firma col NOME DEL LABORATORIO, e il
  // nome arriva da qui: `ScadenzarioList` è un componente client che si prende i
  // dati da `/api/scadenzario`, cioè da una rotta che parla di **clienti** e non
  // ha ragione di portare il mittente.
  // 🛑 Nessuna SECONDA via di lettura: `getLabContext()` è il contesto che tutta
  // l'app usa già (`(app)/layout.tsx:22`) e porta di suo `laboratori(nome)`
  // (`lab-context.ts:24`). È `cache()`ata per richiesta, quindi qui non aggiunge
  // una andata al banco.
  // ⚠️ `lab` è `null` per progetto quando l'utente è `admin_sistema`
  // (`laboratorio_id` NULL): il nome può mancare, e cosa succede allora lo decide
  // `src/lib/messaggi/firma.ts` — non questa pagina.
  const context = await getLabContext()

  return (
    <PageWrapper>
      <AppHeader
        title="Scadenzario"
        subtitle="Clienti con pagamenti in sospeso"
        backHref="/dashboard"
      />
      <ScadenzarioList nomeLaboratorio={context?.lab?.nome ?? null} />
    </PageWrapper>
  )
}
