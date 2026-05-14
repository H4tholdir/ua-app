import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'UÀ che lab!', template: '%s — UÀ' },
  description: 'Il gestionale per laboratori odontotecnici italiani. Tutto automatico, tutto dal telefono.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: { url: '/favicon.ico', type: 'image/x-icon' },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UÀ',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B2D6B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  )
}
