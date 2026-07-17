import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { eseguiRegistrazionePagamento } from '@/lib/contabilita/registra-pagamento'

const METODI_VALIDI = ['contanti', 'bonifico', 'pos', 'assegno', 'altro']

type RouteContext = { params: Promise<{ id: string }> }

// ─── PATCH /api/pagamenti/[id] ─────────────────────────────────────────────
// Modifica-come-sostituzione: annulla il pagamento esistente e ne crea uno
// nuovo con sostituisce_pagamento_id. Body: { importo, metodo, metodo_nota?, data_pagamento }
export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (context.ruolo !== 'titolare' && context.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }
  const svc = getServiceClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const importo = typeof body.importo === 'number' ? body.importo : NaN
  const metodo = typeof body.metodo === 'string' ? body.metodo : ''
  const metodo_nota = typeof body.metodo_nota === 'string' ? body.metodo_nota : null
  const data_pagamento = typeof body.data_pagamento === 'string' ? body.data_pagamento : ''

  if (!METODI_VALIDI.includes(metodo)) {
    return NextResponse.json({ error: 'Campo `metodo` non valido' }, { status: 400 })
  }
  if (!data_pagamento) {
    return NextResponse.json({ error: 'Campo `data_pagamento` richiesto' }, { status: 400 })
  }

  // Il pagamento deve esistere nel laboratorio dell'utente (404 se non esiste affatto)
  const { data: esistente } = await svc
    .from('pagamenti')
    .select('id, fattura_id, lavoro_id, stato')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .single()

  if (!esistente) {
    return NextResponse.json({ error: 'Pagamento non trovato' }, { status: 404 })
  }

  // Claim atomico: annulla solo se ancora attivo — previene la race con una
  // seconda richiesta concorrente sullo stesso pagamento (spec B2 §"Edge case")
  const { data: claimed } = await svc
    .from('pagamenti')
    .update({
      stato: 'annullato',
      motivo_annullamento: 'Sostituito da modifica',
      annullato_da: context.userId,
      annullato_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .eq('stato', 'attivo')
    .select('id')
    .single()

  if (!claimed) {
    return NextResponse.json({ error: 'Il pagamento non è più attivo — ricarica e riprova' }, { status: 409 })
  }

  const risultato = await eseguiRegistrazionePagamento(svc, {
    laboratorio_id: context.laboratorioId,
    fattura_id: esistente.fattura_id,
    lavoro_id: esistente.lavoro_id,
    importo,
    metodo,
    metodo_nota,
    data_pagamento,
    registrato_da: context.userId,
    sostituisce_pagamento_id: id,
  })

  if (!risultato.ok) {
    // Rollback del claim: il vecchio pagamento torna attivo per permettere un retry
    await svc
      .from('pagamenti')
      .update({ stato: 'attivo', motivo_annullamento: null, annullato_da: null, annullato_at: null })
      .eq('id', id)
      .eq('laboratorio_id', context.laboratorioId)

    return NextResponse.json({ error: risultato.errore }, { status: 400 })
  }

  return NextResponse.json({ pagamento: risultato.pagamento, eccedenza: risultato.eccedenza, avviso: risultato.avviso })
}

// ─── DELETE /api/pagamenti/[id] ─────────────────────────────────────────────
// Soft-cancel: richiede motivo_annullamento. Body: { motivo_annullamento }
export async function DELETE(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (context.ruolo !== 'titolare' && context.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }
  const svc = getServiceClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const motivo_annullamento = typeof body.motivo_annullamento === 'string' ? body.motivo_annullamento.trim() : ''
  if (!motivo_annullamento) {
    return NextResponse.json({ error: 'Campo `motivo_annullamento` richiesto' }, { status: 400 })
  }

  const { data: esistente } = await svc
    .from('pagamenti')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .single()

  if (!esistente) {
    return NextResponse.json({ error: 'Pagamento non trovato' }, { status: 404 })
  }

  const { data: claimed } = await svc
    .from('pagamenti')
    .update({
      stato: 'annullato',
      motivo_annullamento,
      annullato_da: context.userId,
      annullato_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .eq('stato', 'attivo')
    .select('id')
    .single()

  if (!claimed) {
    return NextResponse.json({ error: 'Il pagamento non è più attivo' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
