export default function ImpostazioniLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <div style={pulse({ width: 160, height: 28, borderRadius: 8 })} />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div style={{ ...pulse({ width: 140, height: 14, borderRadius: 6 }), marginBottom: 12 }} />
          <div style={pulse({ height: 72, borderRadius: 16 })} />
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
