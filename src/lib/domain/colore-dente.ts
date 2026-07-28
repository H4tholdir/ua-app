// La precedenza «riga di dente → default di caso» (spec §3.2, pattern exocad /
// 3Shape). Vive QUI e solo qui: wizard, scheda del lavoro e Dichiarazione di
// Conformità devono leggere lo stesso default con la stessa regola. Due
// letture divergenti dello stesso fatto sono il difetto che questa modifica
// introdurrebbe — è la classe già pagata una volta con `numero_cassetta`.
//
// Un colore è una COPPIA (scala, codice), non una stringa (W10): «A3» da solo
// non identifica nulla in un mondo con due scale VITA. Mezza coppia non è
// mezzo colore: è nessun colore.

export const SCALE_COLORE = ['vita_classical', 'vita_3d_master', 'fuori_scala'] as const
export type ScalaColore = (typeof SCALE_COLORE)[number]

export type DefaultCaso = { colore_scala: string | null; colore_codice: string | null }
export type RigaDente = { fdi: number; scala: string | null; codice: string | null }
export type ColoreRisolto = { scala: ScalaColore; codice: string; da: 'dente' | 'caso' } | null

function isScala(v: string | null): v is ScalaColore {
  return v !== null && (SCALE_COLORE as readonly string[]).includes(v)
}

function coppia(
  scala: string | null,
  codice: string | null,
  da: 'dente' | 'caso'
): ColoreRisolto {
  if (!isScala(scala) || !codice) return null
  return { scala, codice, da }
}

/**
 * Il colore effettivo di un dente. La riga vince se porta una coppia completa;
 * altrimenti si ricade sul default del lavoro; se non c'è nemmeno quello, `null`
 * — mai una stringa vuota, che a valle si confonderebbe con «bianco».
 */
export function risolviColore(riga: RigaDente | undefined, caso: DefaultCaso): ColoreRisolto {
  return coppia(riga?.scala ?? null, riga?.codice ?? null, 'dente')
      ?? coppia(caso.colore_scala, caso.colore_codice, 'caso')
}

// ═══════════════════════════════════════════════════════════════════════════
// LA SCALA DEDOTTA DAL CODICE — specchio del catalogo `colori_dentali`
// ═══════════════════════════════════════════════════════════════════════════
// Serve perché `PUT /api/lavori/[id]/denti` pretende la coppia già completa,
// mentre `POST /api/lavori` deduce la scala leggendo il catalogo
// (`route.ts:110-132`). L'asimmetria è dichiarata a `denti/route.ts:157-160` ed
// è assegnata al Task 11-bis: quando la deduzione salirà anche sul PUT, questa
// mappa muore. Fino ad allora è QUI e non altrove.
//
// 🔴 Non è una convenzione, è una copia: dedurre «se non è T/BL/OM allora è
// vita_classical» sembra funzionare finché non arriva un codice VITA 3D-Master
// — e la casella «Colore» del wizard (`PassoPaziente.tsx:99-106`) è TESTO
// LIBERO risolto sull'intero catalogo, quindi `2M2` arriva davvero. Quella
// deduzione manderebbe la coppia ('vita_classical','2M2'), che non esiste:
// violazione di `lavori_denti_colore_fk`, 500, e ogni salvataggio della scheda
// bloccato per sempre su quel lavoro.
// L'allineamento con la migration è tenuto da
// `tests/unit/colore-dente-idratazione.test.ts`, che legge le INSERT vere.
const CODICI_PER_SCALA: Readonly<Record<ScalaColore, readonly string[]>> = {
  vita_classical: [
    'A1', 'A2', 'A3', 'A3.5', 'A4',
    'B1', 'B2', 'B3', 'B4',
    'C1', 'C2', 'C3', 'C4',
    'D2', 'D3', 'D4',
  ],
  vita_3d_master: [
    '0M1', '0M2', '0M3',
    '1M1', '1M2',
    '2L1.5', '2L2.5', '2M1', '2M2', '2M3', '2R1.5', '2R2.5',
    '3L1.5', '3L2.5', '3M1', '3M2', '3M3', '3R1.5', '3R2.5',
    '4L1.5', '4L2.5', '4M1', '4M2', '4M3', '4R1.5', '4R2.5',
    '5M1', '5M2', '5M3',
  ],
  fuori_scala: ['T', 'BL', 'OM'],
}

/** I 48 codici del catalogo, ciascuno con la sua unica scala. */
export const SCALA_DI_CODICE: ReadonlyMap<string, ScalaColore> = new Map(
  (Object.entries(CODICI_PER_SCALA) as Array<[ScalaColore, readonly string[]]>)
    .flatMap(([scala, codici]) => codici.map((c) => [c, scala] as [string, ScalaColore]))
)

/**
 * La scala di un codice, o `null` se il catalogo non lo conosce. Il confronto è
 * esatto: `colori_dentali` distingue le maiuscole («A3» c'è, «a3» no), e un
 * `null` qui vale «non lo so», mai «tiriamo a indovinare» — mezza coppia non è
 * mezzo colore.
 */
export function scalaDelCodice(codice: string | null | undefined): ScalaColore | null {
  if (!codice) return null
  return SCALA_DI_CODICE.get(codice) ?? null
}

// ═══════════════════════════════════════════════════════════════════════════
// LA STRADA DEL RITORNO — dalle righe di `lavori_denti` alle quattro caselle
// ═══════════════════════════════════════════════════════════════════════════
// Dal Task 10 `lavori.colore_dente`/`colore_collo`/`colore_corpo`/
// `colore_incisale` non hanno più alcuno scrittore: le due RPC denormalizzano
// solo i tre `denti_*` (20260727120300_lavori_denti_rpc.sql:115-121 e :205-211).
// Chi idratasse la scheda da quelle colonne mostrerebbe l'ultimo valore
// ricevuto prima di quel deploy — cioè un dato fermo, che l'utente vede
// cambiare mentre scrive e tornare indietro appena ricarica.

export type ZoneCeramista = {
  codice_collo: string | null
  codice_corpo: string | null
  codice_incisale: string | null
}

export type RigaColore = RigaDente & Partial<ZoneCeramista>

/** Le quattro caselle colore della scheda clinica, come le legge `TabClinica`. */
export type ColoreScheda = {
  colore_dente: string | null
  colore_collo: string | null
  colore_corpo: string | null
  colore_incisale: string | null
}

const NESSUN_COLORE_SCHEDA: ColoreScheda = {
  colore_dente: null, colore_collo: null, colore_corpo: null, colore_incisale: null,
}

/**
 * Le quattro caselle colore della scheda, ricavate dalle righe del lavoro con
 * la precedenza riga → caso di `risolviColore`.
 *
 * ⚠️ In questa ondata il colore è UNO per tutto il caso: la tendina è una sola
 * e vale per l'intero lavoro. Si prende quindi la prima riga (per numero di
 * dente) che porta una coppia completa; le tre zone del ceramista vengono da
 * quella stessa riga, perché `lavori_denti_zone_ck` non le ammette senza. Il
 * colore per singolo dente è ondata (b): sarà lì che questa funzione diventerà
 * una lettura per riga invece che per lavoro.
 */
export function idrataColoreScheda(
  righe: readonly RigaColore[] | null | undefined,
  caso: DefaultCaso
): ColoreScheda {
  const ordinate = [...(righe ?? [])].sort((a, b) => a.fdi - b.fdi)
  const conColore = ordinate.find((r) => r.scala !== null && r.codice !== null)
  const risolto = risolviColore(conColore, caso)

  if (!risolto) return NESSUN_COLORE_SCHEDA

  return {
    colore_dente: risolto.codice,
    // Le zone appartengono alla riga, non al caso: il default di caso è una
    // coppia (scala, codice) e basta — non ha zone da offrire.
    colore_collo: (risolto.da === 'dente' ? conColore?.codice_collo : null) ?? null,
    colore_corpo: (risolto.da === 'dente' ? conColore?.codice_corpo : null) ?? null,
    colore_incisale: (risolto.da === 'dente' ? conColore?.codice_incisale : null) ?? null,
  }
}
