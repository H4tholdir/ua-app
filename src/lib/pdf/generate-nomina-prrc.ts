import 'server-only'
import { createElement } from 'react'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { NominaPrrcTemplate } from '@/components/features/pdf/NominaPrrcTemplate'

export async function generateNominaPrrc(laboratorio_id: string): Promise<Buffer> {
  const supabase = getTypedServiceClient()
  const { data: lab } = await supabase.from('laboratori').select('*').eq('id', laboratorio_id).single()
  if (!lab) throw new Error('Laboratorio non trovato')
  if (!lab.prrc_nome) throw new Error('Dati PRRC non configurati')

  const nominaPrrc = {
    prrc_nome: lab.prrc_nome,
    prrc_cognome: '',
    prrc_qualifica: lab.prrc_qualifica ?? null,
    prrc_numero_albo: null as string | null,
    data_nomina: new Date().toLocaleDateString('it-IT'),
    ha_accettato: false,
  }

  const buffer = await renderPdfDocument(createElement(NominaPrrcTemplate, { lab, nominaPrrc }))
  return buffer
}
