import 'server-only'
import { createElement } from 'react'
import crypto from 'node:crypto'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { generaProgressivo } from '@/lib/db/progressivi'
import { BuonoTemplate } from '@/components/features/pdf/BuonoTemplate'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'
import { annoRoma } from '@/lib/utils/data-roma'

export async function generateBuono(lavoro: LavoroDettaglio) {
  const supabase = getTypedServiceClient()

  // Idempotenza su retry di orchestraConsegna (B13 1/2): se il buono per
  // questo lavoro è già stato generato in un tentativo precedente
  // (buono_pdf_url già valorizzato su lavori, caricato in memoria da
  // orchestraConsegna Step 1), non rigenerare — nessuna query aggiuntiva.
  if (lavoro.buono_pdf_url) {
    return { numero: lavoro.buono_numero ?? '', url: lavoro.buono_pdf_url }
  }

  const anno = annoRoma()

  // Carica dati laboratorio
  const { data: labRaw } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', lavoro.laboratorio_id)
    .single()
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio

  // Genera progressivo
  const progressivo = await generaProgressivo(supabase, lavoro.laboratorio_id, 'buono', anno)
  const numero = `BUO-${anno}-${String(progressivo).padStart(4, '0')}`

  // Genera PDF
  const buffer = await renderPdfDocument(createElement(BuonoTemplate, { lavoro, lab, numeroBuono: numero }))
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

  // Salva url, numero e storage path sul lavoro per il recupero idempotente
  // e per generare l'URL firmato on-demand dal portale dentista (B5).
  const { count: buonoUpdateCount } = await supabase
    .from('lavori')
    .update(
      { buono_pdf_url: pdfUrl, buono_numero: numero, buono_storage_path: storagePath },
      { count: 'exact' }
    )
    .eq('id', lavoro.id)
    .eq('laboratorio_id', lavoro.laboratorio_id)

  if (buonoUpdateCount === 0) {
    throw new Error(`[Buono] UPDATE affected 0 rows — tenant mismatch for lavoro ${lavoro.id}`)
  }

  return { numero, url: pdfUrl }
}
