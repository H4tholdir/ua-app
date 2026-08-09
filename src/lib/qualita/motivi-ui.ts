// src/lib/qualita/motivi-ui.ts
//
// I TESTI CHE L'UTENTE LEGGE su «Devo intervenire» (Task 6).
// Mockup approvato: docs/design/mockups/2026-08-07-devo-intervenire.html
// Verbale: D300 (variante B, motivi raggruppati) · D301 («il manufatto», mai
// «il pezzo») · D302 (nelle etichette «la dichiarazione», mai «la carta») ·
// D303 («manufatto» al banco, «dispositivo» quando parla la norma).
//
// 🔑 PERCHÉ I TESTI STANNO QUI E NON DENTRO IL COMPONENTE. Sono parole che una
// persona legge per decidere in fretta, al banco: cambiarle è una decisione di
// Francesco, non un ritocco di codice. Tenendole in un file solo si vede
// l'intero vocabolario in una schermata, e la prova che lo sorveglia può
// contarlo contro `MOTIVI` — che è copiato dal CHECK vivo in banca dati.
//
// 🛑 D303 — DENTRO UN REGISTRO LA PAROLA È UNA. Qui si parla la lingua del
// banco: **manufatto**. «Dispositivo» è la parola della norma e vive in
// `classifica.ts`, dove il testo cita la legge. Le due possono comparire sulla
// stessa schermata perché rispondono a due domande diverse — ma non si
// alternano dentro la stessa frase.

import { MOTIVI } from '@/lib/domain/qualita-costanti'
import type {
  Motivo,
  OrigineInformazione,
  StatoDispositivo,
  PotenzialeDiDanno,
} from '@/lib/domain/qualita-costanti'
import type { Scelta } from '@/lib/qualita/effetti'

/** Le CINQUE famiglie, nell'ordine in cui compaiono nel foglio.
 *
 *  ⚠️ Erano quattro nel mockup che Francesco ha scelto, e sono cinque per una
 *  ragione scritta (D300, riquadro): «La carta» teneva insieme **due documenti
 *  diversi** — la dichiarazione e la fattura — mentre per la regola di casa lo
 *  stato clinico e quello fiscale sono **dimensioni indipendenti**.
 *  🔑 Le due famiglie da una voce sola se la meritano: «La fattura» diventa
 *  saltabile a colpo d'occhio da chi ha un problema clinico, e «La
 *  dichiarazione» è l'unica voce che fa rifare il documento. */
export const FAMIGLIE = [
  { chiave: 'manufatto', etichetta: 'Il manufatto' },
  { chiave: 'dichiarazione', etichetta: 'La dichiarazione' },
  { chiave: 'persona', etichetta: 'La persona, o la richiesta' },
  { chiave: 'fattura', etichetta: 'La fattura' },
  { chiave: 'nostro', etichetta: 'Un errore nostro qui dentro' },
] as const

export type Famiglia = (typeof FAMIGLIE)[number]['chiave']

export interface VoceMotivo {
  etichetta: string
  /** Una riga: dice **che cosa succede**, non solo come si chiama il caso. */
  sottotitolo: string
  famiglia: Famiglia
  /** Tinta della pastiglia dell'icona — famiglia semantica, mai decorazione. */
  tinta: 'rossa' | 'blu' | 'viola' | 'ambra' | 'verde'
  glifo: string
}

/**
 * LA DOMANDA DEL BIVIO, IN UNA FORMULAZIONE SOLA (⚖️ D304).
 *
 * 🛑 ERA SCRITTA DUE VOLTE ALLA LETTERA — i sottotitoli dei due difetti — e il
 * foglio stava per aggiungerne una terza a schermo, dove la domanda si pone
 * davvero. Tre copie della stessa frase divergono alla prima revisione: la
 * prima che si corregge lascia le altre due a dire un'altra cosa, ed è la
 * stessa famiglia di difetto per cui questo file esiste (v. il cappello).
 * ➡️ Una costante, tre usi: i due sottotitoli e la domanda del passo.
 */
export const DOMANDA_SCELTA = 'Si sistema questo manufatto o se ne fa uno nuovo — scegli tu'

/**
 * Le due strade del bivio, con le etichette **ratificate** dal Passo 3 del
 * piano del 07/08.
 *
 * 🔑 PERCHÉ NON DICONO «SÌ» E «NO», e nemmeno «Continua». Il secondo ramo
 * **brucia un progressivo di anno**: fa nascere un lavoro nuovo, con il suo
 * numero, e da qui non si torna indietro. Un'etichetta che non lo dicesse
 * darebbe all'atto che crea il tasto più debole dei due — mentre il ramo
 * reversibile, in questa stessa app, ha già un'etichetta esplicita.
 *
 * `Record<Scelta, …>`: il giorno in cui il vocabolario del bivio cambiasse,
 * una voce senza etichetta non compila.
 */
export const SCELTA_UI: Record<Scelta, string> = {
  si_sistema: 'Si sistema questo manufatto',
  si_rifa: 'Se ne fa uno nuovo — nasce subito un lavoro nuovo',
}

/** Che cosa dice il tasto finale quando la scelta è stata fatta.
 *
 *  ⚖️ D322 — IL TASTO FINALE DICE QUELLO CHE FA, mai «Continua»: da qui parte
 *  l'azione, non un altro passo. */
export const TASTO_SCELTA: Record<Scelta, string> = {
  si_sistema: 'Registra e riportalo fra i pronti',
  si_rifa: 'Registra e fai il lavoro nuovo',
}

export const MOTIVI_UI: Record<Motivo, VoceMotivo> = {
  difetto_lavorazione: {
    etichetta: 'Difetto di lavorazione',
    sottotitolo: DOMANDA_SCELTA,
    famiglia: 'manufatto', tinta: 'rossa', glifo: '🔧',
  },
  difetto_materiale: {
    etichetta: 'Difetto del materiale',
    sottotitolo: DOMANDA_SCELTA,
    famiglia: 'manufatto', tinta: 'rossa', glifo: '🧱',
  },
  reso_senza_difetto: {
    etichetta: 'Tornato indietro senza difetti',
    sottotitolo: 'Registriamo il fatto; cosa fare si decide dopo',
    famiglia: 'manufatto', tinta: 'ambra', glifo: '📦',
  },
  errore_dato_dichiarazione: {
    etichetta: 'C\'è un dato sbagliato sulla dichiarazione',
    sottotitolo: 'Il manufatto resta dov\'è: si rifà solo la dichiarazione',
    famiglia: 'dichiarazione', tinta: 'blu', glifo: '📄',
  },
  destinatario_errato: {
    etichetta: 'È andato alla persona sbagliata',
    sottotitolo: 'Torna fra i pronti; la dichiarazione resta valida',
    famiglia: 'persona', tinta: 'viola', glifo: '👤',
  },
  modifica_clinica_richiesta: {
    etichetta: 'Il medico chiede una modifica',
    sottotitolo: 'Non è una correzione: serve un lavoro nuovo',
    famiglia: 'persona', tinta: 'blu', glifo: '🩺',
  },
  errore_prezzo_quantita: {
    etichetta: 'Prezzo o quantità sbagliati',
    sottotitolo: 'Il lavoro non si tocca: è una questione di fattura',
    famiglia: 'fattura', tinta: 'ambra', glifo: '€',
  },
  errore_registrazione: {
    etichetta: 'Ho premuto «consegna» per sbaglio',
    sottotitolo: 'Il lavoro torna fra i pronti e la dichiarazione si annulla',
    famiglia: 'nostro', tinta: 'verde', glifo: '↩',
  },
  altro: {
    etichetta: 'Altro',
    sottotitolo: 'Scrivilo in due parole',
    famiglia: 'nostro', tinta: 'ambra', glifo: '✎',
  },
}

/** I motivi di una famiglia, nell'ordine di dichiarazione di `MOTIVI_UI`. */
export function motiviDellaFamiglia(f: Famiglia): Motivo[] {
  return MOTIVI.filter((m) => MOTIVI_UI[m].famiglia === f)
}

// ── le etichette delle quattro caselle (spec §5) ─────────────────────────────
//
// 🛑 «DA VALUTARE» NON È UN RIPIEGO ED È GIÀ ACCESO. La spec §5 lo dice per
// intero: un default `nessuno` sarebbe un «generatore silenzioso di
// sotto-classificazione», contro l'Art. 87(7). Qui la conseguenza di forma è
// che **«nessuno» non deve mai essere il percorso più rapido**: le quattro
// pastiglie hanno lo stesso peso, e quella accesa all'apertura è «da valutare».

export const DOMANDE = {
  origine: 'Chi se n\'è accorto?',
  conosciuto: 'Quando l\'avete saputo?',
  stato: 'Dov\'era il manufatto?',
  danno: 'Poteva far male a qualcuno?',
} as const

export const ORIGINE_UI: Record<OrigineInformazione, string> = {
  laboratorio_interno: 'Noi in laboratorio',
  odontoiatra: 'L\'odontoiatra',
  paziente_tramite_medico: 'Il paziente, tramite il medico',
  autorita_competente: 'Un\'autorità',
  altro_operatore: 'Un altro operatore',
}

export const STATO_UI: Record<StatoDispositivo, string> = {
  mai_uscito_dal_lab: 'Mai uscito',
  consegnato_non_applicato: 'Consegnato, non applicato',
  applicato: 'Già applicato',
  non_noto: 'Non lo so',
}

export const DANNO_UI: Record<PotenzialeDiDanno, string> = {
  nessuno: 'No',
  da_valutare: 'Da valutare',
  possibile: 'Forse',
  accertato: 'Sì, è successo',
}

// ── gli esiti, per il tasto «non è così — cambia» (spec §6, D267) ───────────
export const ESITO_UI = {
  nessuna_azione: 'Nessuna azione',
  non_conformita_interna: 'Non conformità interna',
  reclamo: 'Reclamo',
  incidente: 'Incidente',
  incidente_grave: 'Incidente grave',
} as const
