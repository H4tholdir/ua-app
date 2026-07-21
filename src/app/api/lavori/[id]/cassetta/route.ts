import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { isSameOrigin } from '@/lib/utils/csrf'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'

type RouteContext = { params: Promise<{ id: string }> }

const NOME_MIN = 1
const NOME_MAX = 20
// Forma UUID canonica (qualunque versione/variante RFC4122): sufficiente a
// scartare PRIMA della RPC un valore che farebbe fallire il cast Postgres
// `uuid` con un errore di tipo invece di un esito di dominio (review Minor #1).
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

type ParsedBody = { ok: true; body: Record<string, unknown> | null } | { ok: false }

/**
 * Legge il body distinguendo TRE casi (review Important #1 — prima di questo
 * fix qualunque payload non riconosciuto cadeva silenziosamente nel ramo di
 * liberazione, rispondendo 200 all'esatto opposto di quanto il chiamante
 * intendeva): corpo assente/vuoto e JSON letterale `null` sono lo STESSO
 * segnale — liberazione manuale, contratto esplicito del brief («null (o {})
 * = liberazione manuale»). Un JSON presente ma sintatticamente non valido, o
 * un primitivo/array al livello radice, è invece un errore di richiesta (400):
 * NON va confuso con l'intento di liberare la cassetta solo perché anche lì
 * `req.json()` avrebbe fallito.
 */
async function parseBody(req: Request): Promise<ParsedBody> {
  const raw = await req.text()
  if (raw.trim().length === 0) return { ok: true, body: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false }
  }
  if (parsed === null) return { ok: true, body: null }
  if (typeof parsed === 'object' && !Array.isArray(parsed)) {
    return { ok: true, body: parsed as Record<string, unknown> }
  }
  return { ok: false }
}

/**
 * Assegnazione/liberazione della cassetta di un lavoro (spec parete-cassette §10),
 * sostituisce il PATCH diretto di `numero_cassetta` (vedi sentinella su
 * `PATCHABLE_FIELDS`, `src/app/api/lavori/[id]/route.ts`).
 *
 * Body: `{cassetta_id}` (aggancio a cassetta esistente) | `{nome}` (get-or-create
 * race-safe, delegata alla RPC) | `null`/`{}` letterali (liberazione manuale).
 * La scelta fra i rami si decide sulla PRESENZA della chiave (`hasOwnProperty`),
 * non sulla verità del valore derivato: un `cassetta_id`/`nome` presente ma di
 * tipo sbagliato o vuoto dopo il trim è un 422, MAI un fallback silenzioso a
 * libera (review Important #1). Libera SOLO `null` o un oggetto VUOTO: un
 * oggetto non vuoto che non contiene né `cassetta_id` né `nome` (chiavi
 * estranee, un refuso tipo `cassettaId` in camelCase) è anch'esso un 422
 * `corpo_non_riconosciuto` — stessa classe di bug di Important #1 con
 * un'altra porta, chiusa esplicitamente invece di lasciarla cadere su libera.
 *
 * ⚠️ Correzione 21/07 #1: `cassetta_assegna_atomica` NON valida più il nome
 * (R-5 ha tolto `nome_non_valido` dai suoi esiti: un nome fuori range torna
 * `cassetta_non_trovata`, che questa route mappa su 404). Senza una validazione
 * qui PRIMA della RPC, un nome di 25 caratteri leggerebbe «cassetta non
 * trovata» — una bugia. Si valida quindi `1 ≤ len(trim(nome)) ≤ 20` in route e
 * si risponde 422 PRIMA di chiamare la RPC: ogni `cassetta_non_trovata` che
 * arriva dalla RPC dopo questa guardia è quindi SEMPRE un problema di
 * `cassetta_id` (assente/di altro lab/eliminata), mai di nome → 404 corretto.
 * Stessa logica per `cassetta_id`: forma UUID validata qui, altrimenti 422
 * `cassetta_id_non_valido` PRIMA della RPC (review Minor #1).
 *
 * `p_colore` non è esposto da questa route (l'interfaccia del body non lo
 * prevede): si passa sempre `null` alla RPC, che applica il default `bianca`
 * solo nel ramo get-or-create per nome. Un domani, se questa route dovesse
 * inoltrare un colore scelto dall'utente, andrebbe validato qui allo stesso
 * modo del nome — `cassetta_assegna_atomica` solleva un RAISE (500) su un
 * colore fuori enum/hex, non un esito di dominio (correzione 21/07 #2).
 */
export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard
  const labId: string = context.laboratorioId

  const svc = getServiceClient()

  // Pre-check di appartenenza al lab (Step 3 del brief): la RPC valida ANCHE
  // stato/soft-delete del lavoro (esito lavoro_non_valido → 422), ma
  // l'esistenza/tenant-scoping si verifica qui, prima di qualunque RPC —
  // stesso principio delle FK cross-tenant di lavori/[id]/route.ts.
  const { data: lavoroRow } = await svc
    .from('lavori')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .single()

  if (!lavoroRow) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  const parsedBody = await parseBody(req)
  if (!parsedBody.ok) {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  const body = parsedBody.body

  const hasCassettaId = body != null && Object.prototype.hasOwnProperty.call(body, 'cassetta_id')
  const hasNome = body != null && Object.prototype.hasOwnProperty.call(body, 'nome')

  let pCassettaId: string | null = null
  let pNome: string | null = null
  let azione: 'assegna' | 'libera' = 'libera'

  if (hasCassettaId) {
    const raw = (body as Record<string, unknown>).cassetta_id
    const trimmed = typeof raw === 'string' ? raw.trim() : ''
    if (typeof raw !== 'string' || trimmed.length === 0 || !UUID_RE.test(trimmed)) {
      return NextResponse.json({ errore: 'cassetta_id_non_valido' }, { status: 422 })
    }
    pCassettaId = trimmed
    azione = 'assegna'
  } else if (hasNome) {
    const raw = (body as Record<string, unknown>).nome
    const trimmed = typeof raw === 'string' ? raw.trim() : ''
    if (typeof raw !== 'string' || trimmed.length < NOME_MIN || trimmed.length > NOME_MAX) {
      return NextResponse.json({ errore: 'nome_non_valido' }, { status: 422 })
    }
    pNome = trimmed
    azione = 'assegna'
  } else if (body != null && Object.keys(body).length > 0) {
    // Review Important #1 (istruzione letterale): libera SOLO su `null` o `{}`
    // letterali. Un oggetto non vuoto che non contiene né `cassetta_id` né
    // `nome` (chiavi estranee, o un refuso tipo `cassettaId` in camelCase) NON
    // deve liberare in silenzio con 200 — è esattamente la stessa classe di
    // bug della review, solo con una porta diversa: si rifiuta esplicitamente.
    return NextResponse.json({ errore: 'corpo_non_riconosciuto' }, { status: 422 })
  }

  if (azione === 'libera') {
    const { data, error } = await callRpcWithRetry(() =>
      svc.rpc('cassetta_libera_atomica', { p_lab: labId, p_lavoro: id, p_motivo: 'manuale' })
    )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const esito = (data as { esito?: string; nome?: string | null } | null)?.esito
    if (esito === 'ok') {
      return NextResponse.json({ esito: 'ok', nome: (data as { nome?: string | null }).nome ?? null })
    }
    // Contratto RPC: unico altro esito è motivo_non_valido, impossibile qui
    // dato che 'manuale' è sempre nell'enum valido (non un input utente).
    return NextResponse.json({ error: 'Esito inatteso dalla RPC cassetta_libera_atomica' }, { status: 500 })
  }

  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('cassetta_assegna_atomica', {
      p_lab: labId,
      p_lavoro: id,
      p_cassetta_id: pCassettaId,
      p_nome: pNome,
      p_colore: null,
    })
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const esito = (data as { esito?: string; nome?: string | null } | null)?.esito

  switch (esito) {
    case 'ok':
      return NextResponse.json({ esito: 'ok', nome: (data as { nome?: string | null }).nome ?? null })
    case 'occupata':
      return NextResponse.json(
        { errore: 'occupata', nome: (data as { nome?: string | null }).nome ?? null },
        { status: 409 }
      )
    case 'cassetta_non_trovata':
      return NextResponse.json({ errore: 'cassetta_non_trovata' }, { status: 404 })
    case 'lavoro_non_valido':
      return NextResponse.json({ errore: 'lavoro_non_valido' }, { status: 422 })
    default:
      return NextResponse.json({ error: 'Esito inatteso dalla RPC cassetta_assegna_atomica' }, { status: 500 })
  }
}
