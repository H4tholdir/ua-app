import type { getServiceClient } from '@/lib/supabase/server-service'
import { famigliaDiMacro } from '@/lib/domain/tinta'

export type Tinta = {
  tinta_famiglia: string | null
  tinta_codice: string | null
  /**
   * Una tinta era stata CHIESTA e non si è potuta registrare: si degrada E si
   * dice. «Si corregge dalla scheda» vale solo se chi deve correggere sa di
   * doverlo fare.
   *
   * ⚠️ CONFINE DICHIARATO, perché nessuno debba indovinarlo: «chiesta» vuol dire
   * `tinta_codice` — il codice è ciò che si sceglie, e senza codice non c'è
   * tinta. Quindi `undefined`, `null` e una casella di soli spazi NON sono una
   * richiesta e non producono nessun avviso. Un avviso che compare quando non
   * serve si impara a ignorare, e allora smette di avvisare.
   */
  scartata: boolean
}

export const NESSUNA_TINTA: Tinta = { tinta_famiglia: null, tinta_codice: null, scartata: false }

/** Una tinta c'era, e non si è potuta registrare: si degrada E si dice. */
const TINTA_SCARTATA: Tinta = { tinta_famiglia: null, tinta_codice: null, scartata: true }

/**
 * La tinta del manufatto (`lavori.tinta_famiglia`/`tinta_codice`), normalizzata
 * e confrontata col catalogo `tinte_manufatto`.
 *
 * 🔑 RICALCATURA CONSAPEVOLE di `risolviColoreCaso` (`src/lib/api/colore-caso.ts`):
 * stessa forma, stessa regola dura, stesso campo che dichiara lo scarto. Le due
 * NON si unificano: parlano di due cataloghi con chiavi diverse — là la coppia è
 * (scala, codice) e il codice è univoco fra le scale; qui è (famiglia, codice) e
 * lo stesso codice PUÒ vivere in due famiglie, perché la chiave è composita
 * (`provato:` T2, sonda «stesso codice in famiglia diversa» → accettata).
 *
 * 🛑 NON FALLISCE MAI. Se la tinta non si riconosce si perde LA TINTA, non il
 * lavoro: si corregge dalla scheda (direttiva «ogni campo del lavoro si
 * corregge, fino alla consegna», 27/07/2026).
 *
 * 🔴 Vive nel SERVER, non nel client, per la stessa ragione misurata il 28/07
 * sul colore di caso: i vincoli mordono nel database, e una garanzia che vivesse
 * solo nel client non sarebbe una garanzia — i client saranno più d'uno. I tre
 * vincoli che difendono queste due colonne (migration `20260805174500`):
 *   lavori_tinta_coppia_ck  CHECK ((tinta_famiglia IS NULL) = (tinta_codice IS NULL))
 *   lavori_tinta_fk         FOREIGN KEY (tinta_famiglia, tinta_codice)
 *                             REFERENCES tinte_manufatto(famiglia, codice)
 *   lavori_tinta_tipo_ck    la famiglia dev'essere quella della categoria GROSSA
 * Quindi una tinta sportiva su una corona non «non si salva»: fa fallire la
 * scrittura con un 500. Ed è per questo che il terzo argomento è la macro VERA
 * del lavoro, letta dalla riga in banca dati — mai quella che arriva nel body.
 *
 * @param macroDelLavoro `lavori.tipo_dispositivo` (i 10 valori macro), NON l'id
 *   fine dei 38 tipi: l'id fine non è persistito, ed è la categoria grossa che
 *   il CHECK guarda.
 */
export async function risolviTinta(
  svc: ReturnType<typeof getServiceClient>,
  famigliaGrezza: unknown,
  codiceGrezzo: unknown,
  macroDelLavoro: string
): Promise<Tinta> {
  // Mezza coppia non è mezza tinta: è nessuna tinta (violerebbe
  // `lavori_tinta_coppia_ck`). Un codice che non è nemmeno una stringa cade qui:
  // se però qualcosa era stato mandato, una tinta era stata CHIESTA e va detto
  // che si è persa; `undefined`/`null` sono invece «nessuna tinta», non un errore.
  if (typeof codiceGrezzo !== 'string') {
    return codiceGrezzo === undefined || codiceGrezzo === null ? NESSUNA_TINTA : TINTA_SCARTATA
  }
  const codice = codiceGrezzo.trim().toLowerCase()
  // Casella lasciata vuota: niente da salvare, quindi niente da segnalare.
  if (codice.length === 0) return NESSUNA_TINTA

  // La famiglia ammessa la decide il TIPO del lavoro, non il body: è la stessa
  // regola di `lavori_tinta_tipo_ck`, applicata prima che il CHECK debba
  // difendersi. Se la categoria non ha tinte (una corona), non c'è niente da
  // dedurre e non si interroga nemmeno il catalogo.
  const ammessa = famigliaDiMacro(macroDelLavoro)
  if (ammessa === null) return TINTA_SCARTATA

  // 🆕 IL LATO CHE IL PIANO NON COPRIVA, e la ragione per cui va coperto: il
  //    piano puliva solo il codice, quindi una famiglia mal tipata (un numero,
  //    un oggetto) cadeva nel ramo «non indicata» e veniva DEDOTTA IN SILENZIO.
  //    Ne usciva un'asimmetria storta: un valore palesemente rotto (`42`)
  //    passava, mentre uno solo sbagliato (`'resina_ortodontica'` su un bite)
  //    veniva scartato. Una famiglia che non è una stringa non arriva da
  //    qualcuno che sceglie in una tavolozza: arriva da un client rotto — e
  //    davanti a un client rotto la regola giusta è quella già scritta nel
  //    gemello, «scarta invece di tirare a indovinare».
  if (famigliaGrezza !== undefined && famigliaGrezza !== null && typeof famigliaGrezza !== 'string') {
    return TINTA_SCARTATA
  }

  const famiglia =
    typeof famigliaGrezza === 'string' && famigliaGrezza.trim().length > 0
      ? famigliaGrezza.trim().toLowerCase()
      : ammessa
  if (famiglia !== ammessa) return TINTA_SCARTATA

  const { data, error } = await svc
    .from('tinte_manufatto')
    .select('famiglia, codice')
    .eq('famiglia', ammessa)
  // Anche un catalogo irraggiungibile scarta la tinta invece di far fallire la
  // scrittura: la regola dura non ha eccezioni tecniche. La tinta però è persa
  // davvero, quindi si segnala come ogni altro scarto.
  if (error || !data) return TINTA_SCARTATA

  const trovata = data.find((r) => r.codice === codice)
  if (!trovata) return TINTA_SCARTATA
  return { tinta_famiglia: trovata.famiglia, tinta_codice: trovata.codice, scartata: false }
}
