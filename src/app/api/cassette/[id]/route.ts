import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
import { normalizzaColore } from '@/lib/cassette/colore'

// NB (correzioni 21/07 del brief Task 4, stesse di ../route.ts): NESSUNA scrittura diretta
// su `cassette` — `service_role` ha SOLO SELECT. Rinomina, colore ed eliminazione passano
// tutte dalle RPC SECURITY DEFINER (20260721090000_parete_cassette.sql +
// 20260721090300_cassette_crea_colore.sql).

type RouteContext = { params: Promise<{ id: string }> }

// Forma UUID canonica: stesso pattern e stesso motivo di `cassette/riordino/route.ts:9-25`
// e `lavori/[id]/cassetta/route.ts:15` — un `id` malformato (es. "pippo") farebbe fallire il
// cast Postgres `uuid` con un errore di tipo (22P02, → 500) invece del 404 dovuto su tutti e
// tre i rami (PATCH nome, PATCH colore, DELETE) — review Minor #1.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

// Tipi VOLUTAMENTE larghi (non union discriminate chiuse), come in ../route.ts: un esito
// futuro non ancora gestito qui deve cadere nel fallback 500 esplicito in fondo a ciascun
// ramo, non in un "ok" implicito (review Minor #4).
type EsitoRinomina = { esito?: string }
type EsitoColore = { esito?: string; colore?: string }
type EsitoElimina = { esito?: string }

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

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ errore: 'cassetta_id_non_valido' }, { status: 404 })
  }

  // `req.json()` risolve `null` per un body JSON letterale `null` SENZA lanciare (review
  // Minor #2) — `?? {}` evita un TypeError su `hasOwnProperty.call(null, ...)` più sotto.
  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
  const hasNome = Object.prototype.hasOwnProperty.call(body, 'nome')
  const hasColore = Object.prototype.hasOwnProperty.call(body, 'colore')
  if (hasNome === hasColore) {
    // entrambi presenti o nessuno dei due → 422, nessuna RPC chiamata (correzione 4)
    return NextResponse.json({ errore: 'campi_non_validi' }, { status: 422 })
  }

  const svc = getServiceClient()

  if (hasNome) {
    if (typeof body.nome !== 'string') {
      return NextResponse.json({ errore: 'nome_non_valido' }, { status: 422 })
    }
    const { data, error } = await callRpcWithRetry(() =>
      svc.rpc('cassetta_rinomina_atomica', { p_lab: labId, p_cassetta_id: id, p_nome: body.nome })
    )
    if (error) {
      console.error('[PATCH /api/cassette/[id]] cassetta_rinomina_atomica fallita:', error)
      return NextResponse.json({ errore: 'rinomina_fallita' }, { status: 500 })
    }
    const esito = data as EsitoRinomina | null
    if (esito?.esito === 'nome_occupato') return NextResponse.json({ errore: 'nome_occupato' }, { status: 409 })
    if (esito?.esito === 'cassetta_non_trovata') return NextResponse.json({ errore: 'cassetta_non_trovata' }, { status: 404 })
    if (esito?.esito === 'nome_non_valido') return NextResponse.json({ errore: 'nome_non_valido' }, { status: 422 })
    if (esito?.esito === 'ok') return NextResponse.json({ esito: 'ok' })
    return NextResponse.json({ error: 'Esito inatteso dalla RPC cassetta_rinomina_atomica' }, { status: 500 })
  }

  // {colore}: un valore `null` esplicito NON significa "default bianca" come in POST — il
  // campo è PRESENTE, quindi un null è input malformato, non un'omissione (review Minor #3,
  // coerente col ramo `nome` sopra dove un null fa 422). Si richiede una stringa PRIMA di
  // passare a normalizzaColore, che altrimenti tratterebbe `null` come "non specificato" e
  // produrrebbe 'bianca' senza che l'utente l'abbia scelto.
  if (typeof body.colore !== 'string') {
    return NextResponse.json({ errore: 'colore_non_valido' }, { status: 422 })
  }
  const colore = normalizzaColore(body.colore)
  if (!colore) return NextResponse.json({ errore: 'colore_non_valido' }, { status: 422 })

  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('cassetta_imposta_colore_atomica', { p_lab: labId, p_cassetta_id: id, p_colore: colore })
  )
  if (error) {
    console.error('[PATCH /api/cassette/[id]] cassetta_imposta_colore_atomica fallita:', error)
    return NextResponse.json({ errore: 'colore_fallito' }, { status: 500 })
  }
  const esito = data as EsitoColore | null
  if (esito?.esito === 'cassetta_non_trovata') return NextResponse.json({ errore: 'cassetta_non_trovata' }, { status: 404 })
  if (esito?.esito === 'ok') {
    // La RPC NON tocca updated_at (R-4.2, ratificata): non "ripararlo" qui.
    return NextResponse.json({ esito: 'ok', colore: esito.colore })
  }
  return NextResponse.json({ error: 'Esito inatteso dalla RPC cassetta_imposta_colore_atomica' }, { status: 500 })
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

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ errore: 'cassetta_id_non_valido' }, { status: 404 })
  }

  const svc = getServiceClient()
  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('cassetta_elimina_atomica', { p_lab: labId, p_cassetta_id: id })
  )
  if (error) {
    console.error('[DELETE /api/cassette/[id]] cassetta_elimina_atomica fallita:', error)
    return NextResponse.json({ errore: 'eliminazione_fallita' }, { status: 500 })
  }
  const esito = data as EsitoElimina | null
  if (esito?.esito === 'occupata') return NextResponse.json({ errore: 'occupata' }, { status: 409 })
  if (esito?.esito === 'cassetta_non_trovata') return NextResponse.json({ errore: 'cassetta_non_trovata' }, { status: 404 })
  if (esito?.esito === 'ok') return NextResponse.json({ esito: 'ok' })
  return NextResponse.json({ error: 'Esito inatteso dalla RPC cassetta_elimina_atomica' }, { status: 500 })
}
