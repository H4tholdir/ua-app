import type { getServiceClient } from '@/lib/supabase/server-service'

export type ColoreCaso = {
  colore_scala: string | null
  colore_codice: string | null
  /**
   * 🔑 «Si perde il colore, mai il lavoro» giustifica il NON far fallire; NON
   * giustifica il non dirlo (rilievo M2 della revisione pre-merge, 28/07/2026).
   * `scartato` è vero quando un colore era stato CHIESTO e non si è potuto
   * registrare: il chiamante lo riporta all'utente invece di lasciarlo leggere
   * «Fatto!» su un dato che non c'è.
   *
   * ⚠️ CONFINE DICHIARATO, perché nessuno debba indovinarlo: «chiesto» vuol dire
   * `colore_codice` — il codice è ciò che si digita, e senza codice non c'è
   * colore (mezza coppia = nessun colore, v. sotto). Quindi `undefined`, `null`
   * e una stringa di soli spazi NON sono una richiesta e non producono nessun
   * avviso; una `colore_scala` orfana nemmeno. Un avviso che compare quando non
   * serve si impara a ignorare, e allora smette di avvisare.
   */
  scartato: boolean
}
export const NESSUN_COLORE: ColoreCaso = { colore_scala: null, colore_codice: null, scartato: false }

/** Un colore c'era, e non si è potuto registrare: si degrada E si dice. */
const COLORE_SCARTATO: ColoreCaso = { colore_scala: null, colore_codice: null, scartato: true }

/**
 * Il colore di CASO (`lavori.colore_scala`/`colore_codice`), normalizzato e
 * confrontato col catalogo `colori_dentali`.
 *
 * 🔑 UNA SOLA CASA, DUE CHIAMANTI. Scritta col Task 11 per `POST /api/lavori`,
 * estratta qui col Task 12-bis perché la serve anche `PATCH /api/lavori/[id]`:
 * il default di caso nasce alla creazione e da adesso si CORREGGE dalla scheda,
 * quindi la stessa regola morde in due punti. Due copie della stessa regola —
 * una che si aggiorna e l'altra no — sono la classe di difetto R3 che
 * quest'ondata combatte.
 *
 * 🛑 NON FALLISCE MAI. Se il codice non si riconosce si perde IL COLORE, non il
 * lavoro: si corregge dalla scheda (direttiva «ogni campo del lavoro si
 * corregge, fino alla consegna», 27/07/2026). ⚠️ Ma lo DICE: `scartato` (M2,
 * 28/07/2026) — «si corregge dalla scheda» vale solo se chi deve correggere sa
 * di doverlo fare.
 *
 * 🔴 Perché vive nel SERVER e non nel client (misurato il 28/07/2026):
 *
 *   begin; update lavori set colore_scala='vita_classical', colore_codice='a3'
 *     where id=(select id from lavori limit 1); rollback;
 *   → ERRORE SQL: insert or update on table "lavori" violates foreign key
 *     constraint "lavori_colore_caso_fk"
 *
 * I tre vincoli, riletti dal catalogo di sistema il 28/07/2026:
 *   lavori_colore_caso_coppia_ck CHECK ((colore_scala IS NULL) = (colore_codice IS NULL))
 *   lavori_colore_caso_fk        FOREIGN KEY (colore_scala, colore_codice)
 *                                  REFERENCES colori_dentali(scala, codice)
 *   lavori_colore_scala_check    CHECK (colore_scala IS NULL OR colore_scala =
 *                                  ANY ('vita_classical','vita_3d_master','fuori_scala'))
 * La coppia viaggia SEMPRE INTERA (mezza coppia = violazione del CHECK) e il
 * catalogo distingue le maiuscole: «A3» c'è, «a3» no. Quindi un colore digitato
 * di fretta al banco non «non si salva»: fa fallire la scrittura con un 500.
 * Una garanzia che vivesse solo nel client non sarebbe una garanzia — il client
 * si aggira, e domani i client saranno più d'uno.
 *
 * 📌 CONTRATTO, dichiarato perché il Task 11-bis non debba indovinarlo:
 * `colore_codice` può arrivare SENZA `colore_scala`, e allora la scala si deduce
 * dal catalogo. È lecito perché i 48 codici sono distinti fra le tre scale
 * (16 vita_classical + 29 vita_3d_master + 3 fuori_scala, verificato il
 * 28/07/2026); se un domani un codice comparisse in due scale, `trovate.length
 * !== 1` lo scarta invece di tirare a indovinare. Il `PUT /api/lavori/[id]/denti`
 * oggi NON fa nulla di tutto questo (limite dichiarato a `denti/route.ts:157-160`):
 * allinearli è il Task 11-bis.
 */
export async function risolviColoreCaso(
  svc: ReturnType<typeof getServiceClient>,
  scalaGrezza: unknown,
  codiceGrezzo: unknown
): Promise<ColoreCaso> {
  // Mezza coppia non è mezzo colore: è nessun colore. Una scala orfana
  // violerebbe `lavori_colore_caso_coppia_ck` — 500, nessun lavoro salvato. Un
  // codice che non è nemmeno una stringa cade qui: se però qualcosa era stato
  // mandato (un numero, un oggetto), un colore era stato CHIESTO e va detto che
  // si è perso; `undefined`/`null` sono invece «nessun colore», non un errore.
  if (typeof codiceGrezzo !== 'string') {
    return codiceGrezzo === undefined || codiceGrezzo === null ? NESSUN_COLORE : COLORE_SCARTATO
  }
  const codice = codiceGrezzo.trim().toUpperCase()
  // Casella lasciata vuota: niente da salvare, quindi niente da segnalare.
  if (codice.length === 0) return NESSUN_COLORE

  const scala =
    typeof scalaGrezza === 'string' && scalaGrezza.trim().length > 0 ? scalaGrezza.trim() : null

  const { data, error } = await svc.from('colori_dentali').select('scala, codice').eq('codice', codice)
  // Anche un catalogo irraggiungibile scarta il colore invece di far fallire la
  // scrittura: la regola dura non ha eccezioni tecniche. Il colore però è perso
  // davvero, quindi si segnala come ogni altro scarto.
  if (error || !data) return COLORE_SCARTATO

  const trovate = scala === null ? data : data.filter((r) => r.scala === scala)
  if (trovate.length !== 1) return COLORE_SCARTATO
  return { colore_scala: trovate[0].scala, colore_codice: trovate[0].codice, scartato: false }
}
