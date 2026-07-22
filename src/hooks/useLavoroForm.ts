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
  saveError: string | null
  isDirty: boolean
}

export function useLavoroForm(initial: Partial<Lavoro> = {}): UseLavoroFormReturn {
  const [data, setData] = useState<Partial<Lavoro>>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Track whether data has been touched since last successful save
  // Ref is used for autosave timer to avoid stale closure; state is for UI
  const isDirtyRef = useRef(false)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async (id: string) => {
    if (!isDirtyRef.current) return

    setSaving(true)
    setSaved(false)
    setSaveError(null)

    try {
      // Build patch body — exclude price fields if included in invoice
      const patchBody: Partial<Lavoro> = { ...data }
      if (data.incluso_in_fattura) {
        for (const field of PRICE_FIELDS) {
          delete patchBody[field]
        }
      }
      // numero_cassetta è MORTO come campo del form (Task 16, spec §10/R1): la
      // posizione fisica si assegna SOLO dalla Parete (POST /api/lavori/[id]/
      // cassetta). `data` la contiene ancora perché è una colonna del lavoro
      // caricato, quindi `{ ...data }` la porterebbe nel payload — il server
      // l'ha tolta da PATCHABLE_FIELDS (no-op silenzioso), ma va tolta ALLA
      // SORGENTE così il PATCH del form non la invia MAI.
      delete patchBody.numero_cassetta

      const res = await fetch(`/api/lavori/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const msg = json.error ?? `Salvataggio fallito (${res.status})`
        setSaveError(msg)
        throw new Error(msg)
      }

      isDirtyRef.current = false
      setIsDirty(false)
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
    setIsDirty(true)
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
      // save() rilancia l'errore dopo aver impostato saveError (per far sì
      // che i chiamanti espliciti, es. il bottone CONSEGNA, possano
      // intercettarlo prima di navigare). Qui il timer non ha alcun
      // chiamante che osservi la Promise: senza il .catch() un fallimento
      // di rete diventerebbe una unhandled rejection. saveError è già
      // stato impostato dentro save() prima del throw, quindi l'utente
      // vede comunque il feedback — non serve altra gestione qui.
      void save(lavoroId).catch(() => {})
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

  return { data, update, save, saving, saved, saveError, isDirty }
}
