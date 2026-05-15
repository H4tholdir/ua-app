import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

type RouteParams = { params: Promise<{ id: string }> }

// GET — lista prove di un lavoro
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // Guard cross-tenant: verifica che il lavoro appartenga al lab dell'utente
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

  const { data, error } = await svc
    .from('lavoro_prove')
    .select('*')
    .eq('lavoro_id', id)
    .order('numero_prova', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — manda_in_prova OPPURE registra_rientro
export async function POST(req: NextRequest, { params }: RouteParams) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const { id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // Guard cross-tenant
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, stato, laboratorio_id')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { action } = body

  if (action === 'manda_in_prova') {
    const { data_rientro_prevista, istruzioni } = body

    if (!data_rientro_prevista) {
      return NextResponse.json({ error: 'data_rientro_prevista obbligatoria' }, { status: 400 })
    }

    // Fix 5 — State machine guard: solo da stati che ammettono la prova
    const statiConsentiti = ['ricevuto', 'in_lavorazione', 'in_ritardo']
    if (!statiConsentiti.includes(lavoro.stato)) {
      return NextResponse.json(
        { error: `Impossibile mandare in prova un lavoro in stato "${lavoro.stato}"` },
        { status: 409 }
      )
    }

    const { count } = await svc
      .from('lavoro_prove')
      .select('*', { count: 'exact', head: true })
      .eq('lavoro_id', id)

    const numero_prova = (count ?? 0) + 1

    const { data: prova, error: provaErr } = await svc
      .from('lavoro_prove')
      .insert({
        lavoro_id: id,
        laboratorio_id: lavoro.laboratorio_id,
        numero_prova,
        data_uscita: new Date().toISOString().split('T')[0],
        data_rientro_prevista,
        note_dentista: istruzioni ?? null,
        created_by: user.id, // Fix 4 — audit trail
      })
      .select()
      .single()

    if (provaErr) {
      // Fix 1 — Unique constraint violation (numero_prova duplicato da concurrent request)
      if (provaErr.code === '23505') {
        return NextResponse.json({ error: 'Prova già in corso — ricarica e riprova' }, { status: 409 })
      }
      return NextResponse.json({ error: provaErr.message }, { status: 500 })
    }

    await svc
      .from('lavori')
      .update({ stato: 'in_prova_esterna', updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ prova, stato: 'in_prova_esterna' })
  }

  if (action === 'registra_rientro') {
    const { prova_id, esito, note_dentista, nuova_data_consegna } = body
    const validEsiti = ['ok', 'modifiche', 'rifare', 'sospeso']

    if (!validEsiti.includes(esito as string)) {
      return NextResponse.json({ error: `esito non valido: ${esito}` }, { status: 400 })
    }

    // Fix 2 — verifica che almeno un record sia stato aggiornato (guard cross-tenant + prova inesistente)
    const { data: updatedProva, error: updateErr } = await svc
      .from('lavoro_prove')
      .update({
        data_rientro_effettiva: new Date().toISOString().split('T')[0],
        esito,
        note_dentista: note_dentista ?? null,
      })
      .eq('id', prova_id as string)
      .eq('lavoro_id', id) // guard: la prova deve appartenere al lavoro
      .select('id')

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    if (!updatedProva || updatedProva.length === 0) {
      return NextResponse.json({ error: 'Prova non trovata o già chiusa' }, { status: 404 })
    }

    const nuovoStato = esito === 'rifare' ? 'annullato'
                     : esito === 'sospeso' ? 'sospeso'
                     : 'in_lavorazione'

    const updateLavoro: Record<string, unknown> = {
      stato: nuovoStato,
      updated_at: new Date().toISOString(),
    }
    if (nuova_data_consegna) updateLavoro.data_consegna_prevista = nuova_data_consegna

    await svc.from('lavori').update(updateLavoro).eq('id', id)

    return NextResponse.json({ esito, stato: nuovoStato })
  }

  return NextResponse.json({ error: 'action non valida' }, { status: 400 })
}
