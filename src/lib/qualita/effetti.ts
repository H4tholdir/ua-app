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
// ⚠️ LE NOVE RIGHE SI DIVIDONO IN TRE GRUPPI, E NON IN DUE — la riga che stava
// qui prima ne contava due, ed era già superata dalla stessa passata che l'ha
// scritta (trovata dalla revisione del 07/08):
//   · DUE portano l'azione SUBITO, dalla tabella fissa: `errore_registrazione`
//     (D288) e — dal 07/08 — `destinatario_errato` (⚖️ D312, resa possibile
//     dalla transizione «pronto col documento intatto» del PRONTO-4);
//   · DUE la portano DOPO LA SCELTA, e non da qui: `difetto_lavorazione` e
//     `difetto_materiale` dichiarano `scelta_richiesta` nella tabella e
//     ricevono la loro azione da `effettoDaMotivoEScelta` (D304). 🛑 Chi legge
//     la sola tabella le vede senza azione, e si sbaglia.
//   · le altre CINQUE NON sono abbozzi: sono descrittori. Dichiarano che cosa è
//     stato deciso, e l'app non finge di eseguirlo. Costruire cinque rami
//     inerti che sembrano agire sarebbe esattamente il difetto che questo
//     modulo nasce per chiudere — la funzione esistente che nessuno chiama,
//     «una cosa che esiste, sembra copertura, e non gira».
//
// 🔑 E DICHIARARE UN'AZIONE CHE ANCORA NESSUNO ESEGUE NON È UNO DI QUEI RAMI
// INERTI. La differenza è la finestra: un ramo inerte finge di agire **per
// sempre**; qui il modulo DICHIARA e il compito successivo CABLA lo
// smistamento, dentro la stessa ondata. Finché non lo fa, la rotta smista solo
// `riapri_lavoro` e la cosa è scritta nella prova che ne tiene il perimetro
// (`tests/unit/eventi-qualita-route.test.ts`, il caso D312).

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

/** Le cose che l'app fa DA SOLA, senza altre domande.
 *  - `riapri_lavoro` — torna a `pronto` E annulla la dichiarazione (D288);
 *  - `torna_pronto` — torna a `pronto` e la dichiarazione RESTA VIVA (D291 · D304);
 *  - `crea_rifacimento` — nasce un lavoro nuovo, il vecchio resta consegnato (D306). */
export type AzioneAutomatica = 'riapri_lavoro' | 'torna_pronto' | 'crea_rifacimento'

export interface Effetto {
  lavoro: EffettoLavoro
  documento: EffettoDocumento
  /** `null` = l'app registra e non agisce. Oggi due righe su nove non lo sono
   *  nella tabella fissa, più i due esiti risolti del bivio (D304). */
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
      'Il manufatto è a posto: sbagliato è un dato scritto sulla dichiarazione. Il manufatto resta dov\'è, dal dentista — si rifà solo la dichiarazione, con il dato giusto. Quella vecchia resta in archivio come superata, non sparisce.',
    // ⚖️ D299 (07/08/2026) — QUESTA RIGA ERA UNA SCELTA FATTA IN SILENZIO, e adesso
    // non lo è più. Due documenti ratificati si contraddicevano: la tabella degli
    // effetti (tornata 120) dice «resta consegnato», mentre D288 riporta le parole
    // «lo corregge e posso RICONSEGNARE», che si leggono come un lavoro che torna
    // indietro. Francesco ha sciolto il nodo: «il lavoro resta consegnato, si rifà
    // solo la carta» — «riconsegnare» era il DOCUMENTO, non il manufatto.
    // 🔑 Da qui il perimetro del Task 5: la riemissione NON tocca `lavori.stato` e
    // NON chiama `riapri_lavoro_atomica`.
    decisione: 'spec §6 · D293① · D299',
  },
  difetto_lavorazione: {
    lavoro: 'scelta_richiesta',
    documento: 'segue_la_scelta',
    azione: null,
    perche:
      'Il manufatto è compromesso, e prima di procedere serve una scelta: si sistema questo, oppure se ne fa uno nuovo? La dichiarazione segue quella scelta — se si sistema resta valida, se se ne fa uno nuovo ne serve una nuova e la vecchia resta.',
    decisione: 'D290 · D298',
  },
  difetto_materiale: {
    lavoro: 'scelta_richiesta',
    documento: 'segue_la_scelta',
    azione: null,
    perche:
      'Il materiale ha ceduto, e prima di procedere serve una scelta: si sistema questo manufatto, oppure se ne fa uno nuovo? La dichiarazione segue quella scelta, come per un difetto di lavorazione.',
    decisione: 'D297 · D298',
  },
  destinatario_errato: {
    lavoro: 'torna_pronto',
    documento: 'resta_valido',
    // ⚖️ D312 (07/08/2026) — QUI C'ERA `null`, e accanto un commento che diceva
    // «la transizione "pronto col documento intatto" NON ESISTE ancora».
    // 🛑 Quel testo è SCADUTO: il PRONTO-4 ha costruito
    // `riporta_a_pronto_atomica`, che riporta il lavoro fra i pronti e lascia
    // viva la dichiarazione — cioè esattamente ciò che questa riga chiede da
    // quando è stata scritta. Un commento che nega l'esistenza di una cosa
    // costruita è il modo più veloce per far nascere rossa una prova tre
    // compiti più in là, con l'aria della regressione.
    // 🔑 Resta vero PERCHÉ non è `riapri_lavoro`: quella gemella annulla SEMPRE
    // la dichiarazione (20260806210400:138-140), e qui il documento diceva il
    // vero — il manufatto è uscito davvero, solo alla persona sbagliata.
    // ⚠️ Il TERZO dei tre motivi della spec §0 è questo, e non passa dal bivio:
    // la sua azione vive qui, nella riga fissa, non in `effettoDaMotivoEScelta`.
    azione: 'torna_pronto',
    perche:
      'Il manufatto è giusto: sbagliata è la persona a cui è andato. Si recupera e si riconsegna a chi doveva riceverlo. Il lavoro torna fra quelli pronti, e la dichiarazione resta valida perché diceva il vero.',
    decisione: 'D291 · D312',
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

// ─── IL BIVIO DEI DUE DIFETTI (D304) ────────────────────────────────────────

/** Il bivio dei due difetti: la sceglie chi registra, e non si indovina (D290 · D297 · D304). */
export type Scelta = 'si_sistema' | 'si_rifa'

/** Le due strade, NELL'ORDINE in cui si mostrano.
 *
 *  🔑 Sta qui, accanto al tipo, per la stessa ragione per cui `MOTIVI` sta in
 *  `qualita-costanti.ts` e le sue etichette in `motivi-ui.ts`: il vocabolario e
 *  le parole che una persona legge sono due cose, e vivono in due posti.
 *  `satisfies readonly Scelta[]` fa protestare `tsc` se un giorno il tipo
 *  cresce e questo elenco resta indietro.
 *  ⚠️ La rotta ne tiene una copia privata (`eventi-qualita/route.ts:115`),
 *  scritta prima di questa: RIFERITA, non toccata — è fuori da questo mandato. */
export const SCELTE = ['si_sistema', 'si_rifa'] as const satisfies readonly Scelta[]

/** I soli motivi che ammettono — e pretendono — una scelta. 🔑 Questa è la FONTE:
 *  il database porta solo l'implicazione «se c'è una scelta, il motivo è uno di
 *  questi», perché il biconditionale abortirebbe sulle righe già esistenti. */
export const MOTIVI_CON_SCELTA = ['difetto_lavorazione', 'difetto_materiale'] as const satisfies readonly Motivo[]

export function richiedeScelta(motivo: Motivo): boolean {
  return (MOTIVI_CON_SCELTA as readonly string[]).includes(motivo)
}

/** L'effetto RISOLTO. Senza scelta restituisce la riga non risolta — che dichiara
 *  `scelta_richiesta` e non agisce — invece di indovinare un ramo.
 *
 *  📋 Forme d'ingresso censite (R-P4): motivo del bivio + scelta valida → la riga
 *  risolta · motivo del bivio + `null` → la riga NON risolta, nessuna azione ·
 *  motivo fuori dal bivio + una scelta qualunque → esattamente `effettoDaMotivo`,
 *  perché su quel motivo la scelta non ha significato e scartarla in silenzio
 *  spetta alla rotta, che la rifiuta con un 422 · chiave del prototipo → riga
 *  neutra (la guardia sta in `effettoDaMotivo`, e questa funzione ci passa
 *  sempre) · una scelta fuori vocabolario su un motivo del bivio → la riga NON
 *  risolta, mai un ramo indovinato.
 *
 *  🛑 `destinatario_errato` NON passa di qui: è il terzo motivo della spec §0, e
 *  la sua azione vive nella riga fissa di `EFFETTI_PER_MOTIVO` (⚖️ D312). Per lui
 *  `richiedeScelta` è falso, quindi questa funzione restituisce `base` — che la
 *  porta già. */
export function effettoDaMotivoEScelta(motivo: Motivo, scelta: Scelta | null): Effetto {
  const base = effettoDaMotivo(motivo)
  if (!richiedeScelta(motivo) || scelta === null) return base
  if (scelta === 'si_sistema') {
    return {
      lavoro: 'torna_pronto',
      documento: 'resta_valido',
      azione: 'torna_pronto',
      perche:
        'Si sistema questo manufatto. Il lavoro torna fra quelli pronti e la dichiarazione resta valida: il manufatto è lo stesso, e nessuno dei dati stampati cambia.',
      decisione: `${base.decisione} · D304 · D310`,
    }
  }
  if (scelta === 'si_rifa') {
    return {
      lavoro: 'lavoro_nuovo',
      documento: 'resta_valido',
      azione: 'crea_rifacimento',
      perche:
        'Se ne fa uno nuovo. Nasce subito un lavoro nuovo, collegato a questo; il lavoro di prima resta consegnato con la sua dichiarazione, e il manufatto nuovo avrà la sua quando lo consegnerai.',
      decisione: `${base.decisione} · D304 · D306`,
    }
  }
  return base
}
