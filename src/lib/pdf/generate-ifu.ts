import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { getServiceClient } from '@/lib/supabase/server-service'
import { IFUTemplate } from '@/components/features/pdf/IFUTemplate'
import type { LavoroDettaglio } from '@/types/domain'

export async function generateIFU(lavoro_id: string, laboratorio_id: string): Promise<Buffer> {
  const supabase = getServiceClient()

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
      partitario:lavori_partitario(*),
      ddc:dichiarazioni_conformita(*)
    `)
    .eq('id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (error || !lavoro) throw new Error('Lavoro non trovato')

  const { data: lab } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', laboratorio_id)
    .single()
  if (!lab) throw new Error('Laboratorio non trovato')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(IFUTemplate, { lavoro: lavoro as unknown as LavoroDettaglio, lab }) as any)
}
