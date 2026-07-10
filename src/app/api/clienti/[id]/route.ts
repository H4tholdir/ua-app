import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string }> }

// I-2 (spec portale-dentista-v2 §6): allowlist esplicita — MAI blocklist (CLAUDE.md §9).
// I campi portale (portale_fatturazione_attiva, portale_pin) hanno gestione
// dedicata con controllo ruolo: vedi più sotto, NON aggiungerli qui.
export const PATCHABLE_FIELDS_CLIENTE = [
  'studio_nome', 'nome', 'cognome', 'telefono', 'email',
  'partita_iva', 'codice_fiscale', 'codice_sdi', 'pec',
  'indirizzo', 'cap', 'citta', 'provincia', 'paese',
  'listino_numero', 'sconto_percentuale', 'tecnico_default_id',
  'modalita_pagamento', 'non_soggetto_fe', 'fatturare_al_paziente',
  'laboratorio_odontotecnico', 'iban', 'note',
] as const

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

  // Fetch cliente con count lavori recenti
  const { data: cliente, error } = await svc
    .from('clienti')
    .select(`
      id,
      laboratorio_id,
      studio_nome,
      nome,
      cognome,
      telefono,
      email,
      partita_iva,
      codice_fiscale,
      codice_sdi,
      pec,
      indirizzo,
      cap,
      citta,
      provincia,
      paese,
      listino_numero,
      sconto_percentuale,
      tecnico_default_id,
      modalita_pagamento,
      non_soggetto_fe,
      portale_token,
      note,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (error || !cliente) {
    const status = error?.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { error: error?.message ?? 'Cliente non trovato' },
      { status }
    )
  }

  // Count lavori recenti (ultimi 12 mesi) separatamente
  const dodiciMesiFa = new Date()
  dodiciMesiFa.setFullYear(dodiciMesiFa.getFullYear() - 1)
  const dodiciMesiFaISO = dodiciMesiFa.toISOString().split('T')[0]

  const { count: lavori_recenti_count } = await svc
    .from('lavori')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .gte('created_at', dodiciMesiFaISO)
    .is('deleted_at', null)

  return NextResponse.json({
    cliente: {
      ...cliente,
      lavori_recenti_count: lavori_recenti_count ?? 0,
    },
  })
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params

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

  const update: Record<string, unknown> = {}
  for (const field of PATCHABLE_FIELDS_CLIENTE) {
    if (field in body) update[field] = body[field]
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nessun campo modificabile nel body' }, { status: 400 })
  }

  // FK cross-tenant: il tecnico di default deve appartenere al lab (pattern PATCH lavori)
  if (update.tecnico_default_id != null) {
    const { data: tec, error: tecErr } = await svc
      .from('tecnici')
      .select('id')
      .eq('id', update.tecnico_default_id as string)
      .eq('laboratorio_id', utente.laboratorio_id)
      .is('deleted_at', null)
      .maybeSingle()
    if (tecErr) {
      console.error('[clienti PATCH] verifica tecnico_default_id:', tecErr.message)
      return NextResponse.json({ error: 'Errore verifica tecnico' }, { status: 500 })
    }
    if (!tec) {
      return NextResponse.json({ error: 'Tecnico non valido' }, { status: 403 })
    }
  }

  update.updated_at = new Date().toISOString()

  const { data: cliente, error: updateError } = await svc
    .from('clienti')
    .update(update)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .select('id, nome, cognome, studio_nome, updated_at')
    .single()

  if (updateError) {
    console.error('[clienti PATCH] update:', updateError.message)
    return NextResponse.json({ error: 'Errore aggiornamento cliente' }, { status: 500 })
  }

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  }

  return NextResponse.json({ cliente })
}
