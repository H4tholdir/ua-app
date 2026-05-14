'use client'

import { useEffect, useState } from 'react'
import type { DashboardStats } from '@/types/domain'

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/kpi')
      .then((r) => r.json())
      .then((d: DashboardStats) => {
        setStats(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { stats, loading }
}
