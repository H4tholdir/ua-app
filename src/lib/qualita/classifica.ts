// src/lib/qualita/classifica.ts
//
// Il motore che, dai fatti di un evento (`eventi_qualita`), PROPONE una
// classificazione (spec §6). Funzione pura, senza database: chi conferma
// resta un giudizio umano — «l'app propone, una persona conferma» (§6).
//
// 🛑 D276 (06/08/2026) — NESSUN MOTIVO SALTA LA FILA. Il test dell'incidente
// (①) sta SEMPRE prima delle esenzioni (①-bis), qualunque sia `natura`. Un
// piano precedente faceva uscire prima i tre motivi «non è un problema del
// dispositivo»: un evento marcato «richiesta clinica nuova» sarebbe uscito
// con «nessuna azione» ANCHE con un danno accertato su una persona, e
// l'obbligo di segnalazione sarebbe sparito. Vedi spec §6, riquadro D276.
//
// ⚖️ D277/D278 (06/08/2026, centododicesima tornata) — due correzioni al passo ①, dalla
// revisione del Task 2 (commit 10c2da7b), verificate contro la spec §3/§6.
//
// D278 — IL PASSO ① SI APPLICA SOLO A UN DISPOSITIVO USCITO. Prima di questa correzione,
// il test dell'incidente ignorava `statoDispositivo`: un difetto registrato su un lavoro
// ancora al banco (`potenzialeDiDanno` nasce `da_valutare` in banca dati — il caso NORMALE,
// non il raro) usciva «incidente». Ma un incidente riguarda un dispositivo «messo a
// disposizione» (Art. 2(64)), e uno che non è mai uscito dal laboratorio non lo è mai
// stato: vince la spec §3 su §6 («Nessuna vigilanza, nessun reclamo» prima della consegna).
// Le esenzioni di natura (①-bis, D276) restano più forti di questo confine: la spec, per
// D278, elenca solo `potenzialeDiDanno` e `origine` fra i «qualunque sia» — mai `natura` —
// e non c'è contraddizione, perché un motivo che non è mai un problema del dispositivo non
// nasconde nessun incidente, uscito o no.
//
// D277 — LA GRAVITÀ SI CHIEDE, NON SI DEDUCE. `potenzialeDiDanno` risponde solo alla
// domanda dell'Art. 2(64) («è un incidente?»); l'Art. 2(65) («è grave?») è una domanda
// diversa, sulla quale decide una persona — non un solo valore con 4 caselle chiamato a
// risponderne 2. Senza risposta il termine resta `null` e la proposta porta la domanda in
// chiaro; con la risposta, i tre termini dell'Art. 87(3)/(4)/(5) diventano raggiungibili.
// ⚠️ `accertato` NON implica più «grave»: un danno può essere avvenuto ed essere lieve.

import { isRispostaGravitaIncidente } from '@/lib/domain/qualita-costanti'
import type {
  Natura,
  OrigineInformazione,
  StatoDispositivo,
  PotenzialeDiDanno,
  Esito,
  RispostaGravitaIncidente,
} from '@/lib/domain/qualita-costanti'

export interface FattiEvento {
  natura: Natura
  origine: OrigineInformazione
  statoDispositivo: StatoDispositivo
  potenzialeDiDanno: PotenzialeDiDanno
}

export interface Proposta {
  esito: Esito
  perche: string
  ramoIso: '8.3.2' | '8.3.3' | null
  termineOre: number | null
}

// ── testi in parole comuni, composti dai FATTI reali (D279) ────────────────────────────
// 🟠 D279 — il perché non può affermare il contrario di ciò che l'utente ha appena
// dichiarato. Tre frasi fisse lo facevano: «anche se non è ancora stato applicato» quando
// era vero il contrario, «a dispositivo già uscito» quando non si sapeva, «ce ne siamo
// accorti noi» quando se n'era accorto l'odontoiatra. Ora ogni testo si compone da
// `origine` e `statoDispositivo` reali con queste due funzioni, non da una frase fissa.

function descriviProvenienza(origine: OrigineInformazione): string {
  switch (origine) {
    case 'laboratorio_interno': return 'Ce ne siamo accorti noi, in laboratorio'
    case 'odontoiatra': return 'Ce l\'ha segnalato l\'odontoiatra'
    case 'paziente_tramite_medico': return 'Ce l\'ha segnalato il paziente, tramite il medico'
    case 'autorita_competente': return 'Ce l\'ha segnalato l\'autorità competente'
    case 'altro_operatore': return 'Ce l\'ha segnalato un altro operatore'
    // 🛑 REGRESSIONE chiusa dalla ri-revisione (06/08/2026): senza questo ramo, un `origine`
    // fuori vocabolario/assente/`null`/di tipo sbagliato faceva restituire `undefined`, e il
    // testo composto (`:146`, `:157`) mostrava la parola letterale "undefined" invece di un
    // "perché" leggibile. Non affermiamo una provenienza che non conosciamo — il calcolo
    // dell'esito (② più sotto) tratta comunque ogni origine ≠ 'laboratorio_interno' come
    // esterna, quindi resta dalla parte di PIÙ obblighi, mai di meno.
    default: return 'Non sappiamo con certezza da dove sia arrivata la segnalazione'
  }
}

function descriviStatoDispositivo(stato: StatoDispositivo): string {
  switch (stato) {
    case 'mai_uscito_dal_lab': return 'il dispositivo non è mai uscito dal laboratorio'
    case 'consegnato_non_applicato': return 'il dispositivo era stato consegnato, ma non ancora applicato'
    case 'applicato': return 'il dispositivo era stato applicato'
    // ⚠️ D279 — `non_noto` non autorizza ad affermare né che fosse uscito né che non lo
    // fosse: la classificazione resta prudente (si tratta come se fosse uscito, Art. 87(7)
    // generalizzato), ma il TESTO non deve dichiarare una certezza che non c'è.
    case 'non_noto': return 'non sappiamo con certezza se il dispositivo fosse già uscito dal laboratorio, ma nel dubbio lo trattiamo come se lo fosse'
    // 🛑 REGRESSIONE chiusa dalla ri-revisione (06/08/2026): stesso difetto di
    // `descriviProvenienza` sopra, sullo stesso ingresso imprevisto (fuori vocabolario/
    // assente/`null`/tipo sbagliato). Trattamento IDENTICO a `non_noto`: non affermiamo una
    // certezza che non abbiamo, e restiamo coerenti con `uscito` (`f.statoDispositivo !==
    // 'mai_uscito_dal_lab'`), che per lo stesso valore ignoto è già `true` — quindi più
    // obblighi, mai meno.
    default: return 'non sappiamo con certezza se il dispositivo fosse già uscito dal laboratorio, ma nel dubbio lo trattiamo come se lo fosse'
  }
}

function primaLettera(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── la risposta alla domanda dell'Art. 2(65) (D277) ─────────────────────────────────────
function esitoDaGravita(gravita: RispostaGravitaIncidente): { esito: 'incidente' | 'incidente_grave'; termineOre: number | null; perche: string } {
  switch (gravita) {
    case 'minaccia_grave_salute_pubblica':
      return { esito: 'incidente_grave', termineOre: 2 * 24, perche: 'È una minaccia grave per la salute pubblica: la segnalazione va fatta entro 2 giorni da quando lo si è saputo (Art. 87(4)).' }
    case 'morte_o_deterioramento_grave_non_previsto':
      return { esito: 'incidente_grave', termineOre: 10 * 24, perche: 'Ha portato, o avrebbe potuto portare, a una morte o a un peggioramento serio e non previsto della salute: la segnalazione va fatta entro 10 giorni da quando lo si è saputo (Art. 87(5)).' }
    case 'grave_regola_generale':
      return { esito: 'incidente_grave', termineOre: 15 * 24, perche: 'È un incidente grave: la segnalazione va fatta entro 15 giorni da quando lo si è saputo (Art. 87(3)).' }
    case 'non_grave':
      return { esito: 'incidente', termineOre: null, perche: 'È un incidente, ma non è grave: nessuna segnalazione immediata da fare, ma entra nel conteggio periodico degli incidenti (Art. 88).' }
  }
}

/** Propone una classificazione dai fatti di un evento di qualità (spec §6).
 *
 *  `rispostaGravita` è la risposta — FACOLTATIVA — alla domanda dell'Art. 2(65) (D277):
 *  arriva più tardi dei fatti, da una persona, non dal modulo che registra l'evento.
 *  Senza risposta, un evento col test dell'incidente positivo resta `incidente` con
 *  `termineOre: null` e la domanda in chiaro nel `perche` — mai `incidente_grave` per
 *  default. */
export function classifica(f: FattiEvento, rispostaGravita?: RispostaGravitaIncidente): Proposta {
  const uscito = f.statoDispositivo !== 'mai_uscito_dal_lab'

  // 🛑 D276 — NESSUN MOTIVO SALTA LA FILA. Il test dell'incidente sta PRIMA di ogni
  // esenzione: qui c'era l'uscita anticipata dei tre motivi «non è un problema del
  // dispositivo», e faceva sparire un danno accertato dietro un «nessuna azione».
  // 🛑 D278 — ma il passo ① si applica SOLO se il dispositivo è uscito: prima della
  // consegna nessun incidente è possibile (Art. 2(64), spec §3).
  // ① IL TEST DELL'INCIDENTE VIENE PRIMA — invertirlo nasconde l'obbligo dell'Art. 88 (D268)
  if (uscito && f.potenzialeDiDanno !== 'nessuno') {
    // ⚖️ D277 — la gravità si CHIEDE, non si deduce da `potenzialeDiDanno`.
    // 🛑 REGRESSIONE chiusa dalla ri-revisione (06/08/2026): il controllo era
    // `rispostaGravita === undefined`, e SOLO quel valore rientrava nel ramo "domanda in
    // attesa". Un `rispostaGravita` fuori vocabolario, `null`, o di un tipo diverso da
    // stringa (nessuna validazione a monte in questo mandato) superava il controllo e cadeva
    // in `esitoDaGravita`, il cui `switch` non ha un ramo di riserva: `TypeError` alla
    // destrutturazione sotto, non una `Proposta`. `isRispostaGravitaIncidente` tratta OGNI
    // valore non riconosciuto come "nessuna risposta valida ancora data" — stessa domanda in
    // chiaro, stesso termine vuoto: indovinare una gravità da un ingresso corrotto sarebbe
    // esattamente la deduzione che D277 vieta, quindi non si inventa nulla.
    if (!isRispostaGravitaIncidente(rispostaGravita))
      return {
        esito: 'incidente',
        perche: 'C\'è un potenziale di danno: per la norma è un incidente (Art. 2(64)). Prima di calcolare la scadenza va risposto — ha causato, avrebbe potuto causare o potrebbe causare la morte, un peggioramento serio della salute, oppure una minaccia grave per la salute pubblica? Finché non si risponde, la scadenza resta da definire.',
        ramoIso: '8.3.3',
        termineOre: null,
      }
    const { esito, termineOre, perche } = esitoDaGravita(rispostaGravita)
    return { esito, perche, ramoIso: '8.3.3', termineOre }
  }

  // ①-bis — SOLO ORA le esenzioni (D276): non sono problemi del dispositivo, quindi
  // non entrano nei conteggi del rapporto periodico (D273). Valgono qualunque sia lo
  // stato del dispositivo (D278: non c'era nessun incidente da nascondere qui).
  if (f.natura === 'nuova_esigenza_clinica')
    return { esito: 'nessuna_azione', perche: 'Il medico chiede una cosa nuova: il dispositivo era conforme alla prescrizione con cui è stato fatto. Serve una prescrizione nuova, non una correzione.', ramoIso: null, termineOre: null }
  // ⚖️ D288 — QUI C'ERA UN RAMO SOLO PER DUE CASI OPPOSTI, e la frase che ne usciva era
  // FALSA per uno dei due. `commerciale` ed `errore_registrazione` uscivano insieme con
  // «Non tocca il dispositivo né il documento sanitario»: vero per un errore di prezzo,
  // **l'esatto contrario** per chi ha premuto «consegna» per sbaglio, dove il lavoro torna
  // a `pronto` e la dichiarazione si annulla.
  // 🛑 Il difetto NON era il testo: era il ramo condiviso. Riscrivere la frase l'avrebbe resa
  // giusta per uno e falsa per l'altro — la correzione è la SPACCATURA.
  if (f.natura === 'commerciale')
    return { esito: 'nessuna_azione', perche: 'Non tocca il dispositivo né il documento sanitario.', ramoIso: null, termineOre: null }
  // 🔑 I DUE PIANI RESTANO DUE (D288). Sul piano della QUALITÀ l'esito è lo stesso di sopra —
  // `nessuna_azione`, nessun ramo ISO, nessun termine: non è un problema del dispositivo e
  // non entra nei conteggi regolamentari (D281 e D285 intatte). È il piano OPERATIVO a
  // divergere, e il suo effetto vive in `src/lib/qualita/effetti.ts`, non qui: una funzione
  // sola che rispondeva a due domande diverse è ciò che aveva prodotto la frase falsa.
  if (f.natura === 'errore_registrazione')
    return {
      esito: 'nessuna_azione',
      perche: 'La consegna non è mai avvenuta: non c\'è nessun problema del dispositivo da segnalare, e questo caso non entra nei conteggi di legge. Ma non resta senza conseguenze: il lavoro torna fra quelli pronti e la dichiarazione già emessa viene annullata, perché diceva di una consegna che non c\'è stata.',
      ramoIso: null,
      termineOre: null,
    }

  // ② — dispositivo uscito, nessun incidente, segnalazione da fuori: reclamo.
  if (uscito && f.origine !== 'laboratorio_interno')
    return {
      esito: 'reclamo',
      perche: `${descriviProvenienza(f.origine)}. ${primaLettera(descriviStatoDispositivo(f.statoDispositivo))}. Per la norma è un reclamo.`,
      ramoIso: '8.3.3',
      termineOre: null,
    }

  // ③ — non conformità interna. §8.3.3 se il dispositivo era uscito, §8.3.2 se non lo è mai
  // stato (D278: qui il fallback, per ogni `origine`, di un motivo non esente).
  return {
    esito: 'non_conformita_interna',
    perche: uscito
      ? `${descriviProvenienza(f.origine)}. ${primaLettera(descriviStatoDispositivo(f.statoDispositivo))}. È una non conformità interna, con rilavorazione (ramo ISO 8.3.3).`
      : `${descriviProvenienza(f.origine)}. ${primaLettera(descriviStatoDispositivo(f.statoDispositivo))}. Non può esserci né un incidente né un reclamo, qualunque sia il potenziale di danno: è una non conformità interna, da correggere prima che il lavoro riparta (ramo ISO 8.3.2).`,
    ramoIso: uscito ? '8.3.3' : '8.3.2',
    termineOre: null,
  }
}
