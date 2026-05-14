'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lavoro } from '@/types/domain'

// Campi prezzo da escludere quando il lavoro è già incluso in fattura
const PRICE_FIELDS: Array<keyof Lavoro> = [
  'prezzo_unitario',
  'listino_id',
  'codice_iva',
  'natura_iva',
]

interface UseLavoroFormReturn {
  data: Partial<Lavoro>
  update: (updates: Partial<Lavoro>) => void
  save: (id: string) => Promise<void>
  saving: boolean
  saved: boolean
}

export function useLavoroForm(initial: Partial<Lavoro> = {}): UseLavoroFormReturn {
  const [data, setData] = useState<Partial<Lavoro>>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Track whether data has been touched since last successful save
  const isDirtyRef = useRef(false)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async (id: string) => {
    if (!isDirtyRef.current) return

    setSaving(true)
    setSaved(false)

    try {
      // Build patch body — exclude price fields if included in invoice
      const patchBody: Partial<Lavoro> = { ...data }
      if (data.incluso_in_fattura) {
        for (const field of PRICE_FIELDS) {
          delete patchBody[field]
        }
      }

      const res = await fetch(`/api/lavori/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `PATCH failed: ${res.status}`)
      }

      isDirtyRef.current = false
      setSaved(true)

      // Reset saved indicator after 3s
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }, [data])

  const update = useCallback((updates: Partial<Lavoro>) => {
    setData((prev) => ({ ...prev, ...updates }))
    isDirtyRef.current = true
    setSaved(false)
  }, [])

  // Autosave: debounced 30s after last update
  // Only fires if there's a pending lavoro id stored in form data
  useEffect(() => {
    const lavoroId = data.id
    if (!lavoroId || !isDirtyRef.current) return

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(() => {
      save(lavoroId)
    }, 30_000)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [data, save])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [])

  return { data, update, save, saving, saved }
}
