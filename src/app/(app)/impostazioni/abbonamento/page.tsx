import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { isTrialExpiringSoon } from '@/lib/utils/lab-stato'

export default async function AbbonamentoPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login?error=no_lab')

  const svc = getServiceClient()
  // piano/stripe_* NON sono nel LabContext — query locale (1 RT) per questi campi extra.
  const { data: lab } = await svc
    .from('laboratori')
    .select('nome, stato, piano, trial_ends_at, stripe_subscription_status, stripe_customer_id')
    .eq('id', context.laboratorioId).single()

  if (!lab) redirect('/login?error=no_lab')

  const l = lab as Record<string, unknown>
  const trialDate = l.trial_ends_at ? new Date(l.trial_ends_at as string).toLocaleDateString('it-IT') : null
  const trialExpiringSoon = isTrialExpiringSoon(l.stato as string, l.trial_ends_at as string | null)

  const card: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
    boxShadow: 'var(--sh-b)',
    marginBottom: '12px',
  }

  return (
    <>
      <AppHeader title="Abbonamento" backHref="/impostazioni" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px', maxWidth: '480px' }}>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px', fontFamily: 'DM Sans, sans-serif' }}>Piano attuale</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
                {(l.piano as string) === 'rete' ? 'Rete PRO' : 'Laboratorio'}
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', fontFamily: 'DM Sans, sans-serif',
                background: l.stato === 'attivo' ? 'rgba(22,163,74,.1)' : 'rgba(180,83,9,.1)',
                color: l.stato === 'attivo' ? 'var(--success, #16A34A)' : 'var(--warning, #B45309)',
              }}>
                {l.stato === 'trial' ? `Trial${trialDate ? ` · scade ${trialDate}` : ''}` :
                 l.stato === 'attivo' ? 'Attivo' : (l.stato as string)?.toUpperCase()}
              </span>
            </div>
            {trialExpiringSoon && (
              <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(180,83,9,.08)', fontSize: '13px', color: 'var(--warning, #B45309)', fontWeight: 600, marginBottom: '16px', fontFamily: 'DM Sans, sans-serif' }}>
                Il trial scade tra pochi giorni. Attiva il piano per continuare.
              </div>
            )}
            {l.stato === 'attivo' ? (
              <a href="/api/stripe/portal" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px', borderRadius: '14px', textDecoration: 'none',
                background: 'var(--elv)', color: 'var(--t1)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700,
                boxShadow: 'var(--sh-b)',
              }}>
                Gestisci abbonamento →
              </a>
            ) : (
              <a href="/billing" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px', borderRadius: '14px', textDecoration: 'none',
                background: 'var(--gold, #D4A843)', color: '#fff',
                fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), 0 6px 18px -2px rgba(180,130,0,.38)',
              }}>
                → Attiva il piano
              </a>
            )}
          </div>
          <div style={{ ...card, fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif' }}>
            <strong>Piano Lab:</strong> €49/mese · €490/anno<br/>
            <strong>Piano Rete PRO:</strong> €149/mese · €1.490/anno<br/>
            <br/>
            Per assistenza sull&apos;abbonamento: <strong>supporto@ua.app</strong>
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
