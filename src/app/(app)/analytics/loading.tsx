export default function AnalyticsLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={pulse({ width: 140, height: 28, borderRadius: 8 })} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={pulse({ width: 88, height: 76, borderRadius: 16, flexShrink: 0 })} />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 16, ...pulse({ height: 160, borderRadius: 16 }) }} />
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
