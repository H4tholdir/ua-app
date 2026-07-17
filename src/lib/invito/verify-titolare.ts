import 'server-only'
import { getFreshLabContext, type LabContext } from '@/lib/supabase/lab-context'

export interface TitolareContext {
  userId: string
  laboratorioId: string
  // N13: ruolo + lab esposti per assertLabOperativo (LabGuardInput) —
  // tipi presi da LabContext per non divergere mai dalla fonte.
  ruolo: LabContext['ruolo']
  lab: LabContext['lab']
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
