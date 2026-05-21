import type { ReactNode } from 'react'

export const metadata = {
  title: 'Nuova richiesta — UÀ',
  robots: 'noindex, nofollow',
}

export default function RichiestaLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: 'var(--bg, #DDD8D3)',
          fontFamily: 'DM Sans, system-ui, sans-serif',
          color: 'var(--t1, #1C1916)',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  )
}
