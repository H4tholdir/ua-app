import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

// Tipi allineati allo schema DB: incidenti_mdr.tipo CHECK
const VALID_TIPI = ['anomalia', 'incidente', 'incidente_grave', 'azione_correttiva_sicurezza'] as const
const VALID_GRAVITA = ['lieve', 'moderata', 'grave', 'critica'] as const

// GET /api/qualita/incidenti
// Lista incidenti MDR, ordine data_evento DESC, max 50
export async function GET() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const { data, error } = await svc
    .from('incidenti_mdr')
    .select('id, tipo, gravita, data_evento, descrizione, risolto, segnalato_ministero')
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .order('data_evento', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ incidenti: data ?? [] })
}

// POST /api/qualita/incidenti
// Crea un nuovo incidente MDR
export async function POST(req: Request) {
  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Validazione campi obbligatori
  if (!body.tipo || !VALID_TIPI.includes(body.tipo as typeof VALID_TIPI[number])) {
    return NextResponse.json({ error: 'Campo "tipo" non valido' }, { status: 422 })
  }
  if (!body.gravita || !VALID_GRAVITA.includes(body.gravita as typeof VALID_GRAVITA[number])) {
    return NextResponse.json({ error: 'Campo "gravita" non valido' }, { status: 422 })
  }
  if (!body.data_evento || typeof body.data_evento !== 'string') {
    return NextResponse.json({ error: 'Campo "data_evento" obbligatorio' }, { status: 422 })
  }
  if (!body.descrizione || typeof body.descrizione !== 'string' || !body.descrizione.trim()) {
    return NextResponse.json({ error: 'Campo "descrizione" obbligatorio' }, { status: 422 })
  }

  const insertData = {
    laboratorio_id: utente.laboratorio_id,
    tipo: body.tipo,
    gravita: body.gravita,
    data_evento: body.data_evento,
    descrizione: (body.descrizione as string).trim(),
    causa_probabile: body.causa_probabile ?? null,
    azione_immediata: body.azione_immediata ?? null,
    azione_correttiva: body.azione_correttiva ?? null,
    risolto: body.risolto ?? false,
    data_risoluzione: body.data_risoluzione ?? null,
    segnalato_ministero: body.segnalato_ministero ?? false,
    data_segnalazione: body.data_segnalazione ?? null,
    lavoro_id: body.lavoro_id ?? null,
  }

  const { data: incidente, error: insertError } = await svc
    .from('incidenti_mdr')
    .insert(insertData)
    .select('id, tipo, gravita, data_evento, descrizione')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Alert per incidenti gravi/critici
  if (body.gravita === 'grave' || body.gravita === 'critica') {
    console.warn('[MDR ALERT] Incidente grave/critico:', incidente.id)
    // TODO Fase 3: notifica push al titolare
  }

  return NextResponse.json({ incidente }, { status: 201 })
}
