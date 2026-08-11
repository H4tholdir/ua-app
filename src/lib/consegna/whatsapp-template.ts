// src/lib/consegna/whatsapp-template.ts
// GDPR Art. 9 — nessun dato del PAZIENTE (nome, tipo prestazione).
// Solo: numero lavoro + link portale token + la firma del laboratorio.
//
// 🔄 CORRETTA IL 09/08/2026 — ⚖️ **D345**. Questa riga diceva «nessun dato
//    personale (nome paziente, tipo prestazione, **nome lab**)», e il nome del
//    laboratorio ci stava dentro come se fosse un dato da proteggere. È un
//    errore di ragionamento, non una svista di scrittura: il laboratorio è il
//    **mittente**, non un terzo di cui si divulgano i dati, e un messaggio che
//    esce da lui deve dire chi è. Il difetto vero che ne è nato: i messaggi si
//    firmavano col nome dello **strumento** («UÀ Lab») invece che del mittente,
//    e il **sollecito di pagamento** non si firmava affatto.
//    ➡️ Il vincolo GDPR che resta, intero, è sul **paziente**.
import { firmaMessaggio } from '@/lib/messaggi/firma'

interface WhatsappMessageParams {
  numeroLavoro: string
  portalToken: string
  /** ⚖️ D345 — `laboratori.nome`. **Chiave obbligatoria, valore che ammette
   *  `null`**: obbligatoria perché ogni chiamante deve dichiarare da dove prende
   *  il nome (con `?` `tsc` non avrebbe censito nessuno); `null` perché il ramo
   *  «lettura senza laboratorio» esiste e va deciso, non assunto
   *  (`src/lib/messaggi/firma.ts`). */
  nomeLaboratorio: string | null
}

export function buildWhatsappMessage({
  numeroLavoro,
  portalToken,
  nomeLaboratorio,
}: WhatsappMessageParams): string {
  const righe = [`✅ Lavoro #${numeroLavoro} pronto per la consegna.`]

  if (portalToken) {
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'}/portale/${portalToken}`
    righe.push(``, `📋 Visualizza dettagli e scarica i documenti:`, portalUrl)
  }

  // ⚠️ La riga vuota entra CON la firma, non prima: senza nome il messaggio non
  //    deve finire con una riga vuota appesa. Per la stessa ragione qui non si
  //    usa `.filter(Boolean)` — le righe vuote di separazione sono volute.
  const firma = firmaMessaggio(nomeLaboratorio)
  if (firma) righe.push(``, firma)

  return righe.join('\n')
}

/**
 * Prepara un numero per wa.me: solo cifre, in formato internazionale.
 *
 * 🔑 PERCHÉ ESISTE (P31, D182). `buildWhatsappUrl` faceva solo
 * `replace(/\D/g,'')`, e NESSUN punto del programma aggiungeva il 39:
 * un cellulare italiano scritto come lo scrive chiunque («333 1234567»)
 * produceva un link senza prefisso paese.
 *
 * 🛑 LA SOGLIA DELLE 11 CIFRE non è arbitraria: esiste un prefisso di
 * cellulare italiano che COMINCIA per 39 (391…, Wind), quindi
 * «comincia per 39» non basta a dire «è già internazionale».
 * I numeri nazionali italiani non superano le 10 cifre, e i fissi
 * cominciano per 0, mai per 39.
 *
 * 🛑 COSA NON FA: non valida che il numero sia raggiungibile, non
 * distingue fisso da cellulare, non rifiuta niente. Prepara una stringa.
 * ⚠️ Un numero STRANIERO scritto SENZA il «+» viene trattato da
 * italiano: limitazione dichiarata (in banca dati non ci sono clienti
 * stranieri), e la strada è chiedere il «+», non indovinare.
 */
export function numeroPerWhatsapp(grezzo: string | null | undefined): string | null {
  if (!grezzo) return null
  const conPiu = grezzo.trim().startsWith('+')
  const cifre = grezzo.replace(/\D/g, '')
  if (!cifre) return null

  if (conPiu) return cifre                                  // il paese è dichiarato: si rispetta
  if (cifre.startsWith('00')) return cifre.slice(2) || null  // forma internazionale con 00
  if (cifre.startsWith('39') && cifre.length >= 11) return cifre  // già internazionale
  return `39${cifre}`                                        // nazionale italiano
}

export function buildWhatsappUrl(message: string, phone?: string): string {
  const encoded = encodeURIComponent(message)
  const numero = numeroPerWhatsapp(phone)
  return numero ? `https://wa.me/${numero}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

export interface SollecitoParams {
  studioNome: string    // nome dello studio/dentista (non dati paziente)
  totaleInsoluto: number
  /** ⚖️ D345 — `laboratori.nome`, la firma. V. `WhatsappMessageParams`. */
  nomeLaboratorio: string | null
}

/**
 * Messaggio sollecito pagamento GDPR-safe — nessun dato clinico o paziente.
 * Usato dalla pagina Scadenzario per link WhatsApp ai dentisti con fatture non pagate.
 *
 * 🔴 IL DIFETTO CHE ⚖️ D345 HA CHIUSO QUI ERA DI FORMA DIVERSA DA COME ERA STATO
 *    DESCRITTO, e vale scriverlo: il verbale della centoquarantanovesima tornata
 *    dice che «ogni sollecito mandato finora si firma col nome dello strumento».
 *    `provato:` misurato il 09/08/2026 — questa funzione **non conteneva la
 *    stringa «UÀ Lab»**: finiva a «Cordiali saluti» e lì si fermava. Cioè il
 *    messaggio con cui un laboratorio chiede soldi a un dentista **non era
 *    firmato da nessuno**. Il danno era reale, la sua forma no.
 *    ➡️ D345 lo copre comunque: la firma è il nome del laboratorio, e qui non
 *    c'era. **Senza nome, però, questa funzione torna esattamente il messaggio di
 *    prima** — è l'unico dei tre punti in cui il ramo «nome assente» non perde
 *    niente. Asimmetria dichiarata, non incidente.
 */
export function buildWhatsappSollecito({ studioNome, totaleInsoluto, nomeLaboratorio }: SollecitoParams): string {
  const righe = [
    `Gentile ${studioNome},`,
    ``,
    `La contatto per ricordarle del pagamento in sospeso di €${totaleInsoluto.toFixed(2)}.`,
    ``,
    `Per qualsiasi chiarimento non esiti a contattarci.`,
    ``,
    `Cordiali saluti`,
  ]

  // Attaccata ai saluti, senza riga vuota in mezzo: è la forma di una firma
  // sotto una chiusura di lettera.
  const firma = firmaMessaggio(nomeLaboratorio)
  if (firma) righe.push(firma)

  return righe.join('\n')
}
