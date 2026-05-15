import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ScadenzarioList } from '@/components/features/scadenzario/ScadenzarioList'

export const metadata = { title: 'Scadenzario | UÀ' }

export default function ScadenzarioPage() {
  return (
    <PageWrapper>
      <AppHeader
        title="Scadenzario"
        subtitle="Clienti con pagamenti in sospeso"
        backHref="/dashboard"
      />
      <ScadenzarioList />
    </PageWrapper>
  )
}
