import 'server-only'
import { createElement } from 'react'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { SchedaFabbricazioneTemplate } from '@/components/features/pdf/SchedaFabbricazioneTemplate'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'

export async function generateSchedaFabbricazione(
  lavoro_id: string,
  laboratorio_id: string
): Promise<Buffer> {
  const supabase = getTypedServiceClient()

  const { data: lavoro, error } = await supabase
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      fasi:lavori_fasi(*, fase:fasi_produzione(*), tecnico:tecnici(nome, cognome))
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

  return renderPdfDocument(
    createElement(SchedaFabbricazioneTemplate, {
      lavoro: lavoro as unknown as LavoroDettaglio,
      lab: lab as Laboratorio,
    })
  )
}
