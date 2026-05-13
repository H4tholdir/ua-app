import type { Metadata } from 'next'
import { Suspense } from 'react'
import ForgotForm from './forgot-form'

export const metadata: Metadata = {
  title: 'Password dimenticata',
  description: 'Recupera l\'accesso al tuo laboratorio UÀ',
}

export default function ForgotPasswordPage() {
  return <Suspense><ForgotForm /></Suspense>
}
