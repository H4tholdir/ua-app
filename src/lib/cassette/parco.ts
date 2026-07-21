import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveParete, type CassettaParete, type RawLavoro } from './parco-shared'

/** Lettura server della parete (Task 3, spec §5): cassette vive ordinate
 *  `posizione, created_at, id`, join riga viva → lavoro.
 *
 *  **Auto-riparazione** (D-5, layer b del fail-soft §9.1): righe vive il cui
 *  lavoro è chiuso o soft-deleted vengono chiuse via `cassetta_libera_atomica`,
 *  col motivo per-lavoro derivato da `deriveParete` (correzione 21/07 #2 /
 *  R-B) — MAI `'consegna'` fisso: un lavoro annullato chiuso con `'consegna'`
 *  diventerebbe eleggibile a `cassetta_riassegna_post_annullo`
 *  (`WHERE liberato_per = 'consegna'`).
 *
 *  **Deviazione dal piano, dichiarata (review Task 3, Critical #1):** il
 *  piano parlava di "fire-and-forget" (`void svc.rpc(...)`), ma
 *  `PostgrestFilterBuilder` è un thenable pigro — la richiesta HTTP parte
 *  SOLO dentro `.then()`; `void` sul builder lo scarta senza mai eseguirla
 *  (verificato empiricamente: 0 richieste HTTP). Si usa quindi `await` (non
 *  `after()` di `next/server`): la RPC può chiudere in modo IRREVERSIBILE
 *  un'assegnazione (trigger append-only: niente UPDATE su riga già chiusa,
 *  niente DELETE), quindi deve girare dove è protetta e osservabile — non
 *  differita dopo la risposta, dove un guard mancato farebbe danno
 *  invisibile. Il requisito "resa come libera già in questa risposta" resta
 *  soddisfatto in modo sincrono da `deriveParete` PRIMA di questo blocco; il
 *  costo in latenza nel caso sano (nessuna riga da riparare) è zero, perché
 *  l'`if` sotto salta l'intero `await`.
 *
 *  **Guardia critica (Critical #2):** un lavoro "assente" dalla query
 *  `lavori` è prova di orfanità SOLO se quella query è riuscita. `deriveParete`
 *  resta pura e non può conoscere l'errore: il guard vive qui — se `errLavori`
 *  è valorizzato, `daRiparare` NON viene eseguito. La RPC è una UPDATE
 *  incondizionata (non ri-verifica lo stato del lavoro): se `lavori` fosse
 *  stato degradato a `[]` per un errore transitorio (es. query abortita),
 *  ogni cassetta occupata del lab finirebbe in `daRiparare` e verrebbe
 *  chiusa — anche assegnazioni di lavori attivi, in modo irreversibile. La
 *  degradazione che resta con la guardia (cassette occupate mostrate libere
 *  per QUESTO solo caricamento, senza toccare il DB) è benigna: si
 *  autocorregge al primo refresh con la query `lavori` riuscita.
 *
 *  **Fail-soft** (spec §9.1b): un errore sulle letture viene loggato e
 *  degradato (dato mancante trattato come vuoto) senza cambiare il contratto
 *  di ritorno. Ogni esito della riparazione — rifiuto della chiamata, errore
 *  RPC, o `esito` diverso da `'ok'` — viene loggato (Important #3): mai
 *  ingoiato in silenzio. */
export async function getParete(svc: SupabaseClient, labId: string): Promise<CassettaParete[]> {
  const [{ data: cassette, error: errCassette }, { data: vive, error: errVive }] = await Promise.all([
    svc.from('cassette').select('id, nome, colore, posizione, created_at')
      .eq('laboratorio_id', labId).is('deleted_at', null),
    svc.from('cassette_lavori').select('cassetta_id, lavoro_id')
      .eq('laboratorio_id', labId).is('liberato_at', null),
  ])
  if (errCassette) console.error('[getParete] lettura cassette fallita:', errCassette)
  if (errVive) console.error('[getParete] lettura cassette_lavori fallita:', errVive)

  const ids = (vive ?? []).map((v) => v.lavoro_id)
  const { data: lavori, error: errLavori } = ids.length
    ? await svc.from('lavori')
        .select('id, numero_lavoro, stato, deleted_at, descrizione, tipo_dispositivo, clienti(studio_nome, nome, cognome), pazienti(codice_paziente)')
        .eq('laboratorio_id', labId).in('id', ids)
    : { data: [] as RawLavoro[], error: null }
  if (errLavori) console.error('[getParete] lettura lavori fallita:', errLavori)

  const { parete, daRiparare } = deriveParete(cassette ?? [], vive ?? [], (lavori ?? []) as unknown as RawLavoro[])

  if (!errLavori && daRiparare.length) {
    const esiti = await Promise.allSettled(
      daRiparare.map(({ lavoroId, motivo }) =>
        svc.rpc('cassetta_libera_atomica', { p_lab: labId, p_lavoro: lavoroId, p_motivo: motivo }))
    )
    esiti.forEach((esito, i) => {
      const { lavoroId, motivo } = daRiparare[i]
      if (esito.status === 'rejected') {
        console.error(`[getParete] auto-riparazione: chiamata RPC fallita per il lavoro ${lavoroId} (motivo ${motivo}):`, esito.reason)
        return
      }
      const { data, error } = esito.value
      if (error) {
        console.error(`[getParete] auto-riparazione: RPC in errore per il lavoro ${lavoroId} (motivo ${motivo}):`, error)
        return
      }
      const rpcEsito = (data as { esito?: string } | null)?.esito
      if (rpcEsito !== 'ok') {
        console.error(`[getParete] auto-riparazione: esito inatteso per il lavoro ${lavoroId} (motivo ${motivo}):`, data)
      }
    })
  }
  return parete
}
