export default function DashboardLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      {/* Header skeleton */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={pulse({ width: 180, height: 28, borderRadius: 8 })} />
      </div>

      {/* KPI strip skeleton */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={pulse({ width: 76, height: 64, borderRadius: 16, flexShrink: 0 })} />
        ))}
      </div>

      {/* Section skeleton × 3 */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <div style={{ ...pulse({ width: 160, height: 16, borderRadius: 6 }), marginBottom: 12 }} />
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} style={{ marginBottom: 8, ...pulse({ height: 80, borderRadius: 14 }) }} />
          ))}
        </div>
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
