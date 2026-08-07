import type { LavoroDettaglio, ConsegnaPrecheckResult } from '@/types/domain'
import { nomePrescrittore } from './prescrittore'
import { caratteristichePrescritte } from '@/lib/prescrizione/caratteristiche-prescritte'

/**
 * Il controllo che precede la consegna, misurato sulle OTTO informazioni che
 * l'Allegato XIII punto 1 del Reg. (UE) 2017/745 pretende sulla dichiarazione.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🛑 QUESTO COMMENTO DICEVA IL FALSO, ed è stato riscritto il 07/08/2026 (D295)
 * ═══════════════════════════════════════════════════════════════════════════
 * Dichiarava di verificare «gli 8 elementi obbligatori Allegato XIII» e poi
 * elencava una numerazione che **nell'Allegato XIII non esiste**: 2 = data di
 * emissione, 6 = classe di rischio, 7 = data di consegna prevista — **nessuna
 * delle tre è una voce dell'Allegato**. E tre voci vere mancavano: la **2**
 * (mandatario), la **6** (caratteristiche prescritte), la **8** (sostanze e
 * tessuti).
 *
 * 🔑 **Non è stato un errore innocuo, ed è il motivo per cui il commento conta
 *    quanto il codice.** Chi leggeva «6 = classe di rischio» aveva ogni ragione
 *    di credere che la voce 6 fosse coperta. La voce 6 vera — «le
 *    caratteristiche specifiche del prodotto indicate nella prescrizione» — è
 *    invece l'unica delle otto che il documento **non ha MAI stampato**: era
 *    cablata a `null` in `generate-ddc.ts`. Un elenco che sembra completo e non
 *    lo è è lo stesso difetto dei cinque ruoli che sembravano quattro
 *    (CLAUDE.md §9).
 *
 * ── LE OTTO VOCI VERE, e dove ognuna è garantita ──────────────────────────
 *   1. Fabbricante e **tutti i luoghi di fabbricazione** → istantanea dei dati
 *      del laboratorio alla generazione (`generate-ddc.ts`, `luogoFabbricazione`).
 *   2. Mandatario → **non applicabile**: un laboratorio italiano che fabbrica in
 *      Italia non ha un mandatario (serve al fabbricante extra-UE, Art. 11).
 *      Nessun controllo, e l'assenza è la risposta giusta — non un buco.
 *   3. Dati che identificano il dispositivo → **verificata qui** (descrizione +
 *      tipo dispositivo).
 *   4. Destinazione a un solo paziente identificato → **verificata qui**.
 *   5. Nome di chi ha prescritto → **verificata qui**.
 *   6. Caratteristiche specifiche indicate nella prescrizione → **avvisata
 *      qui** (canale morbido, sotto): il dato vive in `lavori_prescrizioni` e
 *      può legittimamente non esserci.
 *   7. Dichiarazione di conformità ai requisiti dell'Allegato I → testo fisso
 *      alla generazione. La seconda metà della voce («**se del caso**»,
 *      i requisiti non interamente rispettati) è **condizionale**: pretenderla
 *      sempre sarebbe sbagliato quanto ignorarla.
 *   8. Sostanze medicinali, tessuti o cellule → «**se del caso**». Oggi il
 *      documento afferma «No» senza avere il dato: **è un difetto noto, fuori
 *      da questo mandato** (candidato già registrato nel registro versioni di
 *      `generate-ddc.ts`), riferito e non corretto qui.
 *
 * ── I due controlli che NON sono voci dell'Allegato, e restano ─────────────
 * `classe_rischio` e `data_consegna_prevista` portano `elemento: null`, che
 * dice onestamente «controllo d'integrità, non voce dell'Allegato XIII».
 * 🛑 **Non si tolgono**: `classe_rischio` è `NOT NULL` su
 * `dichiarazioni_conformita` (`schema.sql:1231`) e senza di lei l'emissione
 * fallisce. Togliere un cancello perché il suo cartello era sbagliato sarebbe
 * il contrario del rimedio.
 */
export function precheckMDR(lavoro: LavoroDettaglio): ConsegnaPrecheckResult {
  const errori: ConsegnaPrecheckResult['errori'] = []

  // VOCE 5 — «il nome della persona che ha prescritto il dispositivo»
  // D242: la regola di «vuoto» è UNA e vive in `nomePrescrittore`, la stessa
  // che usano i due documenti. Prima questo controllo misurava il testo
  // trimmato e i documenti no: il controllo diceva verde e la Dichiarazione
  // usciva senza il nome del medico.
  const haPrescrittore = nomePrescrittore(
    lavoro.richiedente_nome,
    `${lavoro.cliente?.cognome ?? ''} ${lavoro.cliente?.nome ?? ''}`,
  ) !== null

  if (!haPrescrittore) {
    errori.push({
      elemento: 5,
      descrizione: 'Nominativo prescrittore mancante',
      campo: 'cliente_id',
      route: 'dati',
    })
  }

  // VOCE 4 — Paziente: deve esserci un identificatore renderizzabile nel PDF
  // (nome snapshot, o codice paziente — non basta solo paziente_id senza nome)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paz = lavoro.paziente as any
  const nomePaziente = lavoro.paziente_nome_snapshot?.trim()
    ?? paz?.nome_cognome?.trim()
    ?? paz?.codice_paziente?.trim()
  const haPaziente = !!nomePaziente && nomePaziente.length > 0

  if (!haPaziente) {
    errori.push({
      elemento: 4,
      descrizione: 'Paziente non identificabile — aggiungi nome paziente o codice',
      campo: 'paziente_id',
      route: 'dati',
    })
  }

  // VOCE 3a — «i dati che consentono di identificare il dispositivo»
  if (!lavoro.descrizione || lavoro.descrizione.trim().length < 5) {
    errori.push({
      elemento: 3,
      descrizione: 'Descrizione dispositivo troppo breve (min 5 caratteri)',
      campo: 'descrizione',
      route: 'dati',
    })
  }

  // VOCE 3b — stessa voce: anche il tipo identifica il dispositivo
  if (!lavoro.tipo_dispositivo || lavoro.tipo_dispositivo.trim().length === 0) {
    errori.push({
      elemento: 3,
      descrizione: 'Tipo dispositivo non specificato',
      campo: 'tipo_dispositivo',
      route: 'dati',
    })
  }

  // NON una voce dell'Allegato XIII — controllo d'integrità del documento.
  // 🛑 Resta bloccante com'era: `dichiarazioni_conformita.classe_rischio` è
  //    `NOT NULL` (schema.sql:1231), quindi senza di lei l'emissione fallisce
  //    con un errore che l'utente non sa leggere. Meglio dirlo prima.
  if (!lavoro.classe_rischio) {
    errori.push({
      elemento: null,
      descrizione: 'Classe di rischio non specificata',
      campo: 'classe_rischio',
      route: 'dati',
    })
  }

  // NON una voce dell'Allegato XIII — dato d'esercizio del laboratorio.
  // Resta bloccante com'era: cambiare quel confine è una decisione di Francesco.
  if (!lavoro.data_consegna_prevista) {
    errori.push({
      elemento: null,
      descrizione: 'Data consegna prevista mancante',
      campo: 'data_consegna_prevista',
      route: 'dati',
    })
  }

  // Dati accettazione ingresso — MDR Allegato XIII (tracciabilità impronta)
  // Questi campi non bloccano la consegna ma generano un avviso esplicito
  const mdrCampiMancanti: string[] = [
    !lavoro.tipo_impronte ? 'Tipo impronta' : null,
    !lavoro.disinfettante_usato ? 'Disinfettante' : null,
  ].filter((x): x is string => x !== null)

  const mdrIncompleto = mdrCampiMancanti.length > 0

  // ═══ VOCE 6 — la rete che impedisce al buco di riaprirsi (D295) ═══════════
  //
  // 🔑 I DUE VUOTI NON SONO LO STESSO VUOTO, ed è tutto il senso di questo
  //    blocco:
  //    · **Nessuna prescrizione** (`prescrizione` assente) → la voce 6 dice «le
  //      caratteristiche indicate NELLA PRESCRIZIONE»: se prescrizione non ce
  //      n'è, non c'è nulla da riportare e il campo resta vuoto **per diritto**.
  //      Avvisare qui sarebbe un falso allarme su ogni lavoro nato senza foglio
  //      del dentista — cioè su tanti — e un avviso che grida sempre è un
  //      avviso che nessuno legge più.
  //    · **Prescrizione presente ma senza caratteristiche** → è ESATTAMENTE il
  //      difetto che D295 chiude: il dato c'era e sul documento non arrivava.
  //      Senza questa rete si riapre in silenzio alla prima regressione.
  //
  // 🛑 AVVISA, NON BLOCCA. «La PWA non dà blocchi, dà aiuti» (D262): l'avviso
  //    vive nel canale morbido e non tocca `ok`. Il foglio di conferma in cui
  //    finisce compare GIÀ oggi a ogni consegna consegnabile
  //    (`FlussoConsegna.tsx:97`), quindi non si aggiunge nessun passaggio: si
  //    aggiunge una riga a un foglio che c'era. Rendere questa voce bloccante è
  //    una decisione di Francesco — proposta nel referto, non presa qui.
  //
  // ⚠️ LIMITE DICHIARATO: se chi chiama non ha chiesto l'embed
  //    `prescrizione:lavori_prescrizioni(*)`, `lavoro.prescrizione` è
  //    `undefined` e questo controllo tace. Tace nella direzione sicura (nessun
  //    falso allarme), ma **tace anche su un lavoro che una prescrizione ce
  //    l'ha**. I due chiamanti veri (`orchestrate.ts` e la rotta di precheck)
  //    l'embed lo chiedono entrambi, da D295.
  const avvisi: string[] = []
  if (lavoro.prescrizione && caratteristichePrescritte(lavoro.prescrizione.contenuto) === null) {
    avvisi.push(
      'La prescrizione è allegata ma non riporta caratteristiche (elementi o colore): la dichiarazione uscirà senza',
    )
  }

  return {
    ok: errori.length === 0,
    errori,
    mdr_incompleto: mdrIncompleto,
    mdr_campi_mancanti: mdrCampiMancanti,
    avvisi,
  }
}
