import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mapPileHome, type PileHome, type RawLavoroPila } from './pile-home-shared'

// I tipi e le funzioni pure (mapPileHome, subMorph, giornoBreve, …) vivono in
// `pile-home-shared.ts` (Task 9) — NESSUN `import 'server-only'` lì, perché
// componenti client (`HomeDesktop`, `SchedaAnteprima`) le usano nel browser.
// Questo file resta server-only e aggiunge solo l'accesso a Supabase; tutto
// ciò che veniva esportato prima da qui resta disponibile agli import
// esistenti tramite il re-export sotto — nessun consumatore server-side cambia.
export * from './pile-home-shared'

export async function getPileHome(svc: SupabaseClient, labId: string, opts: { tecnicoId?: string | null } = {}): Promise<PileHome> {
  let q = svc
    .from('lavori')
    .select(`id, numero_lavoro, stato, data_consegna_prevista, ora_consegna, descrizione, created_at, updated_at,
      clienti(nome, cognome, studio_nome), pazienti(codice_paziente),
      lavori_fasi(eseguita_at, deleted_at, fase:fasi_produzione(descrizione, ordine)),
      lavoro_prove(data_rientro_prevista, data_rientro_effettiva),
      tecnici(nome, cognome)`)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .not('stato', 'in', '("consegnato","annullato")')
    .not('numero_lavoro', 'ilike', 'STOR/%')
    .limit(500)
  if (opts.tecnicoId) q = q.eq('tecnico_id', opts.tecnicoId)
  const { data, error } = await q
  if (error) throw new Error(`getPileHome: lettura lavori fallita — ${error.message}`) // fail-closed, mai pile vuote silenziose
  return mapPileHome((data ?? []) as unknown as RawLavoroPila[], new Date())
}

export async function getPerimetroHome(svc: SupabaseClient, labId: string, userId: string, ruolo: string): Promise<{ tecnicoId: string | null }> {
  if (ruolo !== 'tecnico') return { tecnicoId: null } // titolare/admin_rete/front_desk: tutto il lab (§3.2; l'ibrido usa il perimetro titolare)
  const { data } = await svc.from('tecnici').select('id').eq('laboratorio_id', labId).eq('utente_id', userId).is('deleted_at', null).maybeSingle()
  return { tecnicoId: data?.id ?? null }
}
