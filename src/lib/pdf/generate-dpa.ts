import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { getServiceClient } from '@/lib/supabase/server-service'
import { DpaTemplate } from '@/components/features/pdf/DpaTemplate'

export async function generateDpa(laboratorio_id: string, cliente_id: string): Promise<Buffer> {
  const svc = getServiceClient()

  const [{ data: lab }, { data: cliente }] = await Promise.all([
    svc.from('laboratori').select('*').eq('id', laboratorio_id).single(),
    svc.from('clienti').select('*').eq('id', cliente_id).eq('laboratorio_id', laboratorio_id).single(),
  ])

  if (!lab) throw new Error('Laboratorio non trovato')
  if (!cliente) throw new Error('Cliente non trovato')

  const numero_dpa = `DPA-${new Date().getFullYear()}-${cliente_id.slice(0, 8).toUpperCase()}`

  const dpa = {
    lab: {
      ragione_sociale: lab.ragione_sociale,
      nome: lab.nome,
      partita_iva: lab.partita_iva,
      codice_fiscale: lab.codice_fiscale,
      indirizzo: lab.indirizzo,
      cap: lab.cap,
      citta: lab.citta,
      provincia: lab.provincia,
      prrc_nome: lab.prrc_nome,
      codice_itca: lab.codice_itca,
    },
    cliente: {
      studio_nome: cliente.studio_nome,
      nome: cliente.nome,
      cognome: cliente.cognome,
      partita_iva: cliente.partita_iva,
      codice_fiscale: cliente.codice_fiscale,
      indirizzo: cliente.indirizzo,
      cap: cliente.cap,
      citta: cliente.citta,
      provincia: cliente.provincia,
    },
    numero_dpa,
    data_emissione: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(DpaTemplate, { dpa }) as any)
  return buffer
}
