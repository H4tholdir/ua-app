import 'server-only'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generaProgressivo } from '@/lib/db/progressivi'
import type { LavoroDettaglio } from '@/types/domain'

// ─── XML escaping ─────────────────────────────────────────────────────────────
function xe(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
}

// ─── Numeric formatting for FatturaPA (dot decimal, 2 places) ────────────────
function fmt2(n: number): string {
  return n.toFixed(2)
}

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

/**
 * Genera il file XML FatturaPA 1.2 per il lavoro indicato.
 *
 * @param lavoro       - LavoroDettaglio con join cliente e lavorazioni
 * @param fatturaId    - Se fornito, AGGIORNA la riga fatture esistente (draft → generata).
 *                       Se omesso, INSERISCE una nuova riga fatture.
 *                       Usare il parametro quando si parte da un draft creato via POST /api/fatture.
 */
export async function generaFatturaPA(
  lavoro: LavoroDettaglio,
  fatturaId?: string
): Promise<{ numero: string; stato_sdi: 'generata' }> {
  const supabase = getServiceClient()

  // ── 1. Carica dati laboratorio ───────────────────────────────────────────
  const { data: lab, error: labErr } = await supabase
    .from('laboratori')
    .select(
      'id, nome, ragione_sociale, partita_iva, codice_fiscale, indirizzo, cap, citta, provincia, regime_fiscale, pec, pec_host, pec_port, pec_user, pec_smtp_configurata, pec_vault_key_id'
    )
    .eq('id', lavoro.laboratorio_id)
    .single()

  if (labErr || !lab) {
    throw new Error(`Laboratorio non trovato: ${labErr?.message ?? 'null'}`)
  }

  const labRow = lab as unknown as LabRow
  const cliente = lavoro.cliente

  // ── 2. Genera progressivi ────────────────────────────────────────────────
  const progressivoFattura = await generaProgressivo(supabase, lavoro.laboratorio_id, 'fattura')
  const progressivoSdi = await generaProgressivo(supabase, lavoro.laboratorio_id, 'sdi_invio')

  const anno = new Date().getFullYear()
  const numero = `${anno}/${String(progressivoFattura).padStart(4, '0')}`
  const progressivoSdiStr = String(progressivoSdi).padStart(5, '0')

  // ── 3. Calcola importi ───────────────────────────────────────────────────
  const imponibile = lavoro.lavorazioni.reduce((acc, r) => acc + (r.importo ?? 0), 0)
  const bolloApplicato = imponibile > 77.47 ? 2.00 : 0
  const totale = imponibile + bolloApplicato

  // ── 4. Determina ragione sociale / denominazione ─────────────────────────
  const labDenominazione = labRow.ragione_sociale ?? labRow.nome
  const labPiva = labRow.partita_iva ?? labRow.codice_fiscale ?? ''

  const clienteDenominazione = cliente.studio_nome
    ?? `${xe(cliente.cognome)} ${xe(cliente.nome)}`.trim()

  // CodiceDestinatario: uso '0000000' se assente (prevede PEC come alternativa)
  const codiceDestinatario = cliente.codice_sdi ?? '0000000'
  const usaPec = !cliente.codice_sdi && !!cliente.pec

  // ── 5. Costruisce righe DettaglioLinee ───────────────────────────────────
  let righeXml = ''
  lavoro.lavorazioni.forEach((riga, idx) => {
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
  if (lavoro.lavorazioni.length === 0) {
    const prezzoUnit = lavoro.prezzo_unitario ?? 0
    righeXml = `
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>${xe(lavoro.descrizione)}</Descrizione>
        <Quantita>1.00</Quantita>
        <UnitaMisura>PZ</UnitaMisura>
        <PrezzoUnitario>${fmt2(prezzoUnit)}</PrezzoUnitario>
        <PrezzoTotale>${fmt2(prezzoUnit)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N4</Natura>
      </DettaglioLinee>`
  }

  // ── 6. Bollo virtuale (condizionale) ─────────────────────────────────────
  const bolloXml = bolloApplicato > 0
    ? `<DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>2.00</ImportoBollo></DatiBollo>`
    : ''

  // ── 7. CessionarioCommittente (cliente) ──────────────────────────────────
  const clienteFiscaleXml = cliente.partita_iva
    ? `<IdFiscaleIVA><IdPaese>${xe(cliente.paese ?? 'IT')}</IdPaese><IdCodice>${xe(cliente.partita_iva)}</IdCodice></IdFiscaleIVA>`
    : `<CodiceFiscale>${xe(cliente.codice_fiscale ?? '')}</CodiceFiscale>`

  // PECDestinatario (solo se non c'è codice_sdi)
  const pecDestinatarioXml = usaPec
    ? `<PECDestinatario>${xe(cliente.pec!)}</PECDestinatario>`
    : ''

  // ── 8. Data fattura ───────────────────────────────────────────────────────
  const oggi = new Date().toISOString().split('T')[0]

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
        <Indirizzo>${xe(cliente.indirizzo ?? '')}</Indirizzo>
        <CAP>${xe(cliente.cap ?? '00000')}</CAP>
        <Comune>${xe(cliente.citta ?? '')}</Comune>
        <Provincia>${xe(cliente.provincia ?? '')}</Provincia>
        <Nazione>${xe(cliente.paese ?? 'IT')}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${oggi}</Data>
        <Numero>${xe(numero)}</Numero>
        <ImportoTotaleDocumento>${fmt2(totale)}</ImportoTotaleDocumento>
        ${bolloXml}
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      ${righeXml}
      <DatiRiepilogo>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N4</Natura>
        <RiferimentoNormativo>Art. 10 n.18 DPR 633/72</RiferimentoNormativo>
        <ImponibileImporto>${fmt2(imponibile)}</ImponibileImporto>
        <Imposta>0.00</Imposta>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`

  // ── 10. Salva XML su Supabase Storage ────────────────────────────────────
  const storagePath = `${lavoro.laboratorio_id}/${anno}/${nomeFileXml}`
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

  const { data: urlData } = supabase.storage
    .from('fatture-pdf')
    .getPublicUrl(storagePath)

  const xmlUrl = urlData?.publicUrl ?? null

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
    xml_url: xmlUrl,
    nome_file_xml: nomeFileXml,
    xml_hash_sha256: hashHex,
    // Importi (ricalcolati a partire dalle lavorazioni)
    imponibile,
    iva_percentuale: 0,
    iva_importo: 0,
    bollo: bolloApplicato,
    totale,
  }

  let numeroFinale = numero

  if (fatturaId) {
    // UPDATE: finalizza il draft — recupera il numero esistente
    const { data: existingRow, error: fetchErr } = await supabase
      .from('fatture')
      .select('numero')
      .eq('id', fatturaId)
      .single()

    if (fetchErr || !existingRow) {
      throw new Error(`Fattura draft non trovata (id=${fatturaId}): ${fetchErr?.message ?? 'null'}`)
    }

    numeroFinale = (existingRow as { numero: string }).numero

    const { error: updateError } = await supabase
      .from('fatture')
      .update(xmlFields as Record<string, unknown>)
      .eq('id', fatturaId)

    if (updateError) {
      throw new Error(`UPDATE fattura fallito: ${updateError.message}`)
    }
  } else {
    // INSERT: crea nuova riga (flusso CONSEGNA automatica)
    const insertPayload = {
      laboratorio_id: lavoro.laboratorio_id,
      cliente_id: cliente.id,
      numero,
      anno,
      progressivo: progressivoFattura,
      data: oggi,
      tipo_documento: 'TD01',
      // Snapshot dati cliente (immutabilità fiscale)
      cliente_denominazione: clienteDenominazione,
      cliente_piva: cliente.partita_iva ?? null,
      cliente_cf: cliente.codice_fiscale ?? null,
      cliente_indirizzo: `${cliente.indirizzo ?? ''}, ${cliente.cap ?? ''} ${cliente.citta ?? ''} ${cliente.provincia ?? ''}`.trim(),
      cliente_codice_sdi: cliente.codice_sdi ?? null,
      cliente_pec: cliente.pec ?? null,
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
