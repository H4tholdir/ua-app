// src/lib/consegna/precheck-mdr.ts
export interface MaterialeLavorazione {
  nome: string
  lotto: string
  scadenza: string
}

export interface LavorazioneItem {
  id: string
  nome: string
  quantita: number
}

export interface PrecheckInput {
  laboratorio_itca: string
  materiali: MaterialeLavorazione[]
  paziente_codice_gdpr: string
  tipo_dispositivo: string
  lavorazioni: LavorazioneItem[]
  dentista_piva: string
  data_consegna: string
  numero_ddc: string
  prescrizione_ricevuta: boolean
  conformita_fornitore: boolean
  non_conformita_aperte: boolean   // MUST be loaded server-side, never from client
  laboratorio_firma_url: string
}

export interface PrecheckError {
  campo: string
  messaggio: string
  riferimento: string
}

export interface PrecheckResult {
  passed: boolean
  errors: PrecheckError[]
}

export function runPrecheckMdr(input: PrecheckInput): PrecheckResult {
  const errors: PrecheckError[] = []

  // 1. ITCA
  if (!input.laboratorio_itca?.trim()) {
    errors.push({ campo: 'laboratorio_itca', messaggio: 'Codice ITCA mancante nelle impostazioni del laboratorio', riferimento: 'Registro ITCA Ministero Salute — obbligatorio per DM su misura' })
  }

  // 2. Materiali con lotto
  const senzaLotto = input.materiali.filter(m => !m.lotto?.trim())
  if (senzaLotto.length > 0) {
    errors.push({ campo: 'materiali_lotti', messaggio: `${senzaLotto.length} materiale/i senza numero di lotto: ${senzaLotto.map(m => m.nome).join(', ')}`, riferimento: 'Art. 25 MDR 2017/745 — tracciabilità nella filiera, numero di lotto obbligatorio' })
  }

  // 3. Paziente codice GDPR
  if (!input.paziente_codice_gdpr?.trim()) {
    errors.push({ campo: 'paziente_codice_gdpr', messaggio: 'Codice paziente mancante — richiesto per pseudonimizzazione GDPR', riferimento: 'GDPR Art. 9 — trattamento dati sanitari' })
  }

  // 4. Tipo dispositivo
  if (!input.tipo_dispositivo?.trim()) {
    errors.push({ campo: 'tipo_dispositivo', messaggio: 'Tipo dispositivo non specificato', riferimento: 'Allegato XIII §1 MDR 2017/745 — elemento obbligatorio DdC' })
  }

  // 5. Almeno una lavorazione
  if (!input.lavorazioni?.length) {
    errors.push({ campo: 'lavorazioni', messaggio: 'Nessuna lavorazione associata al lavoro', riferimento: 'Allegato XIII §1 MDR 2017/745 — descrizione dispositivo obbligatoria' })
  }

  // 6. Dentista P.IVA
  if (!input.dentista_piva?.trim()) {
    errors.push({ campo: 'dentista_piva', messaggio: 'P.IVA o Codice Fiscale del dentista prescrivente mancante', riferimento: 'Art. 2(3) MDR 2017/745 — prescrittore identificato obbligatoriamente' })
  }

  // 7. Data consegna
  if (!input.data_consegna) {
    errors.push({ campo: 'data_consegna', messaggio: 'Data di consegna non impostata', riferimento: 'Allegato XIII §1 MDR — data obbligatoria' })
  } else {
    const dataConsegna = new Date(input.data_consegna)
    const trentaGiorniFa = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    if (dataConsegna < trentaGiorniFa) {
      errors.push({ campo: 'data_consegna', messaggio: `Data consegna (${dataConsegna.toLocaleDateString('it-IT')}) è più di 30 giorni nel passato`, riferimento: 'Allegato XIII — data consegna deve essere accurata' })
    }
  }

  // 8. Numero DdC
  if (!input.numero_ddc?.trim()) {
    errors.push({ campo: 'numero_ddc', messaggio: 'Numero progressivo DdC non disponibile', riferimento: 'Allegato XIII — numerazione DdC obbligatoria' })
  }

  // 9. Prescrizione ricevuta
  if (!input.prescrizione_ricevuta) {
    errors.push({ campo: 'prescrizione_ricevuta', messaggio: 'Conferma ricezione prescrizione non registrata', riferimento: 'Art. 2(3) MDR 2017/745 — produzione su base di prescrizione obbligatoria' })
  }

  // 10. Conformità fornitore
  if (!input.conformita_fornitore) {
    errors.push({ campo: 'conformita_fornitore', messaggio: 'Conformità materiali del fornitore non confermata', riferimento: 'Allegato I GSPR §10 MDR 2017/745 — proprietà biologiche e chimiche dei materiali' })
  }

  // 11. Non conformità aperte (loaded server-side)
  if (input.non_conformita_aperte) {
    errors.push({ campo: 'non_conformita_aperte', messaggio: 'Esistono non conformità aperte per questo dispositivo — risolverle prima della consegna', riferimento: 'ISO 13485 §8.3 — gestione non conformità' })
  }

  // 12. Firma laboratorio
  if (!input.laboratorio_firma_url?.trim()) {
    errors.push({ campo: 'laboratorio_firma', messaggio: 'Firma del laboratorio non configurata nelle Impostazioni', riferimento: 'Allegato XIII §1 MDR 2017/745 — firma fabbricante obbligatoria sulla DdC (elemento 8)' })
  }

  return { passed: errors.length === 0, errors }
}
