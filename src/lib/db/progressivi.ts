import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Genera e ritorna il prossimo numero progressivo per il tipo indicato.
 *
 * Chiama la funzione PostgreSQL `genera_progressivo` che gestisce
 * l'incremento atomico per anno e tipo, evitando race conditions.
 *
 * @param supabase        - Client Supabase (service role)
 * @param laboratorio_id  - UUID del laboratorio
 * @param tipo            - Tipo progressivo (es. 'ddc', 'fattura', 'buono')
 * @param anno            - Anno della serie — OBBLIGATORIO e identico a quello
 *                          stampato nel numero documento (Europe/Rome via
 *                          annoRoma()): mai ricalcolarlo qui, la divergenza
 *                          numero/serie a capodanno è il bug chiuso il 20/07.
 * @returns Il numero progressivo generato (intero positivo)
 */
export async function generaProgressivo(
  supabase: SupabaseClient,
  laboratorio_id: string,
  tipo: string,
  anno: number
): Promise<number> {
  const { data, error } = await supabase.rpc('genera_progressivo', {
    p_laboratorio_id: laboratorio_id,
    p_tipo: tipo,
    p_anno: anno,
  })

  if (error) {
    throw new Error(`generaProgressivo fallito (tipo=${tipo}): ${error.message}`)
  }

  if (typeof data !== 'number' || data <= 0) {
    throw new Error(`generaProgressivo ha restituito un valore non valido: ${data}`)
  }

  return data
}
