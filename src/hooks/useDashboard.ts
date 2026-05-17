'use client'

import { useEffect, useState } from 'react'
import type {
  DashboardStatsExtended,
  TecnicoDashboard,
  FrontDeskDashboard,
} from '@/types/domain'

// ─── Response union (spec allineata alla route GET /api/dashboard/kpi) ───────

export type DashboardApiResponse =
  | { role: 'titolare'; data: DashboardStatsExtended }
  | { role: 'tecnico'; data: TecnicoDashboard }
  | { role: 'front_desk'; data: FrontDeskDashboard }

export function useDashboard() {
  const [response, setResponse] = useState<DashboardApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/dashboard/kpi', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: DashboardApiResponse | { error: string }) => {
        if ('error' in d) {
          setError(d.error)
        } else {
          setResponse(d)
        }
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Errore sconosciuto')
        setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return { response, loading, error }
}
