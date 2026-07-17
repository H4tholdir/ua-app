// src/lib/portale/guardie.ts
// Risoluzione del cliente dal token per le route ECONOMICHE del portale.
// F13: la risposta per token invalido/scaduto/inesistente è sempre la stessa
// (401 uniforme, mappata dal chiamante) — niente oracolo di esistenza.
import type { getServiceClient } from '@/lib/supabase/server-service'
import { NextResponse } from 'next/server'
import { verificaSessioneEconomica, estraiCookie, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { getLabGuardMode } from '@/lib/supabase/lab-guard'

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

// N13: estrae lo stato lab dall'embed `laboratori(stato)`. Il typegen tipizza
// l'embed to-one come array mentre PostgREST a runtime ritorna l'oggetto
// (verificato sull'istanza reale il 17/07/2026) — si gestiscono entrambe le
// forme per robustezza. null = embed assente (fail-closed a carico del chiamante).
export function statoLabDaEmbed(value: unknown): string | null {
  const v = Array.isArray(value) ? value[0] : value
  const stato = (v as { stato?: unknown } | null | undefined)?.stato
  return typeof stato === 'string' ? stato : null
}

// N13: true se il portale del lab deve "sparire" per i terzi (blacklist o
// embed assente = fail-closed). Rispetta il rollout della guard: in shadow
// logga soltanto (would-block) e lascia passare; il kill-switch env vale
// anche qui. Il blocco reale parte col flip a 'enforce'.
export function portaleNonDisponibile(labStato: string | null, contesto: string): boolean {
  const bloccherebbe = labStato === null || labStato === 'blacklist'
  if (!bloccherebbe) return false
  const mode = getLabGuardMode()
  if (mode === 'enforce') return true
  if (mode === 'shadow') {
    console.warn(`[portale-guard] would-block ${JSON.stringify({ contesto, labStato })}`)
  }
  return false
}

export async function risolviClientePortale(
  svc: Svc, token: string,
): Promise<
  | { esito: 'ok'; cliente: ClientePortale }
  | { esito: 'non_autorizzato' }
  | { esito: 'non_disponibile' }
  | { esito: 'errore' }
> {
  const { data, error } = await svc
    .from('clienti')
    .select('id, laboratorio_id, studio_nome, portale_token_scade_at, portale_fatturazione_attiva, portale_pin_hash, portale_pin_tentativi, portale_pin_bloccato_fino_a, portale_pin_generation, laboratori(stato)')
    .eq('portale_token', token)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    console.error('[portale guardie] risoluzione token:', error.message)
    return { esito: 'errore' }
  }
  if (!data) return { esito: 'non_autorizzato' }
  // N13: lab blacklist → il portale sparisce per i terzi (404 generico dal
  // chiamante, no info-leak) — PRIMA del check scadenza, così anche un token
  // scaduto di un lab blacklist risponde come risorsa inesistente.
  // sospeso/scaduto restano leggibili (diritto di terzi sui propri documenti
  // fiscali — decisione ratificata 17/07/2026).
  if (portaleNonDisponibile(statoLabDaEmbed(data.laboratori), 'risolviClientePortale')) {
    return { esito: 'non_disponibile' }
  }
  if (data.portale_token_scade_at && new Date(data.portale_token_scade_at).getTime() < Date.now()) {
    return { esito: 'non_autorizzato' }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omissione intenzionale dei campi dallo spread
  const { portale_token_scade_at: _scade, laboratori: _lab, ...cliente } = data
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
  if (ris.esito === 'non_disponibile') {
    // N13: lab blacklist — stessa forma di una risorsa inesistente
    return { ok: false, res: NextResponse.json({ errore: 'non_trovato' }, { status: 404 }) }
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
