import 'server-only'
import { createElement } from 'react'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generaProgressivo } from '@/lib/db/progressivi'
import type { LavoroDettaglio } from '@/types/domain'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { FatturaCortesiaTemplate, type FatturaCortesiaProps } from '@/components/features/pdf/FatturaCortesiaTemplate'
import { prezzoEffettivoLavoro, divergenzaPrezzo } from '@/lib/domain/prezzo-lavoro'

// Funzioni pure estratte in xml-helpers.ts (importabili anche nei test)
import { xe, fmt2, validaIdentificativoFiscale } from './xml-helpers'

// ─── Laboratorio row type (includes PEC SMTP fields not yet in domain.ts) ────
interface LabRow {
  id: string
  nome: string
  ragione_sociale: string | null
  partita_iva: string | null
  codice_fiscale: string | null
  indirizzo: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  regime_fiscale: string
  pec: string | null
  // SMTP PEC fields (stored in DB but not yet in domain.ts Laboratorio)
  pec_host: string | null
  pec_port: number | null
  pec_user: string | null
  pec_smtp_configurata: boolean
  pec_vault_key_id: string | null
}

/** Spezza una stringa in chunk da max 200 caratteri (limite XSD per <Causale>). */
function chunk200(s: string): string[] {
  const out: string[] = []
  for (let i = 0; i < s.length; i += 200) out.push(s.slice(i, i + 200))
  return out.length > 0 ? out : ['']
}

/**
 * Genera il file XML FatturaPA 1.2 per il lavoro indicato — oppure, quando il
 * draft caricato tramite `fatturaId` è una nota di credito (`tipo_documento
 * === 'TD04'`), genera lo storno leggendo SOLO dallo snapshot congelato sulla
 * riga `fatture` (numero/data/cliente/imponibile), MAI dal lavoro vivo.
 *
 * @param lavoro       - LavoroDettaglio con join cliente e lavorazioni.
 *                       Può essere `null` quando `fatturaId` punta a un draft
 *                       TD04 (Task 6: lo storno non ha un "lavoro" associato).
 * @param fatturaId    - Se fornito, AGGIORNA la riga fatture esistente (draft → generata).
 *                       Se omesso, INSERISCE una nuova riga fatture.
 *                       Usare il parametro quando si parte da un draft creato via POST /api/fatture.
 */
export async function generaFatturaPA(
  lavoro: LavoroDettaglio | null,
  fatturaId?: string
): Promise<{ numero: string; stato_sdi: 'generata' }> {
  const supabase = getServiceClient()

  // ── 0. Carica SUBITO il draft (quando fatturaId presente) ────────────────
  // Serve a decidere il ramo (tipo_documento) e, nel caso TD04, a risolvere
  // laboratorio_id/snapshot cliente dato che quel ramo non riceve `lavoro`.
  // Sostituisce anche la vecchia lettura separata di numero/progressivo/data.
  type DraftRow = {
    numero: string
    progressivo: number
    data: string
    tipo_documento: string | null
    imponibile: number | null
    collegata_numero: string | null
    collegata_data: string | null
    causale_storno: string | null
    cliente_denominazione: string | null
    cliente_piva: string | null
    cliente_cf: string | null
    cliente_indirizzo: string | null
    cliente_codice_sdi: string | null
    cliente_pec: string | null
    laboratorio_id: string
  }

  let draft: DraftRow | null = null
  if (fatturaId) {
    const { data: draftData, error: draftErr } = await supabase
      .from('fatture')
      .select(
        'numero, progressivo, data, tipo_documento, imponibile, collegata_numero, collegata_data, causale_storno, cliente_denominazione, cliente_piva, cliente_cf, cliente_indirizzo, cliente_codice_sdi, cliente_pec, laboratorio_id'
      )
      .eq('id', fatturaId)
      .single()
    if (draftErr || !draftData) {
      throw new Error(`Draft fattura non trovato (id=${fatturaId}): ${draftErr?.message ?? 'null'}`)
    }
    draft = draftData as unknown as DraftRow
  }

  const isTd04 = draft?.tipo_documento === 'TD04'

  if (!isTd04 && !lavoro) {
    throw new Error('generaFatturaPA: lavoro è richiesto per documenti non-TD04')
  }

  // Assertion difensiva TD04: il ramo storno non deve MAI derivare l'imponibile
  // dal lavoro vivo. Se un refactor futuro introducesse accidentalmente un
  // accesso a lavoro.lavorazioni dentro il ramo TD04, questo Proxy lo blocca a
  // runtime invece di fallire silenziosamente con un dato fiscale sbagliato.
  const lavoroEff: LavoroDettaglio | null = isTd04 && lavoro
    ? (new Proxy(lavoro, {
        get(target, prop, receiver) {
          if (prop === 'lavorazioni') {
            throw new Error('[TD04] imponibile deve venire dallo snapshot fattura, mai dal lavoro')
          }
          return Reflect.get(target, prop, receiver)
        },
      }) as LavoroDettaglio)
    : lavoro

  const laboratorioId = isTd04 ? draft!.laboratorio_id : lavoroEff!.laboratorio_id

  // ── 1. Carica dati laboratorio ───────────────────────────────────────────
  const { data: lab, error: labErr } = await supabase
    .from('laboratori')
    .select(
      'id, nome, ragione_sociale, partita_iva, codice_fiscale, indirizzo, cap, citta, provincia, regime_fiscale, pec, pec_host, pec_port, pec_user, pec_smtp_configurata, pec_vault_key_id'
    )
    .eq('id', laboratorioId)
    .single()

  if (labErr || !lab) {
    throw new Error(`Laboratorio non trovato: ${labErr?.message ?? 'null'}`)
  }

  const labRow = lab as unknown as LabRow
  // TD04: nessun "cliente" da lavoro — tutto il cessionario viene dallo snapshot.
  const cliente = isTd04 ? null : lavoroEff!.cliente

  // Campi cessionario unificati: snapshot fattura (TD04) oppure cliente vivo (TD01, invariato).
  const clientePivaEff = isTd04 ? draft!.cliente_piva : cliente!.partita_iva
  const clienteCfEff = isTd04 ? draft!.cliente_cf : cliente!.codice_fiscale
  const clienteCodiceSdiEff = isTd04 ? draft!.cliente_codice_sdi : cliente!.codice_sdi
  const clientePecEff = isTd04 ? draft!.cliente_pec : cliente!.pec
  const cessNazione = isTd04 ? 'IT' : (cliente!.paese ?? 'IT')
  const cessIndirizzo = isTd04 ? (draft!.cliente_indirizzo ?? '') : (cliente!.indirizzo ?? '')
  const cessCap = isTd04 ? '00000' : (cliente!.cap ?? '00000')
  const cessComune = isTd04 ? '' : (cliente!.citta ?? '')
  const cessProvincia = isTd04 ? '' : (cliente!.provincia ?? '')

  // Fix: validare identificativo fiscale cedente e cessionario prima di costruire XML
  validaIdentificativoFiscale(labRow.partita_iva, labRow.codice_fiscale, 'Laboratorio (cedente)')
  if (!clienteCodiceSdiEff && !clientePecEff) {
    // Warning: cliente senza SDI né PEC — l'XML sarà generato ma forse non recapitabile
    console.warn('[FatturaPA] Cliente senza codice SDI né PEC:', isTd04 ? fatturaId : cliente!.id)
  }

  // Assertion fiscale — invariante per ENTRAMBI i rami di emissione (draft e
  // automatico): ogni riga di lavorazione custom-made deve essere Natura N4.
  // Se una riga porta una natura diversa, l'XML la appiattirebbe comunque a
  // N4 (hardcoded sotto) producendo un errore fiscale silenzioso: si blocca
  // l'emissione a monte — PRIMA di generare progressivi (evita di bruciare
  // un numero fattura/SDI su un'emissione che verrà comunque rigettata).
  // TD04: la riga sintetica di storno è sempre N4 per costruzione — nessun
  // controllo da fare (e non si legge lavoro.lavorazioni, vedi assertion sopra).
  if (!isTd04 && lavoroEff!.lavorazioni.some((r) => r.natura_iva && r.natura_iva !== 'N4')) {
    throw new Error('Natura IVA non N4 su riga di lavorazione: FatturaPA custom-made richiede N4')
  }

  // ── 2. Determina numero fattura e progressivi ────────────────────────────
  // Fix divergenza DB/XML: se fatturaId presente, usa il numero del draft esistente
  // e NON generare un nuovo progressivo fattura (evita duplicati).
  const anno = new Date().getFullYear()
  const oggi = new Date().toISOString().split('T')[0]
  const progressivoSdi = await generaProgressivo(supabase, laboratorioId, 'sdi_invio')
  const progressivoSdiStr = String(progressivoSdi).padStart(5, '0')

  let numero: string
  let progressivoFattura: number
  let dataFattura: string

  if (fatturaId) {
    // draft già caricato in Sezione 0
    numero = draft!.numero
    progressivoFattura = draft!.progressivo
    dataFattura = draft!.data
  } else {
    // Nuovo insert: genera progressivo fresco
    progressivoFattura = await generaProgressivo(supabase, laboratorioId, 'fattura')
    numero = `${anno}-${String(progressivoFattura).padStart(4, '0')}`
    dataFattura = oggi
  }

  // ── 3. Calcola importi ───────────────────────────────────────────────────
  let imponibile: number
  if (isTd04) {
    // TD04: imponibile SOLO dallo snapshot congelato — mai da prezzoEffettivoLavoro(lavoro).
    imponibile = draft!.imponibile ?? 0
  } else {
    // N4: fonte unica del prezzo (righe se esistono, altrimenti prezzo_unitario).
    imponibile = prezzoEffettivoLavoro(lavoroEff!)
  }
  // BOLLO TD04: rispecchia la regola dell'originale — flag commercialista (spec §7.1)
  const bolloApplicato = imponibile > 77.47 ? 2.00 : 0
  const totale = imponibile + bolloApplicato

  // ── 4. Determina ragione sociale / denominazione ─────────────────────────
  const labDenominazione = labRow.ragione_sociale ?? labRow.nome
  const labPiva = labRow.partita_iva ?? labRow.codice_fiscale ?? ''

  // Raw value — xe() will be applied once when inserted into the XML template
  const clienteDenominazione = isTd04
    ? (draft!.cliente_denominazione ?? '')
    : (cliente!.studio_nome ?? `${cliente!.cognome ?? ''} ${cliente!.nome ?? ''}`.trim())

  // CodiceDestinatario: uso '0000000' se assente (prevede PEC come alternativa)
  const codiceDestinatario = clienteCodiceSdiEff ?? '0000000'
  const usaPec = !clienteCodiceSdiEff && !!clientePecEff

  // Indirizzo di cortesia (PDF): TD04 usa lo snapshot già combinato in un'unica
  // stringa; TD01 lo ricostruisce da indirizzo/cap/citta/provincia del cliente.
  const cortesiaClienteIndirizzo = isTd04
    ? (draft!.cliente_indirizzo ?? '')
    : `${cliente!.indirizzo ?? ''}, ${cliente!.cap ?? ''} ${cliente!.citta ?? ''} ${cliente!.provincia ?? ''}`.trim()

  // ── 5. Costruisce righe DettaglioLinee ───────────────────────────────────
  let righeXml = ''
  if (isTd04) {
    // Riga sintetica unica di storno — descrizione con riferimento alla fattura collegata.
    righeXml = `
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>${xe(`Storno integrale fattura n. ${draft!.collegata_numero} del ${draft!.collegata_data}`)}</Descrizione>
        <Quantita>1.00</Quantita>
        <UnitaMisura>PZ</UnitaMisura>
        <PrezzoUnitario>${fmt2(imponibile)}</PrezzoUnitario>
        <PrezzoTotale>${fmt2(imponibile)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N4</Natura>
      </DettaglioLinee>`
  } else {
    lavoroEff!.lavorazioni.forEach((riga, idx) => {
      const qta = riga.quantita ?? 1
      const prezzoUnit = riga.prezzo_unitario ?? 0
      const prezzoTotale = riga.importo ?? 0
      righeXml += `
      <DettaglioLinee>
        <NumeroLinea>${idx + 1}</NumeroLinea>
        <Descrizione>${xe(riga.descrizione)}</Descrizione>
        <Quantita>${fmt2(qta)}</Quantita>
        <UnitaMisura>${xe(riga.unita_misura)}</UnitaMisura>
        <PrezzoUnitario>${fmt2(prezzoUnit)}</PrezzoUnitario>
        <PrezzoTotale>${fmt2(prezzoTotale)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N4</Natura>
      </DettaglioLinee>`
    })

    // Se nessuna lavorazione, riga singola con prezzo_unitario del lavoro
    // (stessa regola di prezzoEffettivoLavoro — vedi ALLOWLIST in prezzo-tripwire.test.ts)
    if (lavoroEff!.lavorazioni.length === 0) {
      const prezzoUnit = lavoro?.prezzo_unitario ?? 0
      righeXml = `
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>${xe(lavoroEff!.descrizione)}</Descrizione>
        <Quantita>1.00</Quantita>
        <UnitaMisura>PZ</UnitaMisura>
        <PrezzoUnitario>${fmt2(prezzoUnit)}</PrezzoUnitario>
        <PrezzoTotale>${fmt2(prezzoUnit)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N4</Natura>
      </DettaglioLinee>`
    }
  }

  // ── 6. Bollo virtuale (condizionale) ─────────────────────────────────────
  const bolloXml = bolloApplicato > 0
    ? `<DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>2.00</ImportoBollo></DatiBollo>`
    : ''

  // ── 7. CessionarioCommittente (cliente) ──────────────────────────────────
  const clienteFiscaleXml = clientePivaEff
    ? `<IdFiscaleIVA><IdPaese>${xe(cessNazione)}</IdPaese><IdCodice>${xe(clientePivaEff)}</IdCodice></IdFiscaleIVA>`
    : `<CodiceFiscale>${xe(clienteCfEff ?? '')}</CodiceFiscale>`

  // PECDestinatario (solo se non c'è codice_sdi)
  const pecDestinatarioXml = usaPec
    ? `<PECDestinatario>${xe(clientePecEff!)}</PECDestinatario>`
    : ''

  // ── 8. TipoDocumento / DatiFattureCollegate / Causale (TD04) ─────────────
  const tipoDocumentoXml = isTd04 ? 'TD04' : 'TD01'

  // DatiFattureCollegate: SUBITO dopo </DatiGeneraliDocumento>, dentro DatiGenerali.
  const datiFattureCollegateXml = isTd04
    ? `
      <DatiFattureCollegate>
        <IdDocumento>${xe(draft!.collegata_numero)}</IdDocumento>
        <Data>${draft!.collegata_data}</Data>
      </DatiFattureCollegate>`
    : ''

  // Causale (solo TD04): chunk da 200 char per rispettare il limite XSD.
  const causaleXml = isTd04 && draft!.causale_storno
    ? chunk200(draft!.causale_storno).map((c) => `<Causale>${xe(c)}</Causale>`).join('')
    : ''

  // ── 9. Costruisce XML completo ────────────────────────────────────────────
  const nomeFileXml = `IT${labPiva}_${progressivoSdiStr}.xml`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12"
  xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${xe(labPiva)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${progressivoSdiStr}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${xe(codiceDestinatario)}</CodiceDestinatario>${pecDestinatarioXml ? `\n      ${pecDestinatarioXml}` : ''}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${xe(labPiva)}</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>${xe(labDenominazione)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>${xe(labRow.regime_fiscale ?? 'RF01')}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${xe(labRow.indirizzo ?? '')}</Indirizzo>
        <CAP>${xe(labRow.cap ?? '00000')}</CAP>
        <Comune>${xe(labRow.citta ?? '')}</Comune>
        <Provincia>${xe(labRow.provincia ?? '')}</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${clienteFiscaleXml}
        <Anagrafica>
          <Denominazione>${xe(clienteDenominazione)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${xe(cessIndirizzo)}</Indirizzo>
        <CAP>${xe(cessCap)}</CAP>
        <Comune>${xe(cessComune)}</Comune>
        <Provincia>${xe(cessProvincia)}</Provincia>
        <Nazione>${xe(cessNazione)}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>${tipoDocumentoXml}</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${dataFattura}</Data>
        <Numero>${xe(numero)}</Numero>
        ${bolloXml}
        <ImportoTotaleDocumento>${fmt2(totale)}</ImportoTotaleDocumento>
        ${causaleXml}
      </DatiGeneraliDocumento>${datiFattureCollegateXml}
    </DatiGenerali>
    <DatiBeniServizi>
      ${righeXml}
      <DatiRiepilogo>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N4</Natura>
        <ImponibileImporto>${fmt2(imponibile)}</ImponibileImporto>
        <Imposta>0.00</Imposta>
        <RiferimentoNormativo>Art. 10 n.18 DPR 633/72</RiferimentoNormativo>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`

  // ── 10. Salva XML su Supabase Storage ────────────────────────────────────
  const storagePath = `${laboratorioId}/${anno}/${nomeFileXml}`
  const xmlBytes = Buffer.from(xml, 'utf-8')

  const { error: uploadError } = await supabase.storage
    .from('fatture-pdf')
    .upload(storagePath, xmlBytes, {
      contentType: 'application/xml',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Upload XML FatturaPA fallito: ${uploadError.message}`)
  }

  // ── 10b. Copia di cortesia PDF — stessi dati dell'XML (Ondata 2) ─────────
  // Se il render/upload fallisce si lancia PRIMA dell'UPDATE/INSERT fatture:
  // il draft resta draft e il retry è pulito (stesso contratto dell'upload XML).
  const righeCortesia = isTd04
    ? [{
        descrizione: `Storno integrale fattura n. ${draft!.collegata_numero} del ${draft!.collegata_data}`,
        quantita: 1,
        unita_misura: 'PZ',
        prezzo_unitario: imponibile,
        importo: imponibile,
      }]
    : lavoroEff!.lavorazioni.length > 0
      ? lavoroEff!.lavorazioni.map((r) => ({
          descrizione: r.descrizione,
          quantita: r.quantita ?? 1,
          unita_misura: r.unita_misura ?? 'PZ',
          prezzo_unitario: r.prezzo_unitario ?? 0,
          importo: r.importo ?? 0,
        }))
      : [{
          descrizione: lavoroEff!.descrizione,
          quantita: 1,
          unita_misura: 'PZ',
          // stessa regola di prezzoEffettivoLavoro — vedi ALLOWLIST in prezzo-tripwire.test.ts
          prezzo_unitario: lavoro?.prezzo_unitario ?? 0,
          importo: lavoro?.prezzo_unitario ?? 0,
        }]

  const propsCortesia: FatturaCortesiaProps = {
    lab: {
      denominazione: labDenominazione,
      partita_iva: labPiva,
      indirizzo: labRow.indirizzo,
      cap: labRow.cap,
      citta: labRow.citta,
      provincia: labRow.provincia,
    },
    cliente: {
      denominazione: clienteDenominazione,
      piva: clientePivaEff ?? null,
      cf: clienteCfEff ?? null,
      indirizzo: cortesiaClienteIndirizzo,
    },
    fattura: { numero, data: dataFattura, tipo_documento: tipoDocumentoXml },
    righe: righeCortesia,
    imponibile,
    bollo: bolloApplicato,
    totale,
  }
  const pdfBuffer = await renderPdfDocument(createElement(FatturaCortesiaTemplate, propsCortesia))
  const pdfStoragePath = `${laboratorioId}/${anno}/cortesia/Fattura-${numero}.pdf`

  const { error: pdfUploadError } = await supabase.storage
    .from('fatture-pdf')
    .upload(pdfStoragePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (pdfUploadError) {
    throw new Error(`Upload PDF cortesia fallito: ${pdfUploadError.message}`)
  }

  // ── 11. Hash SHA-256 del file XML ─────────────────────────────────────────
  const hashBuffer = await crypto.subtle.digest('SHA-256', xmlBytes)
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // ── 12. INSERT o UPDATE record fatture ───────────────────────────────────
  // - Con fatturaId: aggiorna il draft esistente (flusso da /api/fatture/[id]/xml)
  // - Senza fatturaId: inserisce una nuova riga (flusso da CONSEGNA automatica)
  //
  // Campi allineati alla migration 002_fase2_schema.sql (v1.1 domain.ts)
  const xmlFields = {
    // SDI
    stato_sdi: 'generata',
    progressivo_sdi: progressivoSdiStr,
    // XML archiviato
    xml_storage_path: storagePath,
    nome_file_xml: nomeFileXml,
    xml_hash_sha256: hashHex,
    // Copia di cortesia PDF (Ondata 2)
    pdf_storage_path: pdfStoragePath,
    // Importi (ricalcolati a partire dalle lavorazioni)
    imponibile,
    iva_percentuale: 0,
    iva_importo: 0,
    bollo: bolloApplicato,
    totale,
  }

  // numero è già corretto (risolto in step 2)
  const numeroFinale = numero

  if (fatturaId) {
    const { error: updateError } = await supabase
      .from('fatture')
      .update(xmlFields as Record<string, unknown>)
      .eq('id', fatturaId)

    if (updateError) {
      throw new Error(`UPDATE fattura fallito: ${updateError.message}`)
    }
  } else {
    // INSERT: crea nuova riga (flusso CONSEGNA automatica)
    // Log best-effort (non bloccante): se righe e prezzo_unitario divergono,
    // le righe vincono comunque (prezzoEffettivoLavoro) — questo warn serve
    // solo a rendere visibile il disallineamento a valle, senza fermare
    // l'emissione automatica (nessun operatore presente per confermare).
    const dv = divergenzaPrezzo(lavoroEff!)
    if (dv.divergente) {
      console.warn('[N4] divergenza prezzo in emissione automatica', {
        lavoroId: lavoroEff!.id,
        deltaCents: dv.deltaCents,
      })
    }

    const insertPayload = {
      laboratorio_id: laboratorioId,
      cliente_id: cliente!.id,
      lavoro_id: lavoroEff!.id, // B-2: ogni fattura legata a un lavoro porta lavoro_id (gate annullo)
      numero,
      anno,
      progressivo: progressivoFattura,
      data: oggi,
      tipo_documento: 'TD01',
      // Snapshot dati cliente (immutabilità fiscale)
      cliente_denominazione: clienteDenominazione,
      cliente_piva: clientePivaEff ?? null,
      cliente_cf: clienteCfEff ?? null,
      cliente_indirizzo: cortesiaClienteIndirizzo,
      cliente_codice_sdi: clienteCodiceSdiEff ?? null,
      cliente_pec: clientePecEff ?? null,
      codice_iva: 'N4',
      natura_iva: 'N4',
      ...xmlFields,
    }

    const { error: insertError } = await supabase
      .from('fatture')
      .insert(insertPayload as Record<string, unknown>)

    if (insertError) {
      throw new Error(`INSERT fattura fallito: ${insertError.message}`)
    }
  }

  return { numero: numeroFinale, stato_sdi: 'generata' }
}
