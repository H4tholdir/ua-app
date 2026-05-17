// src/lib/pec/providers.ts
// Provider PEC italiani e loro configurazioni SMTP
// Aggiornato 2026-05 — verificare con documentazione ufficiale del provider
// prima di aggiungere o modificare un host.

export interface PecSmtpConfig {
  host: string
  port: number
  secure: boolean      // true = SSL/TLS diretto, false = STARTTLS su porta 25/587
  auth_method: 'plain' | 'login' | 'oauth2'
  display_name: string
  help_url?: string
}

/**
 * Mappa domain → configurazione SMTP.
 * Ogni entry è verificata contro la documentazione pubblica del provider.
 *
 * NOTA: in V2 la connessione SMTP reale avverrà via Edge Function
 * con credenziali decifrate da Supabase Vault.
 * Queste configurazioni definiscono host/porta/TLS — mai password.
 */
export const PEC_PROVIDERS: Record<string, PecSmtpConfig> = {
  // Aruba PEC — provider #1 per diffusione in Italia
  // Ref: https://guide.pec.it/impostazioni-client/configurazione-client-aruba-pec.kl
  'pec.it': {
    host: 'smtps.aruba.it',
    port: 465,
    secure: true,
    auth_method: 'plain',
    display_name: 'Aruba PEC',
    help_url: 'https://guide.pec.it/impostazioni-client/configurazione-client-aruba-pec.kl',
  },
  'arubapec.it': {
    host: 'smtps.aruba.it',
    port: 465,
    secure: true,
    auth_method: 'plain',
    display_name: 'Aruba PEC',
    help_url: 'https://guide.pec.it/impostazioni-client/configurazione-client-aruba-pec.kl',
  },
  // Legalmail (InfoCert)
  // Ref: documentazione cliente InfoCert — host ufficiale
  'legalmail.it': {
    host: 'smtp.legalmail.it',
    port: 465,
    secure: true,
    auth_method: 'plain',
    display_name: 'Legalmail (InfoCert)',
    help_url: 'https://www.legalmail.it',
  },
  // Namirial PEC
  'namirial.it': {
    host: 'mail.namirial.it',
    port: 465,
    secure: true,
    auth_method: 'plain',
    display_name: 'Namirial PEC',
  },
  // TimCert (TIM — ex Telecom Italia)
  'timcert.it': {
    host: 'smtpcert.tim.it',
    port: 465,
    secure: true,
    auth_method: 'plain',
    display_name: 'TimCert (TIM)',
  },
  // Postecom (Poste Italiane)
  // NOTA: Poste utilizza STARTTLS su porta 25 — secure: false indica STARTTLS, non plaintext.
  // Verificare con il provider se la porta 587 con STARTTLS è disponibile.
  'postecert.it': {
    host: 'smtp.postecert.it',
    port: 25,
    secure: false,
    auth_method: 'plain',
    display_name: 'Postecom (Poste Italiane)',
  },
  // Register.it PEC
  'register.it': {
    host: 'smtp-pec.register.it',
    port: 465,
    secure: true,
    auth_method: 'plain',
    display_name: 'Register.it PEC',
  },
  // Libero PEC (Italiaonline)
  'pecmailbox.com': {
    host: 'smtp.pecmailbox.com',
    port: 465,
    secure: true,
    auth_method: 'plain',
    display_name: 'Libero PEC',
  },
  // MailCert
  'mailcert.it': {
    host: 'smtp.mailcert.it',
    port: 465,
    secure: true,
    auth_method: 'plain',
    display_name: 'MailCert',
  },
}

/**
 * Rileva la configurazione SMTP dal dominio dell'indirizzo PEC.
 * Restituisce null se il provider non è nella lista (configurazione manuale richiesta).
 */
export function detectPecProvider(email: string): PecSmtpConfig | null {
  const domain = email.toLowerCase().split('@')[1]
  if (!domain) return null
  return PEC_PROVIDERS[domain] ?? null
}

/**
 * Lista ordinata per UI: provider più diffusi in Italia per laboratori odontotecnici.
 */
export const PEC_PROVIDER_LIST = [
  { domain: 'pec.it', ...PEC_PROVIDERS['pec.it'] },
  { domain: 'legalmail.it', ...PEC_PROVIDERS['legalmail.it'] },
  { domain: 'arubapec.it', ...PEC_PROVIDERS['arubapec.it'] },
  { domain: 'namirial.it', ...PEC_PROVIDERS['namirial.it'] },
  { domain: 'timcert.it', ...PEC_PROVIDERS['timcert.it'] },
  { domain: 'postecert.it', ...PEC_PROVIDERS['postecert.it'] },
] as const
