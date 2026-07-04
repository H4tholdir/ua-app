'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'ua-theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  // Respect system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  // Stato iniziale sempre 'light', identico a quello che il server renderizza
  // (che non ha accesso a localStorage/matchMedia) — evita un hydration
  // mismatch su attributi che dipendono da `theme` (es. aria-label di
  // ThemeToggleButton). Il valore reale viene letto una sola volta dopo il
  // mount, quando è sicuro farlo (stesso pattern usato da next-themes per lo
  // stesso problema). La classe sull'<html> per evitare il FOUC visivo resta
  // gestita separatamente e prima, da ThemeInitializer (script inline).
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Sync una tantum al mount da una fonte esterna (localStorage/matchMedia,
    // mai disponibile server-side) — non innesca cascata, è l'unica scrittura
    // di questo effect e le sue dipendenze sono vuote.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(getInitialTheme())
    setMounted(true)
  }, [])

  // Applica il tema al DOM solo dopo aver letto il valore reale — se questo
  // effetto girasse anche con lo stato iniziale fittizio 'light' rimuoverebbe
  // momentaneamente la classe 'dark' già impostata da ThemeInitializer,
  // causando un flash visivo (dark → light → dark).
  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted])

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const newTheme: Theme = e.matches ? 'dark' : 'light'
        setTheme(newTheme)
      }
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  function toggle() {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      applyTheme(next)
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  return { theme, toggle, isDark: theme === 'dark' }
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  if (theme === 'dark') {
    html.classList.add('dark')
    html.setAttribute('data-theme', 'dark')
  } else {
    html.classList.remove('dark')
    html.setAttribute('data-theme', 'light')
  }
}
