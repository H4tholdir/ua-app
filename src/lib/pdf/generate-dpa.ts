import 'server-only'
import { createElement } from 'react'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { DpaTemplate } from '@/components/features/pdf/DpaTemplate'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import type { Laboratorio, Cliente } from '@/types/domain'
import { annoRoma } from '@/lib/utils/data-roma'

function validateDpaData(lab: Laboratorio, cliente: Cliente): void {
  if (!lab.partita_iva && !lab.codice_fiscale) {
    throw new Error('DPA: laboratorio privo di Partita IVA e Codice Fiscale')
  }
  if (!cliente.partita_iva && !cliente.codice_fiscale) {
    throw new Error('DPA: cliente privo di Partita IVA e Codice Fiscale')
  }
}

export async function generateDpa(laboratorio_id: string, cliente_id: string): Promise<Buffer> {
  const svc = getTypedServiceClient()

  const [{ data: labRaw }, { data: clienteRaw }] = await Promise.all([
    svc.from('laboratori').select('*').eq('id', laboratorio_id).single(),
    svc.from('clienti').select('*').eq('id', cliente_id).eq('laboratorio_id', laboratorio_id).single(),
  ])

  if (!labRaw) throw new Error('Laboratorio non trovato')
  if (!clienteRaw) throw new Error('Cliente non trovato')

  // Cast puntuale sul risultato: lo schema reale tipizza alcune colonne enum
  // (es. laboratori.piano, clienti.listino_numero) come stringa/numero generico
  // invece delle union letterali di domain.ts — la query stessa resta type-safe
  // sullo schema (typo sulle colonne vengono comunque intercettati da tsc).
  const lab = labRaw as Laboratorio
  const cliente = clienteRaw as Cliente

  validateDpaData(lab, cliente)

  const numero_dpa = `DPA-${annoRoma()}-${cliente_id.slice(0, 8).toUpperCase()}`

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

  return renderPdfDocument(createElement(DpaTemplate, { dpa }))
}
