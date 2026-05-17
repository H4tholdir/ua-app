export default function LavoriLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      {/* Header skeleton */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 0 0', marginBottom: 8 }}>
        <div style={pulse({ width: 140, height: 28, borderRadius: 8 })} />
        <div style={{ marginLeft: 'auto', ...pulse({ width: 52, height: 52, borderRadius: 14 }) }} />
      </div>

      {/* Filter strip skeleton */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={pulse({ width: 80, height: 36, borderRadius: 32, flexShrink: 0 })} />
        ))}
      </div>

      {/* Card skeleton × 6 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8, ...pulse({ height: 110, borderRadius: 16 }) }} />
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
