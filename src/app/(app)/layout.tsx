import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { BottomNavPill } from '@/components/layout/BottomNavPill'
import { SwRegistration } from '@/components/layout/SwRegistration'
import { PushRegistrar } from '@/components/features/notifications/PushRegistrar'
import { SkipToContent } from '@/components/layout/SkipToContent'
import { UserProfileSheet } from '@/components/layout/UserProfileSheet'
import { RealtimeProvider } from '@/components/layout/RealtimeProvider'

// Wrapper isolato per il timestamp — react-hooks/purity vieta di chiamare
// performance.now() direttamente nel corpo del Server Component (vedi anche
// ScadenzarioList.tsx per il pattern analogo lato client con Date.now()).
function perfNow(): number {
  return performance.now()
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t0 = perfNow()
  const { context, timings } = await getLabContextWithTimings()
  const hdrs = await headers()
  const route = hdrs.get('x-pathname') ?? 'unknown'

  // Log strutturato 1-riga — emesso SEMPRE PRIMA di ogni redirect (redirect()
  // lancia — riserva sre R6c) così da non perdere osservabilità sui bounce.
  const logLine = () => console.log(`[layout] ${JSON.stringify({
    route,
    authMs: Math.round(timings.authMs),
    dbMs: Math.round(timings.dbMs),
    totalMs: Math.round(perfNow() - t0),
  })}`)

  if (!context) { logLine(); redirect('/login') }

  // Ordine VINCOLATO (spec §D-2): admin_sistema PRIMA del check lab-null —
  // admin_sistema usa /admin/labs, non (app) — evita il loop redirect
  // dashboard→login→dashboard (riserva BA R7).
  if (context.ruolo === 'admin_sistema') { logLine(); redirect('/admin/labs') }

  const lab = context.lab
  const laboratorioId = context.laboratorioId
  if (!lab || !laboratorioId) { logLine(); redirect('/login?error=no_lab') }

  // Blacklist is terminal — revoked immediately with no appeal path
  if (lab.stato === 'blacklist') { logLine(); redirect('/blocked') }

  // NOTE: /billing and /blocked live outside (app) group to avoid redirect loops.
  // sospeso/scaduto → redirect('/billing') → (app) layout → sospeso → loop ∞
  if (lab.stato === 'sospeso') { logLine(); redirect('/billing') }
  if (lab.stato === 'scaduto') { logLine(); redirect('/billing?expired=true') }

  // Trial expired — trial_ends_at IS NULL = admin override, never expires
  if (
    lab.stato === 'trial' &&
    lab.trial_ends_at !== null &&
    new Date(lab.trial_ends_at) < new Date()
  ) {
    logLine()
    redirect('/billing?trial_expired=true')
  }

  const isTrialExpiring = lab.stato === 'trial' && lab.trial_ends_at
    ? (new Date(lab.trial_ends_at).getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000
    : false

  logLine()

  return (
    <RealtimeProvider
      laboratorioId={laboratorioId}
      ruolo={context.ruolo}
    >
      {/* SkipToContent è un Client island — onFocus/onBlur non possono stare in Server Component */}
      <SkipToContent />

      {/* Profilo utente — avatar fisso top-right + bottom sheet */}
      <UserProfileSheet
        nome={context.nome ?? ''}
        cognome={context.cognome}
        email={context.email ?? ''}
        ruolo={context.ruolo}
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
