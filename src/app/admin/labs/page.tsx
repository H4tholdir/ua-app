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
  const nextTrialExpiry = trialExpSub[0]?.trial_ends_at ?? null

  const labAttiviRete = safeLabs.filter(l => l.stato === 'attivo' && l.piano === 'rete').length

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

      {/* Stat tiles + lista — tiles cliccabili come filtri (gestito in LabsList) */}
      <LabsList
        labs={safeLabs}
        counts={counts}
        nextTrialExpiry={nextTrialExpiry}
        labAttiviRete={labAttiviRete}
      />
    </div>
  )
}
