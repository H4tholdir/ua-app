import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { rilevaGruppi } from '@/lib/utils/sorveglianza-postvendita'
import { GRUPPO_TO_CLASSI_RISCHIO, type GruppoClassePsur } from '@/types/domain'

// GET /api/qualita/psur
// Lista PSUR/PMS del laboratorio + gruppi-classe rilevati dai lavori esistenti
export async function GET() {
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const svc = getServiceClient()

  const { data, error } = await svc
    .from('psur')
    .select(
      'id, anno_riferimento, gruppo_classe, periodo_inizio, periodo_fine, totale_dispositivi, totale_non_conformita, totale_incidenti, totale_reclami, totale_rifacimenti, stato, pdf_url, pdf_sha256, firmato_at, prrc_nome_snapshot, created_at, updated_at'
    )
    .eq('laboratorio_id', context.laboratorioId)
    .order('anno_riferimento', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: lavoriClassi, error: lavoriClassiError } = await svc
    .from('lavori')
    .select('classe_rischio')
    .eq('laboratorio_id', context.laboratorioId)

  if (lavoriClassiError) {
    return NextResponse.json({ error: lavoriClassiError.message }, { status: 500 })
  }

  const { gruppiRilevati, nonClassificabili } = rilevaGruppi(
    (lavoriClassi ?? []).map((l) => l.classe_rischio as string)
  )

  return NextResponse.json({ psur: data ?? [], gruppiRilevati, nonClassificabili })
}

// POST /api/qualita/psur
// Crea nuovo PMS Report/PSUR per (anno, gruppo_classe), aggregati filtrati per classe di rischio
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
  const svc = getServiceClient()
  const labId = context.laboratorioId

  let body: Record<string, unknown> = {}
  try {
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const form = await req.formData()
      body = Object.fromEntries(form.entries())
    }
  } catch {
    // body vuoto/non valido — gruppo_classe resterà mancante, gestito sotto come 400
  }

  const gruppo = body.gruppo_classe
  if (typeof gruppo !== 'string' || !(gruppo in GRUPPO_TO_CLASSI_RISCHIO)) {
    return NextResponse.json({ error: 'gruppo_classe non valido' }, { status: 400 })
  }
  const gruppoClasse = gruppo as GruppoClassePsur
  const classiRischio = GRUPPO_TO_CLASSI_RISCHIO[gruppoClasse]

  const annoRaw = body.anno_riferimento
  const anno: number =
    typeof annoRaw === 'number'
      ? annoRaw
      : typeof annoRaw === 'string' && annoRaw.trim() !== '' && Number.isFinite(Number(annoRaw))
        ? Number(annoRaw)
        : new Date().getFullYear() - 1

  const { data: existing } = await svc
    .from('psur')
    .select('id, stato')
    .eq('laboratorio_id', labId)
    .eq('anno_riferimento', anno)
    .eq('gruppo_classe', gruppoClasse)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: `Documento per l'anno ${anno} e gruppo ${gruppoClasse} già esistente`, psur: existing },
      { status: 409 }
    )
  }

  const inizio = `${anno}-01-01`
  const fine = `${anno}-12-31`

  // Lavori del laboratorio nella classe richiesta (non filtrati per periodo —
  // servono come chiave di join per fasi/incidenti, che hanno le proprie date)
  const { data: lavoriClasseData, error: lavoriClasseError } = await svc
    .from('lavori')
    .select('id')
    .eq('laboratorio_id', labId)
    .in('classe_rischio', classiRischio)

  if (lavoriClasseError) {
    return NextResponse.json({ error: 'Errore nel calcolo degli aggregati' }, { status: 500 })
  }
  const lavoriClasseIds = (lavoriClasseData ?? []).map((l) => l.id)

  const [disp, nc, inc, rifac] = await Promise.all([
    svc
      .from('lavori')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .not('stato', 'eq', 'annullato')
      .in('classe_rischio', classiRischio)
      .gte('data_consegna_effettiva', inizio)
      .lte('data_consegna_effettiva', fine),
    lavoriClasseIds.length === 0
      ? Promise.resolve({ count: 0, error: null })
      : svc
          .from('lavori_fasi')
          .select('id', { count: 'exact', head: true })
          .eq('laboratorio_id', labId)
          .eq('non_conforme', true)
          .in('lavoro_id', lavoriClasseIds)
          .gte('created_at', `${inizio}T00:00:00`)
          .lte('created_at', `${fine}T23:59:59`),
    lavoriClasseIds.length === 0
      ? Promise.resolve({ count: 0, error: null })
      : svc
          .from('incidenti_mdr')
          .select('id', { count: 'exact', head: true })
          .eq('laboratorio_id', labId)
          .is('deleted_at', null)
          .in('lavoro_id', lavoriClasseIds)
          .gte('data_evento', inizio)
          .lte('data_evento', fine),
    svc
      .from('lavori')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .eq('is_rifacimento', true)
      .in('classe_rischio', classiRischio)
      .gte('created_at', `${inizio}T00:00:00`)
      .lte('created_at', `${fine}T23:59:59`),
  ])

  if (disp.error || nc.error || inc.error || rifac.error) {
    return NextResponse.json({ error: 'Errore nel calcolo degli aggregati' }, { status: 500 })
  }

  const { data: lab } = await svc
    .from('laboratori')
    .select('prrc_nome')
    .eq('id', labId)
    .single()

  const insertData = {
    laboratorio_id: labId,
    anno_riferimento: anno,
    gruppo_classe: gruppoClasse,
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
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: `Documento per l'anno ${anno} e gruppo ${gruppoClasse} già esistente` },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ psur }, { status: 201 })
}
