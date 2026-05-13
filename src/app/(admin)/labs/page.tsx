import { getServiceClient } from '@/lib/supabase/server-service'
import LabsList from './labs-list'

export const dynamic = 'force-dynamic'

type Lab = {
  id: string
  nome: string
  ragione_sociale: string | null
  partita_iva: string
  stato: string
  piano: string
  trial_ends_at: string | null
  stripe_subscription_status: string | null
  stripe_price_id: string | null
  created_at: string
}

function calcMrr(labs: Lab[]): number {
  return labs
    .filter(l => l.stato === 'attivo')
    .reduce((acc, l) => {
      const isRete = l.piano === 'rete'
      const isYearly = l.stripe_price_id?.includes('yearly') ?? false
      const monthly = isRete ? (isYearly ? Math.round(1490 / 12) : 149) : (isYearly ? Math.round(490 / 12) : 49)
      return acc + monthly
    }, 0)
}

function countAlerts(labs: Lab[]) {
  const now = new Date()
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const trialExpiring = labs.filter(l =>
    l.stato === 'trial' && l.trial_ends_at && new Date(l.trial_ends_at) <= in7
  ).length
  const failedPayments = labs.filter(l =>
    l.stripe_subscription_status === 'past_due' || l.stato === 'sospeso'
  ).length
  return { trialExpiring, failedPayments }
}

function countByStato(labs: Lab[]) {
  return {
    trial:     labs.filter(l => l.stato === 'trial').length,
    attivo:    labs.filter(l => l.stato === 'attivo').length,
    sospeso:   labs.filter(l => l.stato === 'sospeso').length,
    scaduto:   labs.filter(l => l.stato === 'scaduto').length,
    blacklist: labs.filter(l => l.stato === 'blacklist').length,
  }
}

export default async function AdminLabsPage() {
  const svc = getServiceClient()
  const { data: labs = [] } = await svc
    .from('laboratori')
    .select('id, nome, ragione_sociale, partita_iva, stato, piano, trial_ends_at, stripe_subscription_status, stripe_price_id, created_at')
    .order('created_at', { ascending: false })

  const safeLabs = (labs ?? []) as Lab[]
  const mrr = calcMrr(safeLabs)
  const counts = countByStato(safeLabs)
  const alerts = countAlerts(safeLabs)

  const trialExpSub = safeLabs
    .filter(l => l.stato === 'trial' && l.trial_ends_at)
    .sort((a, b) => new Date(a.trial_ends_at!).getTime() - new Date(b.trial_ends_at!).getTime())
  const nextTrialExpiry = trialExpSub[0]?.trial_ends_at

  return (
    <div className="adm-page">

      {/* MRR Banner */}
      <div className="adm-mrr adm-animate">
        <div className="adm-mrr-group">
          <span className="adm-mrr-label">MRR</span>
          <span className="adm-mrr-value">€{mrr.toLocaleString('it-IT')}</span>
          <span className="adm-mrr-sub">/ mese · ARR €{(mrr * 12).toLocaleString('it-IT')}</span>
        </div>
        <div className="adm-alerts">
          {alerts.trialExpiring > 0 && (
            <div className="adm-alert-pill warn">
              <span className="adm-dot warn" />
              {alerts.trialExpiring} trial {alerts.trialExpiring === 1 ? 'scade' : 'scadono'} in 7gg
            </div>
          )}
          {alerts.failedPayments > 0 && (
            <div className="adm-alert-pill error">
              <span className="adm-dot error" />
              {alerts.failedPayments} pagamento{alerts.failedPayments > 1 ? 'i' : ''} fallito{alerts.failedPayments > 1 ? 'i' : ''}
            </div>
          )}
          {alerts.trialExpiring === 0 && alerts.failedPayments === 0 && (
            <div className="adm-alert-pill" style={{ color: 'var(--adm-g)' }}>
              <span className="adm-dot" style={{ background: 'var(--adm-g)' }} />
              Tutto ok
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="adm-stats">
        <div className="adm-stat trial adm-animate" style={{ animationDelay: '.08s' }}>
          <span className="adm-stat-label">In prova</span>
          <span className="adm-stat-value">{counts.trial}</span>
          <span className="adm-stat-sub">
            {nextTrialExpiry
              ? `1 scade ${new Date(nextTrialExpiry).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`
              : ' '}
          </span>
        </div>
        <div className="adm-stat attivo adm-animate" style={{ animationDelay: '.12s' }}>
          <span className="adm-stat-label">Attivi</span>
          <span className="adm-stat-value">{counts.attivo}</span>
          <span className="adm-stat-sub">
            {safeLabs.filter(l => l.stato === 'attivo' && l.piano === 'lab').length} Lab ·{' '}
            {safeLabs.filter(l => l.stato === 'attivo' && l.piano === 'rete').length} Rete
          </span>
        </div>
        <div className="adm-stat sospeso adm-animate" style={{ animationDelay: '.16s' }}>
          <span className="adm-stat-label">Sospesi</span>
          <span className="adm-stat-value">{counts.sospeso}</span>
          <span className="adm-stat-sub">{counts.sospeso > 0 ? 'Intervento richiesto' : ' '}</span>
        </div>
        <div className="adm-stat scaduto adm-animate" style={{ animationDelay: '.20s' }}>
          <span className="adm-stat-label">Scaduti</span>
          <span className="adm-stat-value">{counts.scaduto}</span>
          <span className="adm-stat-sub">&nbsp;</span>
        </div>
        <div className="adm-stat blacklist adm-animate" style={{ animationDelay: '.24s' }}>
          <span className="adm-stat-label">Blacklist</span>
          <span className="adm-stat-value">{counts.blacklist}</span>
          <span className="adm-stat-sub">&nbsp;</span>
        </div>
      </div>

      {/* Labs list — client component for filtering */}
      <LabsList labs={safeLabs} />
    </div>
  )
}
