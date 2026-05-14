import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

// Campi prezzo da bloccare quando il lavoro è già incluso in fattura
const LOCKED_PRICE_FIELDS = [
  'prezzo_unitario',
  'listino_id',
  'codice_iva',
  'natura_iva',
] as const

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

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

  const { data: lavoro, error } = await svc
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      tecnico:tecnici(*),
      lavorazioni:lavori_lavorazioni(*),
      appuntamenti:lavori_appuntamenti(*),
      immagini:lavori_immagini(*),
      fasi:lavori_fasi(*, fase:fasi_produzione(*)),
      materiali:lavori_materiali(*),
      partitario:lavori_partitario(*),
      ddc:dichiarazioni_conformita(*)
    `)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (error || !lavoro) {
    const status = error?.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { error: error?.message ?? 'Lavoro non trovato' },
      { status }
    )
  }

  return NextResponse.json({ lavoro })
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params

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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Verifica se il lavoro è già incluso in fattura — legge solo il campo necessario
  const { data: existing } = await svc
    .from('lavori')
    .select('incluso_in_fattura')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // Se incluso in fattura: rimuovi i campi prezzo dal body per protezione
  if (existing.incluso_in_fattura) {
    for (const field of LOCKED_PRICE_FIELDS) {
      delete body[field]
    }
  }

  // Rimuovi campi non aggiornabili lato API (immutabili) e campi gestiti
  // dalla state machine della consegna (non modificabili via PATCH diretto)
  const IMMUTABLE = [
    'id',
    'laboratorio_id',
    'numero_lavoro',
    'anno_lavoro',
    'created_at',
    'deleted_at',
    // State machine — modificati esclusivamente da orchestraConsegna
    'stato',
    'conformato',
    'data_conformazione',
    'consegna_completata_at',
    'consegna_tap_at',
    'consegna_in_corso',
    'post_consegna_correzioni',
    'consegna_precheck_passato_al_primo_tentativo',
  ]
  for (const field of IMMUTABLE) {
    delete body[field]
  }

  // Fix cross-tenant FK: validare che cliente_id, paziente_id, tecnico_id, ciclo_id
  // appartengano al laboratorio dell'utente prima di aggiornare
  const FK_FIELDS = [
    { field: 'cliente_id',  table: 'clienti' },
    { field: 'paziente_id', table: 'pazienti' },
    { field: 'tecnico_id',  table: 'tecnici' },
    { field: 'ciclo_id',    table: 'cicli_produzione' },
  ] as const

  for (const { field, table } of FK_FIELDS) {
    if (body[field] != null) {
      const { data: fkRow } = await svc
        .from(table)
        .select('id')
        .eq('id', body[field] as string)
        .eq('laboratorio_id', utente.laboratorio_id)
        .is('deleted_at', null)
        .single()
      if (!fkRow) {
        return NextResponse.json(
          { error: `${field} non appartiene a questo laboratorio` },
          { status: 403 }
        )
      }
    }
  }

  // Forza aggiornamento timestamp
  body.updated_at = new Date().toISOString()

  const { data: lavoro, error: updateError } = await svc
    .from('lavori')
    .update(body)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .select('id, numero_lavoro, stato, updated_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ lavoro })
}
