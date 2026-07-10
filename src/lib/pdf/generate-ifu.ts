import 'server-only'
import { createElement } from 'react'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { IFUTemplate } from '@/components/features/pdf/IFUTemplate'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'

export async function generateIFU(lavoro_id: string, laboratorio_id: string): Promise<Buffer> {
  const supabase = getTypedServiceClient()

  // Carica lavoro con join completi
  const { data: lavoro, error } = await supabase
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      tecnico:tecnici(*),
      lavorazioni:lavori_lavorazioni(*),
      appuntamenti:lavori_appuntamenti(*),
      immagini:lavori_immagini(*),
      fasi:lavori_fasi(*, fase:fasi_produzione(*)),
      materiali:lavori_materiali(*),
      ddc:dichiarazioni_conformita(*)
    `)
    .eq('id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .neq('ddc.stato', 'annullata')
    .single()

  if (error || !lavoro) throw new Error('Lavoro non trovato')

  const { data: labRaw } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', laboratorio_id)
    .single()
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio

  return renderPdfDocument(createElement(IFUTemplate, { lavoro: lavoro as unknown as LavoroDettaglio, lab }))
}
