import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { getServiceClient } from '@/lib/supabase/server-service'
import { EtichettaTemplate } from '@/components/features/pdf/EtichettaTemplate'
import type { LavoroDettaglio } from '@/types/domain'

// ─── Helper: calcola "Installare entro" (+30gg dalla consegna) ──────────────

function calcInstallareEntro(lavoro: LavoroDettaglio): string | null {
  const dataBase = lavoro.data_consegna_effettiva ?? lavoro.data_consegna_prevista
  if (!dataBase) return null
  try {
    const d = new Date(dataBase)
    d.setDate(d.getDate() + 30)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return null
  }
}

// ─── Buffer-only (per API route /api/lavori/[id]/etichetta) ────────────────

export async function generateEtichettaBuffer(lavoro_id: string, laboratorio_id: string): Promise<Buffer> {
  const supabase = getServiceClient()

  // Carica lavoro con join completi (materiali necessari per il lotto sull'etichetta)
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

  const lavoroDettaglio = lavoro as unknown as LavoroDettaglio
  const installareEntro = calcInstallareEntro(lavoroDettaglio)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(EtichettaTemplate, { lavoro: lavoroDettaglio, lab, installareEntro }) as any)
}

// ─── Con upload Storage (per orchestratore consegna) ──────────────────────

export async function generateEtichetta(lavoro: LavoroDettaglio) {
  const supabase = getServiceClient()
  const anno = new Date().getFullYear()

  const { data: lab } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', lavoro.laboratorio_id)
    .single()
  if (!lab) throw new Error('Laboratorio non trovato')

  const installareEntro = calcInstallareEntro(lavoro)

  // Genera PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(EtichettaTemplate, { lavoro, lab, installareEntro }) as any)

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
