// src/lib/portale/audit.ts
// Writer unico di portale_accessi (spec §4, audit F9/I-3).
// Gli eventi economici NON vengono ingoiati in silenzio: il chiamante
// controlla il boolean di ritorno e risponde 500 se false (fail-loud).
import type { getServiceClient } from '@/lib/supabase/server-service'

type Svc = ReturnType<typeof getServiceClient>

export type AzionePortale =
  | 'view_lavori' | 'download_ddc' | 'download_buono'
  | 'view_fatturazione' | 'lista_stampata' | 'proposta_fatturazione'
  | 'view_fatture' | 'download_fattura'
  | 'view_situazione'
  | 'pin_ok' | 'pin_errato' | 'pin_bloccato'
  | 'pin_impostato' | 'pin_reimpostato'
  | 'interruttore_on' | 'interruttore_off'
  | 'link_rigenerato'

export function ipDaRequest(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd ? fwd.split(',')[0].trim() : null
}

export async function logPortaleAudit(
  svc: Svc,
  entry: {
    laboratorio_id: string
    cliente_id: string
    azione: AzionePortale
    lavoro_id?: string | null
    dettaglio?: Record<string, unknown> | null
    req?: Request
  },
): Promise<boolean> {
  const { error } = await svc.from('portale_accessi').insert({
    laboratorio_id: entry.laboratorio_id,
    cliente_id: entry.cliente_id,
    azione: entry.azione,
    lavoro_id: entry.lavoro_id ?? null,
    dettaglio: entry.dettaglio ?? null,
    ip_address: entry.req ? ipDaRequest(entry.req) : null,
    user_agent: entry.req ? entry.req.headers.get('user-agent') : null,
  })
  if (error) {
    console.error('[portale audit] insert fallito:', error.message)
    return false
  }
  return true
}
