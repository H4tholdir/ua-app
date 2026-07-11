// src/app/api/portale/[token]/situazione/route.ts
// Spec Ondata 3 — situazione economica dietro PIN (D-O3-1: estratto conto
// completo, stessi numeri dello scadenzario lab via getContabilitaCliente).
// DTO ad allowlist: mai id interni, mai stato_sdi, mai metodo_nota.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { guardieEconomiche } from '@/lib/portale/guardie'
import { logPortaleAudit } from '@/lib/portale/audit'
import { getContabilitaCliente, getPagamentiCliente } from '@/lib/contabilita/queries'

type RouteContext = { params: Promise<{ token: string }> }

export type DovutoPortale = {
  origine: 'fattura' | 'lavoro_diretto'
  numero: string
  data: string
  totale: number
  residuo: number
  pagata: boolean
  giorni_ritardo: number
}
export type SituazionePortaleResponse = {
  studio: string | null
  saldo: { confermato: number; potenziale: number; disponibile: number; totale: number }
  dovuti: DovutoPortale[]
  pagamenti: Array<{
    data: string
    importo: number
    metodo: string
    destinazione: { tipo: 'fattura' | 'lavoro'; numero: string }
  }>
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { token } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    const [contabilita, pagamenti] = await Promise.all([
      getContabilitaCliente(svc, cliente.laboratorio_id, cliente.id),
      getPagamentiCliente(svc, cliente.laboratorio_id, cliente.id),
    ])

    // Allowlist esplicita: da DovutoEstratto cadono id e stato_sdi.
    const dovuti: DovutoPortale[] = contabilita.dovuti.map((d) => ({
      origine: d.origine,
      numero: d.numero,
      data: d.data,
      totale: d.totale,
      residuo: d.residuo,
      pagata: d.pagata,
      giorni_ritardo: d.giorni_ritardo,
    }))

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'view_situazione', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const risposta: SituazionePortaleResponse = {
      studio: cliente.studio_nome,
      saldo: contabilita.creditoCliente,
      dovuti,
      pagamenti,
    }
    return NextResponse.json(risposta)
  } catch (err) {
    console.error('[portale situazione] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
