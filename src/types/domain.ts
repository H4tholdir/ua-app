// UÀ — Domain Types
// Fonte: ANALISI/31_fase2_spec_completo.md §11
// Aggiornato: 2026-05-14 (patch v1.1: stato ricevuto, tracking spedizioni)

// Le CASE UNICHE dei dizionari chiusi vivono in `src/lib/domain/*` — questo
// file importa i tipi, non li ridichiara (Task 6, ondata B ③): `fonte_tipo`
// aveva una QUARTA copia a mano dell'unione prima di questo import, e una
// copia scritta qui non la vedrebbe la spia di migrazione
// (`tests/unit/prescrizione-costanti-spia-migration.test.ts`), che sorveglia
// solo `src/lib/domain/prescrizione-costanti.ts`.
import type { CategoriaFoto } from '@/lib/domain/categorie-foto'
import type { CampoTypo, FonteTipo, MotivoDivergenza } from '@/lib/domain/prescrizione-costanti'
// D42 — stessa ragione: la forma di una tinta si scrive in un posto solo.
// ⚠️ `lib/domain/tinta.ts` importa `TipoDispositivo` da qui: è un rimando
// circolare di SOLI TIPI, che TypeScript cancella in compilazione (nessun
// modulo si tira dietro l'altro a runtime). Copiare qui la forma sarebbe la
// duplicazione che il censimento della riga 22 ha appena finito di contare.
import type { TintaManufatto, TintaScelta } from '@/lib/domain/tinta'

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
  // Testo generico rischi residui, fallback quando manca una riga specifica
  // in rischi_tipo_dispositivo per il tipo di dispositivo (vedi generate-ddc.ts)
  testo_rischi_default: string | null;
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
// PSUR / PMS Report — sorveglianza post-vendita (MDR Art. 85/86)
// ============================================================
export type GruppoClassePsur = 'classe_i' | 'classe_iia' | 'classe_iib_iii'

// Unica fonte di verità del raggruppamento — classe_iib e classe_iii
// condivise nello stesso gruppo/documento per semplicità pratica (stessa
// cadenza annuale), non una lettura letterale di MDCG 2025-10 (che
// raggrupperebbe per uso previsto/materiali/processo). Vedi spec B20 §3.2.
export const CLASSE_RISCHIO_TO_GRUPPO: Record<ClasseRischio, GruppoClassePsur> = {
  classe_i: 'classe_i',
  classe_iia: 'classe_iia',
  classe_iib: 'classe_iib_iii',
  classe_iii: 'classe_iib_iii',
}

export const GRUPPO_TO_CLASSI_RISCHIO: Record<GruppoClassePsur, ClasseRischio[]> = {
  classe_i: ['classe_i'],
  classe_iia: ['classe_iia'],
  classe_iib_iii: ['classe_iib', 'classe_iii'],
}

export interface Psur {
  id: string;
  laboratorio_id: string;
  anno_riferimento: number;
  gruppo_classe: GruppoClassePsur;
  periodo_inizio: string;            // ISO date
  periodo_fine: string;              // ISO date
  // Dati aggregati (calcolati al momento della generazione, filtrati per gruppo_classe)
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
  /** Cellulare per WhatsApp (P31, D182/D183): telefono può essere un fisso
   *  dello studio — chi manda WhatsApp legge SEMPRE questo campo, mai
   *  telefono, altrimenti il messaggio riparte su un fisso. */
  cellulare_whatsapp: string | null;
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
  | 'bite_splint'
  | 'altro';

// PATCH v1.1: aggiunto 'ricevuto' come stato iniziale prima della lavorazione
// PATCH v1.2: aggiunto 'in_prova_esterna', 'sospeso' (migration 005 CHECK constraint)
export type StatoLavoro =
  | 'ricevuto'           // appena arrivato, non ancora iniziato
  | 'in_lavorazione'
  | 'in_prova'
  | 'in_prova_esterna'   // mandato in prova dal dentista
  | 'pronto'
  | 'consegnato'
  | 'annullato'
  | 'sospeso'            // in attesa di decisione (esito prova sospeso)
  | 'in_ritardo';

export type PrioritaLavoro = 'normale' | 'urgente' | 'extra_urgente';
export type ClasseRischio = 'classe_i' | 'classe_iia' | 'classe_iib' | 'classe_iii';

export type TipoSegnalazione =
  | 'impronta_non_idonea'
  | 'colore_mancante'
  | 'istruzione_poco_chiara'
  | 'materiale_esaurito'
  | 'altro';

// Corrieri supportati (PATCH v1.1 — tracking spedizioni)
export type Corriere = 'gls' | 'brt' | 'dhl' | 'sda' | 'ups' | 'fedex' | 'interno' | 'altro';
export type StatoSpedizione = 'da_spedire' | 'spedito' | 'consegnato_corriere' | 'problema';

export type DecisioneFatturazione = 'in_attesa' | 'fatturare' | 'non_fatturare';

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
  // Ondata 3b — nota del dentista (portale) separata da note_interne del lab
  note_dentista: string | null;
  da_portale: boolean;
  paziente_codice_richiesta: string | null;
  richiedente_nome: string | null;
  richiedente_email: string | null;
  // P37 (ondata B ②): l'istituzione sanitaria del prescrittore — nasce dal
  // POST /api/lavori e si corregge dalla PATCH fino alla consegna (direttiva §9).
  istituzione_sanitaria: string | null;
  // Campi colore (tab Clinica)
  // ⚠️ ORFANE dal Task 10 (ondata a): nessuno le scrive più — le due RPC
  // denormalizzano solo i tre `denti_*`. Restano nel tipo perché sono ancora
  // colonne di `lavori` e la fatturazione le legge nello snapshot, ma la
  // scheda si idrata da `lavori_denti` via `idrataColoreScheda`.
  colore_dente: string | null;
  colore_collo: string | null;
  colore_corpo: string | null;
  colore_incisale: string | null;
  // Default di caso (ondata a): la coppia colore del lavoro, scritta alla
  // creazione da `lavoro_crea_atomico`. È il secondo termine della precedenza
  // riga → caso di `src/lib/domain/colore-dente.ts`.
  colore_scala: string | null;
  colore_codice: string | null;
  // D42 — la tinta del manufatto NON dentale (resina ortodontica, sport): la
  // coppia stabile, che è ciò che resta scritto sul lavoro e conservato. Il
  // `nome` mostrato e l'`hex` del pallino NON vivono qui — stanno nel catalogo
  // `tinte_manufatto` e li risolve chi rende la schermata (`caricaTinteScheda`),
  // così rinominare un'etichetta non invalida i lavori che l'avevano scelta.
  // Vincoli in `20260805174500_lavori_tinta.sql`: coppia intera o niente, FK
  // composita sul catalogo, famiglia coerente col tipo di dispositivo.
  tinta_famiglia: string | null;
  tinta_codice: string | null;
  effetti_speciali: string | null;
  tecnica_colore: string | null;
  colorazione_esterna: string | null;
  denti_coinvolti: string[] | null;
  denti_mancanti: number[] | null;
  denti_impianti: number[] | null;
  tipo_arco: 'superiore' | 'inferiore' | 'entrambi' | null;
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
  // Documenti generati alla consegna (B13 1/2 — idempotenza retry orchestraConsegna)
  buono_pdf_url: string | null;
  buono_numero: string | null;
  buono_storage_path: string | null;
  // Prezzi
  listino_id: string | null;
  prezzo_unitario: number | null;
  codice_iva: string;
  natura_iva: string;
  incluso_in_fattura: boolean;
  decisione_fatturazione: DecisioneFatturazione;
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
  // Accettazione ingresso — MDR Allegato XIII (tracciabilità impronta)
  tipo_impronte: string | null;
  disinfettante_usato: string | null;
  lotto_disinfettante: string | null;
  materiali_allegati: string[];
  // Tracciabilità materiali/lotti — B1 (Allegato XIII MDR)
  tracciabilita_materiali_ok: boolean;
  materiali_incompleti_dettaglio: MaterialeIncompletoDettaglio[] | null;
  anamnesi_difficolta_manuali: boolean;
  // Segnalazione problemi (tecnico → titolare)
  segnalazione_tipo: TipoSegnalazione | null;
  segnalazione_nota: string | null;
  segnalazione_at: string | null;
  segnalazione_by: string | null;
  segnalazione_risolta: boolean;
  // Audit
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================================
// LAVORO DENTE — una riga per dente del lavoro (spec wizard §3.1)
// ============================================================
// Scrittura SOLO via le due RPC atomiche (`lavoro_denti_sostituisci_atomica`,
// `lavoro_crea_atomico`): la tabella è in REVOKE ALL, service_role compreso.
export interface LavoroDente {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  fdi: number;
  ruolo: 'elemento' | 'mancante' | 'impianto' | 'escluso' | 'incollato';
  gruppo: number | null;
  gruppo_ruolo: 'pilastro' | 'intermedio' | null;
  scala: string | null;
  codice: string | null;
  codice_collo: string | null;
  codice_corpo: string | null;
  codice_incisale: string | null;
  provenienza: 'prescritto' | 'eseguito';
  created_at: string;
  updated_at: string;
}

// ============================================================
// LAVORO PRESCRIZIONE — la trascrizione della prescrizione (ondata B, D214)
// ============================================================
// Scrittura SOLO via le RPC dedicate (`lavoro_crea_atomico`,
// `lavoro_prescrizione_*`): la tabella è in REVOKE ALL, service_role compreso.
// `contenuto`: chiave presente = caratteristica TRASCRITTA (V2, l'assenza è
// un'informazione); il colore vive lì COME DIGITATO (D210); `tipo` entra SOLO
// alla conferma di consegna (D213, copiato da `lavori.tipo_dispositivo` in
// `lavoro_prescrizione_conferma_consegna`, 20260804152403:357-360).
export interface PrescrizioneContenuto {
  /** Denti PRESCRITTI (provenienza 'prescritto', W20) — vedi componiSnapshot. */
  elementi?: number[];
  /** COME DIGITATO dall'addetta (D210): mai trim, mai uppercase. */
  colore?: string;
  /** Entra SOLO alla conferma di consegna (D213) — mai alla creazione. */
  tipo?: string;
}

// Un valore di un dizionario chiuso, così come letto dal database: o una
// delle forme valide (`T`), o — quando la riga non rispetta il dizionario —
// un valore SCONOSCIUTO che porta il testo grezzo, MAI scartato in
// silenzio (Task 6, review interna: guardia simmetrica a `fonte_tipo`, ma
// senza il suo ripiegamento su `null` — qui non c'è uno stato legittimo su
// cui ripiegare, quindi il valore grezzo si conserva).
//
// 🛑 PERCHÉ NON `T | string`. Un cast a `T | string` nasconderebbe lo stesso
// rischio invece di chiuderlo: `string` accetta qualunque valore, quindi uno
// switch che dimentica il caso fuori dizionario compila comunque, con o
// senza quel cast — lo stesso «elenco che sembra completo e non lo è» di
// CLAUDE.md §6. La differenza si vede quando la UI scrive l'esaustività
// ESPLICITAMENTE (un `default: assertNever(valore)`, pattern già in uso nel
// dominio): con `T | string` quel `default` sembra irraggiungibile ma non lo
// è (un qualunque `string` lo soddisfa, quindi `tsc` non lo segnala mai
// come vivo); con `ValoreDizionario`, `{ noto: false, valore: string }` è un
// membro REALE dell'unione — un `default` che lo dimentica è un errore di
// compilazione con nome, non un buco silenzioso. `typeof valore === 'string'`
// è la guardia con cui la UI separa i due rami.
export type ValoreDizionario<T extends string> =
  | T
  | { readonly noto: false; readonly valore: string };

// Una voce del registro divergenze prescritto/eseguito (V9, D212). Forma
// fissata dalla RPC `lavoro_prescrizione_registra_divergenza`
// (jsonb_build_object, migration 20260804211256:85-91) — NON si inventa qui.
//
// ⚠️ `campo`/`motivo` non sono garantiti dentro il dizionario per OGNI riga:
// prima della migration 20260804211256 la stessa RPC non validava `p_campo`
// (la sonda S3 del Task 5 ha misurato `'pippo'` e perfino `NULL` accettati
// con esito `ok`) — righe legacy possono quindi portare un valore fuori
// unione. `normalizzaPrescrizione` (`@/lib/domain/prescrizione-mapper`) le
// legge con `ValoreDizionario`, non le scarta e non le fa passare con un
// cast cieco.
export interface Divergenza {
  /** Uno dei tre campi correggibili dello snapshot — stesso dizionario di CAMPI_TYPO. */
  campo: ValoreDizionario<CampoTypo>;
  /** Dizionario chiuso — vedi MOTIVI_DIVERGENZA. */
  motivo: ValoreDizionario<MotivoDivergenza>;
  nota: string | null;
  // Nullable (corretto in review, Task 6): `lavoro_prescrizione_registra_divergenza`
  // (20260804211256:38-44) NON ha un CHECK su `p_utente` — a differenza di
  // `lavori_prescrizioni_conferma_ck`, che rende una conferma anonima
  // impossibile per costruzione. L'UNICO chiamante applicativo oggi
  // (POST /api/lavori/[id]/prescrizione/divergenza:103) passa sempre
  // `context.userId` (autenticato, mai null) — ma la RPC stessa non lo
  // impedisce, quindi il tipo non può dichiararlo NOT NULL: un valore NULL
  // qui è un'anomalia da leggere, non uno stato impossibile da presumere via.
  utente_id: string | null;
  /** ISO timestamp — `now()` lato RPC: nessun chiamante lo può omettere
   *  (non è un parametro), quindi la sua assenza è corruzione strutturale
   *  della riga, non un'anomalia isolata — la voce si scarta. */
  registrata_at: string;
}

export interface LavoroPrescrizione {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  contenuto: PrescrizioneContenuto;
  // Il registro delle divergenze (gesto typo-vs-divergenza, spec §4.3):
  // jsonb '[]' di default.
  divergenze: Divergenza[];
  fonte_tipo: FonteTipo | null;
  fonte_immagine_id: string | null;
  fonte_riferimento: string | null;
  // P38: il numero facoltativo vive QUI, non su lavori.numero_prescrizione
  // (colonna legacy, esclusa dalla PATCH con la sua ragione).
  numero_prescrizione: string | null;
  confermata_da: string | null;
  confermata_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// LAVORO DETTAGLIO — con join
// ============================================================
export interface LavoroDettaglio extends Lavoro {
  // Opzionale perché è un embed: c'è solo dove la query lo chiede
  // (`denti:lavori_denti(*)`). Chi mostra o corregge il colore DEVE chiederlo —
  // guardia in `tests/unit/lavoro-form-colore-idratazione.test.tsx`.
  denti?: LavoroDente[];
  // Opzionale sullo stesso modello di `denti?` (Task 6, ondata B ③): c'è solo
  // dove la query chiede l'embed (`prescrizione:lavori_prescrizioni(*)`), ed
  // è `undefined` — MAI un oggetto vuoto — quando il lavoro non ha ancora una
  // trascrizione. Normalizzazione della forma array-vs-oggetto dell'embed:
  // `src/lib/domain/prescrizione-mapper.ts` (`normalizzaPrescrizione`).
  prescrizione?: LavoroPrescrizione;
  cliente: Cliente;
  paziente: Paziente | null;
  tecnico: Tecnico | null;
  lavorazioni: LavoroLavorazione[];
  appuntamenti: LavoroAppuntamento[];
  immagini: LavoroImmagine[];
  fasi: LavoroFase[];
  materiali: LavoroMateriale[];
  ddc: DichiarazioneConformita | null;
  laboratorio: Pick<Laboratorio, 'nome' | 'telefono'> | null;
  // D42 Task 7 — la tinta RISOLTA col catalogo, e le voci fra cui scegliere.
  // Opzionali sullo stesso modello di `denti?`/`prescrizione?`: ci sono solo
  // dove chi rende la schermata le ha chieste (`caricaTinteScheda`). Assenti =
  // la riga non compare e la tavolozza non si apre — mai una riga vuota per una
  // lettura dimenticata.
  tinta?: TintaScelta | null;
  tinteDisponibili?: TintaManufatto[];
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
  /** L'indirizzo per MOSTRARE la foto — **non è una colonna** (D236,
   *  05/08/2026: `lavori_immagini.url` è stata tolta, conteneva una URL
   *  «pubblica» su un bucket privato che non ha mai funzionato).
   *  Si firma al momento e vive solo in memoria: la popolano le due pagine
   *  che rendono le foto (`lavori/[id]/page.tsx`, `.../modifica/page.tsx`)
   *  e la risposta della rotta di caricamento, per la foto appena salita.
   *  🛑 Opzionale apposta: chi legge una riga senza passare da lì NON ha una
   *     URL, e deve accorgersene dal tipo invece che da un'immagine rotta. */
  url?: string;
  storage_path: string;
  nome_file: string | null;
  descrizione: string | null;
  data_scatto: string | null;
  /** Categoria fotografica — elenco chiuso, D72. La fonte dei valori è
   *  src/lib/domain/categorie-foto.ts — mai una copia locale. */
  categoria: CategoriaFoto;
  /** Serve a ordinare DENTRO il gruppo (D71). Esiste in banca dati da sempre
   *  (`002_fase2_schema.sql:254`) ma mancava da questo tipo. */
  created_at: string;
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
  tecnico: {
    nome: string;
    cognome: string;
  } | null;
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
// MATERIALE INCOMPLETO DETTAGLIO (tracciabilità MDR)
// ============================================================
export interface MaterialeIncompletoDettaglio {
  magazzino_id: string | null;
  nome_materiale: string;
  motivo: 'lotto_assente' | 'bom_mancante';
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
  stato: 'bozza' | 'generata' | 'firmata' | 'consegnata' | 'annullata';
  // §1 Allegato XIII — Fabbricante (snapshot immutabile)
  fabbricante_nome: string;
  fabbricante_indirizzo: string;
  fabbricante_piva: string;
  fabbricante_itca: string | null;
  luogo_emissione: string;               // Es. "Serre (SA), Italia"
  /** VOCE 1 dell'Allegato XIII: «il nome e l'indirizzo del fabbricante e di
   *  TUTTI I LUOGHI DI FABBRICAZIONE».
   *
   *  🔄 Aggiunto al tipo il 07/08/2026 (D295): la colonna esiste dal primo
   *     giorno (`schema.sql:1251`, `NOT NULL DEFAULT 'Italia'`), ma non stava
   *     nel tipo, non la scriveva nessuno e il modello non la stampava — così
   *     ogni dichiarazione emessa portava in banca dati il letterale «Italia»,
   *     che è un PAESE e non un indirizzo, e sul foglio non portava niente.
   *  ⚠️ NON è `luogo_emissione` (`lab.citta`): quello è dove il documento è
   *     stato firmato, questo è dove il dispositivo è stato fabbricato. */
  luogo_fabbricazione: string;
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
  // Normative armonizzate applicate (da rischi_tipo_dispositivo, MDR §7 — Fascicolo Tecnico)
  norme_json: Array<{ codice: string; titolo: string; anno?: number }> | null;
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
    /** La VOCE dell'Allegato XIII punto 1 che questo controllo protegge (1-8),
     *  oppure `null` quando il controllo non difende una voce dell'Allegato ma
     *  l'integrità del documento (una colonna `NOT NULL`, un dato d'esercizio).
     *
     *  🔄 CORRETTO IL 07/08/2026 (D295). Qui c'era `elemento: number` con il
     *     commento «1-8 (Allegato XIII MDR)», e la numerazione che ci passava
     *     dentro NON era quella dell'Allegato: tre voci erano inventate (data
     *     di emissione, classe di rischio, data di consegna prevista — nessuna
     *     compare nell'Allegato) e tre voci vere mancavano (la 2 mandatario,
     *     la 6 caratteristiche prescritte, la 8 sostanze/tessuti).
     *  🔑 Perché un numero sbagliato è costato mesi: chi leggeva «6 = classe di
     *     rischio» aveva ogni ragione di credere che la voce 6 fosse coperta.
     *     Era invece l'unica delle otto che il documento non ha MAI stampato.
     *  ⚠️ Il numero non arriva all'operatore: `FlussoConsegna.tsx:169` lo usa
     *     come sola `key` di React, e la schermata mostra `descrizione`. È un
     *     nome per chi scrive il codice — ed è esattamente per questo che
     *     sbagliarlo non si vedeva. */
    elemento: number | null;
    descrizione: string;
    campo: string;
    route: string;
  }[];
  /** Segnala campi accettazione-ingresso mancanti (tipo_impronte, disinfettante_usato) — SOFT BLOCK */
  mdr_incompleto?: boolean;
  mdr_campi_mancanti?: string[];
  /** Avvisi già scritti in italiano compiuto — la rotta di precheck li versa
   *  nei `warnings`, che la schermata mostra nel foglio di conferma.
   *
   *  🛑 NON BLOCCANO, e la distinzione è una direttiva: «la PWA non dà blocchi,
   *     dà aiuti» (D262). `mdr_campi_mancanti` non basta come casa: quella
   *     lista porta NOMI DI CAMPO e la rotta li completa con «non registrato
   *     all'accettazione» (precheck-consegna/route.ts:62) — una coda che per
   *     un avviso diverso da quelli d'accettazione direbbe una cosa falsa. */
  avvisi?: string[];
}

export interface PrecheckConsegnaResponse {
  consegnabile: boolean;
  bloccanti: ConsegnaPrecheckResult['errori'];
  warnings: string[];
}

export interface ConsegnaResult {
  ok: true;
  lavoro_id: string;
  /** Id del cliente a cui è andato il lavoro. Serve al tasto WhatsApp per
   *  salvare il cellulare quando manca (P31, D183): senza, la schermata
   *  della consegna non sa a chi salvarlo. Additivo — nessun consumatore
   *  preesistente si rompe. */
  cliente_id: string;
  numero_lavoro: string;
  ddc: { numero: string; url: string; signed_url: string };
  buono: { numero: string; url: string; signed_url: string };
  fattura: { numero: string; stato_sdi: string } | null;
  whatsapp_url: string;
  tempo_ms: number;
  /** Nome della cassetta liberata alla consegna (Task 7, spec §9.1 — L5), o
   *  `null` se non c'era niente da liberare/la liberazione è fallita
   *  (fail-soft: la consegna non si annulla mai per questo). Opzionale per
   *  compatibilità con payload/mock preesistenti che non lo includono. */
  cassettaLiberata?: string | null;
}

export interface ConsegnaError {
  ok: false;
  tipo: 'precheck_fallito' | 'errore_pdf' | 'errore_upload' | 'errore_fattura' | 'errore_pec' | 'stato_non_consegnabile';
  messaggio: string;
  errori_precheck?: ConsegnaPrecheckResult['errori'];
}

// ============================================================
// PAGAMENTI — ledger polimorfico (fattura XOR lavoro diretto) — B2
// ============================================================
export type MetodoPagamento = 'contanti' | 'bonifico' | 'pos' | 'assegno' | 'altro';
export type StatoPagamento = 'attivo' | 'annullato';

export interface Pagamento {
  id: string;
  laboratorio_id: string;
  fattura_id: string | null;
  lavoro_id: string | null;
  importo: number;
  metodo: MetodoPagamento;
  metodo_nota: string | null;
  data_pagamento: string;
  stato: StatoPagamento;
  motivo_annullamento: string | null;
  sostituisce_pagamento_id: string | null;
  registrato_da: string;
  annullato_da: string | null;
  annullato_at: string | null;
  created_at: string;
}

// ============================================================
// CREDITO CLIENTI — eccedenze, applicazioni, rimborsi — B2
// ============================================================
export type TipoMovimentoCredito = 'eccedenza' | 'applicazione' | 'rimborso' | 'storno' | 'annullo_storno';

export interface CreditoClienteMovimento {
  id: string;
  laboratorio_id: string;
  cliente_id: string;
  tipo: TipoMovimentoCredito;
  pagamento_id: string | null;
  fattura_id: string | null;
  lavoro_id: string | null;
  importo: number;
  metodo: MetodoPagamento | null;
  metodo_nota: string | null;
  note: string | null;
  registrato_da: string | null;
  created_at: string;
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
  importo_pagato: number;
  codice_cup: string | null;
  codice_cig: string | null;
  progressivo_invio: number | null;
  nome_file_xml: string | null;
  xml_storage_path: string | null;
  pdf_storage_path: string | null;
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

// ─── DASHBOARD EXTENDED (Plan C) ─────────────────────────────
export interface DashboardStatsExtended extends DashboardStats {
  fatturato_mese_precedente: number
  pagamenti_scaduti_totale: number
  pagamenti_scaduti_clienti_count: number
  materiali_esaurimento_count: number
  in_prova_count: number
  margine_netto: number
  percentuale_margine: number
}

// ─── Vista TECNICO ───────────────────────────────────────────
export interface TecnicoDashboardItem {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  priorita: PrioritaLavoro
  tipo_dispositivo: TipoDispositivo
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  cliente_display: string
  prossima_fase: string | null
  completamento_perc: number
  is_urgente: boolean
}

export interface TecnicoDashboard {
  lavori_urgenti: TecnicoDashboardItem[]
  lavori_oggi: TecnicoDashboardItem[]
  in_prova_rientro_oggi: TecnicoDashboardItem[]
  compenso_oggi: number
  lavorazioni_conteggiate_oggi: number
}

// ─── Vista FRONT DESK ────────────────────────────────────────
export interface FrontDeskConsegnaItem {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  tipo_dispositivo: TipoDispositivo
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  cliente_display: string
  cliente_telefono: string | null
}

export interface FrontDeskPagamentoScaduto {
  cliente_id: string
  cliente_display: string
  cliente_telefono: string | null
  residuo_totale: number
  giorni_scaduto: number
  lavori_count: number
}

export interface FrontDeskDashboard {
  consegne_oggi: FrontDeskConsegnaItem[]
  ritiri_attesi_oggi: FrontDeskConsegnaItem[]
  in_prova_rientro_oggi: FrontDeskConsegnaItem[]
  da_contattare: FrontDeskPagamentoScaduto[]
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
