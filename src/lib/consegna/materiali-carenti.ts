// src/lib/consegna/materiali-carenti.ts
// Estratto dalla vecchia route GET di precheck materiali (ondata 16/07,
// riserva backend #3; la route stessa è morta nel Task 15 insieme alla
// pagina /consegna): il calcolo BOM lavorazioni → listino_materiali_auto →
// magazzino è condiviso dalla GET precheck-consegna. Logica INVARIATA.
import type { getServiceClient } from '@/lib/supabase/server-service'

export interface MaterialeCarente {
  nome: string
  quantita_necessaria: number
  scorta_attuale: number
  unita_misura: string
  sufficiente: false
}

export async function materialiCarenti(
  svc: ReturnType<typeof getServiceClient>,
  lavoroId: string,
  labId: string
): Promise<MaterialeCarente[]> {
  const { data: lavorazioni, error: lavErr } = await svc
    .from('lavori_lavorazioni')
    .select('id, listino_id, quantita')
    .eq('lavoro_id', lavoroId)
    .eq('laboratorio_id', labId)

  if (lavErr || !lavorazioni || lavorazioni.length === 0) return []

  const carenti: MaterialeCarente[] = []
  for (const lavorazione of lavorazioni) {
    if (!lavorazione.listino_id) continue
    const { data: bomItems } = await svc
      .from('listino_materiali_auto')
      .select('magazzino_id, quantita_per_unita, unita_misura')
      .eq('listino_id', lavorazione.listino_id)
      .eq('laboratorio_id', labId)
    if (!bomItems || bomItems.length === 0) continue

    for (const bom of bomItems) {
      const quantitaNecessaria = Number(bom.quantita_per_unita) * Number(lavorazione.quantita)
      const { data: magazzino } = await svc
        .from('magazzino')
        .select('nome, scorta_attuale')
        .eq('id', bom.magazzino_id)
        .eq('laboratorio_id', labId)
        .single()
      if (!magazzino) continue
      const scorta = Number(magazzino.scorta_attuale)
      if (scorta < quantitaNecessaria) {
        carenti.push({
          nome: magazzino.nome as string,
          quantita_necessaria: quantitaNecessaria,
          scorta_attuale: scorta,
          unita_misura: bom.unita_misura as string,
          sufficiente: false,
        })
      }
    }
  }
  return carenti
}
