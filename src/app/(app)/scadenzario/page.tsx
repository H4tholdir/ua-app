import { Suspense } from 'react'
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
      <Suspense
        fallback={
          <div
            style={{
              padding: '20px 20px',
              color: '#8899CC',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
            }}
          >
            Caricamento...
          </div>
        }
      >
        <ScadenzarioList />
      </Suspense>
    </PageWrapper>
  )
}
