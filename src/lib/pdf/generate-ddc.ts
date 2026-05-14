import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import crypto from 'node:crypto'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generaProgressivo } from '@/lib/db/progressivi'
import { DdcTemplate } from '@/components/features/pdf/DdcTemplate'
import type { LavoroDettaglio } from '@/types/domain'

export async function generateDdC(lavoro: LavoroDettaglio) {
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
  const progressivo = await generaProgressivo(supabase, lavoro.laboratorio_id, 'ddc')
  const numero = `DDC-${anno}-${String(progressivo).padStart(4, '0')}`

  // Prepara dati snapshot
  const ddc = {
    numero_ddc: numero,
    anno_ddc: anno,
    progressivo_ddc: progressivo,
    fabbricante_nome: (lab.ragione_sociale ?? lab.nome) as string,
    fabbricante_indirizzo: (lab.indirizzo ?? '') as string,
    fabbricante_piva: (lab.partita_iva ?? '') as string,
    fabbricante_itca: (lab.codice_itca ?? null) as string | null,
    luogo_emissione: (lab.citta ?? 'Italia') as string,
    prescrittore_nome: lavoro.richiedente_nome
      ?? `${lavoro.cliente.cognome} ${lavoro.cliente.nome}`.trim(),
    prescrizione_id: lavoro.numero_prescrizione ?? null,
    paziente_nome: lavoro.paziente_nome_snapshot ?? '',
    paziente_cognome: null as string | null,
    tipo_dispositivo: lavoro.tipo_dispositivo as string,
    descrizione_dispositivo: lavoro.descrizione,
    denti_coinvolti: lavoro.denti_coinvolti ?? null,
    uso_esclusivo_paziente: 'Dispositivo fabbricato su misura esclusivamente per il paziente indicato',
    prescrizione_caratteristiche: null as string | null,
    contiene_sostanze_o_tessuti: false,
    sostanze_tessuti_dettaglio: null as string | null,
    classe_rischio: lavoro.classe_rischio,
    norma_riferimento: lavoro.norma_riferimento ?? null,
    testo_conformita_snapshot: "Il fabbricante dichiara che il presente dispositivo e' conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745.",
    prrc_nome: (lab.prrc_nome ?? '') as string,
    prrc_qualifica: (lab.prrc_qualifica ?? null) as string | null,
    firma_ddc_storage_path: (lab.firma_ddc_url ?? null) as string | null,
    firma_ddc_sha256: null as string | null,
    rischi_residui_snapshot: null as string | null,
    data_emissione: new Date().toISOString(),
    stato: 'generata' as const,
  }

  // Genera PDF
  // Il cast è necessario: createElement produce FunctionComponentElement,
  // mentre renderToBuffer accetta ReactElement<DocumentProps>.
  // A runtime il componente renderizza sempre un <Document> come root.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(DdcTemplate, { lavoro, lab, ddc }) as any)
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')
  const storagePath = `${lavoro.laboratorio_id}/ddc/${anno}/${numero}.pdf`

  // Upload su Supabase Storage
  const { error: upErr } = await supabase.storage
    .from('documenti')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

  // Se il bucket non esiste ancora (dev), continua senza errore fatale
  if (upErr && !upErr.message.includes('not found') && !upErr.message.includes('already exists')) {
    console.error('[DdC] Storage upload failed:', upErr.message)
  }

  const { data: urlData } = supabase.storage
    .from('documenti')
    .getPublicUrl(storagePath)
  const pdfUrl = urlData?.publicUrl ?? ''

  // INSERT record DdC
  const { error: insertErr } = await supabase
    .from('dichiarazioni_conformita')
    .insert({
      laboratorio_id: lavoro.laboratorio_id,
      lavoro_id: lavoro.id,
      ...ddc,
      pdf_url: pdfUrl,
      storage_path_pdf: storagePath,
      pdf_sha256: sha256,
      pdf_generato_at: new Date().toISOString(),
      inviata_al_dentista: false,
    })

  if (insertErr) {
    // Se unique constraint violato (doppio tap), recupera record esistente
    if (insertErr.code === '23505') {
      const { data: existing } = await supabase
        .from('dichiarazioni_conformita')
        .select('numero_ddc, pdf_url')
        .eq('lavoro_id', lavoro.id)
        .single()
      return { numero: existing?.numero_ddc ?? numero, url: existing?.pdf_url ?? pdfUrl }
    }
    throw new Error(`DdC insert failed: ${insertErr.message}`)
  }

  return { numero, url: pdfUrl }
}
