// src/lib/consegna/whatsapp-template.ts
// GDPR Art. 9 — nessun dato personale (nome paziente, tipo prestazione)
// Solo: numero lavoro + link portale token

interface WhatsappMessageParams {
  numeroLavoro: string
  portalToken: string
  labNome?: string
  pazienteNome?: string     // ignorato — GDPR Art. 9
  tipoPrestazione?: string  // ignorato — GDPR Art. 9
}

export function buildWhatsappMessage({
  numeroLavoro,
  portalToken,
  labNome,
}: WhatsappMessageParams): string {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'}/portale/${portalToken}`
  const labSig = labNome ?? 'UÀ Lab'

  return [
    `✅ Lavoro #${numeroLavoro} pronto per la consegna.`,
    ``,
    `📋 Visualizza dettagli e scarica i documenti:`,
    portalUrl,
    ``,
    `— ${labSig}`,
  ].join('\n')
}

export function buildWhatsappUrl(message: string, phone?: string): string {
  const encoded = encodeURIComponent(message)
  return phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
}
