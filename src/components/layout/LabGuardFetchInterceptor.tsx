'use client'

import { useEffect } from 'react'
import { installLabGuardInterceptor } from '@/lib/api/lab-guard-client'

// N13: monta l'interceptor fetch UA_LAB_* una volta per il gruppo (app).
// Nessun render: solo effetto con cleanup.
export function LabGuardFetchInterceptor() {
  useEffect(() => installLabGuardInterceptor(window), [])
  return null
}
