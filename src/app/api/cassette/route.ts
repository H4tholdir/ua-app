import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'

// NB (correzioni 21/07 del brief Task 4): NESSUNA scrittura diretta su `cassette`.
// `service_role` ha SOLO SELECT su quella tabella (REVOKE ALL + GRANT SELECT,
// 20260721090000_parete_cassette.sql:148-150) — creazione, rinomina, colore ed
// eliminazione passano TUTTE dalle RPC SECURITY DEFINER di quella migration e di
// 20260721090300_cassette_crea_colore.sql. Un .insert()/.update() diretto qui
// darebbe 42501 in produzione.

const COLORI = new Set(['bianca', 'azzurra', 'rossa', 'blu', 'verde', 'grigia'])
const HEX_RE = /^#[0-9a-fA-F]{6}$/

/** Normalizza in route (R-5): l'hex va MAIUSCOLO perché il CHECK di tabella vuole A-F.
 *  Un colore non normalizzato che arriva alla RPC fa RAISE, cioè un 400/P0001 —
 *  non un esito (verificato sul DB live, task-4a-report.md Appendice 2). */
export function normalizzaColore(input: unknown): string | null {
  if (input == null) return 'bianca'
  if (typeof input !== 'string') return null
  if (COLORI.has(input)) return input
  if (HEX_RE.test(input)) return input.toUpperCase()
  return null
}

type CassettaCreata = { id: string; nome: string; colore: string; posizione: number }
type EsitoCrea =
  | { esito: 'ok'; cassetta: CassettaCreata }
  | { esito: 'nome_occupato'; nome: string | null }
  | { esito: 'nome_non_valido' }

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'origin' }, { status: 403 })
  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'auth' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'lab' }, { status: 403 })
  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard
  const labId: string = context.laboratorioId

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const colore = normalizzaColore(body.colore)
  if (!colore) return NextResponse.json({ errore: 'colore_non_valido' }, { status: 422 })

  const nome: string | null = typeof body.nome === 'string' ? body.nome.trim() : null
  if (nome !== null && (nome.length < 1 || nome.length > 20)) {
    return NextResponse.json({ errore: 'nome_non_valido' }, { status: 422 })
  }

  const svc = getServiceClient()
  const chiama = () => svc.rpc('cassetta_crea_atomica', {
    p_lab: labId, p_nome: nome, p_colore: colore,
  })

  let { data, error } = await callRpcWithRetry(chiama)
  // Correzione 8: col nome AUTOMATICO, `nome_occupato` non è colpa dell'utente — non ha
  // digitato niente. È il fallthrough dei 5 giri interni alla RPC, misurato al 2,6% con 16
  // sessioni concorrenti (task-4a-report.md §4 riserva 1). Si ritenta una volta; solo se
  // ricapita diventa un 409. NON è coperto da callRpcWithRetry: quello ritenta solo su
  // error.code === '40P01', mentre questo è un esito valido con error: null.
  if (!error && nome === null && (data as EsitoCrea | null)?.esito === 'nome_occupato') {
    ({ data, error } = await callRpcWithRetry(chiama))
  }
  if (error) return NextResponse.json({ errore: 'creazione_fallita' }, { status: 500 })

  const esito = data as EsitoCrea
  if (esito.esito === 'nome_occupato') {
    return NextResponse.json({ errore: 'nome_occupato', nome: esito.nome }, { status: 409 })
  }
  if (esito.esito === 'nome_non_valido') {
    return NextResponse.json({ errore: 'nome_non_valido' }, { status: 422 })
  }
  return NextResponse.json({ cassetta: esito.cassetta }, { status: 201 })
}
