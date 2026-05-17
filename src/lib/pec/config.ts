// src/lib/pec/config.ts
// Gestione configurazione PEC per laboratorio.
//
// V1: salva email + flag pec_smtp_configurata in tabella laboratori.
//     La password NON viene persistita in questo layer — viene gestita
//     dalla route /api/pec/config che in V2 scrive in Supabase Vault
//     (pgsodium vault.secrets) e aggiorna pec_vault_key_id.
//
// V2: Edge Function cifra la password con pgsodium, restituisce
//     vault_key_id → salvato in laboratori.pec_vault_key_id.

import type { SupabaseClient } from '@supabase/supabase-js'
import { detectPecProvider, type PecSmtpConfig } from './providers'

export interface PecConfigSave {
  email: string
  // Override manuali opzionali — usati se il provider non viene rilevato automaticamente
  smtp_host?: string
  smtp_port?: number
  smtp_secure?: boolean
}

export interface PecConfigRead {
  email: string
  provider_display: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  configurata: boolean
  // null = non ancora testata, true/false = risultato ultimo test
  testata_ok: boolean | null
}

/**
 * Salva la configurazione PEC del laboratorio (email + SMTP metadata).
 * La password non transita né viene persistita qui.
 * Viene gestita separatamente dalla route /api/pec/config.
 */
export async function savePecConfig(
  svc: SupabaseClient,
  labId: string,
  config: PecConfigSave
): Promise<{ ok: boolean; error?: string; smtpConfig?: PecSmtpConfig }> {
  const detected = detectPecProvider(config.email)

  const smtpHost = config.smtp_host ?? detected?.host
  const smtpPort = config.smtp_port ?? detected?.port

  if (!smtpHost || smtpPort === undefined) {
    return {
      ok: false,
      error:
        'Provider PEC non riconosciuto. Inserisci manualmente host e porta SMTP.',
    }
  }

  const { error } = await svc
    .from('laboratori')
    .update({
      pec: config.email,
      pec_smtp_configurata: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', labId)

  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    smtpConfig: detected ?? undefined,
  }
}

/**
 * Legge la configurazione PEC corrente del laboratorio (dati pubblici, no password).
 */
export async function getPecConfig(
  svc: SupabaseClient,
  labId: string
): Promise<PecConfigRead | null> {
  const { data, error } = await svc
    .from('laboratori')
    .select('pec, pec_smtp_configurata')
    .eq('id', labId)
    .single()

  if (error || !data) return null

  const email = (data.pec as string | null) ?? ''
  const detected = detectPecProvider(email)
  const configurata = (data.pec_smtp_configurata as boolean | null) ?? false

  return {
    email,
    provider_display: detected?.display_name ?? 'Configurazione manuale',
    smtp_host: detected?.host ?? '',
    smtp_port: detected?.port ?? 465,
    smtp_secure: detected?.secure ?? true,
    configurata,
    testata_ok: null,
  }
}
