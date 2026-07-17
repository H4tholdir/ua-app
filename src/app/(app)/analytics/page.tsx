import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getTrendMensile } from '@/lib/dashboard/queries'
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

interface BarChartProps {
  data: { month: string; totale: number; label: string }[]
  height?: number
}

function BarChart({ data, height = 120 }: BarChartProps) {
  const max = Math.max(...data.map(d => d.totale), 1)
  const barCount = data.length
  const svgW = 320
  const barW = Math.floor((svgW - (barCount - 1) * 3) / barCount)

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgW} ${height + 24}`}
      style={{ overflow: 'visible' }}
      aria-label="Trend fatturato ultimi 12 mesi"
      role="img"
    >
      {data.map((d, i) => {
        const x = i * (barW + 3)
        const barH = max > 0 ? Math.round((d.totale / max) * height) : 0
        const y = height - barH
        const isCurrentMonth = i === data.length - 1
        return (
          <g key={d.month}>
            <rect
              x={x} y={y} width={barW} height={barH || 2}
              fill={isCurrentMonth ? 'var(--primary, #D90012)' : 'var(--prs, #D4CFC9)'}
              rx={3}
            />
            <title>{`${d.label}: €${d.totale.toLocaleString('it-IT')}`}</title>
          </g>
        )
      })}
      {/* X-axis labels every 3 months */}
      {data.filter((_, i) => i % 3 === 0 || i === data.length - 1).map((d) => {
        const i = data.indexOf(d)
        const x = i * (barW + 3) + barW / 2
        return (
          <text
            key={d.month}
            x={x} y={height + 16}
            textAnchor="middle"
            fontSize={9}
            fill="var(--t3, #6B5C51)"
            fontFamily="DM Sans, sans-serif"
          >
            {d.label}
          </text>
        )
      })}
    </svg>
  )
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
        background: 'var(--surface, #E4DFD9)',
        borderRadius: '16px',
        padding: '20px 16px',
        boxShadow: 'var(--sh-b, var(--sh-b))',
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
          color: 'var(--t2, #4A3D33)',
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default async function AnalyticsPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  let stats: DashboardStats = defaultStats
  let cacheUpdatedAt: string | null = null
  let trend: { month: string; totale: number; label: string }[] = []

  if (labId) {
    trend = await getTrendMensile(svc, labId, 12)
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
            accent="var(--info, #2563EB)"
          />
          <KpiCard
            label="Consegne oggi"
            value={String(stats.consegne_oggi)}
            accent="#D4A843"
          />
          <KpiCard
            label="In ritardo"
            value={String(stats.lavori_in_ritardo)}
            accent="var(--primary, #D90012)"
          />
          <KpiCard
            label="Pronti da fatturare"
            value={String(stats.pronti_non_fatturati)}
            accent="var(--success, #16A34A)"
          />
          <KpiCard
            label="MDR incompleti"
            value={String(stats.mdr_incompleti)}
            accent="var(--urgente, #F97316)"
          />
          <KpiCard
            label="Fatturato mese"
            value={formatEuro(stats.fatturato_mese)}
            accent="#D4A843"
          />
        </div>

        {/* Trend fatturato 12 mesi */}
        {trend.length > 0 && (
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: 14, fontWeight: 700, color: 'var(--t2, #4A3D33)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: 12, marginTop: 0,
              fontFamily: 'DM Sans, sans-serif',
            }}>
              Fatturato ultimi 12 mesi
            </h3>
            <div style={{
              padding: '16px',
              background: 'var(--sfc, #E4DFD9)',
              borderRadius: 14,
            }}>
              <BarChart data={trend} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--t2, #4A3D33)', fontFamily: 'DM Sans, sans-serif' }}>
                  Totale anno: €{trend.reduce((s, d) => s + d.totale, 0).toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                </span>
                <span style={{ fontSize: 12, color: 'var(--primary, #D90012)', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                  ● Mese corrente
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Timestamp aggiornamento */}
        {aggiornato && (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: 'var(--t2, #4A3D33)',
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
