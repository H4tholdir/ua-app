/**
 * 🔴 COME SI SEPARANO I TREDICI CASI CHE CONDIVIDONO `P0001`.
 *
 * `correggi_e_riemetti_atomica` alza **tredici** eccezioni e **nessuna** porta
 * un `USING ERRCODE`: hanno quindi tutte lo stesso SQLSTATE, `P0001`. Ma non
 * sono la stessa cosa —
 *
 *   · **NOVE** nascono da un chiamante sbagliato e succedono **prima di
 *     qualsiasi scrittura**: forma degli ingressi, chiavi fuori dalle allowlist,
 *     la coppia `anno_ddc`/`progressivo_ddc` spezzata, le due voci delle penne
 *     mandate nella forma sbagliata. Sono **400**.
 *   · **QUATTRO** succedono **dopo l'annullo** — annullo che non tocca niente,
 *     penna dei denti non-`ok`, penna della prescrizione non-`ok`, chiavi
 *     accettate e non atterrate su `lavori`. Sono **guasti interni**, cioè
 *     **500**.
 *
 * 🔑 PERCHÉ IL VERSO DEL RIPIEGO È IL PUNTO, e non un dettaglio di stile:
 * tradurre un guasto in un 400 dice all'odontotecnico **che ha sbagliato lui**,
 * mentre l'app si è rotta. Quindi si riconoscono i **nove**, e tutto ciò che
 * non si riconosce è un guasto. Una `RAISE` aggiunta domani e non classificata
 * diventa un 500 — brutto, ma onesto — mai un 400 che dà la colpa a chi ha
 * chiesto. (Il conto delle tredici è sorvegliato da una prova che le legge dal
 * corpo vivo della migration: `tests/unit/atto-unico-errori.test.ts`.)
 *
 * ⚠️ NON si smista con `USING ERRCODE` diversi perché **il contratto è fermo**:
 * cambiarlo sarebbe un quarto compito SQL, e l'intera ondata è separata proprio
 * perché chi scrive il consumatore non pieghi il contratto per far tornare il
 * proprio codice. La separazione per testo è il costo che ne segue, ed è
 * dichiarato.
 *
 * 📌 DOVE STANNO I CAMPI — misurato attraverso PostgREST, non dedotto
 * (`scripts/tmp/sonda-forma-errori-postgrest.ts`, output incollato nel
 * resoconto). Sono due forme diverse:
 *   `P0001` → `{code, message: <il nostro testo>, details: null, hint: null}`
 *   `23505` → `{code, message: 'duplicate key value violates unique constraint
 *              "<NOME>"', details: 'Key (…)=(…) already exists.', hint: null}`
 * Il **nome del vincolo sta in `message`**: `details` porta i valori e `hint` è
 * sempre nullo. Per questo si ramifica su `message`.
 */

export type ErrorePostgrest = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

export type VincoloNoto = 'evento_gia_consumato' | 'gia_superata' | 'numero_gia_usato'

export type ClassificazioneErrore =
  /** Colpa di chi ha chiesto, e niente è stato scritto → 400. */
  | { tipo: 'richiesta'; messaggio: string }
  /** Un vincolo unico che ha un significato leggibile → 409. */
  | { tipo: 'vincolo'; vincolo: VincoloNoto }
  /** Tutto il resto: l'app si è rotta → 500. */
  | { tipo: 'guasto'; motivo: string }

/**
 * I NOVE PREFISSI, uno per `RAISE` di colpa del chiamante.
 *
 * 🛑 Sono **prefissi**, non parole: quattro messaggi su tredici cominciano con
 * «chiavi», e il quarto — «chiavi accettate ma NON atterrate su lavori» —
 * succede **dopo l'annullo**, cioè è un guasto. Un riconoscimento fatto sulla
 * parola scambierebbe proprio quello, che è il caso in cui sbagliare costa di
 * più. Ogni prefisso arriva fino al primo `%` della `RAISE`, così i valori
 * interpolati non entrano nel confronto.
 */
export const PREFISSI_COLPA_DEL_CHIAMANTE = [
  // ① · ② la forma dei due oggetti in ingresso
  'atto unico: la dichiarazione nuova non è un oggetto',
  'atto unico: le correzioni non sono un oggetto',
  // ③ · ④ · ⑤ le tre allowlist
  'atto unico: chiavi che non sono voci correggibili del documento:',
  'atto unico: chiavi che non sono colonne di dichiarazioni_conformita:',
  'atto unico: chiavi che la dichiarazione nuova NON accetta dal chiamante:',
  // ⑥ la coppia indivisibile (C-ter)
  'atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI',
  // ⑦ · ⑧ · ⑨ la forma delle due voci che vanno alle penne
  "atto unico: denti_coinvolti dev'essere un array di oggetti",
  'atto unico: denti_coinvolti porta il CARICO DELLA PENNA',
  "atto unico: prescrizione_caratteristiche dev'essere un oggetto",
] as const

/**
 * I tre vincoli unici che `23505` può significare da C3 in poi, col nome col
 * quale il database li chiama. 🛑 **Si ramifica sul NOME, mai sul solo codice:**
 * fino a ieri `23505` voleva dire una cosa sola, oggi ne vuol dire tre.
 */
const VINCOLI: ReadonlyArray<{ nome: string; vincolo: VincoloNoto }> = [
  // Un evento annulla AL PIÙ UNA dichiarazione per laboratorio: il secondo
  // tocco con lo stesso evento finisce qui.
  { nome: 'ddc_evento_annulla_unique', vincolo: 'evento_gia_consumato' },
  // Una dichiarazione è superata da UNA SOLA successiva.
  { nome: 'ddc_sostituisce_unique', vincolo: 'gia_superata' },
  // La coppia anno+progressivo è già stata bruciata per questo laboratorio.
  { nome: 'dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key', vincolo: 'numero_gia_usato' },
]

export function classificaErroreAttoUnico(
  errore: ErrorePostgrest | null | undefined
): ClassificazioneErrore {
  if (!errore) return { tipo: 'guasto', motivo: 'errore assente' }

  const codice = errore.code ?? ''
  const messaggio = errore.message ?? ''

  if (codice === 'P0001') {
    if (PREFISSI_COLPA_DEL_CHIAMANTE.some((p) => messaggio.startsWith(p))) {
      return { tipo: 'richiesta', messaggio }
    }
    // 🛑 Fail-closed nel verso giusto: un `P0001` che non si riconosce è un
    //    guasto. Fra i tredici, i quattro post-annullo cadono qui — ed è
    //    esattamente dove devono cadere.
    return { tipo: 'guasto', motivo: messaggio }
  }

  if (codice === '23505') {
    const noto = VINCOLI.find((v) => messaggio.includes(v.nome))
    if (noto) return { tipo: 'vincolo', vincolo: noto.vincolo }
    // Un unico che non è nessuno dei tre non ha una traduzione onesta: dirgli
    // «riprova» sarebbe inventare un significato.
    return { tipo: 'guasto', motivo: messaggio }
  }

  return { tipo: 'guasto', motivo: `${codice}: ${messaggio}` }
}
