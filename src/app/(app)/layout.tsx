import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { BottomNavPill } from '@/components/layout/BottomNavPill'
import { SwRegistration } from '@/components/layout/SwRegistration'
import { PushRegistrar } from '@/components/features/notifications/PushRegistrar'
import { SkipToContent } from '@/components/layout/SkipToContent'
import { UserProfileSheet } from '@/components/layout/UserProfileSheet'
import { RealtimeProvider } from '@/components/layout/RealtimeProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // 1. Validate session
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  // 2. Load user's lab via service client (bypasses RLS — current_lab_id() not yet defined)
  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('ruolo, laboratorio_id, nome, cognome')
    .eq('id', user.id)
    .single()

  if (!utente) redirect('/login?error=no_lab')

  // admin_sistema usa /admin/labs, non (app) — evita il loop redirect dashboard→login→dashboard
  if (utente.ruolo === 'admin_sistema') redirect('/admin/labs')

  const { data: lab } = await svc
    .from('laboratori')
    .select('stato, trial_ends_at, nome')
    .eq('id', utente.laboratorio_id)
    .single()

  if (!lab) redirect('/login?error=no_lab')

  // Blacklist is terminal — revoked immediately with no appeal path
  if (lab.stato === 'blacklist') redirect('/blocked')

  // NOTE: /billing and /blocked live outside (app) group to avoid redirect loops.
  // sospeso/scaduto → redirect('/billing') → (app) layout → sospeso → loop ∞
  if (lab.stato === 'sospeso') redirect('/billing')
  if (lab.stato === 'scaduto') redirect('/billing?expired=true')

  // Trial expired — trial_ends_at IS NULL = admin override, never expires
  if (
    lab.stato === 'trial' &&
    lab.trial_ends_at !== null &&
    new Date(lab.trial_ends_at) < new Date()
  ) {
    redirect('/billing?trial_expired=true')
  }

  const utenteData = utente as { ruolo: string; laboratorio_id: string; nome: string; cognome?: string | null }

  const isTrialExpiring = lab.stato === 'trial' && lab.trial_ends_at
    ? (new Date(lab.trial_ends_at).getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000
    : false

  return (
    <RealtimeProvider
      laboratorioId={utenteData.laboratorio_id}
      ruolo={utenteData.ruolo}
    >
      {/* SkipToContent è un Client island — onFocus/onBlur non possono stare in Server Component */}
      <SkipToContent />

      {/* Profilo utente — avatar fisso top-right + bottom sheet */}
      <UserProfileSheet
        nome={utenteData.nome ?? ''}
        cognome={utenteData.cognome}
        email={user.email ?? ''}
        ruolo={utenteData.ruolo}
        labNome={lab.nome}
        trialEndsAt={lab.trial_ends_at}
        labStato={lab.stato}
        isTrialExpiring={isTrialExpiring}
      />

      <main id="main-content">
        {children}
      </main>

      {/* BottomNavPill: solo per ruoli app (non admin_sistema che va su /admin) */}
      <BottomNavPill />
      <SwRegistration />
      {/* PushRegistrar: subscription push (Task B7) — dipende da SW pronto, montato accanto */}
      <PushRegistrar />
    </RealtimeProvider>
  )
}
