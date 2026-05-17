'use client'

// Client Component island — necessario per onFocus/onBlur sul link accessibilità
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      style={{
        position: 'absolute',
        top: '-40px',
        left: 0,
        zIndex: 9999,
        padding: '8px 16px',
        background: 'var(--primary, #D90012)',
        color: '#fff',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '14px',
        fontWeight: 600,
        textDecoration: 'none',
        borderRadius: '0 0 8px 0',
        transition: 'top 0.15s',
      }}
      onFocus={(e) => { (e.currentTarget as HTMLAnchorElement).style.top = '0' }}
      onBlur={(e) => { (e.currentTarget as HTMLAnchorElement).style.top = '-40px' }}
    >
      Vai al contenuto
    </a>
  )
}
