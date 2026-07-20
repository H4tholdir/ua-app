import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mapPileHome, type PileHome, type RawLavoroPila } from './pile-home-shared'
import { adessoRoma } from '@/lib/utils/data-roma'

// I tipi e le funzioni pure (mapPileHome, subMorph, giornoBreve, …) vivono in
// `pile-home-shared.ts` (Task 9) — NESSUN `import 'server-only'` lì, perché
// componenti client (`HomeDesktop`, `SchedaAnteprima`) le usano nel browser.
// Questo file resta server-only e aggiunge solo l'accesso a Supabase; tutto
// ciò che veniva esportato prima da qui resta disponibile agli import
// esistenti tramite il re-export sotto — nessun consumatore server-side cambia.
export * from './pile-home-shared'

export async function getPileHome(svc: SupabaseClient, labId: string, opts: { tecnicoId?: string | null; senzaAnagrafica?: boolean } = {}): Promise<PileHome> {
  // Fail-closed (ratifica Francesco 12/07, review finale Ondata 1): un tecnico
  // SENZA riga in `tecnici` deve vedere pile VUOTE, mai l'intero lab. Lo
  // short-circuit vive PRIMA della query — non un filtro impossibile dopo,
  // così il perimetro è chiuso per costruzione, non per un WHERE che qualcuno
  // potrebbe rimuovere in un refactor futuro.
  if (opts.senzaAnagrafica) return mapPileHome([], adessoRoma())
  let q = svc
    .from('lavori')
    .select(`id, numero_lavoro, numero_cassetta, stato, data_consegna_prevista, ora_consegna, descrizione, created_at, updated_at,
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
  // O1b (review Bundle T): «oggi» delle pile = giorno civile di Roma, non del
  // server (UTC dava il giorno prima tra le 00:00 e le 02:00). Trade-off noto:
  // adessoRoma() sposta getTime() di 1-2h, quindi gli elapsed (fermo ≥5gg,
  // arrivo >24h in pile-home-shared) anticipano al più di 2h su soglie di
  // giorni — irrilevante rispetto al giorno civile sbagliato di notte.
  return mapPileHome((data ?? []) as unknown as RawLavoroPila[], adessoRoma())
}

export async function getPerimetroHome(svc: SupabaseClient, labId: string, userId: string, ruolo: string): Promise<{ tecnicoId: string | null; senzaAnagrafica: boolean }> {
  if (ruolo !== 'tecnico') return { tecnicoId: null, senzaAnagrafica: false } // titolare/admin_rete/front_desk: tutto il lab (§3.2; l'ibrido usa il perimetro titolare)
  const { data } = await svc.from('tecnici').select('id').eq('laboratorio_id', labId).eq('utente_id', userId).is('deleted_at', null).maybeSingle()
  // Fail-closed (ratifica Francesco 12/07): prima, un tecnico senza riga in
  // `tecnici` risolveva a `tecnicoId: null` → `getPileHome` senza filtro →
  // vedeva TUTTO il lab (bug di perimetro, scoperto in QA Task 11). Ora
  // `senzaAnagrafica: true` istruisce `getPileHome` a tornare pile vuote.
  if (!data) return { tecnicoId: null, senzaAnagrafica: true }
  return { tecnicoId: data.id, senzaAnagrafica: false }
}
