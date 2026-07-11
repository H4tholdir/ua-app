// src/app/api/portale/[token]/fatture/[fattura_id]/pdf/route.ts
// Download copia di cortesia — pattern B5 (signed URL 300s, redirect 307).
// Evento economico: audit fail-loud PRIMA del redirect (spec §4).
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { guardieEconomiche } from '@/lib/portale/guardie'
import { logPortaleAudit } from '@/lib/portale/audit'
import { getSignedUrl } from '@/lib/storage/signed-url'

type RouteContext = { params: Promise<{ token: string; fattura_id: string }> }

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { token, fattura_id } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    const { data: fattura, error: fatErr } = await svc
      .from('fatture')
      .select('id, numero, pdf_storage_path')
      .eq('id', fattura_id)
      .eq('cliente_id', cliente.id)
      .eq('laboratorio_id', cliente.laboratorio_id)
      .not('stato_sdi', 'in', '("draft","rifiutata")')
      .is('deleted_at', null)
      .maybeSingle()
    if (fatErr) {
      console.error('[portale fattura pdf] lettura fattura:', fatErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }
    if (!fattura || !fattura.pdf_storage_path) {
      return NextResponse.json({ errore: 'documento_non_disponibile' }, { status: 404 })
    }

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id,
      cliente_id: cliente.id,
      azione: 'download_fattura',
      dettaglio: { fattura_id: fattura.id, numero: fattura.numero },
      req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const signedUrl = await getSignedUrl(svc, 'fatture-pdf', fattura.pdf_storage_path, 300)
    if (!signedUrl) {
      console.error('[portale fattura pdf] signed URL non generato per', fattura.id)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }

    return NextResponse.redirect(signedUrl, 307)
  } catch (err) {
    console.error('[portale fattura pdf] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
