// src/lib/rifacimento/cassetta.ts
//
// LA CASSETTA SEGUE IL RIFACIMENTO — un solo posto, per due percorsi.
//
// 🔑 PERCHÉ QUESTO MODULO ESISTE. Fino al 07/08/2026 questa funzione viveva
// dentro `src/app/api/lavori/[id]/rifacimento/route.ts`, ed era l'unico
// percorso che creava un rifacimento. Dal Task 7 dell'ondata «torna a `pronto`
// col documento intatto» ce n'è un SECONDO — la rotta degli eventi di qualità,
// ramo «se ne fa uno nuovo» (D306) — e i due creano **lo stesso oggetto**.
// Ricopiarla sarebbe «le liste scritte due volte» in forma di codice: i due
// percorsi divergerebbero, e il difetto che ne uscirebbe è un tecnico che apre
// il cassetto e lo trova vuoto — a seconda di quale bottone ha premuto.
// ⚖️ D309 — il trasferimento è **fail-soft anche sul percorso nuovo**: un
// cassetto non spostato non annulla un lavoro già creato.

import 'server-only'
import type { getServiceClient } from '@/lib/supabase/server-service'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'

/**
 * Trasferisce al lavoro nuovo la cassetta che aveva il lavoro vecchio, via
 * `cassetta_trasferisci_rifacimento(p_lab, p_lavoro_vecchio, p_lavoro_nuovo)`
 * (contratto ratificato 21/07 — 4 esiti), avvolta in `callRpcWithRetry` (coda di
 * deadlock 40P01 documentata in testa alla migration della Parete).
 *
 * **Fail-soft ASSOLUTO** (vincolo più importante — il rifacimento è già
 * committato quando questa funzione viene chiamata): chi la chiama deve SEMPRE
 * poter restituire il lavoro nuovo, con la risposta invariata per forma e
 * semantica — il trasferimento è silenzioso, non cambia il contratto. L'intero
 * corpo vive dentro un try/catch e la funzione non può mai lanciare:
 *  - `error` non-null (postgrest-js NON lancia sugli errori del database —
 *    torna `{data:null, error:{...}}` — un `try/catch` da solo non lo
 *    intercetterebbe) → log;
 *  - `esito === 'trasferita'` → successo, nessun log;
 *  - `esito === 'niente_da_trasferire'` → non-evento legittimo (il vecchio
 *    non era in nessuna cassetta, o è cambiato tutto sotto il lock): nessun log;
 *  - `esito === 'occupata'` → **console.warn**, non error: il lavoro nuovo
 *    aveva già una riga viva, quindi il pre-check anti-sfratto ha protetto
 *    un'assegnazione esistente. È anomalo-ma-spiegabile (una corsa
 *    concorrente), non un difetto — descrive un'ipotesi, non un'accusa;
 *  - `esito === 'lavoro_non_valido'` → **console.error**, distinto da
 *    `occupata`: il lavoro nuovo è assente/di altro lab/soft-deleted/
 *    consegnato/annullato. Su un lavoro appena creato da
 *    `crea_rifacimento_atomico` — con lo stesso `p_lab` — questo non ha una
 *    causa benigna comune: segnala un difetto altrove;
 *  - esito ignoto (un esito futuro non mappato qui) → log, mai un successo
 *    silenzioso;
 *  - eccezione di rete vera → `try/catch` esterno, ultima difesa.
 */
export async function trasferisciCassettaAlRifacimento(
  svc: ReturnType<typeof getServiceClient>,
  laboratorio_id: string,
  lavoro_vecchio_id: string,
  lavoro_nuovo_id: string
): Promise<void> {
  try {
    const { data, error } = await callRpcWithRetry(() =>
      svc.rpc('cassetta_trasferisci_rifacimento', {
        p_lab: laboratorio_id,
        p_lavoro_vecchio: lavoro_vecchio_id,
        p_lavoro_nuovo: lavoro_nuovo_id,
      })
    )

    if (error) {
      console.error('[RIFACIMENTO] trasferimento cassetta fail-soft — RPC in errore:', error)
      return
    }

    const esito = (data as { esito?: string; nome?: string } | null)?.esito

    switch (esito) {
      case 'trasferita':
      case 'niente_da_trasferire':
        return
      case 'occupata':
        console.warn(
          `[RIFACIMENTO] cassetta non trasferita al lavoro nuovo ${lavoro_nuovo_id} — ha già una riga viva in un'altra cassetta (il pre-check anti-sfratto ha protetto quell'assegnazione):`,
          data
        )
        return
      case 'lavoro_non_valido':
        console.error(
          `[RIFACIMENTO] cassetta non trasferita — il lavoro nuovo ${lavoro_nuovo_id} risulta non valido per la RPC (assente/di altro lab/soft-deleted/consegnato/annullato): su un lavoro appena creato dal rifacimento questo indica un difetto altrove:`,
          data
        )
        return
      default:
        console.error('[RIFACIMENTO] trasferimento cassetta — esito inatteso dalla RPC:', data)
        return
    }
  } catch (err) {
    console.error('[RIFACIMENTO] trasferimento cassetta fail-soft — eccezione:', err)
  }
}
