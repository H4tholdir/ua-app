// src/lib/portale/guardie.ts
// Risoluzione del cliente dal token per le route ECONOMICHE del portale.
// F13: la risposta per token invalido/scaduto/inesistente è sempre la stessa
// (401 uniforme, mappata dal chiamante) — niente oracolo di esistenza.
import type { getServiceClient } from '@/lib/supabase/server-service'
import { NextResponse } from 'next/server'
import { verificaSessioneEconomica, estraiCookie, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'

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

/** Guardie comuni delle route economiche: token (401 uniforme) + interruttore + sessione. */
export async function guardieEconomiche(
  svc: Svc, req: Request, token: string,
): Promise<{ ok: true; cliente: ClientePortale } | { ok: false; res: NextResponse }> {
  const ris = await risolviClientePortale(svc, token)
  if (ris.esito === 'errore') {
    return { ok: false, res: NextResponse.json({ errore: 'errore_interno' }, { status: 500 }) }
  }
  if (ris.esito === 'non_autorizzato') {
    return { ok: false, res: NextResponse.json({ errore: 'non_autorizzato' }, { status: 401 }) }
  }
  if (!ris.cliente.portale_fatturazione_attiva) {
    return { ok: false, res: NextResponse.json({ errore: 'sezione_disattivata' }, { status: 403 }) }
  }
  const cookie = estraiCookie(req.headers.get('cookie'), SESSIONE_ECONOMICA_COOKIE)
  if (!verificaSessioneEconomica(cookie, { clienteId: ris.cliente.id, pinGeneration: ris.cliente.portale_pin_generation })) {
    return { ok: false, res: NextResponse.json({ errore: 'sessione_scaduta' }, { status: 401 }) }
  }
  return { ok: true, cliente: ris.cliente }
}
