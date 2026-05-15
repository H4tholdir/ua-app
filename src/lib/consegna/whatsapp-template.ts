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

export function buildWhatsappUrl(message: string, phone?: string): string {
  const encoded = encodeURIComponent(message)
  return phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
}
