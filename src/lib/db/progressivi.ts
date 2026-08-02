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
    // 🛑 P11 (03/08/2026) — QUI IL MESSAGGIO DEL DATABASE USCIVA DALL'APP.
    //    La riga era: `…fallito (tipo=${tipo}): ${error.message}`. Su un guasto
    //    vero `error.message` è la risposta di PostgREST, e contiene l'INSERT
    //    per intero, il nome di `public.progressivi_anno` e la firma della
    //    funzione. `provato:` cinque chiamanti su sei NON catturavano, quindi
    //    quel testo risaliva fino alla risposta HTTP.
    //
    // 🔑 CORRETTO QUI E NON NEI SEI CHIAMANTI: sei `try` sono sei occasioni di
    //    dimenticarne uno, e il settimo chiamante nascerebbe scoperto. È la
    //    stessa ragione per cui il fuso dei documenti è finito in funzioni
    //    condivise (D171) invece che ripetuto in dodici punti.
    //
    // ⚠️ E NON BASTAVA RENDERLO MUTO: un errore senza dettaglio lascia chi
    //    ripara a mani vuote, che è un altro modo di sbagliare. Il dettaglio va
    //    in DUE posti dove l'utente non arriva mai:
    //      · il log del server — è il posto che si guarda per primo;
    //      · `cause`, agganciata all'errore, per chi lo raccoglie più in alto.
    //    📌 `cause` è **nuova in questo progetto** (`provato:` `grep "{ cause:"`
    //    → nessuna riga prima di oggi): sta scritto qui perché il prossimo la
    //    riconosca invece di reinventarla.
    //
    // 📌 Il `tipo` RESTA nel messaggio pubblico, ed è voluto: dice *quale
    //    documento* è rimasto senza numero, e non svela niente di come l'app è
    //    fatta dentro.
    console.error(`[progressivi] genera_progressivo fallito (tipo=${tipo}, anno=${anno}):`, error)
    throw new Error(
      `Non è stato possibile assegnare il numero al documento (tipo=${tipo})`,
      { cause: error },
    )
  }

  if (typeof data !== 'number' || data <= 0) {
    // Qui il valore VIENE dal database ma non è un suo messaggio: è il dato che
    // ci ha restituito. Dirlo è utile e non svela nulla della sua struttura —
    // ma il `tipo` va aggiunto, o non si sa nemmeno quale documento è rimasto
    // senza numero.
    console.error(`[progressivi] valore non valido (tipo=${tipo}, anno=${anno}):`, data)
    throw new Error(
      `Numero non valido per il documento (tipo=${tipo}): ${String(data)}`,
    )
  }

  return data
}
