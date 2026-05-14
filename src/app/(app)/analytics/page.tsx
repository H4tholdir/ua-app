import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { DashboardStats } from '@/types/domain'

const defaultStats: DashboardStats = {
  consegne_oggi: 0,
  lavori_in_ritardo: 0,
  pronti_non_fatturati: 0,
  tecnico_piu_saturo: null,
  mdr_incompleti: 0,
  spedizioni_in_ritardo: 0,
  is_rifacimento_count: 0,
  stl_non_assegnati: 0,
  lavori_attivi: 0,
  fatturato_mese: 0,
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div
      style={{
        background: '#1B2D6B',
        borderRadius: '16px',
        padding: '20px 16px',
        boxShadow: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <span
        style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '28px',
          fontWeight: 700,
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontWeight: 500,
          color: '#8899CC',
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default async function AnalyticsPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  const labId: string = utente?.laboratorio_id ?? ''

  let stats: DashboardStats = defaultStats
  let cacheUpdatedAt: string | null = null

  if (labId) {
    const { data: cache } = await svc
      .from('dashboard_kpi_cache')
      .select('*')
      .eq('laboratorio_id', labId)
      .maybeSingle()

    if (cache) {
      stats = {
        ...defaultStats,
        consegne_oggi: cache.consegne_oggi ?? 0,
        lavori_in_ritardo: cache.lavori_in_ritardo ?? 0,
        pronti_non_fatturati: cache.pronti_non_fatturati ?? 0,
        mdr_incompleti: cache.mdr_incompleti ?? 0,
        spedizioni_in_ritardo: cache.spedizioni_in_ritardo ?? 0,
        is_rifacimento_count: cache.is_rifacimento_count ?? 0,
        stl_non_assegnati: cache.stl_non_assegnati ?? 0,
        lavori_attivi: cache.lavori_attivi ?? 0,
        fatturato_mese: Number(cache.fatturato_mese ?? 0),
        tecnico_piu_saturo: cache.tecnico_saturo_id
          ? { nome: '', sigla: null, lavori_attivi: cache.tecnico_saturo_count ?? 0 }
          : null,
      }
      cacheUpdatedAt = (cache.updated_at as string | null) ?? null
    }
  }

  const aggiornato = cacheUpdatedAt
    ? new Date(cacheUpdatedAt).toLocaleString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
      })
    : null

  return (
    <PageWrapper>
      <AppHeader title="Analytics" subtitle="KPI operativi" />

      <div style={{ padding: '0 20px 32px' }}>
        {/* Griglia 2×3 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <KpiCard
            label="Lavori attivi"
            value={String(stats.lavori_attivi)}
            accent="#4C6EF5"
          />
          <KpiCard
            label="Consegne oggi"
            value={String(stats.consegne_oggi)}
            accent="#D4A843"
          />
          <KpiCard
            label="In ritardo"
            value={String(stats.lavori_in_ritardo)}
            accent="#FA5252"
          />
          <KpiCard
            label="Pronti da fatturare"
            value={String(stats.pronti_non_fatturati)}
            accent="#2ECC9A"
          />
          <KpiCard
            label="MDR incompleti"
            value={String(stats.mdr_incompleti)}
            accent="#FD7E14"
          />
          <KpiCard
            label="Fatturato mese"
            value={formatEuro(stats.fatturato_mese)}
            accent="#D4A843"
          />
        </div>

        {/* Timestamp aggiornamento */}
        {aggiornato && (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: '#6677AA',
              textAlign: 'center',
              margin: 0,
            }}
          >
            Aggiornato: {aggiornato}
          </p>
        )}
      </div>
    </PageWrapper>
  )
}
