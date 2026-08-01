import 'server-only'
import { createElement } from 'react'
import { createHash } from 'node:crypto'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { DpaTemplate } from '@/components/features/pdf/DpaTemplate'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import type { Laboratorio, Cliente } from '@/types/domain'
import { annoRoma } from '@/lib/utils/data-roma'
import { generaProgressivo } from '@/lib/db/progressivi'
import { improntaDpa, VERSIONE_MODELLO_DPA } from '@/lib/pdf/dpa-modello'

/** Il risultato di un'EMISSIONE — non di una generazione.
 *
 *  🔑 La differenza è il punto dell'ondata: prima di D129/D130 `generateDpa()`
 *  rendeva un PDF al volo e UÀ non sapeva quale testo avesse in mano ogni
 *  studio. Ora ogni scarico lascia una riga in `data_processing_agreements`,
 *  con un numero progressivo vero e il file conservato nel contenitore privato.
 *
 *  `riemessa` dice se il documento è nato ADESSO. Nel Task 4 è sempre `true`
 *  (non c'è ancora nulla da riusare); il guard di riuso del Task 5 è ciò che le
 *  darà anche il valore `false`. */
export interface EmissioneDpa {
  buffer: Buffer
  numero_dpa: string      // es. "DPA-2026-0007"
  emissione_id: string    // uuid della riga di registro
  riemessa: boolean       // true = generata ora, false = restituita dall'archivio
}

function validateDpaData(lab: Laboratorio, cliente: Cliente): void {
  if (!lab.partita_iva && !lab.codice_fiscale) {
    throw new Error('DPA: laboratorio privo di Partita IVA e Codice Fiscale')
  }
  if (!cliente.partita_iva && !cliente.codice_fiscale) {
    throw new Error('DPA: cliente privo di Partita IVA e Codice Fiscale')
  }
}

export async function generateDpa(laboratorio_id: string, cliente_id: string): Promise<EmissioneDpa> {
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

  const impronta = improntaDpa(lab, cliente)

  // Guard di riuso (D130). Il confronto è su DUE cose insieme: impronta dei dati
  // E versione del modello — il testo può cambiare a dati identici (D126, 03/08).
  // 🛑 Il filtro laboratorio_id è esplicito: il client di servizio aggira la RLS.
  const { data: esistente } = await svc
    .from('data_processing_agreements')
    .select('id, numero_dpa, storage_path_pdf, payload_sha256, template_versione')
    .eq('laboratorio_id', laboratorio_id)
    .eq('dentista_id', cliente_id)
    .eq('payload_sha256', impronta)
    .eq('template_versione', VERSIONE_MODELLO_DPA)
    .is('deleted_at', null)
    // D132: «viva» comprende lo STATO. Lo stesso predicato dell'indice
    // dpa_emissione_viva_unica — se cambia uno, cambiano tutti e tre (indice,
    // guard, rilettura del Task 6). Senza questo filtro il guard restituirebbe
    // come corrente un contratto REVOCATO che l'indice considera morto.
    .not('stato', 'in', '("revocato","scaduto")')
    .order('emesso_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (esistente?.storage_path_pdf) {
    const { data: file } = await svc.storage.from('documenti').download(esistente.storage_path_pdf)
    if (file) {
      return {
        buffer: Buffer.from(await file.arrayBuffer()),
        numero_dpa: esistente.numero_dpa as string,
        emissione_id: esistente.id as string,
        riemessa: false,
      }
    }
    // File sparito dall'archivio: meglio un numero nuovo che una porta chiusa.
    // 🛑 MA PRIMA VA LIBERATA LA CHIAVE — senza questo UPDATE, con
    //    dpa_emissione_viva_unica in casa, la riemissione è una porta chiusa
    //    PERMANENTE: la riga orfana occupa la chiave (laboratorio, dentista,
    //    impronta, versione), l'INSERT qui sotto prende 23505, la rilettura del
    //    Task 6 ritrova la STESSA orfana e si ricade sul throw — e ogni clic,
    //    prima di fallire, brucia un progressivo e carica un PDF orfano in più,
    //    perché il caricamento precede l'INSERT.
    //    Il soft-delete lascia comunque TRACCIA: una riga il cui file non esiste
    //    più è un'emissione che non documenta niente, e archiviarla è un atto
    //    che deve risultare, non un effetto collaterale.
    await svc
      .from('data_processing_agreements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', esistente.id)
      .eq('laboratorio_id', laboratorio_id)   // il client di servizio aggira la RLS
    console.error('generateDpa — PDF conservato non trovato, riga archiviata e riemetto:', esistente.storage_path_pdf)
  }

  const anno = annoRoma()
  const progressivo = await generaProgressivo(svc, laboratorio_id, 'dpa', anno)
  const numero_dpa = `DPA-${anno}-${String(progressivo).padStart(4, '0')}`

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

  const buffer = await renderPdfDocument(createElement(DpaTemplate, { dpa }))

  // Il FILE prima della RIGA: se il caricamento fallisce, nessuna traccia resta
  // in banca dati. Stessa regola di D61 (immagini/[imgId]/route.ts:207-219).
  //
  // ⚠️ La promessa vale per `data_processing_agreements`, NON per la serie dei
  // numeri: `generaProgressivo` ha già incrementato `progressivi_anno` con una
  // RPC committata, e nessun errore qui sotto la annulla. Se l'archivio rifiuta,
  // quel numero è BRUCIATO e la serie mostra un buco. L'ordine è però FORZATO,
  // non distratto: `storage_path_pdf` contiene `numero_dpa`, quindi il numero
  // deve esistere prima del caricamento — invertire richiederebbe caricare su un
  // percorso provvisorio e poi spostarlo, che è fuori da questo task.
  const storage_path_pdf = `${laboratorio_id}/dpa/${anno}/${numero_dpa}.pdf`
  const { error: erroreFile } = await svc.storage
    .from('documenti')
    .upload(storage_path_pdf, buffer, { contentType: 'application/pdf', upsert: false })
  if (erroreFile) {
    console.error('generateDpa — caricamento del PDF fallito:', erroreFile.message)
    throw new Error('DPA: non è stato possibile conservare il documento')
  }

  const { data: riga, error: erroreRiga } = await svc
    .from('data_processing_agreements')
    .insert({
      laboratorio_id,
      tipo_controparte: 'dentista',
      dentista_id: cliente_id,
      stato: 'da_firmare',
      // 🛑 D133: la costante, MAI il letterale — porta dentro l'impronta del
      // testo, quindi cambia da sola quando cambia il contratto.
      template_versione: VERSIONE_MODELLO_DPA,
      numero_dpa,
      anno_dpa: anno,
      progressivo_dpa: progressivo,
      storage_path_pdf,
      pdf_sha256: createHash('sha256').update(buffer).digest('hex'),
      payload_sha256: impronta,
      emesso_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (erroreRiga || !riga) throw new Error(`DPA: registro non scritto — ${erroreRiga?.message ?? 'nessuna riga'}`)

  return { buffer, numero_dpa, emissione_id: riga.id, riemessa: true }
}
