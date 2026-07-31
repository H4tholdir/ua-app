import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { ilikeLiterale, pgrestQuote } from '@/lib/utils/escape-postgrest'

/** I campi che questo ELENCO può mostrare. Vive in un posto solo perché serve
 *  due volte — per chiedere al database e per rispondere al browser — e due
 *  copie divergerebbero.
 *  🛑 `portale_token` NON è qui, e non ci torna: v. il commento in `select`. */
const CAMPI_ELENCO = [
  'id', 'studio_nome', 'nome', 'cognome', 'telefono', 'email', 'citta', 'provincia',
  'partita_iva', 'codice_fiscale', 'codice_sdi', 'pec', 'listino_numero',
  'sconto_percentuale', 'note',
] as const

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }
    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard
    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    let query = svc
      .from('clienti')
      // 🔒 TOK-1 (D53) — `portale_token` NON esce da qui, ed è una scelta di
      //    sicurezza, non una pulizia: quel token apre DA SOLO, senza PIN, le
      //    URL firmate della dichiarazione di conformità e del buono di
      //    lavorazione (`api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts:19-45`
      //    — il PIN protegge le sole rotte economiche). Questo è un elenco di
      //    RICERCA: metterlo qui lo consegnava al browser di OGNI utente
      //    autenticato del laboratorio, dove sopravvive all'uscita del
      //    dipendente.
      // 🔑 Chi ne ha bisogno è la scheda del singolo cliente
      //    (`(app)/clienti/[id]/page.tsx:235`, i tasti del portale), che lo
      //    legge per conto suo lato server. Nessun consumatore di QUESTA
      //    rotta lo usava (`provato:` grep su `src/components/**`: zero usi).
      .select(CAMPI_ELENCO.join(', '))
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
      .limit(500)

    if (q) {
      // 🔒 CLI-1 (D48) — ORDINE NON OPINABILE: si rende letterale il termine,
      //    POI si incornicia in `%…%`, POI si quota per PostgREST. Senza il
      //    primo passo un `%` digitato nella casella fa combaciare l'elenco
      //    intero e un `_` combacia con qualunque carattere: la ricerca
      //    smette di cercare. `pgrestQuote` difende la SINTASSI del filtro,
      //    `ilikeLiterale` la SEMANTICA del pattern — servono entrambe.
      const pattern = pgrestQuote(`%${ilikeLiterale(q)}%`)
      query = query.or(`cognome.ilike.${pattern},nome.ilike.${pattern},studio_nome.ilike.${pattern}`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 🔒 TOK-1, seconda fonte: si risponde SOLO coi campi dichiarati, non con
    //    ciò che il database ha restituito. La proiezione da sola non basta —
    //    una vista, un trigger, o un `select('*')` rimesso qui un domani
    //    reintrodurrebbero il token IN SILENZIO. Allowlist, mai blocklist:
    //    è la stessa regola delle PATCH di risorsa (§9 di `ua-app/CLAUDE.md`).
    const clienti = (data ?? []).map((riga) =>
      Object.fromEntries(CAMPI_ELENCO.map((campo) => [campo, (riga as unknown as Record<string, unknown>)[campo]])),
    )
    return NextResponse.json({ clienti })
  })
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard
  const svc = getServiceClient()

  const labId: string = context.laboratorioId

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Validazione campi obbligatori
  if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ error: 'Il campo "nome" è obbligatorio' }, { status: 422 })
  }
  if (!body.cognome || typeof body.cognome !== 'string' || !body.cognome.trim()) {
    return NextResponse.json({ error: 'Il campo "cognome" è obbligatorio' }, { status: 422 })
  }

  const insertData = {
    laboratorio_id: labId,
    nome: (body.nome as string).trim(),
    cognome: (body.cognome as string).trim(),
    studio_nome: body.studio_nome ?? null,
    telefono: body.telefono ?? null,
    email: body.email ?? null,
    partita_iva: body.partita_iva ?? null,
    codice_fiscale: body.codice_fiscale ?? null,
    codice_sdi: body.codice_sdi ?? null,
    pec: body.pec ?? null,
    indirizzo: body.indirizzo ?? null,
    cap: body.cap ?? null,
    citta: body.citta ?? null,
    provincia: body.provincia ?? null,
    paese: (body.paese as string) ?? 'IT',
    listino_numero: body.listino_numero ?? 1,
    sconto_percentuale: body.sconto_percentuale ?? 0,
    tecnico_default_id: body.tecnico_default_id ?? null,
    modalita_pagamento: body.modalita_pagamento ?? null,
    non_soggetto_fe: body.non_soggetto_fe ?? false,
    note: body.note ?? null,
  }

  const { data: cliente, error: insertError } = await svc
    .from('clienti')
    .insert(insertData)
    .select('id, nome, cognome, studio_nome')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ cliente }, { status: 201 })
}
