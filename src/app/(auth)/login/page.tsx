import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginForm from './login-form'

export const metadata: Metadata = {
  title: 'Accedi',
  description: 'Accedi al tuo laboratorio UÀ',
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
