// src/app/api/portale/[token]/fatture/route.ts
// Spec §3 Ondata 2 — storico fatture dietro PIN.
// Esclusioni: stato_sdi 'draft' (non ancora emessa) e 'rifiutata' (non valida
// verso il cliente) — coerente con la doppia sorgente della lista Da fatturare.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { guardieEconomiche } from '@/lib/portale/guardie'
import { logPortaleAudit } from '@/lib/portale/audit'

type RouteContext = { params: Promise<{ token: string }> }

export type RigaFatturaPortale = {
  id: string
  numero: string
  data: string
  tipo_documento: string
  totale: number
  pdf: boolean
}
export type FatturePortaleResponse = {
  studio: string | null
  gruppi: Array<{ anno: number; fatture: RigaFatturaPortale[] }>
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { token } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    const { data: fatture, error: fatErr } = await svc
      .from('fatture')
      .select('id, numero, data, tipo_documento, totale, pdf_storage_path')
      .eq('cliente_id', cliente.id)
      .eq('laboratorio_id', cliente.laboratorio_id)
      .not('stato_sdi', 'in', '("draft","rifiutata")')
      .is('deleted_at', null)
      .order('data', { ascending: false })
    if (fatErr) {
      console.error('[portale fatture] lettura fatture:', fatErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }

    const righe: RigaFatturaPortale[] = (fatture ?? []).map((f) => ({
      id: f.id,
      numero: f.numero,
      data: f.data,
      tipo_documento: f.tipo_documento,
      totale: Number(f.totale ?? 0),
      pdf: f.pdf_storage_path != null,
    }))

    const gruppiMap = new Map<number, RigaFatturaPortale[]>()
    for (const r of righe) {
      const anno = Number((r.data ?? '').slice(0, 4)) || 0
      const gruppo = gruppiMap.get(anno) ?? []
      gruppo.push(r)
      gruppiMap.set(anno, gruppo)
    }
    const gruppi = [...gruppiMap.entries()]
      .sort(([a], [b]) => b - a)
      .map(([anno, fattureAnno]) => ({ anno, fatture: fattureAnno }))

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'view_fatture', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const risposta: FatturePortaleResponse = { studio: cliente.studio_nome, gruppi }
    return NextResponse.json(risposta)
  } catch (err) {
    console.error('[portale fatture] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
