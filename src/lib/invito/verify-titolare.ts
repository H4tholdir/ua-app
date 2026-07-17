import 'server-only'
import { getFreshLabContext } from '@/lib/supabase/lab-context'

export interface TitolareContext {
  userId: string
  laboratorioId: string
}

export async function verifyTitolare(): Promise<TitolareContext | null> {
  const context = await getFreshLabContext()
  if (!context || context.ruolo !== 'titolare' || !context.laboratorioId) return null
  return { userId: context.userId, laboratorioId: context.laboratorioId }
}
