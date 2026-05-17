export default function QualitaLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={pulse({ width: 110, height: 28, borderRadius: 8 })} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
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
