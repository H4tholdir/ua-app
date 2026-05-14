import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import crypto from 'node:crypto'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generaProgressivo } from '@/lib/db/progressivi'
import { BuonoTemplate } from '@/components/features/pdf/BuonoTemplate'
import type { LavoroDettaglio } from '@/types/domain'

export async function generateBuono(lavoro: LavoroDettaglio) {
  const supabase = getServiceClient()
  const anno = new Date().getFullYear()

  // Carica dati laboratorio
  const { data: lab } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', lavoro.laboratorio_id)
    .single()
  if (!lab) throw new Error('Laboratorio non trovato')

  // Genera progressivo
  const progressivo = await generaProgressivo(supabase, lavoro.laboratorio_id, 'buono')
  const numero = `BUO-${anno}-${String(progressivo).padStart(4, '0')}`

  // Genera PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(BuonoTemplate, { lavoro, lab, numeroBuono: numero }) as any)
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')
  const storagePath = `${lavoro.laboratorio_id}/buoni/${anno}/${numero}.pdf`

  // Upload su Supabase Storage
  const { error: upErr } = await supabase.storage
    .from('documenti')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

  if (upErr && !upErr.message.includes('not found') && !upErr.message.includes('already exists')) {
    console.error('[Buono] Storage upload failed:', upErr.message)
  }

  const { data: urlData } = supabase.storage
    .from('documenti')
    .getPublicUrl(storagePath)
  const pdfUrl = urlData?.publicUrl ?? ''

  void sha256 // hash disponibile per future integrità

  return { numero, url: pdfUrl }
}
