import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { rilevaGruppi } from '@/lib/utils/sorveglianza-postvendita'

// GET /api/qualita/psur
// Lista PSUR/PMS del laboratorio + gruppi-classe rilevati dai lavori esistenti
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
    .from('psur')
    .select(
      'id, anno_riferimento, gruppo_classe, periodo_inizio, periodo_fine, totale_dispositivi, totale_non_conformita, totale_incidenti, totale_reclami, totale_rifacimenti, stato, pdf_url, pdf_sha256, firmato_at, prrc_nome_snapshot, created_at, updated_at'
    )
    .eq('laboratorio_id', utente.laboratorio_id)
    .order('anno_riferimento', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: lavoriClassi, error: lavoriClassiError } = await svc
    .from('lavori')
    .select('classe_rischio')
    .eq('laboratorio_id', utente.laboratorio_id)

  if (lavoriClassiError) {
    return NextResponse.json({ error: lavoriClassiError.message }, { status: 500 })
  }

  const { gruppiRilevati, nonClassificabili } = rilevaGruppi(
    (lavoriClassi ?? []).map((l) => l.classe_rischio as string)
  )

  return NextResponse.json({ psur: data ?? [], gruppiRilevati, nonClassificabili })
}

// POST /api/qualita/psur
// Crea nuovo PSUR per anno, calcolando aggregati automaticamente dal DB
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
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId = utente.laboratorio_id

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // body vuoto accettato — usiamo defaults
  }

  const anno: number =
    typeof body.anno_riferimento === 'number'
      ? body.anno_riferimento
      : new Date().getFullYear() - 1

  // Verifica che non esista già un PSUR per questo anno
  const { data: existing } = await svc
    .from('psur')
    .select('id, stato')
    .eq('laboratorio_id', labId)
    .eq('anno_riferimento', anno)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: `PSUR per l'anno ${anno} gia esistente`, psur: existing },
      { status: 409 }
    )
  }

  const inizio = `${anno}-01-01`
  const fine = `${anno}-12-31`

  // Calcola aggregati in parallelo
  const [disp, nc, inc, rifac] = await Promise.all([
    svc
      .from('lavori')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .not('stato', 'eq', 'annullato')
      .gte('data_consegna_effettiva', inizio)
      .lte('data_consegna_effettiva', fine),
    svc
      .from('lavori_fasi')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .eq('non_conforme', true)
      .gte('created_at', `${inizio}T00:00:00`)
      .lte('created_at', `${fine}T23:59:59`),
    svc
      .from('incidenti_mdr')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .gte('data_evento', inizio)
      .lte('data_evento', fine),
    svc
      .from('lavori')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .eq('is_rifacimento', true)
      .gte('created_at', `${inizio}T00:00:00`)
      .lte('created_at', `${fine}T23:59:59`),
  ])

  // Carica prrc_nome del laboratorio per snapshot
  const { data: lab } = await svc
    .from('laboratori')
    .select('prrc_nome')
    .eq('id', labId)
    .single()

  const insertData = {
    laboratorio_id: labId,
    anno_riferimento: anno,
    periodo_inizio: inizio,
    periodo_fine: fine,
    totale_dispositivi: disp.count ?? 0,
    totale_non_conformita: nc.count ?? 0,
    totale_incidenti: inc.count ?? 0,
    totale_reclami: 0, // Non ancora implementato — nessuna tabella reclami
    totale_rifacimenti: rifac.count ?? 0,
    stato: 'bozza' as const,
    prrc_nome_snapshot: lab?.prrc_nome ?? null,
  }

  const { data: psur, error: insertError } = await svc
    .from('psur')
    .insert(insertData)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ psur }, { status: 201 })
}
