// src/lib/portale/guardie.ts
// Risoluzione del cliente dal token per le route ECONOMICHE del portale.
// F13: la risposta per token invalido/scaduto/inesistente è sempre la stessa
// (401 uniforme, mappata dal chiamante) — niente oracolo di esistenza.
import type { getServiceClient } from '@/lib/supabase/server-service'

type Svc = ReturnType<typeof getServiceClient>

export type ClientePortale = {
  id: string
  laboratorio_id: string
  studio_nome: string | null
  portale_fatturazione_attiva: boolean
  portale_pin_hash: string | null
  portale_pin_tentativi: number
  portale_pin_bloccato_fino_a: string | null
  portale_pin_generation: number
}

export async function risolviClientePortale(
  svc: Svc, token: string,
): Promise<{ esito: 'ok'; cliente: ClientePortale } | { esito: 'non_autorizzato' } | { esito: 'errore' }> {
  const { data, error } = await svc
    .from('clienti')
    .select('id, laboratorio_id, studio_nome, portale_token_scade_at, portale_fatturazione_attiva, portale_pin_hash, portale_pin_tentativi, portale_pin_bloccato_fino_a, portale_pin_generation')
    .eq('portale_token', token)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    console.error('[portale guardie] risoluzione token:', error.message)
    return { esito: 'errore' }
  }
  if (!data) return { esito: 'non_autorizzato' }
  if (data.portale_token_scade_at && new Date(data.portale_token_scade_at).getTime() < Date.now()) {
    return { esito: 'non_autorizzato' }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omissione intenzionale del campo dallo spread
  const { portale_token_scade_at: _scade, ...cliente } = data
  return { esito: 'ok', cliente }
}
