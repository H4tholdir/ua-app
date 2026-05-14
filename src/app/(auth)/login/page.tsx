import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginForm from './login-form'

export const metadata: Metadata = {
  title: { absolute: 'UÀ che lab!' },
  description: 'Il gestionale per laboratori odontotecnici italiani. DdC MDR, FatturaPA, consegne — tutto automatico, tutto dal telefono.',
  openGraph: {
    title: 'UÀ che lab!',
    description: 'Il laboratorio più rapido, più semplice, più UÀ.',
    type: 'website',
  },
}

// LoginForm uses useSearchParams() → needs a Suspense boundary
// (Next.js 15+ App Router requirement for static rendering)
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
