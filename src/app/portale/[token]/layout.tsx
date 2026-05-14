import type { ReactNode } from 'react'

export const metadata = {
  title: 'Portale Dentista — UÀ',
  robots: 'noindex, nofollow',
}

export default function PortaleLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#F8F9FA',
          fontFamily: 'DM Sans, system-ui, sans-serif',
          color: '#1A1A2E',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  )
}
