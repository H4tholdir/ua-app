// src/app/api/portale/[token]/fatturazione/stampa/route.ts
// Spec §5 — l'azione «Stampa lista» va in audit (lista_stampata, fail-loud).
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { logPortaleAudit } from '@/lib/portale/audit'
import { guardieEconomiche } from '@/lib/portale/guardie'

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ errore: 'forbidden' }, { status: 403 })
    const { token } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: g.cliente.laboratorio_id, cliente_id: g.cliente.id, azione: 'lista_stampata', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[portale stampa] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
