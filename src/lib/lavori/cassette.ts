import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { derivaCassetteSuggerite } from './cassette-shared'
export * from './cassette-shared'

/** Le targhe per le chips dello sheet conferma-cassetta: ultime 80 righe con
 *  cassetta valorizzata, più recenti prima — errori → [] (le chips sono un
 *  aiuto, mai un blocco). */
export async function getCassetteSuggerite(svc: SupabaseClient, labId: string): Promise<string[]> {
  try {
    const { data, error } = await svc
      .from('lavori')
      .select('numero_cassetta, stato')
      .eq('laboratorio_id', labId)
      .not('numero_cassetta', 'is', null)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(80)
    if (error) throw error
    return derivaCassetteSuggerite((data ?? []) as Array<{ numero_cassetta: string | null; stato: string }>)
  } catch (err) {
    console.error('[getCassetteSuggerite] degrado a []:', err)
    return []
  }
}
