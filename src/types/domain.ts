// UÀ — Domain Types
// Fonte: ANALISI/31_fase2_spec_completo.md §11
// Aggiornato: 2026-05-14 (patch v1.1: stato ricevuto, tracking spedizioni)

// ============================================================
// LABORATORIO
// ============================================================
export interface Laboratorio {
  id: string;
  nome: string;
  ragione_sociale: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string | null;
  pec: string | null;
  logo_url: string | null;
  logo_print_url: string | null;
  codice_itca: string | null;
  srn_eudamed: string | null;
  prrc_nome: string | null;
  prrc_qualifica: string | null;
  firma_url: string | null;
  firma_ddc_url: string | null;
  sfondo_ddc_url: string | null;
  intestazione_ddc: string | null;
  intestazione_fattura: string | null;
  intestazione_buono: string | null;
  regime_fiscale: string;
  codice_iva_default: string;
  // PEC: la password NON va in DB — va in Supabase Vault (Codex fix CTO #1)
  // Qui solo host/porta/utente + riferimento al secret Vault
  pec_vault_key_id: string | null;       // ID del secret Vault che contiene la password PEC
  pec_smtp_configurata: boolean;
  piano: 'freemium' | 'solo' | 'lab' | 'studio';
}

// ============================================================
// RETE MULTI-LAB (Codex fix Esperto 5 — multi-sede €129)
// ============================================================
export interface Rete {
  id: string;
  nome: string;
  admin_laboratorio_id: string;     // Lab che amministra la rete
  created_at: string;
  updated_at: string;
}

export interface ReteMembro {
  rete_id: string;
  laboratorio_id: string;
  ruolo: 'admin_rete' | 'membro';
  joined_at: string;
}

export interface ReteDashboard {
  rete: Rete;
  laboratori: Array<{
    laboratorio: Pick<Laboratorio, 'id' | 'nome' | 'citta' | 'piano'>;
    kpi: Pick<DashboardStats, 'lavori_attivi' | 'lavori_in_ritardo' | 'mdr_incompleti'>;
  }>;
}

// ============================================================
// PSUR — Periodic Safety Update Report (MDR Art. 86)
// ============================================================
export interface Psur {
  id: string;
  laboratorio_id: string;
  anno_riferimento: number;
  periodo_inizio: string;            // ISO date
  periodo_fine: string;              // ISO date
  // Dati aggregati (calcolati al momento della generazione)
  totale_dispositivi: number;
  totale_non_conformita: number;
  totale_incidenti: number;
  totale_reclami: number;
  totale_rifacimenti: number;
  // Testi liberi (PRRC compila)
  valutazione_benefici_rischi: string | null;
  conclusioni: string | null;
  misure_correttive: string | null;
  // Documento generato
  pdf_url: string | null;
  pdf_sha256: string | null;
  firmato_at: string | null;
  prrc_nome_snapshot: string | null;
  stato: 'bozza' | 'completato' | 'firmato';
  created_at: string;
  updated_at: string;
}

// ============================================================
// NOMINA PRRC (strutturata, con firme — Codex fix MDR #4)
// ============================================================
export interface NominaPrrc {
  id: string;
  laboratorio_id: string;
  // Dati PRRC al momento della nomina (snapshot)
  prrc_nome: string;
  prrc_cognome: string;
  prrc_qualifica: string | null;
  prrc_numero_albo: string | null;
  // Nomina
  data_nomina: DATE_STRING;
  firma_titolare_url: string | null;
  firma_prrc_url: string | null;         // Controfirma del PRRC
  prrc_ha_accettato: boolean;
  prrc_accettato_at: string | null;
  // PDF
  pdf_url: string | null;
  pdf_sha256: string | null;
  valida_dal: string;
  valida_al: string | null;              // NULL = valida a tempo indeterminato
  revocata: boolean;
  revoca_data: string | null;
  created_at: string;
}

type DATE_STRING = string; // ISO date "YYYY-MM-DD"

// ============================================================
// CLIENTE
// ============================================================
export interface Cliente {
  id: string;
  laboratorio_id: string;
  studio_nome: string | null;
  nome: string;
  cognome: string;
  telefono: string | null;
  email: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;
  codice_sdi: string | null;
  pec: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  paese: string;
  listino_numero: 1 | 2 | 3 | 4;
  sconto_percentuale: number;
  tecnico_default_id: string | null;
  modalita_pagamento: string | null;
  non_soggetto_fe: boolean;
  portale_token: string;
  note: string | null;
}

// ============================================================
// PAZIENTE
// ============================================================
export interface Paziente {
  id: string;
  laboratorio_id: string;
  cliente_id: string;
  codice_paziente: string | null;
  nome: string | null;
  cognome: string | null;
  nome_cognome: string; // deprecata in v1.2, mantenuta per retrocompatibilità
  data_nascita: string | null; // ISO date string
  codice_fiscale: string | null;
  sesso: 'M' | 'F' | null;
  comune_nascita: string | null;
  partita_iva: string | null;
  asl: string | null;
  note: string | null;
  anamnesi: string | null;
  archiviato: boolean;
}

// ============================================================
// LAVORO — stato e tipi
// ============================================================
export type TipoDispositivo =
  | 'protesi_fissa'
  | 'protesi_mobile'
  | 'implantologia'
  | 'cad_cam'
  | 'scheletrato'
  | 'ortodonzia'
  | 'provvisorio'
  | 'riparazione'
  | 'altro';

// PATCH v1.1: aggiunto 'ricevuto' come stato iniziale prima della lavorazione
export type StatoLavoro =
  | 'ricevuto'       // appena arrivato, non ancora iniziato
  | 'in_lavorazione'
  | 'in_prova'
  | 'pronto'
  | 'consegnato'
  | 'annullato'
  | 'in_ritardo';

export type PrioritaLavoro = 'normale' | 'urgente' | 'extra_urgente';
export type ClasseRischio = 'classe_i' | 'classe_iia' | 'classe_iib' | 'classe_iii';

// Corrieri supportati (PATCH v1.1 — tracking spedizioni)
export type Corriere = 'gls' | 'brt' | 'dhl' | 'sda' | 'ups' | 'fedex' | 'interno' | 'altro';
export type StatoSpedizione = 'da_spedire' | 'spedito' | 'consegnato_corriere' | 'problema';

// ============================================================
// LAVORO — tipo base (dalla tabella)
// ============================================================
export interface Lavoro {
  id: string;
  laboratorio_id: string;
  numero_lavoro: string;
  // Idempotency CONSEGNA (Codex fix #1/#2)
  consegna_in_corso: boolean;          // lock ottimistico: TRUE mentre CONSEGNA è in esecuzione
  anno_lavoro: number;
  codice_interno: string | null;
  numero_prescrizione: string | null;
  numero_cassetta: string | null;
  cliente_id: string;
  paziente_id: string | null;
  tecnico_id: string | null;
  ciclo_id: string | null;
  paziente_nome_snapshot: string | null;
  paziente_nascita_snapshot: string | null;
  tipo_dispositivo: TipoDispositivo;
  descrizione: string;
  note_interne: string | null;
  richiedente_nome: string | null;
  // Campi colore (tab Clinica)
  colore_dente: string | null;
  colore_collo: string | null;
  colore_corpo: string | null;
  colore_incisale: string | null;
  effetti_speciali: string | null;
  tecnica_colore: string | null;
  colorazione_esterna: string | null;
  denti_coinvolti: string[] | null;
  arcata: 'superiore' | 'inferiore' | 'entrambe' | null;
  // Anamnesi
  anamnesi_note: string | null;
  anamnesi_bruxismo: boolean;
  anamnesi_precauzioni: string | null;
  anamnesi_altri_dispositivi: string | null;
  // MDR
  classe_rischio: ClasseRischio;
  norma_riferimento: string | null;
  da_conformare: boolean;
  dispositivo_semilavorato: boolean;
  // Workflow
  stato: StatoLavoro;
  priorita: PrioritaLavoro;
  // Date
  data_ingresso: string;
  data_consegna_prevista: string;
  ora_consegna: string | null;
  data_prima_prova: string | null;
  data_seconda_prova: string | null;
  data_terza_prova: string | null;
  data_consegna_effettiva: string | null;
  // File
  file_stl_url: string | null;
  immagini_urls: string[] | null;
  impronta_digitale: boolean;
  // Prezzi
  listino_id: string | null;
  prezzo_unitario: number | null;
  codice_iva: string;
  natura_iva: string;
  incluso_in_fattura: boolean;
  // MDR conformità
  conformato: boolean;
  data_conformazione: string | null;
  is_rifacimento: boolean;             // flag strutturato (Codex fix #13 — sostituisce ILIKE '%rifacimento%')
  // Tracking CONSEGNA (metriche NSM)
  consegna_tap_at: string | null;
  consegna_completata_at: string | null;
  post_consegna_correzioni: number;
  consegna_precheck_passato_al_primo_tentativo: boolean | null;
  // PATCH v1.1 — Tracking spedizioni
  spedizione_corriere: Corriere | null;
  spedizione_tracking: string | null;
  spedizione_stato: StatoSpedizione | null;
  spedizione_data_prevista: string | null;
  spedizione_note: string | null;
  // Audit
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================================
// LAVORO DETTAGLIO — con join
// ============================================================
export interface LavoroDettaglio extends Lavoro {
  cliente: Cliente;
  paziente: Paziente | null;
  tecnico: Tecnico | null;
  lavorazioni: LavoroLavorazione[];
  appuntamenti: LavoroAppuntamento[];
  immagini: LavoroImmagine[];
  fasi: LavoroFase[];
  materiali: LavoroMateriale[];
  partitario: LavoroPartitario[];
  ddc: DichiarazioneConformita | null;
}

// ============================================================
// LAVORO CARD — per liste e dashboard
// ============================================================
export interface LavoroCard {
  id: string;
  numero_lavoro: string;
  stato: StatoLavoro;
  priorita: PrioritaLavoro;
  tipo_dispositivo: TipoDispositivo;
  descrizione: string;
  data_consegna_prevista: string;
  ora_consegna: string | null;
  paziente_nome_snapshot: string | null;
  cliente: Pick<Cliente, 'id' | 'nome' | 'cognome' | 'studio_nome' | 'telefono'>;
  tecnico: Pick<Tecnico, 'id' | 'nome' | 'cognome' | 'sigla'> | null;
  conformato: boolean;
  incluso_in_fattura: boolean;
  spedizione_stato: StatoSpedizione | null;
  spedizione_tracking: string | null;
}

// ============================================================
// LAVORO LAVORAZIONE (riga di dettaglio)
// ============================================================
export interface LavoroLavorazione {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  listino_id: string | null;
  codice: string;
  descrizione: string;
  quantita: number;
  unita_misura: string;
  prezzo_unitario: number;
  sconto_percentuale: number;
  maggiorazione: number;
  importo: number;
  calo: number | null;
  codice_iva: string;
  natura_iva: string;
  esterna: boolean;
  lab_esterno: string | null;
  ordine: number;
}

// ============================================================
// APPUNTAMENTO
// ============================================================
export type TipoAppuntamento = 'prova' | 'consegna' | 'ritiro' | 'altro';

export interface LavoroAppuntamento {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  data_appuntamento: string;
  ora_appuntamento: string | null;
  tipo: TipoAppuntamento;
  numero_prova: 1 | 2 | 3 | 4 | null;
  completato: boolean;
  esito: 'ok' | 'richiede_modifica' | 'annullato' | null;
  note: string | null;
}

// ============================================================
// IMMAGINE
// ============================================================
export interface LavoroImmagine {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  url: string;
  storage_path: string;
  nome_file: string | null;
  descrizione: string | null;
  data_scatto: string | null;
  tipo: 'foto' | 'scan' | 'rx' | 'altro';
  ordine: number;
}

// ============================================================
// FASE DI PRODUZIONE (esecuzione per singolo lavoro)
// ============================================================
export interface LavoroFase {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  fase_id: string;
  tecnico_id: string | null;
  eseguita_at: string | null;
  esito: 'ok' | 'non_conforme' | 'parziale' | null;
  note: string | null;
  materiali_usati: string | null;
  attrezzatura_usata: string | null;
  valore_misurato: string | null;
  non_conforme: boolean;
  azione_correttiva: string | null;
  fase: {
    codice_fase: string;
    descrizione: string;
    ordine: number;
    obbligatoria: boolean;
    misurazioni_da_rilevare: boolean;
  };
}

// ============================================================
// MATERIALE USATO (tracciabilità lotto)
// ============================================================
export interface LavoroMateriale {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  lotto_id: string;
  magazzino_id: string;
  quantita_usata: number;
  unita_misura: string;
  data_uso: string;
  numero_lotto_snapshot: string;
  nome_materiale_snapshot: string;
  produttore_snapshot: string | null;
}

// ============================================================
// PARTITARIO (pagamenti per lavoro)
// ============================================================
export type ModalitaPagamento = 'contante' | 'bonifico' | 'assegno' | 'pos' | 'altro';

export interface LavoroPartitario {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  data_pagamento: string;
  importo: number;
  modalita: ModalitaPagamento;
  riferimento: string | null;
  note: string | null;
}

// ============================================================
// DICHIARAZIONE DI CONFORMITÀ
// Tutti i campi _snapshot sono immutabili dopo generazione (Codex fix #4)
// Copertura completa Allegato XIII MDR 2017/745 (Codex expert #2)
// ============================================================
export interface DichiarazioneConformita {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  numero_ddc: string;
  anno_ddc: number;
  progressivo_ddc: number;
  // PDF archiviato
  pdf_url: string | null;
  pdf_sha256: string | null;
  storage_path_pdf: string | null;
  pdf_generato_at: string | null;
  // Invio al dentista
  inviata_al_dentista: boolean;
  inviata_al_dentista_at: string | null;
  data_emissione: string;
  stato: 'bozza' | 'generata' | 'firmata' | 'consegnata';
  // §1 Allegato XIII — Fabbricante (snapshot immutabile)
  fabbricante_nome: string;
  fabbricante_indirizzo: string;
  fabbricante_piva: string;
  fabbricante_itca: string | null;
  luogo_emissione: string;               // Es. "Serre (SA), Italia"
  // §3 — Prescrittore
  prescrittore_nome: string;
  prescrizione_id: string | null;        // Numero prescrizione del dentista
  // §4 — Paziente
  paziente_nome: string;
  paziente_cognome: string | null;
  // §5 — Dispositivo
  tipo_dispositivo: string;
  descrizione_dispositivo: string;
  denti_coinvolti: string[] | null;
  uso_esclusivo_paziente: string;        // "Dispositivo fabbricato su misura esclusivamente per..."
  prescrizione_caratteristiche: string | null; // Caratteristiche specifiche prescritte
  contiene_sostanze_o_tessuti: boolean;
  sostanze_tessuti_dettaglio: string | null;
  // §6 — Classificazione rischio
  classe_rischio: ClasseRischio;
  norma_riferimento: string | null;
  // §7 — Conformità (snapshot testo completo)
  testo_conformita_snapshot: string;
  // §8 — Firma PRRC (snapshot immutabile)
  prrc_nome: string;
  prrc_qualifica: string | null;
  firma_ddc_storage_path: string | null; // Path firma in Storage
  firma_ddc_sha256: string | null;       // Hash integrità firma
  // Rischi residui (da rischi_tipo_dispositivo, non da lab.testo_rischi_default)
  rischi_residui_snapshot: string | null;
}

// ============================================================
// PAYLOAD E RISULTATI TAP CONSEGNA
// ============================================================
export interface ConsegnaPayload {
  lavoro_id: string;
}

export interface ConsegnaPrecheckResult {
  ok: boolean;
  errori: {
    elemento: number; // 1-8 (Allegato XIII MDR)
    descrizione: string;
    campo: string;
    route: string;
  }[];
}

export interface ConsegnaResult {
  ok: true;
  lavoro_id: string;
  numero_lavoro: string;
  ddc: { numero: string; url: string; signed_url: string };
  buono: { numero: string; url: string; signed_url: string };
  fattura: { numero: string; stato_sdi: string } | null;
  whatsapp_url: string;
  tempo_ms: number;
}

export interface ConsegnaError {
  ok: false;
  tipo: 'precheck_fallito' | 'errore_pdf' | 'errore_upload' | 'errore_fattura' | 'errore_pec';
  messaggio: string;
  errori_precheck?: ConsegnaPrecheckResult['errori'];
}

// ============================================================
// FATTURA
// ============================================================

// Stati SDI granulari — allineati a spec §15.8 e migration v1.2
// 'inviata' RIMOSSO (ambiguo) — usare smtp_inviata o pec_consegnata
export type StatoSDI =
  | 'draft'            // XML non ancora generato
  | 'generata'         // XML prodotto e salvato in storage
  | 'smtp_inviata'     // SMTP ha accettato (NON è prova fiscale)
  | 'pec_consegnata'   // Ricevuta di consegna PEC ricevuta
  | 'ricevuta_sdi'     // SDI ha assegnato numero ricezione
  | 'accettata'        // SDI ha accettato la fattura
  | 'rifiutata'        // SDI ha rifiutato (con codice errore)
  | 'scaduta';         // Nessuna risposta SDI dopo 5 giorni

export interface Fattura {
  id: string;
  laboratorio_id: string;
  cliente_id: string;
  numero: string;
  anno: number;
  progressivo: number;
  data: string;
  // TD01=normale, TD02=acconto/anticipo, TD04=nota credito, TD05=nota debito, TD06=parcella
  tipo_documento: 'TD01' | 'TD02' | 'TD04' | 'TD05' | 'TD06' | string;
  stato_sdi: StatoSDI;
  imponibile: number;
  imponibile_netto: number | null;
  iva_importo: number;
  bollo: number;
  totale: number;
  codice_cup: string | null;
  codice_cig: string | null;
  progressivo_invio: number | null;
  nome_file_xml: string | null;
  xml_url: string | null;
  xml_hash_sha256: string | null;
  inviata_via: 'pec' | 'sdi_coop' | null;
  inviata_at: string | null;
  ricevuta_sdi_at: string | null;
  codice_esito_sdi: string | null;
  messaggio_esito_sdi: string | null;
  note: string | null;
}

// ============================================================
// TECNICO
// ============================================================
export interface Tecnico {
  id: string;
  laboratorio_id: string;
  utente_id: string | null;
  nome: string;
  cognome: string;
  sigla: string | null;
  qualifica: string | null;
  numero_albo: string | null;
  prrc: boolean;
  tipo_compenso: 'fisso' | 'percentuale' | 'per_lavorazione' | null;
  compenso_base: number | null;
}

// ============================================================
// VOCE LISTINO
// ============================================================
export interface VoceListino {
  id: string;
  laboratorio_id: string;
  codice: string;
  nome: string;
  descrizione: string | null;
  categoria: string;
  prezzo_1: number | null;
  prezzo_2: number | null;
  prezzo_3: number | null;
  prezzo_4: number | null;
  tipo_dispositivo_mdr: string | null;
  classe_rischio: ClasseRischio | null;
  da_conformare: boolean;
  norma_riferimento: string | null;
  ciclo_id: string | null;
  unita_misura: string;
  codice_iva: string;
  compenso_tecnico: number | null;
  attivo: boolean;
}

// ============================================================
// ARTICOLO MAGAZZINO
// ============================================================
export interface ArticoloMagazzino {
  id: string;
  laboratorio_id: string;
  fornitore_id: string | null;
  codice_articolo: string;
  nome: string;
  produttore: string | null;
  categoria: string | null;
  sotto_categoria: string | null;
  um_acquisto: string;
  um_scarico: string;
  quantita_per_confezione: number;
  costo_unitario: number | null;
  prezzo_unitario: number | null;
  scorta_attuale: number;
  scorta_minima: number;
  dispositivo_medico: boolean;
  traccia_lotto: boolean;
  codice_ce: string | null;
  attivo: boolean;
}

// ============================================================
// LOTTO MAGAZZINO
// ============================================================
export interface LottoMagazzino {
  id: string;
  laboratorio_id: string;
  magazzino_id: string;
  numero_lotto: string;
  quantita_acquistata: number;
  quantita_residua: number;
  costo_acquisto: number | null;
  data_acquisto: string | null;
  data_scadenza: string | null;
  data_ricezione: string | null;
  documento_acquisto_url: string | null;
  note: string | null;
  attivo: boolean;
}

// ============================================================
// PORTALE DENTISTA
// ============================================================
export interface LavoroPortale {
  id: string;
  numero_lavoro: string;
  stato: StatoLavoro;
  tipo_dispositivo: TipoDispositivo;
  descrizione: string;
  data_consegna_prevista: string;
  data_consegna_effettiva: string | null;
  paziente_nome_snapshot: string | null;
  conformato: boolean;
  ddc_signed_url: string | null;
  buono_signed_url: string | null;
  spedizione_stato: StatoSpedizione | null;
  spedizione_tracking: string | null;
}

export interface PortaleDentistaDati {
  laboratorio: Pick<Laboratorio, 'nome' | 'ragione_sociale' | 'logo_url' | 'telefono' | 'email'>;
  cliente: Pick<Cliente, 'id' | 'nome' | 'cognome' | 'studio_nome'>;
  lavori_aperti: LavoroPortale[];
  lavori_consegnati: LavoroPortale[];
}

// ============================================================
// DASHBOARD — 8 KPI operativi (allineati al contratto spec §14.3)
// Fonte dati: tabella dashboard_kpi_cache (aggiornata da trigger/pg_cron)
// ============================================================
export interface DashboardStats {
  // KPI 1-3: flusso operativo
  consegne_oggi: number;               // stato NOT IN (consegnato,annullato) AND data_consegna_prevista = today
  lavori_in_ritardo: number;           // stato = 'in_ritardo'
  pronti_non_fatturati: number;        // stato = 'pronto' AND incluso_in_fattura = FALSE
  // KPI 4-5: risorse e qualità
  tecnico_piu_saturo: { nome: string; sigla: string | null; lavori_attivi: number } | null;
  mdr_incompleti: number;              // stato = 'consegnato' AND conformato = FALSE
  // KPI 6-8: spedizioni, anomalie, backlog digitale
  spedizioni_in_ritardo: number;       // spedizione_stato = 'spedito' AND data_consegna_prevista < today-2
  is_rifacimento_count: number;        // lavori con is_rifacimento = TRUE questo mese
  stl_non_assegnati: number;           // impronta_digitale=TRUE AND tecnico_id IS NULL AND stato='ricevuto'
  // Aggregati
  lavori_attivi: number;
  fatturato_mese: number;
}

// ============================================================
// DDC SNAPSHOT IMMUTABILE (Codex fix #4)
// Tutti i campi copiati al momento dell'emissione — non modificabili
// ============================================================
export interface DdcSnapshotImmutabile {
  fabbricante_nome: string;
  fabbricante_indirizzo: string;
  fabbricante_piva: string;
  fabbricante_itca: string | null;
  luogo_emissione: string;             // Es. "Serre (SA), Italia"
  prrc_nome: string;
  prrc_qualifica: string | null;       // Es. "Odontotecnico abilitato"
  firma_ddc_storage_path: string | null;
  firma_ddc_sha256: string | null;     // Hash firma per integrità
  testo_conformita_snapshot: string;  // Testo completo della dichiarazione
  uso_esclusivo_paziente: string;     // "Dispositivo fabbricato esclusivamente per [paziente]"
  prescrizione_caratteristiche: string | null; // Caratteristiche specifiche prescritte
  contiene_sostanze_o_tessuti: boolean; // Allegato XIII §1(e) MDR
  sostanze_tessuti_dettaglio: string | null;
}
