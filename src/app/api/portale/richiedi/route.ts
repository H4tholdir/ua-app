/**
 * POST /api/portale/richiedi
 *
 * Accesso PUBBLICO — nessun token di autenticazione richiesto.
 * Autenticato via `portale_token` (campo su `clienti`).
 *
 * Il dentista compila il form su /richiedi/[token] → chiama questa API →
 * viene creato un lavoro in stato 'ricevuto' con da_portale=true, note_dentista e
 * paziente_codice_richiesta valorizzati; note_interne resta NULL (spazio privato del lab).
 * Il lab lo vede in /lavori e lo riceve via Supabase Realtime (useRealtimeNotifiche).
 */

import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { statoLabDaEmbed, portaleNonDisponibile } from '@/lib/portale/guardie'
import { triggerPushByRole } from '@/lib/notifications/trigger'

interface RequestBody {
  token: string
  tipo_dispositivo: string
  descrizione: string
  paziente_codice: string
  data_consegna_prevista: string
  note?: string
}

export async function POST(req: Request) {
  // 1. Parse body
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // 2. Validazione campi obbligatori
  if (!body.token || typeof body.token !== 'string') {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 })
  }
  if (!body.tipo_dispositivo || typeof body.tipo_dispositivo !== 'string') {
    return NextResponse.json({ error: 'tipo_dispositivo obbligatorio' }, { status: 422 })
  }
  if (!body.paziente_codice || typeof body.paziente_codice !== 'string') {
    return NextResponse.json({ error: 'paziente_codice obbligatorio' }, { status: 422 })
  }
  if (!body.data_consegna_prevista || typeof body.data_consegna_prevista !== 'string') {
    return NextResponse.json({ error: 'data_consegna_prevista obbligatoria' }, { status: 422 })
  }

  // Sanitize paziente_codice (no PHI — GDPR)
  const pazienteCodice = body.paziente_codice.trim().substring(0, 40)
  const noteText = (body.note ?? '').trim().substring(0, 500)

  const svc = getServiceClient()

  // 3. Verifica token cliente
  const { data: cliente, error: clienteError } = await svc
    .from('clienti')
    .select('id, laboratorio_id, portale_token_scade_at, laboratori(stato), studio_nome, nome, cognome')
    .eq('portale_token', body.token)
    .is('deleted_at', null)
    .single()

  if (clienteError || !cliente) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 404 })
  }

  // 3b. N13: lab blacklist (o embed assente, fail-closed) → 404 generico,
  // stessa forma del token non valido e PRIMA del check scadenza — nessun
  // info-leak a terzi. Shadow/kill-switch gestiti dal helper.
  const labStato = statoLabDaEmbed((cliente as { laboratori?: unknown }).laboratori)
  if (portaleNonDisponibile(labStato, 'portale/richiedi')) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 404 })
  }

  // 4. Verifica TTL token
  const scadenza = (cliente as Record<string, unknown>).portale_token_scade_at as string | null
  if (scadenza && new Date(scadenza) < new Date()) {
    return NextResponse.json({ error: 'Link scaduto' }, { status: 403 })
  }

  const labId: string = cliente.laboratorio_id
  const clienteId: string = cliente.id
  const { studio_nome, nome, cognome } = cliente as unknown as {
    studio_nome: string | null
    nome: string
    cognome: string
  }
  const nomeStudioODentista = studio_nome ?? `${nome} ${cognome}`

  // 5. Rate limit: max 10 richieste portale nelle ultime 24h per quel cliente
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: recentCount, error: countError } = await svc
    .from('lavori')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('da_portale', true)
    .gte('created_at', since24h)

  if (countError) {
    // Se il conteggio fallisce, procedi comunque (non bloccare per errore di query secondaria)
    console.error('[portale/richiedi] rate-limit count error:', countError.message)
  } else if ((recentCount ?? 0) >= 10) {
    return NextResponse.json(
      { error: 'Troppe richieste nelle ultime 24 ore. Riprova domani.' },
      { status: 429 },
    )
  }

  // 6. Genera numero lavoro (race-safe via RPC DB)
  const anno = new Date().getFullYear()
  const { data: progressivo, error: rpcError } = await svc.rpc('genera_progressivo', {
    p_laboratorio_id: labId,
    p_tipo: 'lavoro',
    p_anno: anno,
  })

  if (rpcError || progressivo == null) {
    return NextResponse.json(
      { error: `Impossibile generare numero lavoro: ${rpcError?.message ?? 'null'}` },
      { status: 500 },
    )
  }

  const numero_lavoro = `${anno}/${String(progressivo).padStart(4, '0')}`

  // 7. Descrizione: usa elementi dentali se forniti, altrimenti tipo_dispositivo
  const descrizione = (body.descrizione ?? body.tipo_dispositivo).substring(0, 255)

  // 8. Inserisci lavoro (bypass RLS con service client)
  const { data: lavoro, error: insertError } = await svc
    .from('lavori')
    .insert({
      laboratorio_id: labId,
      cliente_id: clienteId,
      numero_lavoro,
      anno_lavoro: anno,
      tipo_dispositivo: body.tipo_dispositivo,
      descrizione,
      data_consegna_prevista: body.data_consegna_prevista,
      stato: 'ricevuto',
      priorita: 'normale',
      note_dentista: noteText || null,
      da_portale: true,
      paziente_codice_richiesta: pazienteCodice || null,
      // note_interne resta null: è lo spazio privato del laboratorio
      // Campi MDR con default sicuri
      classe_rischio: 'classe_i',
      da_conformare: true,
      codice_iva: 'N4',
      natura_iva: 'N4',
      dispositivo_semilavorato: false,
      data_ingresso: new Date().toISOString().split('T')[0],
      // Nessun paziente_id — viene assegnato dal lab manualmente
    })
    .select('id, numero_lavoro')
    .single()

  if (insertError) {
    console.error('[portale/richiedi] insert error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 9. Notifica push a titolare + front_desk (GDPR-safe: mai paziente/paziente_codice_richiesta).
  // triggerPushByRole non lancia mai in produzione — await comunque per coerenza
  // col runtime serverless (nessun lavoro in background dopo la response); il
  // try/catch resta una difesa aggiuntiva, non deve mai bloccare il 201.
  try {
    const pushPayload = {
      title: 'Nuova richiesta dal portale',
      body: `${nomeStudioODentista} ha richiesto: ${body.tipo_dispositivo} (n.${numero_lavoro})`,
      url: `/lavori/${lavoro.id}`,
    }
    await Promise.allSettled([
      triggerPushByRole(labId, 'titolare', pushPayload),
      triggerPushByRole(labId, 'front_desk', pushPayload),
    ])
  } catch (pushErr) {
    console.error('[portale/richiedi] push:', pushErr) // mai bloccare la creazione per una push
  }

  return NextResponse.json(
    { ok: true, numero_lavoro: lavoro?.numero_lavoro ?? numero_lavoro },
    { status: 201 },
  )
}
