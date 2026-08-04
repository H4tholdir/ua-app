// src/lib/domain/immagini-eliminazione-messaggi.ts
//
// CASA UNICA dei messaggi del 409 «fonte in uso» (T8, S7, D214) — sia la rotta
// (`api/lavori/[id]/immagini/[imgId]/route.ts`, DELETE) sia i test (server e
// client) importano da qui, invece di ricopiare la frase a mano in tre posti.
// Modello: `prescrizione-costanti.ts` (stessa ragione: una copia locale non la
// vedrebbe nessuno se la frase cambiasse in un solo punto — il test dell'altro
// resterebbe verde su una frase che l'utente non legge più mai).
//
// Il fatto che regge le due frasi VERIFICATO leggendo il codice, non dedotto:
// l'unico scrittore che porta `fonte_immagine_id` da NULL a un valore è
// `lavoro_prescrizione_allega_fonte` (`20260804152403_ondata_b_prescrizioni_
// rpc.sql:141-191`), chiamato SOLO da `POST /api/lavori/[id]/prescrizione/
// fonte` (`prescrizione/fonte/route.ts:150-155`), che impone
// `img.lavoro_id === id` — la fonte, alla nascita, appartiene SEMPRE al lavoro
// a cui si allega. `authenticated` non ha EXECUTE su quella RPC
// (`20260804152403:512` REVOKE), quindi non esiste una via che scavalchi
// quella guardia dal client. L'UNICO altro scrittore, `crea_rifacimento_
// atomico`, non ASSEGNA una fonte nuova: la CLONA per intero con un
// `INSERT … SELECT … FROM lavori_prescrizioni WHERE lavoro_id =
// p_lavoro_originale_id` (`20260804152403:465-476`) — copia lo stesso valore
// dal lavoro che sta rifacendo. Per induzione, ogni riga che porta
// `fonte_immagine_id = X` ha `lavoro_id` uguale al lavoro che possiede
// davvero l'immagine X, oppure a un lavoro nato da un rifacimento (diretto o
// a catena) di quello — mai un lavoro estraneo.
export const MOTIVO_FONTE_IN_USO = 'fonte_in_uso' as const
export const MOTIVO_FONTE_IN_USO_FILE_PERSO = 'fonte_in_uso_file_perso' as const

/** La riga trovata è la prescrizione di QUESTO lavoro (caso comune). */
export const MESSAGGIO_FONTE_QUESTO_LAVORO =
  'Questa immagine è la fonte della prescrizione di questo lavoro — non si può eliminare finché resta collegata.'

/** La riga trovata è di un ALTRO lavoro — un rifacimento che ha clonato la
 *  fonte (v. la prova sopra: non può essere un lavoro estraneo). */
export const MESSAGGIO_FONTE_ALTRO_LAVORO =
  'Questa immagine è la fonte della prescrizione di un rifacimento di questo lavoro — non si può eliminare finché resta collegata.'

/** Cintura e bretelle: la FK morde sulla `.delete()` (corsa, sfuggita al
 *  pre-check) — a questo punto `storage.remove` è già passato, il file è
 *  perso davvero e il messaggio non lo nasconde. */
export const MESSAGGIO_FONTE_FILE_PERSO =
  'Il file è già stato tolto dall’archivio, ma il riferimento non si può cancellare: nel frattempo è diventato la fonte di una prescrizione. La foto risulta persa — serve l’intervento di un tecnico.'
