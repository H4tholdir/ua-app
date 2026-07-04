import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string }> }

interface FaseInput {
  id?: string
  codice_fase: string
  descrizione: string
  obbligatoria?: boolean
  attrezzatura?: string | null
  controllo_misura?: string | null
  esito_atteso?: string | null
  materiali_nota?: string | null
}

export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id: cicloId } = await params

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

  const { data: ciclo } = await svc
    .from('cicli_produzione')
    .select('id')
    .eq('id', cicloId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!ciclo) {
    return NextResponse.json({ error: 'Ciclo non trovato' }, { status: 404 })
  }

  let body: { fasi?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const fasiInput = Array.isArray(body.fasi) ? (body.fasi as FaseInput[]) : []

  for (let i = 0; i < fasiInput.length; i++) {
    const f = fasiInput[i]
    if (!f.codice_fase?.trim()) {
      return NextResponse.json({ error: `Fase #${i + 1}: campo "codice_fase" obbligatorio` }, { status: 422 })
    }
    if (!f.descrizione?.trim()) {
      return NextResponse.json({ error: `Fase #${i + 1}: campo "descrizione" obbligatorio` }, { status: 422 })
    }
  }

  const { data: existingFasi, error: existingFasiError } = await svc
    .from('fasi_produzione')
    .select('id, codice_fase')
    .eq('ciclo_id', cicloId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)

  if (existingFasiError) {
    return NextResponse.json({ error: 'Errore nel recupero delle fasi esistenti' }, { status: 500 })
  }

  const existing = existingFasi ?? []
  const existingIds = new Set(existing.map((row) => row.id))
  // Un id che il client manda ma che non appartiene a QUESTO ciclo/lab (fetched
  // sopra, già scoped) viene trattato come inesistente — mai fidarsi ciecamente
  // di un id arbitrario per un UPDATE cross-tenant.
  const keptIds = new Set(fasiInput.map((f) => f.id).filter((id): id is string => !!id && existingIds.has(id)))
  const now = new Date().toISOString()

  // Righe nuove: insert in blocco (include anche un id fornito dal client
  // ma non riconosciuto come esistente per questo ciclo)
  const nuove = fasiInput
    .map((f, index) => ({ f, ordine: index + 1 }))
    .filter(({ f }) => !f.id || !existingIds.has(f.id))
  if (nuove.length > 0) {
    await svc.from('fasi_produzione').insert(
      nuove.map(({ f, ordine }) => ({
        ciclo_id: cicloId,
        laboratorio_id: labId,
        ordine,
        codice_fase: f.codice_fase,
        descrizione: f.descrizione,
        obbligatoria: f.obbligatoria ?? true,
        attrezzatura: f.attrezzatura ?? null,
        controllo_misura: f.controllo_misura ?? null,
        esito_atteso: f.esito_atteso ?? null,
        materiali_nota: f.materiali_nota ?? null,
        updated_by: user.id,
      }))
    )
  }

  // Righe esistenti presenti nell'array (id riconosciuto per QUESTO ciclo/lab):
  // update singolo, scoped anche per laboratorio_id per difesa-in-profondità
  // (bassa cardinalità, nessuna ottimizzazione batch necessaria — coerente col
  // volume atteso, decine di fasi per ciclo)
  for (let index = 0; index < fasiInput.length; index++) {
    const f = fasiInput[index]
    if (!f.id || !existingIds.has(f.id)) continue
    await svc
      .from('fasi_produzione')
      .update({
        ordine: index + 1,
        codice_fase: f.codice_fase,
        descrizione: f.descrizione,
        obbligatoria: f.obbligatoria ?? true,
        attrezzatura: f.attrezzatura ?? null,
        controllo_misura: f.controllo_misura ?? null,
        esito_atteso: f.esito_atteso ?? null,
        materiali_nota: f.materiali_nota ?? null,
        updated_by: user.id,
      })
      .eq('id', f.id)
      .eq('laboratorio_id', labId)
  }

  // Righe esistenti non più presenti nell'array: soft delete
  for (const row of existing) {
    if (!keptIds.has(row.id)) {
      await svc
        .from('fasi_produzione')
        .update({ deleted_at: now, updated_by: user.id })
        .eq('id', row.id)
        .eq('laboratorio_id', labId)
    }
  }

  // Bump "ultima modifica" sul ciclo padre
  await svc
    .from('cicli_produzione')
    .update({ updated_by: user.id, updated_at: now })
    .eq('id', cicloId)

  return NextResponse.json({ ok: true })
}
