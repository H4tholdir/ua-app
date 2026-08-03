// src/lib/consegna/whatsapp-template.ts
// GDPR Art. 9 — nessun dato personale (nome paziente, tipo prestazione, nome lab)
// Solo: numero lavoro + link portale token

interface WhatsappMessageParams {
  numeroLavoro: string
  portalToken: string
}

export function buildWhatsappMessage({
  numeroLavoro,
  portalToken,
}: WhatsappMessageParams): string {
  if (!portalToken) {
    return [
      `✅ Lavoro #${numeroLavoro} pronto per la consegna.`,
      ``,
      `— UÀ Lab`,
    ].join('\n')
  }

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'}/portale/${portalToken}`

  return [
    `✅ Lavoro #${numeroLavoro} pronto per la consegna.`,
    ``,
    `📋 Visualizza dettagli e scarica i documenti:`,
    portalUrl,
    ``,
    `— UÀ Lab`,
  ].join('\n')
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
  if (cifre.startsWith('00')) return cifre.slice(2)          // forma internazionale con 00
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
}

/**
 * Messaggio sollecito pagamento GDPR-safe — nessun dato clinico o paziente.
 * Usato dalla pagina Scadenzario per link WhatsApp ai dentisti con fatture non pagate.
 */
export function buildWhatsappSollecito({ studioNome, totaleInsoluto }: SollecitoParams): string {
  return [
    `Gentile ${studioNome},`,
    ``,
    `La contatto per ricordarle del pagamento in sospeso di €${totaleInsoluto.toFixed(2)}.`,
    ``,
    `Per qualsiasi chiarimento non esiti a contattarci.`,
    ``,
    `Cordiali saluti`,
  ].join('\n')
}
