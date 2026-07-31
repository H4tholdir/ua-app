import 'server-only'
import { createElement } from 'react'
import crypto from 'node:crypto'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { generaProgressivo } from '@/lib/db/progressivi'
import { DdcTemplate } from '@/components/features/pdf/DdcTemplate'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'
import { isPublicStorageUrl } from '@/lib/utils/storage-url'
import { annoRoma } from '@/lib/utils/data-roma'

// A18 — hash d'integrità del file firma applicato in DdC (cut-off 20/07/2026,
// decisione Francesco: nessun backfill sui DdC storici — dati pre-consegna di
// test). Fail-open: se il download fallisce l'hash resta null e la DdC si
// genera comunque (metadato d'integrità, non condizione di emissione).
async function hashFirmaDdc(url: string | null): Promise<string | null> {
  if (!url) return null
  // Difesa in profondità (review Bundle T): il valore è già validato a
  // scrittura in PATCH /api/impostazioni, ma un dato storico o scritto per
  // altre vie non deve comunque far fetchare al server un URL arbitrario.
  if (!isPublicStorageUrl(url)) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return crypto.createHash('sha256').update(buf).digest('hex')
  } catch (err) {
    console.error('[DdC] hash firma non calcolato:', err instanceof Error ? err.message : err)
    return null
  }
}

/** La versione della FORMA del documento. Cambia quando cambia ciò che il PDF
 *  rende — non a ogni ritocco di codice.
 *
 *  🛑 Introdotta con D102, e «introdotta» è la parola giusta: la colonna
 *  `template_version` esiste in `supabase/schema.sql` dal primo giorno e non
 *  l'ha mai scritta nessuno. Ogni DdC emessa fino a oggi la porta `NULL` —
 *  cioè il documento non dice di che forma è. Fra dieci anni (quindici per gli
 *  impiantabili) è la riga che permette di rileggerlo sapendo come andava letto. */
const VERSIONE_TEMPLATE_DDC = 'ddc-v1'

/** Serializzazione CANONICA: le chiavi degli oggetti in ordine alfabetico, gli
 *  array nel loro ordine (che è un dato, non una casualità).
 *
 *  🔑 Perché canonica e non `JSON.stringify` nudo: l'impronta deve certificare
 *  i DATI, non l'ordine in cui un refactoring futuro capita di dichiararli. Con
 *  la stringa nuda, spostare due righe nel builder cambierebbe l'impronta di un
 *  documento identico — e un'impronta che cambia senza che cambi niente non
 *  prova più niente. */
function canonico(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`).join(',')}}`
}

/** L'impronta dei DATI che hanno prodotto il documento.
 *
 *  🔑 NON è `pdf_sha256`, ed è la ragione per cui ne servono due: quella è
 *  l'impronta del FILE e prova che il byte non è stato toccato; questa prova da
 *  QUALI DATI quel file è nato. Sono due domande diverse e un'ispezione può
 *  farle entrambe.
 *
 *  🛑 Va calcolata sull'oggetto DAVVERO RESO (`ddcConNorma`), mai su `ddc`:
 *  `norma_riferimento` sta nel primo e non nel secondo, perché non è una colonna
 *  della tabella e viene passata al template solo per il rendering. Calcolarla
 *  sull'oggetto sbagliato è l'errore naturale — è quello che si ha sotto mano —
 *  e produrrebbe una prova d'integrità che certifica un payload DIVERSO da
 *  quello stampato: una prova che mente, sul documento in cui mentire costa di
 *  più. La prova che distingue i due mondi è in `tests/unit/generate-ddc.test.ts`
 *  («cambiare `norma_riferimento` cambia l'impronta»). */
export function improntaPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(canonico(payload)).digest('hex')
}

export async function generateDdC(lavoro: LavoroDettaglio) {
  const supabase = getTypedServiceClient()

  // Idempotenza su retry di orchestraConsegna (B13 1/2): se la DdC per questo
  // lavoro esiste già (generata in un tentativo precedente), non rigenerare —
  // evita un secondo file su Storage e un secondo progressivo sprecato. Il
  // recupero su errore 23505 più sotto resta come rete di sicurezza per la
  // race condition residua (due richieste che superano entrambe questo guard).
  const { data: ddcEsistente } = await supabase
    .from('dichiarazioni_conformita')
    .select('numero_ddc, pdf_url')
    .eq('lavoro_id', lavoro.id)
    .neq('stato', 'annullata')
    .maybeSingle()

  if (ddcEsistente) {
    return { numero: ddcEsistente.numero_ddc, url: ddcEsistente.pdf_url ?? '' }
  }

  const anno = annoRoma()

  // Carica dati laboratorio + rischi residui per tipo dispositivo
  const [{ data: labRaw }, { data: rischiRow }] = await Promise.all([
    supabase.from('laboratori').select('*').eq('id', lavoro.laboratorio_id).single(),
    supabase
      .from('rischi_tipo_dispositivo')
      .select('rischi_residui, norme_json')
      .eq('laboratorio_id', lavoro.laboratorio_id)
      .eq('tipo_dispositivo', lavoro.tipo_dispositivo)
      .maybeSingle(),
  ])
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio

  // Genera progressivo
  const progressivo = await generaProgressivo(supabase, lavoro.laboratorio_id, 'ddc', anno)
  const numero = `DDC-${anno}-${String(progressivo).padStart(4, '0')}`

  // MDR §8: dichiarazione esplicita di conformità (colonna NOT NULL senza default
  // in dichiarazioni_conformita — mascherata finora dal client non tipizzato).
  const testoConformita = "Il fabbricante dichiara che il presente dispositivo e' conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745."

  const firmaSha256 = await hashFirmaDdc((lab.firma_ddc_url ?? null) as string | null)

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
    // Fallback da paziente.nome_cognome se lo snapshot è nullo (Allegato XIII §4)
    paziente_nome: lavoro.paziente_nome_snapshot ?? lavoro.paziente?.nome_cognome ?? lavoro.paziente?.codice_paziente ?? '',
    paziente_cognome: null as string | null,
    tipo_dispositivo: lavoro.tipo_dispositivo as string,
    descrizione_dispositivo: lavoro.descrizione,
    denti_coinvolti: lavoro.denti_coinvolti ?? null,
    uso_esclusivo_paziente: 'Dispositivo fabbricato su misura esclusivamente per il paziente indicato',
    prescrizione_caratteristiche: null as string | null,
    contiene_sostanze_o_tessuti: false,
    sostanze_tessuti_dettaglio: null as string | null,
    classe_rischio: lavoro.classe_rischio,
    testo_conformita: testoConformita,
    testo_conformita_snapshot: testoConformita,
    prrc_nome: (lab.prrc_nome ?? '') as string,
    prrc_qualifica: (lab.prrc_qualifica ?? null) as string | null,
    firma_ddc_storage_path: (lab.firma_ddc_url ?? null) as string | null,
    firma_ddc_sha256: firmaSha256,
    // Priorità: rischi specifici per tipo dispositivo > testo generico del lab
    rischi_residui_snapshot: (rischiRow?.rischi_residui ?? lab.testo_rischi_default ?? null) as string | null,
    norme_json: (rischiRow?.norme_json ?? []) as Array<{ codice: string; titolo: string; anno?: number }>,
    data_emissione: new Date().toISOString(),
    stato: 'generata' as const,
  }

  // Genera PDF
  // norma_riferimento non è una colonna di dichiarazioni_conformita (solo del
  // lavoro): passata al template solo per il rendering, esclusa dall'insert.
  const ddcConNorma = { ...ddc, norma_riferimento: lavoro.norma_riferimento ?? null }
  const buffer = await renderPdfDocument(createElement(DdcTemplate, { lavoro, lab, ddc: ddcConNorma }))
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')
  // 🛑 Su `ddcConNorma`, MAI su `ddc`: v. il commento di `improntaPayload`.
  const payloadSha256 = improntaPayload(ddcConNorma)
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
      // D102 ① — le due colonne dichiarate come prova e mai scritte da nessuno.
      payload_sha256: payloadSha256,
      template_version: VERSIONE_TEMPLATE_DDC,
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
        .neq('stato', 'annullata')
        .maybeSingle()
      return { numero: existing?.numero_ddc ?? numero, url: existing?.pdf_url ?? pdfUrl }
    }
    throw new Error(`DdC insert failed: ${insertErr.message}`)
  }

  return { numero, url: pdfUrl }
}
