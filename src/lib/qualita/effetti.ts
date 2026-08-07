// src/lib/qualita/effetti.ts
//
// L'ELENCO DEGLI EFFETTI DEI NOVE MOTIVI — il PIANO OPERATIVO.
// Verbale: docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md,
// centoventesima tornata (D290-D292) e centoventiquattresima (D297-D298).
//
// 🔑 PERCHÉ QUESTO MODULO ESISTE SEPARATO DA `classifica.ts`, e non è una
// duplicazione. D288 lo dice per intero: le due righe della spec che sembravano
// contraddirsi «parlavano di DUE PIANI DIVERSI, e nessuno dei due documenti lo
// diceva».
//   · `classifica()` risponde alla domanda della NORMA — è un incidente? un
//     reclamo? niente? — e il suo esito finisce nei conteggi regolamentari.
//   · questo modulo risponde alla domanda del BANCO — che cosa succede adesso
//     al lavoro e alla dichiarazione?
// Lo stesso motivo può essere «nessuna azione» sul primo piano e «ripristina
// tutto» sul secondo: è esattamente il caso di `errore_registrazione`, ed è la
// ragione per cui tenerli in una funzione sola aveva prodotto un testo FALSO.
//
// 🛑 D288 — L'EFFETTO NON SI CHIEDE A PARTE: SI DERIVA DAL MOTIVO. Nessuna
// casella «vuoi anche rientrare in produzione?». Parole di Francesco: «*per
// quale motivo? […] ho sbagliato a premere consegna, allora ripristina tutto*».
// Il costo dichiarato di D269 è **due tap invece di uno** — «Devo intervenire»,
// poi il motivo. Un terzo passaggio di conferma dopo il motivo violerebbe
// quella riga: per questo l'azione automatica parte quando l'evento si registra.
//
// ⚠️ UNA SOLA RIGA SU NOVE HA UN'AZIONE AUTOMATICA, e le altre otto NON sono
// abbozzi: sono descrittori. Dichiarano che cosa è stato deciso, e l'app non
// finge di eseguirlo. Costruire otto rami inerti che sembrano agire sarebbe
// esattamente il difetto che questo modulo nasce per chiudere — la funzione
// esistente che nessuno chiama, «una cosa che esiste, sembra copertura, e non
// gira».

import { MOTIVI } from '@/lib/domain/qualita-costanti'
import type { Motivo } from '@/lib/domain/qualita-costanti'

/** Che cosa succede al LAVORO. */
export type EffettoLavoro =
  /** torna a `pronto` E la dichiarazione si annulla — la consegna non c'è mai stata */
  | 'ripristina_tutto'
  /** torna a `pronto`, ma il documento resta in piedi */
  | 'torna_pronto'
  /** si sistema questo o se ne fa uno nuovo: sceglie chi registra (D290/D297) */
  | 'scelta_richiesta'
  /** il manufatto è a posto dov'è: il lavoro non si muove */
  | 'resta_consegnato'
  /** non è un rientro: serve un lavoro nuovo, con la sua prescrizione */
  | 'lavoro_nuovo'
  /** serve un secondo dettaglio prima di poter derivare (D292) */
  | 'dipende_dal_perche'
  /** niente in automatico, e non si indovina */
  | 'nessuno'

/** Che cosa succede alla DICHIARAZIONE. */
export type EffettoDocumento =
  /** annullata perché NULLA: afferma una consegna mai avvenuta */
  | 'annulla'
  /** si riemette col dato giusto; la vecchia resta in archivio, SUPERATA (D293①) */
  | 'riemetti'
  /** resta valido: diceva il vero, e nessun campo stampato cambia (D293③) */
  | 'resta_valido'
  /** dipende dal bivio del lavoro: si sistema → resta valido; si rifà → nuovo dovuto, vecchio resta (D298) */
  | 'segue_la_scelta'
  | 'dipende_dal_perche'
  | 'nessuno'

/** L'unica cosa che l'app fa DA SOLA, senza altre domande. */
export type AzioneAutomatica = 'riapri_lavoro'

export interface Effetto {
  lavoro: EffettoLavoro
  documento: EffettoDocumento
  /** `null` = l'app registra e non agisce. Oggi una riga su nove non lo è. */
  azione: AzioneAutomatica | null
  /** In parole comuni: è il testo che una persona legge per decidere. */
  perche: string
  /** La decisione che regge la riga — così chi rilegge non deve dedurla. */
  decisione: string
}

/** Riga neutra: l'app registra il fatto e non decide niente. È anche il
 *  ripiego per un ingresso fuori vocabolario — mai un'azione automatica. */
const NEUTRO: Effetto = {
  lavoro: 'nessuno',
  documento: 'nessuno',
  azione: null,
  perche:
    'Il caso non rientra fra quelli previsti: l\'app registra il fatto e non decide niente da sola.',
  decisione: 'D288',
}

export const EFFETTI_PER_MOTIVO: Record<Motivo, Effetto> = {
  errore_dato_dichiarazione: {
    lavoro: 'resta_consegnato',
    documento: 'riemetti',
    azione: null,
    perche:
      'Il manufatto è a posto: sbagliato è un dato scritto sul documento. Il lavoro resta consegnato, e la dichiarazione si rifà con il dato giusto — la vecchia resta in archivio come superata, non sparisce.',
    decisione: 'spec §6 · D293①',
  },
  difetto_lavorazione: {
    lavoro: 'scelta_richiesta',
    documento: 'segue_la_scelta',
    azione: null,
    perche:
      'Il pezzo è compromesso, e prima di procedere serve una scelta: si sistema questo, oppure se ne fa uno nuovo? Il documento segue quella scelta — se si sistema resta valido, se se ne fa uno nuovo ne serve uno nuovo e il vecchio resta.',
    decisione: 'D290 · D298',
  },
  difetto_materiale: {
    lavoro: 'scelta_richiesta',
    documento: 'segue_la_scelta',
    azione: null,
    perche:
      'Il materiale ha ceduto, e prima di procedere serve una scelta: si sistema questo, oppure se ne fa uno nuovo? Il documento segue quella scelta, come per un difetto di lavorazione.',
    decisione: 'D297 · D298',
  },
  destinatario_errato: {
    lavoro: 'torna_pronto',
    documento: 'resta_valido',
    azione: null,
    perche:
      'Il manufatto è giusto: sbagliata è la persona a cui è andato. Si recupera e si riconsegna a chi doveva riceverlo. Il lavoro torna fra quelli pronti, e la dichiarazione resta valida perché diceva il vero.',
    decisione: 'D291',
  },
  modifica_clinica_richiesta: {
    lavoro: 'lavoro_nuovo',
    documento: 'resta_valido',
    azione: null,
    perche:
      'Il medico chiede una cosa nuova, e non è una correzione: il manufatto era conforme alla prescrizione con cui è stato fatto. Serve una prescrizione nuova e un lavoro nuovo; questo resta com\'è, con la sua dichiarazione.',
    decisione: 'spec §6',
  },
  errore_prezzo_quantita: {
    lavoro: 'resta_consegnato',
    documento: 'resta_valido',
    azione: null,
    perche:
      'È una questione di fattura, non di manufatto: il lavoro non si tocca e nemmeno la dichiarazione. Se la fattura è già stata emessa serve una nota di credito, e quella la fa una persona — l\'app la segnala e non la esegue.',
    decisione: 'spec §6 · D262',
  },
  reso_senza_difetto: {
    lavoro: 'dipende_dal_perche',
    documento: 'dipende_dal_perche',
    azione: null,
    perche:
      'Il manufatto è tornato indietro senza un difetto, e che cosa succede dipende dal perché è tornato: un paziente che non si è presentato non è la stessa cosa di un medico che lo rimanda senza dire nulla. Quella domanda l\'app ancora non la sa fare, quindi registra il fatto e non decide.',
    decisione: 'D292',
  },
  errore_registrazione: {
    lavoro: 'ripristina_tutto',
    documento: 'annulla',
    azione: 'riapri_lavoro',
    perche:
      'La consegna non è mai avvenuta. Il lavoro torna fra quelli pronti e la dichiarazione già emessa viene annullata, perché diceva di una consegna che non c\'è stata.',
    decisione: 'D288',
  },
  altro: NEUTRO,
}

const INSIEME_MOTIVI = new Set<string>(MOTIVI)

/** L'effetto operativo di un motivo (D288: si deriva, non si chiede).
 *
 *  🛑 LA GUARDIA NON È PIGNOLERIA. Senza `INSIEME_MOTIVI`, indicizzare il
 *  `Record` con `'constructor'` o `'__proto__'` risale al prototipo di `Object`
 *  e restituisce una **funzione** al posto di un effetto — che poi viaggia come
 *  se fosse una riga dell'elenco. È lo stesso difetto già chiuso in
 *  `naturaDaMotivo` (`qualita-costanti.ts`), e vale la pena chiuderlo due volte:
 *  qui l'oggetto che ne uscirebbe governa un'AZIONE, non solo un'etichetta.
 *
 *  📋 Forme d'ingresso censite (R-P4): uno dei nove motivi → la sua riga · una
 *  stringa fuori vocabolario → riga neutra · una chiave del prototipo → riga
 *  neutra · `null`/`undefined`/un numero/un oggetto → riga neutra (la firma li
 *  vieta, `Set.has` li regge comunque). **Nessun ingresso produce un'azione
 *  automatica che non sia quella dell'unico motivo che la porta.** */
export function effettoDaMotivo(motivo: Motivo): Effetto {
  if (!INSIEME_MOTIVI.has(motivo)) return NEUTRO
  return EFFETTI_PER_MOTIVO[motivo]
}
