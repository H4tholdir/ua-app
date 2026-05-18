import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

interface Props { params: Promise<{ id: string }> }

export default async function MagazzinoDetailPage({ params }: Props) {
  const { id } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: art } = await svc
    .from('magazzino')
    .select('id, codice, descrizione, unita_misura, giacenza_attuale, scorta_minima, prezzo_acquisto, fornitore, note, categoria')
    .eq('id', id).eq('laboratorio_id', utente.laboratorio_id).is('deleted_at', null).single()

  if (!art) redirect('/magazzino')

  const card: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
    marginBottom: '12px',
  }
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--elv)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }
  const a = art as Record<string, unknown>

  const isLow = typeof a.giacenza_attuale === 'number' && typeof a.scorta_minima === 'number'
    && (a.giacenza_attuale as number) <= (a.scorta_minima as number)

  return (
    <>
      <AppHeader title={a.descrizione as string} backHref="/magazzino" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px' }}>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>Articolo</div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Codice</span><span style={{ fontFamily: 'monospace' }}>{a.codice as string ?? '—'}</span></div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Categoria</span><span>{a.categoria as string ?? '—'}</span></div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Fornitore</span><span>{a.fornitore as string ?? '—'}</span></div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Prezzo acquisto</span><span>{typeof a.prezzo_acquisto === 'number' ? `€${(a.prezzo_acquisto as number).toFixed(2)}` : '—'}</span></div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: 'var(--t2)' }}>Note</span>
              <span style={{ maxWidth: '180px', textAlign: 'right', color: 'var(--t2)' }}>{a.note as string ?? '—'}</span>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>Giacenza</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: isLow ? '#D90012' : 'var(--t1)', letterSpacing: '-.04em', fontFamily: 'DM Sans, sans-serif' }}>
                  {a.giacenza_attuale as number ?? 0}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>{a.unita_misura as string ?? 'pz'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>Scorta minima</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>{a.scorta_minima as number ?? 0} {a.unita_misura as string ?? 'pz'}</div>
              </div>
            </div>
            {isLow && (
              <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(217,0,18,.07)', fontSize: '12px', fontWeight: 600, color: '#D90012', fontFamily: 'DM Sans, sans-serif' }}>
                Scorta sotto la soglia minima — ordinare al più presto
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
