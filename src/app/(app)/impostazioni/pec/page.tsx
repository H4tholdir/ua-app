'use client'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PecSetupWidget } from '@/components/features/pec/PecSetupWidget'
import { useRouter } from 'next/navigation'

export default function PecPage() {
  const router = useRouter()

  return (
    <>
      <AppHeader title="Configurazione PEC" backHref="/impostazioni" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px', maxWidth: '480px' }}>
          <PecSetupWidget
            onSuccess={() => router.push('/impostazioni?pec=ok')}
          />
        </div>
      </PageWrapper>
    </>
  )
}
