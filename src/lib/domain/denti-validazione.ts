// La lista di denti in arrivo da un client: UNA sola casa, DUE porte.
//
// 🔑 PERCHÉ ESISTE — rilievo G2 della revisione pre-merge (28/07/2026). Le due
// porte da cui i denti entrano nel sistema non validavano lo stesso corpo:
// `PUT /api/lavori/[id]/denti` controllava `ruolo`, `provenienza`, i cinque
// campi testo, la coppia e le zone, e NORMALIZZAVA; `POST /api/lavori`
// controllava solo `fdi` e i duplicati, e passava alla RPC l'oggetto GREZZO.
// E `lavoro_crea_atomico` NON ha exception handler attorno all'INSERT dei denti
// (dichiarato in `20260727120300_lavori_denti_rpc.sql:181-183`): un vincolo
// violato aborta l'INTERA funzione. Misurate sette forme, sette su sette:
// **422 sul PUT, 500 col messaggio Postgres crudo sul POST — e il lavoro che
// non nasce affatto.**
// 🛑 È il rovescio esatto della regola dura del ramo (`lib/api/colore-caso.ts`:
// «si perde IL COLORE, non il lavoro»): lì si perdeva un colore, qui il lavoro.
//
// Ogni controllo qui sotto ha il suo gemello in
// `20260727120100_lavori_denti_tabella.sql`: il database resta la rete, questa
// è la porta. I due elenchi devono dire la stessa cosa — se un giorno la
// migration cambia, cambia anche questo file. La ragione per cui la porta
// esiste, e non ci si affida ai soli CHECK, è che un CHECK produce un 500
// illeggibile: chi sbaglia un dente deve sapere QUALE.
//
// 🛑 LA NORMALIZZAZIONE NON È COSMESI, ed è il motivo per cui al POST non
// bastava CONTROLLARE. `{ fdi: 11, scala: '  vita_classical  ', codice: ' A3 ' }`
// supera ogni controllo di forma — sono stringhe non vuote — ma arriva a
// `d->>'scala'` con gli spazi attaccati e sbatte contro
// `lavori_denti_colore_fk`: di nuovo un 500, di nuovo il lavoro perso. Il
// `.trim()` di `leggiTesto` è ciò che lo impedisce, e adesso lo impedisce su
// entrambe le porte.
//
// ⚠️ FUORI da questo modulo, dichiarato perché nessuno debba dedurlo: la
// PRESENZA della chiave `denti` la decide ogni porta per conto suo. Sul PUT la
// lista È il corpo della richiesta e la sua assenza è un errore; sul POST è
// facoltativa e la sua assenza vuol dire «nessun dente». È l'unica differenza
// legittima fra le due porte: nasconderla dietro un parametro di questa
// funzione la renderebbe invisibile proprio dove va vista, cioè alle porte.
//
// ⚠️ LIMITE DICHIARATO, non chiuso qui — e vale per TUTTE E DUE le porte, che
// è già un passo avanti rispetto a due limiti separati: una coppia
// `(scala, codice)` sintatticamente valida ma INESISTENTE in `colori_dentali`
// viola `lavori_denti_colore_fk` e torna 500. Chiuderlo richiede una lettura
// del catalogo, cioè una funzione asincrona — ma soprattutto richiede due esiti
// DIVERSI sulle due porte: sul PUT (sostituzione integrale) rifiutare non perde
// nulla, sul POST rifiutare perderebbe il lavoro, quindi lì il colore andrebbe
// scartato E detto, come già fa `risolviColoreCaso` per il colore di caso. Due
// esiti diversi non sono un'estrazione: sono un secondo progetto, e ha bisogno
// di un campo di risposta che oggi non esiste (`colore_scartato` parla del
// colore di CASO, non dei denti). Appartiene all'ondata (b), quella che porta
// il colore per dente sul POST.

import { isFdiValido } from '@/lib/domain/denti-fdi-dominio'

/** `lavori_denti_ruolo` CHECK — cinque valori, non quattro. */
const RUOLI = ['elemento', 'mancante', 'impianto', 'escluso', 'incollato'] as const

/** `lavori_denti_provenienza` CHECK. */
const PROVENIENZE = ['prescritto', 'eseguito'] as const

/**
 * Le cinque colonne testuali del colore, tutte nullable e tutte soggette agli
 * stessi due CHECK (coppia + zone).
 */
const CAMPI_TESTO = ['scala', 'codice', 'codice_collo', 'codice_corpo', 'codice_incisale'] as const

/**
 * La riga che le due RPC leggono, coi default già applicati.
 *
 * 🔴 QUESTO ELENCO È UN'ALLOWLIST, e da oggi lo è per TUTTE E DUE le porte —
 * prima il POST inoltrava l'oggetto grezzo, quindi non lo era. `lavori_denti`
 * ha due colonne in più, `gruppo` e `gruppo_ruolo` (il ponte, «forma riservata
 * ora, gesto dopo», spec §3.4): oggi NON passano di qui, e la cosa è a somma
 * zero perché non passano nemmeno dalle RPC — l'elenco di colonne dei due
 * `INSERT INTO lavori_denti` in `20260727120300_lavori_denti_rpc.sql` (righe
 * 67-70 e 184-187) non le nomina, quindi restano NULL comunque.
 * ⚠️ Ma il giorno in cui l'ondata del ponte le farà scrivere, chi aggiunge la
 * chiave alle RPC DEVE aggiungerla anche qui, o il client la manderà e questo
 * modulo la butterà **in silenzio**: l'utente leggerebbe «Salvato» su un dato
 * che non c'è. È la stessa classe di difetto di `PATCHABLE_FIELDS`
 * (`src/app/api/lavori/[id]/route.ts`), e la ragione per cui R-P6 chiede che
 * ogni nome fuori da un'allowlist porti scritta la sua destinazione.
 */
export type DenteNormalizzato = {
  fdi: number
  ruolo: string
  scala: string | null
  codice: string | null
  codice_collo: string | null
  codice_corpo: string | null
  codice_incisale: string | null
  provenienza: string
}

/**
 * L'esito è un dato, non un `Response`: questo modulo vive in `lib/domain` e
 * non conosce Next. Sono le due route a trasformarlo in 422 — con lo stesso
 * `error` e lo stesso `valore`, che è il punto dell'intera correzione.
 */
export type EsitoValidazioneDenti =
  | { ok: true; denti: DenteNormalizzato[] }
  | { ok: false; errore: string; valore?: unknown }

/**
 * Un campo testo del colore è: assente (`undefined`/`null`) oppure una stringa
 * non vuota. Un numero o un oggetto arriverebbero al database stringificati da
 * `d->>'scala'` e sbatterebbero contro `lavori_denti_colore_fk` con un 500; una
 * stringa vuota non è un colore, e `('','')` non esiste in `colori_dentali`.
 */
function leggiTesto(grezzo: unknown): { ok: true; valore: string | null } | { ok: false } {
  if (grezzo === undefined || grezzo === null) return { ok: true, valore: null }
  if (typeof grezzo !== 'string') return { ok: false }
  const pulito = grezzo.trim()
  if (pulito.length === 0) return { ok: false }
  return { ok: true, valore: pulito }
}

/**
 * Valida e normalizza la lista di denti. `grezzo` è il valore così com'è
 * arrivato: se non è un array l'esito è già negativo, e con lo stesso messaggio
 * su entrambe le porte.
 *
 * 🔑 L'ORDINE DEI CONTROLLI È PARTE DEL CONTRATTO. È quello che il PUT aveva
 * già: oggettualità → `fdi` → duplicato → `ruolo` → `provenienza` → i cinque
 * testi → coppia → zone. Cambiarlo cambierebbe QUALE errore vede chi ne fa due
 * insieme, cioè cambierebbe il comportamento del PUT senza toccarne una riga.
 */
export function validaDenti(grezzo: unknown): EsitoValidazioneDenti {
  if (!Array.isArray(grezzo)) return { ok: false, errore: 'denti deve essere una lista' }

  const visti = new Set<number>()
  const denti: DenteNormalizzato[] = []

  for (const grezzoDente of grezzo as unknown[]) {
    if (!grezzoDente || typeof grezzoDente !== 'object' || Array.isArray(grezzoDente)) {
      return { ok: false, errore: 'ogni dente deve essere un oggetto', valore: grezzoDente }
    }
    const d = grezzoDente as Record<string, unknown>

    if (!isFdiValido(d.fdi)) return { ok: false, errore: 'numero di dente non valido', valore: d.fdi }
    if (visti.has(d.fdi)) {
      return { ok: false, errore: 'dente ripetuto: la lista è un insieme', valore: d.fdi }
    }
    visti.add(d.fdi)

    if (d.ruolo !== undefined && !(RUOLI as readonly unknown[]).includes(d.ruolo)) {
      return { ok: false, errore: 'ruolo non valido', valore: d.ruolo }
    }
    if (d.provenienza !== undefined && !(PROVENIENZE as readonly unknown[]).includes(d.provenienza)) {
      return { ok: false, errore: 'provenienza non valida', valore: d.provenienza }
    }

    const testi: Record<string, string | null> = {}
    for (const campo of CAMPI_TESTO) {
      const letto = leggiTesto(d[campo])
      if (!letto.ok) return { ok: false, errore: `${campo} non valido`, valore: d[campo] }
      testi[campo] = letto.valore
    }

    // Mezza coppia non è mezzo colore (`lavori_denti_coppia_ck`, stessa regola
    // di risolviColore: tre punti, una sola idea).
    if ((testi.scala === null) !== (testi.codice === null)) {
      return { ok: false, errore: 'scala e codice vanno insieme', valore: testi.scala ?? testi.codice }
    }
    // Le zone del ceramista non possono esistere senza la scala che le legge
    // (`lavori_denti_zone_ck`). Il piano si fermava alla coppia e lasciava
    // scoperto questo secondo CHECK: un `{ fdi: 11, codice_collo: 'A1' }`
    // passava la porta e tornava indietro come 500.
    if (
      testi.scala === null &&
      (testi.codice_collo !== null || testi.codice_corpo !== null || testi.codice_incisale !== null)
    ) {
      return { ok: false, errore: 'le zone del colore richiedono scala e codice', valore: d.fdi }
    }

    denti.push({
      fdi: d.fdi,
      ruolo: (d.ruolo as string | undefined) ?? 'elemento',
      scala: testi.scala,
      codice: testi.codice,
      codice_collo: testi.codice_collo,
      codice_corpo: testi.codice_corpo,
      codice_incisale: testi.codice_incisale,
      provenienza: (d.provenienza as string | undefined) ?? 'prescritto',
    })
  }

  return { ok: true, denti }
}
