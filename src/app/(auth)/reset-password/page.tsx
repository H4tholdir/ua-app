import type { Metadata } from 'next'
import { Suspense } from 'react'
import ResetForm from './reset-form'

export const metadata: Metadata = {
  title: 'Nuova password',
  description: 'Imposta la tua nuova password UÀ',
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>
}
