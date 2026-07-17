import { redirect } from 'next/navigation'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import AdminNav from './admin-nav'
import './admin.css'

// Admin role is verified via getFreshLabContext — getUser() di rete, NON
// claims cachate (admin = mutazioni/borderline, spec R2 §D-2) + filtro
// deleted_at SEMPRE applicato (N11: un admin soft-deleted perde l'accesso
// immediatamente, non al TTL delle claims).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getFreshLabContext()
  if (!context) redirect('/login')

  if (context.ruolo !== 'admin_sistema') redirect('/dashboard')

  const displayName = context.nome
    ? `${context.nome} ${context.cognome ?? ''}`.trim()
    : (context.email ?? 'Admin')

  return (
    <div className="adm-body">
      <AdminNav userDisplay={displayName} />
      {children}
    </div>
  )
}
