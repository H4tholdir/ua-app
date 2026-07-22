import type { Metadata, Viewport } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeInitializer } from '@/components/layout/ThemeInitializer'
import { DiagnosticaViewport } from '@/components/layout/DiagnosticaViewport'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'UÀ che lab!', template: '%s — UÀ' },
  description: 'Il gestionale per laboratori odontotecnici italiani. Tutto automatico, tutto dal telefono.',
  manifest: '/manifest.json',
  icons: {
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UÀ',
  },
}

export const viewport: Viewport = {
  themeColor: '#D90012',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full" suppressHydrationWarning>
      <head>
        <ThemeInitializer />
        {/* Apple Splash Screens */}
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-640-1136.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-750-1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1125-2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1242-2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1170-2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1179-2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1284-2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        {/* Collaudo R3 (P-STATUSBAR) — overlay diagnostico TEMPORANEO, attivo solo con
            ?diag=viewport (flag persistito). Rimuovere a collaudo chiuso. */}
        <DiagnosticaViewport />
        <SpeedInsights />
      </body>
    </html>
  )
}
