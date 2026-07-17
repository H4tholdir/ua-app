import 'server-only'
import { getFreshLabContext } from '@/lib/supabase/lab-context'

export interface TitolareContext {
  userId: string
  laboratorioId: string
  // N13: ruolo + lab esposti per assertLabOperativo (LabGuardInput)
  ruolo: string
  lab: { stato: string; trial_ends_at: string | null; nome: string } | null
}

export async function verifyTitolare(): Promise<TitolareContext | null> {
  const context = await getFreshLabContext()
  if (!context || context.ruolo !== 'titolare' || !context.laboratorioId) return null
  return {
    userId: context.userId,
    laboratorioId: context.laboratorioId,
    ruolo: context.ruolo,
    lab: context.lab,
  }
}
