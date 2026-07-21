import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveParete, type CassettaParete, type RawLavoro } from './parco-shared'

/** Lettura server della parete (Task 3, spec §5): cassette vive ordinate
 *  `posizione, created_at, id`, join riga viva → lavoro.
 *
 *  **Auto-riparazione** (D-5, layer b del fail-soft §9.1): righe vive il cui
 *  lavoro è chiuso o soft-deleted vengono chiuse fire-and-forget via
 *  `cassetta_libera_atomica`, col motivo per-lavoro derivato da
 *  `deriveParete` (correzione 21/07 #2 / R-B) — MAI `'consegna'` fisso: un
 *  lavoro annullato chiuso con `'consegna'` diventerebbe eleggibile a
 *  `cassetta_riassegna_post_annullo` (`WHERE liberato_per = 'consegna'`) —
 *  ed è resa come libera già in questa risposta.
 *
 *  **Fail-soft** (spec §9.1b): un errore su una delle query viene loggato e
 *  degradato (dato mancante trattato come vuoto) senza cambiare il contratto
 *  di ritorno — la parete non deve mai bloccarsi per un problema di lettura. */
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
  for (const { lavoroId, motivo } of daRiparare) {
    // fire-and-forget: la parete non aspetta la riparazione (layer b, §9.1)
    void svc.rpc('cassetta_libera_atomica', { p_lab: labId, p_lavoro: lavoroId, p_motivo: motivo })
  }
  return parete
}
