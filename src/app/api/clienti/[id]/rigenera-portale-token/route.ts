// src/app/api/clienti/[id]/rigenera-portale-token/route.ts
// F6 (spec §6): rotazione del link portale — nessuna rotation esisteva e il
// TTL è 1 anno. Invalida il link vecchio all'istante; nuovo TTL 1 anno.
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { logPortaleAudit } from '@/lib/portale/audit'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params

    const context = await getFreshLabContext()
    if (!context) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    if (!context.laboratorioId) return NextResponse.json({ error: 'Nessun laboratorio' }, { status: 403 })
    if (!['titolare', 'front_desk'].includes(context.ruolo)) {
      return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
    }
    const guard = assertLabOperativo(context, 'POST')
    if (guard) return guard
    const svc = getServiceClient()

    const nuovoToken = randomUUID()
    const { data: aggiornato, error: updErr } = await svc
      .from('clienti')
      .update({
        portale_token: nuovoToken,
        portale_token_scade_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('laboratorio_id', context.laboratorioId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (updErr) {
      console.error('[rigenera token] update:', updErr.message)
      return NextResponse.json({ error: 'Errore rigenerazione link' }, { status: 500 })
    }
    if (!aggiornato) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: context.laboratorioId, cliente_id: id,
      azione: 'link_rigenerato', dettaglio: { autore: context.userId }, req,
    })
    if (!okAudit) return NextResponse.json({ error: 'Errore registrazione audit' }, { status: 500 })

    return NextResponse.json({ portale_token: nuovoToken })
  } catch (err) {
    console.error('[rigenera token] errore:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
