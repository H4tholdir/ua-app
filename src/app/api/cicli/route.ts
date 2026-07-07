import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { pgrestQuote } from '@/lib/utils/escape-postgrest'
import { isSameOrigin } from '@/lib/utils/csrf'
import { TIPO_DISPOSITIVO_CICLO_OPTIONS, CLASSE_RISCHIO_CICLO_OPTIONS } from '@/lib/domain/cicli-produzione'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const id = searchParams.get('id')?.trim() ?? ''

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (utenteError) {
    return NextResponse.json({ error: 'Errore nel recupero del laboratorio' }, { status: 500 })
  }
  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = utente.laboratorio_id

  let query = svc
    .from('cicli_produzione')
    .select('id, codice, nome, tipo_dispositivo')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .order('codice', { ascending: true })
    .limit(8)

  // Lookup by id — usato da CicloComboBox per idratare la label a partire da
  // un ciclo_id già salvato (es. apertura di un lavoro esistente). Stessa
  // allowlist tenant (laboratorio_id) della ricerca testuale.
  if (id) {
    query = query.eq('id', id)
  } else if (q) {
    const pattern = pgrestQuote(`%${q}%`)
    query = query.eq('attivo', true).or(`codice.ilike.${pattern},nome.ilike.${pattern}`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei cicli' }, { status: 500 })
  }

  return NextResponse.json({ cicli: data ?? [] })
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (utenteError) {
    return NextResponse.json({ error: 'Errore nel recupero del laboratorio' }, { status: 500 })
  }
  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = utente.laboratorio_id

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
  const codice = typeof body.codice === 'string' ? body.codice.trim() : ''
  const tipoDispositivo = typeof body.tipo_dispositivo === 'string' ? body.tipo_dispositivo.trim() : ''
  const classeRischio = body.classe_rischio == null || body.classe_rischio === '' ? null : body.classe_rischio

  if (!nome) {
    return NextResponse.json({ error: 'Il campo "nome" è obbligatorio' }, { status: 400 })
  }
  if (!codice) {
    return NextResponse.json({ error: 'Il campo "codice" è obbligatorio' }, { status: 400 })
  }
  if (!tipoDispositivo) {
    return NextResponse.json({ error: 'Il campo "tipo_dispositivo" è obbligatorio' }, { status: 400 })
  }
  if (!(TIPO_DISPOSITIVO_CICLO_OPTIONS as readonly string[]).includes(tipoDispositivo)) {
    return NextResponse.json({ error: 'Tipo dispositivo non valido' }, { status: 400 })
  }
  if (classeRischio != null && !(CLASSE_RISCHIO_CICLO_OPTIONS as readonly string[]).includes(classeRischio as string)) {
    return NextResponse.json({ error: 'Classe di rischio non valida' }, { status: 400 })
  }

  const { data: ciclo, error: insertError } = await svc
    .from('cicli_produzione')
    .insert({
      laboratorio_id: labId,
      nome,
      codice,
      tipo_dispositivo: tipoDispositivo,
      classe_rischio: classeRischio,
      created_by: user.id,
      updated_by: user.id,
      attivo: true,
    })
    .select('id, codice, nome, tipo_dispositivo, classe_rischio')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Esiste già un ciclo con questo codice in questo laboratorio' }, { status: 409 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ciclo }, { status: 201 })
}
