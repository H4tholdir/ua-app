export interface PecProvider {
  name: string
  host: string
  port: number
}

const PROVIDERS: Record<string, PecProvider> = {
  'pec.aruba.it':        { name: 'Aruba PEC',          host: 'smtps.pec.aruba.it',           port: 465 },
  'cert.legalmail.it':   { name: 'Legalmail',           host: 'sendm.cert.legalmail.it',       port: 465 },
  'legalmail.it':        { name: 'Legalmail',           host: 'sendm.cert.legalmail.it',       port: 465 },
  'sicurezzapostale.it': { name: 'Namirial',             host: 'smtps.sicurezzapostale.it',     port: 465 },
  'pec.namirial.com':    { name: 'Namirial PRO',         host: 'pro-smtps.sicurezzapostale.it', port: 465 },
  'postecert.it':        { name: 'Poste Italiane',       host: 'mail.postecert.it',             port: 465 },
  'pectim.it':           { name: 'TIM PEC',              host: 'smtps.pectim.it',               port: 465 },
  'pecmessages.it':      { name: 'PEC Messages',         host: 'smtp.pecmessages.it',           port: 465 },
}

export function detectProvider(email: string): PecProvider | null {
  const atIdx = email.indexOf('@')
  if (atIdx === -1) return null
  const domain = email.slice(atIdx + 1).toLowerCase()
  return PROVIDERS[domain] ?? null
}
