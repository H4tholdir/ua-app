// src/app/api/portale/[token]/fatturazione/[lavoro_id]/route.ts
// Spec §7 — il dentista propone. UPDATE condizionale single-statement (I-5):
// TUTTE le guardie nella WHERE, 0 righe → rilettura e mappa 404/409.
// Colonne hardcoded, mai spread del body — scrive SOLO i 2 campi proposta.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { logPortaleAudit } from '@/lib/portale/audit'
import { guardieEconomiche } from '@/lib/portale/guardie'
import { triggerPushByRole } from '@/lib/notifications/trigger'

const FINESTRA_AGGREGAZIONE_PUSH_MS = 15 * 60 * 1000

type RouteContext = { params: Promise<{ token: string; lavoro_id: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ errore: 'forbidden' }, { status: 403 })
    const { token, lavoro_id } = await params

    let body: { proposta?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ errore: 'body_non_valido' }, { status: 400 })
    }
    const proposta = body.proposta
    if (proposta !== 'fatturare' && proposta !== 'non_fatturare') {
      return NextResponse.json({ errore: 'proposta_non_valida' }, { status: 400 })
    }

    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    // Vincolo doppia sorgente: fattura attiva via fatture.lavoro_id → 409.
    // FAIL-CLOSED: errore in lettura → 500, mai proposta su lavoro forse fatturato.
    const { data: fatt, error: fatErr } = await svc
      .from('fatture')
      .select('id')
      .eq('laboratorio_id', cliente.laboratorio_id)
      .eq('lavoro_id', lavoro_id)
      .neq('stato_sdi', 'rifiutata')
      // Task 5 (audit letture storno TD04): una fattura stornata non blocca
      // più la proposta di fatturazione (il lavoro torna in_attesa via
      // emetti_nota_credito_atomica, Task 3).
      .is('stornata_at', null)
      .limit(1)
    if (fatErr) {
      console.error('[portale proposta] lettura fatture:', fatErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }
    if (fatt && fatt.length > 0) {
      return NextResponse.json({ errore: 'gia_fatturato' }, { status: 409 })
    }

    const { data: aggiornati, error: updErr } = await svc
      .from('lavori')
      .update({ proposta_dentista: proposta, proposta_at: new Date().toISOString() })
      .eq('id', lavoro_id)
      .eq('cliente_id', cliente.id)
      .eq('laboratorio_id', cliente.laboratorio_id)
      .eq('stato', 'consegnato')
      .eq('decisione_fatturazione', 'in_attesa')
      .eq('incluso_in_fattura', false)
      .is('deleted_at', null)
      .select('id')
    if (updErr) {
      console.error('[portale proposta] update:', updErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }
    if (!aggiornati || aggiornati.length === 0) {
      // Rilettura per distinguere 404 (non del cliente / inesistente) da 409
      // (esiste ma non più proponibile: confermato, annullato, in fattura…).
      const { data: esiste } = await svc
        .from('lavori')
        .select('id')
        .eq('id', lavoro_id)
        .eq('cliente_id', cliente.id)
        .eq('laboratorio_id', cliente.laboratorio_id)
        .is('deleted_at', null)
        .maybeSingle()
      if (!esiste) return NextResponse.json({ errore: 'non_trovato' }, { status: 404 })
      return NextResponse.json({ errore: 'non_modificabile' }, { status: 409 })
    }

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id,
      azione: 'proposta_fatturazione', lavoro_id, dettaglio: { proposta }, req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    // Push aggregata per sessione di proposte (spec §6): una sola push quando
    // parte una raffica — se negli ultimi 15 min c'è solo l'evento appena
    // scritto, è la prima della sessione. Mai prezzi né saldi nel payload.
    try {
      const { count, error: cntErr } = await svc
        .from('portale_accessi')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', cliente.id)
        .eq('azione', 'proposta_fatturazione')
        .gte('created_at', new Date(Date.now() - FINESTRA_AGGREGAZIONE_PUSH_MS).toISOString())
      if (!cntErr && (count ?? 0) <= 1) {
        const payload = {
          title: 'Proposte di fatturazione',
          body: `${cliente.studio_nome ?? 'Un cliente'} ha inviato proposte di fatturazione`,
          url: `/scadenzario/${cliente.id}`,
        }
        await Promise.allSettled([
          triggerPushByRole(cliente.laboratorio_id, 'titolare', payload),
          triggerPushByRole(cliente.laboratorio_id, 'front_desk', payload),
        ])
      }
    } catch (pushErr) {
      console.error('[portale proposta] push:', pushErr) // mai bloccare la proposta per una push
    }

    return NextResponse.json({ ok: true, proposta })
  } catch (err) {
    console.error('[portale proposta] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
