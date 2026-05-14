import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { getServiceClient } from '@/lib/supabase/server-service'
import { EtichettaTemplate } from '@/components/features/pdf/EtichettaTemplate'
import type { LavoroDettaglio } from '@/types/domain'

export async function generateEtichetta(lavoro: LavoroDettaglio) {
  const supabase = getServiceClient()
  const anno = new Date().getFullYear()

  // Carica dati laboratorio
  const { data: lab } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', lavoro.laboratorio_id)
    .single()
  if (!lab) throw new Error('Laboratorio non trovato')

  // Genera PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(EtichettaTemplate, { lavoro, lab }) as any)

  const storagePath = `${lavoro.laboratorio_id}/etichette/${anno}/${lavoro.id}.pdf`

  // Upload su Supabase Storage
  const { error: upErr } = await supabase.storage
    .from('documenti')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true })

  if (upErr && !upErr.message.includes('not found')) {
    console.error('[Etichetta] Storage upload failed:', upErr.message)
  }

  const { data: urlData } = supabase.storage
    .from('documenti')
    .getPublicUrl(storagePath)
  const pdfUrl = urlData?.publicUrl ?? ''

  return { url: pdfUrl }
}
