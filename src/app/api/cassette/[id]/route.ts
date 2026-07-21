import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
import { normalizzaColore } from '../route'

// NB (correzioni 21/07 del brief Task 4, stesse di ../route.ts): NESSUNA scrittura diretta
// su `cassette` — `service_role` ha SOLO SELECT. Rinomina, colore ed eliminazione passano
// tutte dalle RPC SECURITY DEFINER (20260721090000_parete_cassette.sql +
// 20260721090300_cassette_crea_colore.sql).

type RouteContext = { params: Promise<{ id: string }> }

type EsitoRinomina =
  | { esito: 'ok' }
  | { esito: 'nome_occupato' }
  | { esito: 'cassetta_non_trovata' }
  | { esito: 'nome_non_valido' }

type EsitoColore =
  | { esito: 'ok'; colore: string }
  | { esito: 'cassetta_non_trovata' }

type EsitoElimina =
  | { esito: 'ok' }
  | { esito: 'occupata' }
  | { esito: 'cassetta_non_trovata' }

/**
 * PATCH accetta ESATTAMENTE UN campo per chiamata — `{nome}` oppure `{colore}`, mai
 * entrambi (correzione 5/decisione di Francesco del 21/07: una chiamata = una RPC, il
 * vecchio passo doppio non atomico sparisce). Qualsiasi altro campo del body è IGNORATO
 * (allowlist esplicita, mai passthrough).
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'origin' }, { status: 403 })
  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'auth' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'lab' }, { status: 403 })
  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard
  const labId: string = context.laboratorioId

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const hasNome = Object.prototype.hasOwnProperty.call(body, 'nome')
  const hasColore = Object.prototype.hasOwnProperty.call(body, 'colore')
  if (hasNome === hasColore) {
    // entrambi presenti o nessuno dei due → 422, nessuna RPC chiamata (correzione 4)
    return NextResponse.json({ errore: 'un_solo_campo' }, { status: 422 })
  }

  const svc = getServiceClient()

  if (hasNome) {
    if (typeof body.nome !== 'string') {
      return NextResponse.json({ errore: 'nome_non_valido' }, { status: 422 })
    }
    const { data, error } = await callRpcWithRetry(() =>
      svc.rpc('cassetta_rinomina_atomica', { p_lab: labId, p_cassetta_id: id, p_nome: body.nome })
    )
    if (error) return NextResponse.json({ errore: 'rinomina_fallita' }, { status: 500 })
    const esito = data as EsitoRinomina
    if (esito.esito === 'nome_occupato') return NextResponse.json({ errore: 'nome_occupato' }, { status: 409 })
    if (esito.esito === 'cassetta_non_trovata') return NextResponse.json({ errore: 'cassetta_non_trovata' }, { status: 404 })
    if (esito.esito === 'nome_non_valido') return NextResponse.json({ errore: 'nome_non_valido' }, { status: 422 })
    return NextResponse.json({ esito: 'ok' })
  }

  // {colore}: normalizzato PRIMA della RPC (R-5) — 422 se non valido, la RPC non viene chiamata.
  const colore = normalizzaColore(body.colore)
  if (!colore) return NextResponse.json({ errore: 'colore_non_valido' }, { status: 422 })

  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('cassetta_imposta_colore_atomica', { p_lab: labId, p_cassetta_id: id, p_colore: colore })
  )
  if (error) return NextResponse.json({ errore: 'colore_fallito' }, { status: 500 })
  const esito = data as EsitoColore
  if (esito.esito === 'cassetta_non_trovata') return NextResponse.json({ errore: 'cassetta_non_trovata' }, { status: 404 })
  // La RPC NON tocca updated_at (R-4.2, ratificata): non "ripararlo" qui.
  return NextResponse.json({ esito: 'ok', colore: esito.colore })
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'origin' }, { status: 403 })
  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'auth' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'lab' }, { status: 403 })
  const guard = assertLabOperativo(context, 'DELETE')
  if (guard) return guard
  const labId: string = context.laboratorioId

  const svc = getServiceClient()
  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('cassetta_elimina_atomica', { p_lab: labId, p_cassetta_id: id })
  )
  if (error) return NextResponse.json({ errore: 'eliminazione_fallita' }, { status: 500 })
  const esito = data as EsitoElimina
  if (esito.esito === 'occupata') return NextResponse.json({ errore: 'occupata' }, { status: 409 })
  if (esito.esito === 'cassetta_non_trovata') return NextResponse.json({ errore: 'cassetta_non_trovata' }, { status: 404 })
  return NextResponse.json({ esito: 'ok' })
}
