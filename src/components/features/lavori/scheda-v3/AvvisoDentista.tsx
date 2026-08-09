'use client'

// src/components/features/lavori/scheda-v3/AvvisoDentista.tsx
//
// Task 5 dell'ondata «l'avviso al dentista», emendato dal Task 5-bis (⚖️ D351).
// Mockup APPROVATO: docs/design/mockups/2026-08-09-avviso-al-dentista.html —
// colonna CENTRALE della sezione A, targhetta «Variante A2 · due strade pari».
// Verbale: ⚖️ D331 · D332 · D334 · D335 · D339 · D344 · D345 · D348 · D350 · D351.
//
// 🔑 LA FORMA, e ogni pezzo ha la sua decisione dietro:
//   ① una RIGA sulla scheda, come il foglio gemello: dice DOVE si va;
//   ② PASSO 1 — una domanda sola (L1): «Come avvisi il dentista?», e due righe
//      di risposta con lo STESSO peso (⚖️ D335). Sotto, «Perché te lo chiedo»:
//      il promemoria non si spegne da solo;
//   ③ PASSO 2 — la strada scelta. Su WhatsApp il testo è MODIFICABILE (⚖️ D334);
//      «a voce» NON chiede più una conferma (⚖️ D351): il tocco sulla riga
//      PROGRAMMA la scrittura, e il passo che si apre è la finestra in cui la si
//      può ancora fermare;
//   ④ PASSO 3 — si rilegge ciò che È STATO scritto, letto dalla riga che la
//      rotta ha restituito.
//
// ⚖️ D351 — «L'HO AVVISATO IO, A VOCE» CHIUDE CON UN TOCCO SOLO.
//    🔄 QUI C'ERA SCRITTO IL CONTRARIO, e la riga è stata riscritta invece di
//    corretta in fondo: il Task 5 sosteneva che la parità di ⚖️ D335 fosse anche
//    parità di TOCCHI, e teneva un secondo passo di conferma su «a voce».
//    Francesco ha scelto la via corta («*Un tocco solo*», 09/08/2026).
//    ➡️ Il conto dei tocchi, dalla scheda: WhatsApp **3** (apri · scegli · manda),
//    a voce **2** (apri · scegli). La parità nei tocchi NON c'è più, ed è una
//    conseguenza dichiarata della decisione, non un difetto da riequilibrare: il
//    passo del messaggio su WhatsApp è ⚖️ D334 e non si tocca.
//    🔑 Ciò che resta pari è il resto, e non è poco: le due righe sono lo STESSO
//    componente con gli stessi token, e **entrambe portano ancora il gallone `›`**
//    — perché entrambe aprono davvero un passo (§4.4). Se «a voce» avesse scritto
//    senza aprire niente, quel gallone sarebbe diventato falso.
//    🔑 E il passo si è tenuto ciò per cui valeva: la RILETTURA di quello che
//    resterà scritto. D351 ha tolto il TOCCO, non la lettura — la si legge
//    mentre la finestra scorre, senza pagarla.
//
// 🛑 UN SOLO OVERLAY PER TUTTO IL PERCORSO, e non è una scelta di stile: è il
//    difetto misurato del foglio gemello (v. il riquadro in testa a
//    `DevoIntervenire.tsx`). La pila di `storia-overlay.ts` tiene UNA sola entry
//    di history: due overlay che si passano il testimone nello stesso commit
//    producono un `popstate` che chiude il secondo appena nato. Qui il percorso
//    vive in un `Sheet` solo, che cambia passo.
//
// ⚖️ D331 — L'ORDINE FRA L'INVIO E LA REGISTRAZIONE, e il caso peggiore.
//    **Prima si apre WhatsApp, poi si registra**, nello stesso gesto.
//    · **Perché non il contrario:** per registrare prima bisognerebbe aspettare
//      la rotta (`await`) e poi aprire il collegamento — cioè aprire una finestra
//      FUORI dal gesto dell'utente, che è il caso che i browser bloccano. Qui il
//      tasto verde resta un `<a target="_blank">`: lo apre il browser, dentro il
//      gesto, e non può essere bloccato.
//    · **Il caso peggiore, scelto e non scoperto:** il messaggio parte e la rotta
//      fallisce. Allora il promemoria **resta aperto** — che è la direzione
//      recuperabile — e il foglio lo DICE («il messaggio è partito, la
//      registrazione no»), offrendo una registrazione che **non riapre
//      WhatsApp**. Il testo diventa di sola lettura: si registra quello che è
//      **partito**, non uno riscritto dopo.
//    · **Perché l'ordine inverso è peggio:** se la registrazione riuscisse e il
//      messaggio non partisse, in banca dati resterebbe `comunicato_dall_app`
//      per un messaggio mai uscito — e la rotta risponde **409** a un secondo
//      aggiornamento (non esiste uno stato «annullato», di proposito): il
//      promemoria sarebbe spento su un fatto falso, senza strada di ritorno.
//    · 🛑 In entrambe le strade quel che resta scritto è un'**autodichiarazione**:
//      l'app non può sapere se il messaggio è davvero partito, e nessun testo di
//      questo foglio fa credere il contrario.
//
// 🔴 LA VIA DI FUGA DELLA LEGGE 6 SU «A VOCE»: LA SCRITTURA SI FA ATTENDERE.
//    🔄 QUI C'ERA SCRITTO CHE LA VIA DI FUGA VIVEVA **PRIMA** DELLA SCRITTURA —
//    era vero col passo di conferma, ed ⚖️ D351 l'ha reso falso. Riscritto qui,
//    non annotato in fondo.
//
//    **Come è fatta ora:** il tocco sulla riga non scrive, PROGRAMMA. Per
//    `FINESTRA_ANNULLO_AVVISO_MS` non parte nessuna richiesta e in banca dati non
//    cambia niente; nel frattempo un «Annulla» sta a schermo — nel foglio e, se il
//    foglio si chiude, al posto della riga sulla scheda.
//
//    🔑 PERCHÉ SI DIFFERISCE INVECE DI TORNARE INDIETRO, e la ragione è un
//    PRECEDENTE IN CASA, non una preferenza. La consegna — l'unico annullo già
//    costruito in questa app — non ha UN meccanismo: ne ha DUE, e li divide per
//    reversibilità.
//      · ciò che ha uno stato di ritorno si SCRIVE SUBITO e si rovescia:
//        `annulla_consegna_atomica` riporta `lavori.stato` a `pronto` e mette la
//        dichiarazione in `stato = 'annullata'`
//        (`supabase/migrations/20260710091500_rpc_consegna_annullo_atomiche.sql:96-108`);
//      · ciò che NON si disfa si DIFFERISCE per la durata esatta della finestra:
//        la fattura non viene emessa al tocco, viene messa in coda con
//        `emetti_dopo = now() + p_finestra_ms` (stessa migration, righe 30-37), e
//        l'annullo si limita a segnare la voce in coda come `annullata` prima che
//        il cron la prenda.
//    🛑 `avvisi_dentista` sta sul secondo ramo, e non per caso: **non ha uno stato
//    «annullato»** — il vocabolario ammette tre valori e basta (Task 1: «un
//    promemoria cancellabile è una casella da spuntare»). Il primo meccanismo qui
//    non è disponibile per costruzione. ➡️ Quindi non ci sono «due modi di
//    annullare che divergeranno»: c'è UN modello di casa con due metà, e questa
//    tabella ricade sulla metà del differimento.
//
//    ✅ E c'è una seconda ragione, che vale più della prima. `misurato:` il ritorno
//    a `da_comunicare` sarebbe scrivibile, ma **azzerando TRE campi, non due**:
//    lasciando `testo_inviato` il vincolo `avviso_testo_solo_se_dall_app` risponde
//    **23514** (sonda su schema usa-e-getta, transazione annullata, 09/08/2026).
//    Cioè un ritorno CANCELLA il testo comunicato — la prova ex Art. 5(2) GDPR che
//    questa tabella esiste per tenere. 🔑 Un tocco per sbaglio è un fatto che non è
//    mai avvenuto: differire vuol dire che nel registro **non ci finisce affatto**,
//    invece di finirci e poi essere sbiancato senza traccia.
//
//    ⚠️ IL PREZZO, DICHIARATO: per la durata della finestra la scrittura non è
//    ancora avvenuta, e **nessuna parola del foglio dice il contrario** («*Lo segno
//    fra un attimo*», non «fatto»). Se la pagina muore nel frattempo, la scrittura
//    non parte e **il promemoria resta aperto** — la direzione recuperabile, la
//    stessa già scelta per il caso «il messaggio è partito e la rotta è fallita».
//
//    📌 SULLA STRADA DI WHATSAPP NON CAMBIA NIENTE: lì la via di fuga vive ancora
//    prima della scrittura, perché il secondo tocco c'è ancora (⚖️ D334) — e dopo
//    di lui il messaggio è **davvero uscito**, quindi non c'è niente da fermare.
//
// ✅ ⚖️ D348 — IL GETTONE DEL PORTALE NON SI RIGENERA QUI: non scade più a tempo.
//    Non esiste nessun ramo «gettone scaduto» in questo foglio.
//
// ⚖️ D339 — nessun salvataggio automatico del testo mentre si scrive, e nessuna
//    scrittura prima del tocco: da qui parte UNA sola richiesta, e porta il testo
//    mandato.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ds/Sheet'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { TastoWhatsApp } from '@/components/ds/TastoWhatsApp'
import { CampoTestoLungo, formattaGiornoBreve } from '@/components/ds/Campo'
import { useAvvisi } from '@/components/ds/Avviso'
// ⚖️ D351 — la via di fuga della Legge 6 ha il SUO componente, e §5.5 lo riserva
//    proprio a questo: «Aspetta, annulla la consegna». Non un tasto.
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'
// 🔑 IL TESTO PROPOSTO NON SI COMPONE QUI: `buildAvvisoMessage` è la fonte sola
//    (⚖️ D334 · D336 · GDPR), e la firma la decide `firmaMessaggio` dentro di
//    lei (⚖️ D345). Questo foglio è il suo primo chiamante e non ne riscrive
//    nemmeno una riga: la difesa contro il nome del paziente è la FIRMA di quella
//    funzione, che non ha un parametro capace di portarlo.
import { buildAvvisoMessage } from '@/lib/avvisi/messaggio'
// 🔑 E il collegamento `wa.me` lo compone chi lo componeva già: `buildWhatsappUrl`
//    è l'unico posto dove il testo viene CODIFICATO e dove il numero viene
//    preparato (prefisso paese compreso, P31/D182). Ricomporlo qui sarebbe la
//    seconda regola sullo stesso indirizzo.
import { buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'
import { testoVivo } from '@/lib/utils/testo'
import { inizioGiorno, stessoGiorno } from '@/lib/date/giorni'

/** I passi del foglio. `chiuso` è lo stato a riposo: la riga sulla scheda. */
type Passo = 'chiuso' | 'scelta' | 'messaggio' | 'voce' | 'fatto'

/**
 * 🛑 IL TETTO DEL TESTO È QUELLO DELLA ROTTA, e i due numeri sono lo stesso
 * numero scritto in due posti: `LIMITE_TESTO` in
 * `src/app/api/lavori/[id]/avviso/route.ts:96` vale **1000** e non è esportato.
 * ⚠️ Divergenza possibile DICHIARATA: esportarlo vorrebbe dire toccare la rotta,
 * che è fuori dal mandato di questo compito — riferito, non corretto (R-E2).
 * 🔑 Perché il tetto sta anche qui e non solo là: senza, chi incolla un file
 * dentro il campo scopre il rifiuto **dopo** che il messaggio è partito.
 */
const TETTO_TESTO = 1000

/**
 * ⚖️ D351 — QUANTO DURA LA FINESTRA IN CUI «A VOCE» SI PUÒ ANCORA FERMARE.
 *
 * 🔑 IL NUMERO È DERIVATO DALLA LEGGE 6, non scelto per gusto. §1 la scrive
 * così: «*Ogni azione irreversibile ha una via di fuga visibile — «Annulla»
 * leggibile senza scrollare, **entro 10s dall'azione***». Se la finestra si
 * chiudesse a 5 secondi, una persona che reagisce all'ottavo non troverebbe più
 * niente: la legge sarebbe violata **col suo stesso numero**. Dieci secondi è il
 * minimo che rende vera la promessa che L6 fa.
 * 📌 Confronto col precedente: la consegna tiene **dieci minuti**
 * (`FINESTRA_ANNULLO_MS`, `src/lib/consegna/costanti.ts:7`). Là si può, perché la
 * finestra la controlla il server sulla data salvata e non fa aspettare nessuno.
 * Qui la finestra è **un'attesa a schermo**, quindi la si misura in secondi.
 *
 * 🛑 STA QUI E NON IN `src/lib/avvisi/costanti.ts`: quel file **non esiste**, e
 * crearlo vorrebbe dire un file nuovo fuori dal perimetro di questo compito («il
 * componente e la sua prova»). ➡️ Il giorno in cui una seconda superficie avrà
 * bisogno di questa finestra, la costante si sposta lì — esattamente come la
 * consegna tiene la sua in un modulo condiviso, e per lo stesso motivo.
 */
export const FINESTRA_ANNULLO_AVVISO_MS = 10_000
const FINESTRA_ANNULLO_AVVISO_S = FINESTRA_ANNULLO_AVVISO_MS / 1000

/**
 * Come si legge lo stato salvato, nelle parole del banco.
 *
 * 🛑 `Record` sulle due chiavi che la rotta può restituire, non `string`: se un
 * giorno nascesse un terzo modo di chiudere un avviso, la riuscita non potrebbe
 * più stampare una parola vuota — `tsc` si accenderebbe qui.
 */
const COME_SI_LEGGE: Record<'comunicato_dall_app' | 'comunicato_a_voce', string> = {
  comunicato_dall_app: 'dall’app, su WhatsApp',
  comunicato_a_voce: 'a voce, da te',
}

/**
 * L'istante salvato, nelle parole del banco — «oggi alle 14:32», «Ven 7 alle
 * 09:05». 🛑 Mai `09/08/2026`: §2.1 vieta la data in cifre nell'interfaccia
 * operativa.
 *
 * 🔑 Torna `null` invece di una stringa di ripiego quando il valore non è un
 * istante: la riuscita si rilegge **senza orologio** piuttosto che con un
 * orologio inventato. Il ramo è raggiungibile — `comunicato_at` arriva dal corpo
 * di una risposta, cioè da fuori, dove il tipo è una promessa e non un fatto
 * (stessa riga di `isStatoAvviso` in `src/lib/avvisi/stati.ts`).
 */
export function quandoLeggibile(iso: unknown, adesso: Date = new Date()): string | null {
  if (typeof iso !== 'string' || iso.length === 0) return null
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return null
  const ora = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(quando)
  const giorno = stessoGiorno(inizioGiorno(quando), inizioGiorno(adesso))
    ? 'oggi'
    : formattaGiornoBreve(quando)
  return `${giorno} alle ${ora}`
}

/** La riga salvata che la rotta restituisce (Task 4: «porta la riga davvero
 *  salvata, così chi ha chiesto non deve rileggerla»). Tutto facoltativo: è un
 *  corpo che arriva da fuori. */
interface RigaSalvata {
  stato?: unknown
  comunicato_at?: unknown
}

/**
 * Il messaggio che la rotta ha scritto, o quello di casa se il corpo è
 * illeggibile. 🛑 Non si sostituisce mai un messaggio del server con un
 * «qualcosa è andato storto»: quello del server dice **che cosa fare**. Stessa
 * funzione del foglio gemello, e per la stessa ragione.
 */
async function messaggioDiErrore(res: Response, difetto: string): Promise<string> {
  try {
    const b = (await res.json()) as { error?: unknown }
    if (typeof b.error === 'string' && b.error.length > 0) return b.error
  } catch {
    /* corpo illeggibile: resta il messaggio di casa */
  }
  return difetto
}

export function AvvisoDentista(props: {
  lavoroId: string
  /** L'avviso `da_comunicare` da chiudere. Lo trova il Task 6 (`avvisiDaComunicare`). */
  avvisoId: string
  numeroLavoro: string
  /** Il nome dello studio, come lo mostra la scheda. */
  nomeStudio: string
  /**
   * Come la scheda identifica il paziente OGGI — lo stesso valore che la scheda
   * sta già mostrando dietro il foglio.
   * ⚠️ Il mockup approvato mostra il nome per esteso, e §2.1 elenca **due** sole
   * deroghe al paziente pseudonimizzato (D8 · D7): questa sarebbe la terza. Il
   * componente non la istituisce — rende **ciò che il chiamante gli passa**, e la
   * domanda è a verbale nel resoconto del Task 5.
   * 🛑 In ogni caso questo valore **non entra nel messaggio**: la difesa è la
   * firma di `buildAvvisoMessage`, che non ha un parametro per portarlo.
   */
  pazienteMostrato: string
  /** `clienti.portale_token`. Vuoto = una lettura che non l'ha chiesto (⚖️ D348:
   *  non scade più a tempo, quindi non esiste il ramo «scaduto»). */
  portalToken: string
  /** ⚖️ D345 — `laboratori.nome`: la firma è un dato passato, non una costante. */
  nomeLaboratorio: string | null
  /** `clienti.telefono` — il numero da comporre su `wa.me`. */
  telefonoStudio: string | null
}) {
  const {
    lavoroId,
    avvisoId,
    numeroLavoro,
    nomeStudio,
    pazienteMostrato,
    portalToken,
    nomeLaboratorio,
    telefonoStudio,
  } = props

  const router = useRouter()
  const { errore } = useAvvisi()

  const [passo, applicaPasso] = useState<Passo>('chiuso')
  /** Il testo proposto, e poi quello corretto a mano (⚖️ D334). Nasce qui e
   *  muore qui: ⚖️ D339 — nessuna bozza si conserva da nessuna parte. */
  const [testo, setTesto] = useState(() =>
    buildAvvisoMessage({ numeroLavoro, portalToken, nomeLaboratorio })
  )
  /**
   * 🔴 IL TESTO CHE È GIÀ PARTITO, messo da parte al tocco.
   * Serve al caso peggiore: se la registrazione fallisce dopo l'invio, ciò che si
   * registra dev'essere la stringa **che il dentista ha ricevuto**, non quella
   * che il campo mostra dopo. Finché è `null`, niente è partito.
   */
  const [mandato, setMandato] = useState<string | null>(null)
  const [nonRegistrato, setNonRegistrato] = useState<string | null>(null)
  const [lavorando, setLavorando] = useState(false)
  const [salvata, setSalvata] = useState<RigaSalvata | null>(null)
  const [daRinfrescare, setDaRinfrescare] = useState(false)
  /**
   * ⚖️ D351 — I SECONDI CHE RESTANO PRIMA CHE «A VOCE» VENGA SCRITTO.
   * `null` = niente in attesa. Diverso da zero: è **l'unico** stato che dice se
   * una scrittura è programmata, e per questo la riga sulla scheda e il passo del
   * foglio lo leggono entrambi.
   */
  const [restanoSec, setRestanoSec] = useState<number | null>(null)

  /**
   * 🔴 LO SCORRIMENTO NON SI AZZERA DA SÉ AL CAMBIO DI PASSO — MISURATO SU QUESTO
   * FOGLIO, non ereditato per sentito dire.
   *
   * `provato:` `grep -n scrollTop src/components/ds/Sheet.tsx` → **zero righe**:
   * il pannello dello `Sheet` è il contenitore che scorre (`overflowY: 'auto'`,
   * `Sheet.tsx:507`) e nessuno lo riporta in cima quando il contenuto cambia.
   * `misurato:` sul banco vero, 09/08/2026, viewport **195×422** — cioè 390×844
   * letto con lo **zoom del browser al 200%**, che §13.3 rende obbligatorio:
   *   passo 1 scorribile (`scrollHeight` 1100 su `clientHeight` 388) → scorso in
   *   fondo (`scrollTop` **712**) → cambio passo → `scrollTop` **216**, e il
   *   **titolo del passo nuovo finisce a −150 px, fuori dal pannello**.
   * 📌 A 390×844 e a 390×667 (regime device-corti §4.2) il passo 1 **non scorre**
   *    (517 su 517 / 517 su 614), quindi lì il difetto non si vede: è una prova
   *    che va cercata dove il caso esiste, non dove è comodo.
   *
   * 🛑 LA CORREZIONE VERA STA IN `Sheet.tsx` E NON SI FA DA QUI: è un componente
   *    di sistema, il difetto vale per **ogni** foglio a passi, e toccarlo è un
   *    mandato diverso — **riferito**, non corretto di nascosto (R-E2).
   * ✅ QUI SI METTE LA VIA LOCALE, e la si mette perché il difetto **si manifesta**:
   *    un titolo fuori schermo su un foglio che cambia argomento è chi legge che
   *    non sa più dove si trova. Un'àncora invisibile in cima ai figli del foglio,
   *    e da lei si risale al pannello che scorre.
   * 🔑 `closest('[role="dialog"]')` e non `.ds-sheet`: `role="dialog"` è la stessa
   *    marca sui DUE rami del componente — quello animato e `SheetRidotto` (a
   *    movimento ridotto è un ramo di codice diverso, §8.4). E non
   *    `scrollIntoView`, che scorrerebbe anche gli antenati.
   * ⚠️ Il giorno in cui `Sheet` azzererà da sé, queste righe diventano innocue e
   *    si togliranno con quella correzione.
   */
  const ancora = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (passo === 'chiuso') return
    const pannello = ancora.current?.closest('[role="dialog"]')
    if (pannello) pannello.scrollTop = 0
  }, [passo])

  /**
   * ⚖️ D351 — LA FINESTRA DI «A VOCE»: DUE OROLOGI, e ognuno fa una cosa sola.
   *
   * 🛑 SONO DUE APPOSTA, e non è pignoleria: mettere la scrittura dentro
   *    l'aggiornatore di `setRestanoSec` la farebbe partire **due volte** in
   *    `StrictMode`, che invoca gli aggiornatori due volte proprio per scoprire
   *    chi non è puro. Quindi la divisione è netta —
   *    · `orologioScrittura` (un `setTimeout` solo) è **l'unico che scrive**, e
   *      scade una volta;
   *    · `orologioContatore` (un `setInterval`) fa scendere il numero e **non
   *      decide niente**: se i due derivassero di qualche millesimo, sbaglierebbe
   *      il numero a schermo, non il momento della scrittura.
   * 🔑 Stanno in due `ref` e non in due stati: fermarli non deve ridisegnare
   *    nulla, e il gestore del tocco li ferma senza passare da un effetto — dove
   *    `setState` è vietato dalla regola di casa (`react-hooks/set-state-in-effect`,
   *    quella con la deroga dichiarata in `AnnullaConsegnaBanner.tsx:32`).
   */
  const orologioScrittura = useRef<ReturnType<typeof setTimeout> | null>(null)
  const orologioContatore = useRef<ReturnType<typeof setInterval> | null>(null)

  const fermaOrologi = useCallback(() => {
    if (orologioScrittura.current !== null) {
      clearTimeout(orologioScrittura.current)
      orologioScrittura.current = null
    }
    if (orologioContatore.current !== null) {
      clearInterval(orologioContatore.current)
      orologioContatore.current = null
    }
  }, [])

  /**
   * 🛑 Se il componente se ne va con una scrittura in attesa, gli orologi si
   *    fermano — e questo è anche **il prezzo dichiarato del differimento**: la
   *    finestra vive nel browser, quindi se la pagina muore la scrittura non parte
   *    e il promemoria **resta aperto**. È la direzione recuperabile, la stessa già
   *    scelta per «il messaggio è partito e la rotta è fallita».
   */
  useEffect(() => fermaOrologi, [fermaOrologi])

  /**
   * 🔴 IL PASSO SI LEGGE DA UN POSTO SOLO, E QUEL POSTO È SINCRONO.
   *
   * **Il problema vero**, trovato in revisione prima che diventasse un difetto:
   * `orologioScrittura` chiude su un render vecchio, quindi dieci secondi più
   * tardi la domanda «il foglio è aperto?» va **riletta adesso**. Ci sono due modi
   * di rileggerla — l'aggiornatore che React passa al setter, e un
   * `ref` — e **usarli entrambi nella stessa decisione è la trappola**: un `ref`
   * aggiornato da un effetto è indietro di un commit, quindi se la persona chiude
   * il foglio nello stesso istante in cui la richiesta si risolve, i due possono
   * **rispondere diverso**. Il danno concreto sarebbe questo: il passo resta
   * (giustamente) `chiuso`, ma il rinfresco viene rimandato a una chiusura **che
   * non arriverà più** — e la riga resterebbe a schermo su un promemoria spento.
   *
   * ✅ Risolto **togliendo il secondo modo**: `passoRef` è la verità sincrona, e
   * ogni transizione passa da `vaiA`, che aggiorna il `ref` **e** lo stato nello
   * stesso gesto. Niente effetto di sincronia, niente ritardo di un commit.
   * 🛑 L'INVARIANTE, ed è grep-abile: `applicaPasso` si chiama **solo** dentro
   * `vaiA`. Se un giorno compare un `applicaPasso(` altrove, questo ragionamento
   * salta — ed è per questo che il setter non si chiama `setPasso`.
   */
  const passoRef = useRef<Passo>('chiuso')
  function vaiA(prossimo: Passo | ((corrente: Passo) => Passo)) {
    const nuovo = typeof prossimo === 'function' ? prossimo(passoRef.current) : prossimo
    passoRef.current = nuovo
    applicaPasso(nuovo)
  }

  /**
   * ⚖️ D351 — IL TOCCO SOLO: la riga «a voce» non scrive, PROGRAMMA.
   * 🛑 Da qui non parte nessuna richiesta: per `FINESTRA_ANNULLO_AVVISO_MS` in
   *    banca dati non cambia niente, e il passo che si apre è la via di fuga.
   */
  function programmaAVoce() {
    // Difesa in profondità: una finestra già aperta non si riapre (il tocco
    // arriva da una riga che, in quel momento, non è più a schermo).
    if (restanoSec !== null || lavorando) return
    setRestanoSec(FINESTRA_ANNULLO_AVVISO_S)
    vaiA('voce')
    orologioContatore.current = setInterval(() => {
      // 🛑 Si ferma a 1 e non scende a 0: lo zero non lo mostra nessuno, e la
      //    scrittura la decide l'altro orologio.
      setRestanoSec((s) => (s === null || s <= 1 ? s : s - 1))
    }, 1000)
    orologioScrittura.current = setTimeout(() => {
      fermaOrologi()
      setRestanoSec(null)
      void registra('a_voce', null)
    }, FINESTRA_ANNULLO_AVVISO_MS)
  }

  /**
   * La via di fuga della **Legge 6**. 🔑 Non «annulla» una scrittura: la ferma
   * prima che avvenga — in banca dati non c'è niente da disfare, ed è esattamente
   * il motivo per cui la finestra è stata fatta così (v. il riquadro in testa).
   * ➡️ Si torna alla DOMANDA, non si chiude: chi si è fermato quasi sempre voleva
   * l'altra strada.
   */
  function annullaAVoce() {
    fermaOrologi()
    setRestanoSec(null)
    tornaAllaDomanda()
  }

  /**
   * Si torna alla DOMANDA. 🛑 Con l'aggiornatore e non con `vaiA('scelta')`
   * nudo: questa funzione la chiama anche una scrittura fallita, che può arrivare
   * **a foglio chiuso** — e un foglio non si apre da solo.
   */
  function tornaAllaDomanda() {
    vaiA((p) => (p === 'chiuso' ? 'chiuso' : 'scelta'))
  }

  /** 🛑 IL RINFRESCO DELLA PAGINA SI FA ALLA CHIUSURA, MAI A FOGLIO APERTO —
   *  difetto misurato sullo schermo vero il 07/08 sul foglio gemello:
   *  `router.refresh()` rirende il Server Component, questo componente si
   *  ricostruisce e perde il passo a cui si era arrivati, quindi la schermata
   *  finale non compariva mai. Qui costerebbe di più: la riuscita è l'unico posto
   *  in cui la persona legge che cosa è rimasto scritto. */
  function chiudi() {
    vaiA('chiuso')
    setSalvata(null)
    setLavorando(false)
    // 🔴 `mandato` E `nonRegistrato` NON SI AZZERANO QUI, e sono due righe assenti
    //    APPOSTA: sono l'unica cosa che attraversa la chiusura del foglio.
    //    Il fatto: messaggio partito → registrazione fallita → la persona chiude
    //    (Esc, tocco sullo scrim, «Chiudi» — tutti passano da qui). In banca dati
    //    il promemoria resta giustamente aperto, ma azzerando quei due la
    //    riapertura mostrerebbe il passo della SCELTA, e da lì le uniche due mosse
    //    sono **mandare un secondo messaggio** al dentista oppure registrare «a
    //    voce» una telefonata che non c'è stata. Cioè il foglio costringerebbe a
    //    una delle due bugie — e la sua stessa frase («*da qui lo registri senza
    //    rimandare niente*») scadrebbe alla prima chiusura.
    //    🔑 Il precedente in casa è `eventoDaRiusare` del foglio gemello, col suo
    //    commento: «*è l'unica cosa che attraversa la chiusura del foglio*».
    //    🛑 E NON è una bozza conservata: ⚖️ D339 vieta di **salvare** la proposta,
    //    e qui non si salva niente — è una stringa **già uscita**, tenuta in memoria
    //    dal componente per il tempo che serve a registrarla. Muore alla riuscita.
    if (mandato === null) {
      setTesto(buildAvvisoMessage({ numeroLavoro, portalToken, nomeLaboratorio }))
    }
    // 🔴 E GLI OROLOGI DI ⚖️ D351 NON SI FERMANO QUI — terza riga assente
    //    APPOSTA, accanto alle due di sopra. Chiudere il foglio **non è**
    //    annullare: l'annullo ha un suo comando, scritto «Annulla», e resta a
    //    schermo al posto della riga sulla scheda anche a foglio chiuso. Se la
    //    chiusura fermasse la scrittura, il tocco solo di D351 non chiuderebbe
    //    niente per chi tocca e va via — cioè il caso normale.
    if (daRinfrescare) {
      setDaRinfrescare(false)
      router.refresh()
    }
  }

  /**
   * L'unica scrittura di questo foglio. Il corpo cambia con la strada, e non per
   * eleganza: il `CHECK` `avviso_testo_solo_se_dall_app` è **stretto** — con
   * «a voce» un `testo` (anche `null` esplicito) fa rispondere **422** alla rotta
   * (`route.ts:317-324`). Quindi la chiave si **omette**, non si annulla.
   */
  async function registra(come: 'dall_app' | 'a_voce', testoMandato: string | null) {
    if (lavorando) return
    setLavorando(true)
    try {
      const corpo: Record<string, unknown> = { avviso_id: avvisoId, come }
      if (come === 'dall_app' && testoMandato !== null) corpo.testo = testoMandato

      const res = await fetch(`/api/lavori/${lavoroId}/avviso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      if (!res.ok) {
        const messaggio = await messaggioDiErrore(
          res,
          'Non sono riuscita a segnare l’avviso come comunicato: riprova fra un momento.'
        )
        // 🛑 Il promemoria RESTA APERTO: è la direzione recuperabile. Sulla
        //    strada di WhatsApp il riquadro dice che il messaggio è già partito;
        //    su quella a voce basta l'avviso, perché niente è uscito.
        if (come === 'dall_app') setNonRegistrato(messaggio)
        else tornaAllaDomanda()
        errore(messaggio)
        return
      }
      const esito = (await res.json()) as { avviso?: RigaSalvata }
      // La riuscita è l'unica cosa che spegne il ricupero: da qui in poi non c'è
      // più niente di partito che aspetti di essere scritto.
      setNonRegistrato(null)
      setMandato(null)
      setSalvata(esito.avviso ?? null)
      // 🔴 ⚖️ D351 — UNA SCRITTURA DIFFERITA PUÒ ARRIVARE A FOGLIO CHIUSO, e le
      //    due righe che seguono NON dicono la stessa cosa in quel caso.
      //    · IL PASSO: un foglio non si apre da solo. Un overlay che compare
      //      dieci secondi dopo, senza che nessuno l'abbia toccato, è
      //      un'imboscata — chi ha chiuso ha finito. Se è chiuso, resta chiuso.
      //    · IL RINFRESCO: a foglio APERTO si rimanda alla chiusura, perché
      //      rinfrescare adesso ricostruisce questo componente e la schermata
      //      finale non comparirebbe mai (difetto misurato sul foglio gemello, v.
      //      `chiudi`). A foglio CHIUSO non c'è nessuna chiusura che verrà: si
      //      rinfresca subito, o la riga «Avvisa il dentista» resterebbe a
      //      schermo su un promemoria già spento.
      // 🛑 UNA LETTURA SOLA, PRESA PRIMA, e le due decisioni la condividono: se
      //    ognuna rileggesse per conto suo potrebbero rispondere diverso (v. il
      //    riquadro su `vaiA`), e la coppia sbagliata è quella che rimanda il
      //    rinfresco a una chiusura che non arriverà più.
      const foglioChiuso = passoRef.current === 'chiuso'
      vaiA(foglioChiuso ? 'chiuso' : 'fatto')
      setDaRinfrescare(!foglioChiuso)
      if (foglioChiuso) router.refresh()
    } catch {
      const messaggio =
        'Non sono riuscita a segnare l’avviso come comunicato: controlla la connessione e riprova.'
      if (come === 'dall_app') setNonRegistrato(messaggio)
      else tornaAllaDomanda()
      errore(messaggio)
    } finally {
      setLavorando(false)
    }
  }

  /**
   * IL TOCCO CHE MANDA. 🔑 L'ordine è: il browser apre `wa.me` (azione
   * predefinita del collegamento, dentro il gesto), e nello stesso gesto parte la
   * registrazione. Qui non si apre nessuna finestra a mano e non si aspetta
   * niente prima: v. il riquadro in testa al file.
   */
  function alTapDiInvio() {
    const vivo = testoVivo(testo)
    // Difesa in profondità: il tasto verde non esiste quando il testo è vuoto.
    if (vivo === null) return
    if (mandato !== null) return
    setMandato(testo)
    void registra('dall_app', testo)
  }

  const testoUsabile = testoVivo(testo) !== null
  const waUrl = buildWhatsappUrl(testo, telefonoStudio ?? undefined)

  const titolo =
    passo === 'scelta'
      ? 'Come avvisi il dentista?'
      : passo === 'messaggio'
        ? `Avvisa ${nomeStudio}`
        : passo === 'voce'
          ? // ⚖️ D351 — il titolo dice ciò che sta per succedere, non ciò che è
            // successo: per questi secondi non è scritto niente. 🛑 E resta lo
            // stesso mentre la richiesta è in volo (frazioni di secondo): un
            // titolo di foglio che cambia si fa riannunciare, e il corpo già dice
            // «Un attimo…».
            'Lo segno fra un attimo'
          : passo === 'fatto'
            ? 'Fatto'
            : ''

  return (
    <>
      {/* ① LA RIGA SULLA SCHEDA — dice DOVE si va e qual è il fatto. Compare solo
          se un avviso `da_comunicare` esiste, e chi lo decide è il Task 6.
          🔴 ⚖️ D351 — MENTRE UNA SCRITTURA ASPETTA, AL SUO POSTO C'È LA VIA DI
             FUGA. Non accanto: **al posto**, e per due ragioni.
             ① La riga porterebbe alla domanda «come avvisi il dentista?» mentre
                una risposta è già stata data e sta per essere scritta.
             ② La Legge 6 chiede l'«Annulla» leggibile **senza scorrere**: qui la
                striscia occupa esattamente il posto che l'occhio stava già
                guardando, cioè dove ha toccato un momento prima.
             🔑 Il precedente in casa è la consegna, e la forma è la sua:
             `AnnullaConsegnaBanner.tsx` mette la via di fuga **sulla pagina**, non
             dentro un overlay, con il tempo che scende accanto. Così la fuga
             sopravvive alla chiusura del foglio. */}
      {restanoSec !== null ? (
        <StrisciaAttesa restanoSec={restanoSec} soloVia={passo === 'chiuso'} onAnnulla={annullaAVoce} />
      ) : (
      <button
        type="button"
        // 🔴 SI RIENTRA DAL RICUPERO, NON DALLA SCELTA. Se un messaggio è già
        //    partito e non è stato scritto, riaprire sulla domanda «come avvisi il
        //    dentista?» offrirebbe due mosse false (rimandare · dire «a voce»): il
        //    foglio riprende esattamente da dove si era interrotto.
        onClick={() => vaiA(mandato !== null ? 'messaggio' : 'scelta')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spazio.sm,
          width: '100%',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: raggio.riga,
          padding: `${spazio.m}px`,
          textAlign: 'left',
          minHeight: 52,
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden style={{ fontSize: tipografia.size.heading, lineHeight: 1 }}>
          ✉️
        </span>
        <span style={{ flex: 1 }}>
          <span
            style={{
              display: 'block',
              fontSize: tipografia.size.body,
              fontWeight: tipografia.weight.bold,
              color: 'var(--ink)',
            }}
          >
            Avvisa il dentista
          </span>
          <span
            style={{
              display: 'block',
              fontSize: tipografia.size.label,
              color: 'var(--muted)',
              marginTop: 2,
            }}
          >
            La dichiarazione è stata rifatta: {nomeStudio} ha in mano quella vecchia
          </span>
        </span>
        <span aria-hidden style={{ color: 'var(--faint)', fontSize: tipografia.size.body }}>
          ›
        </span>
      </button>
      )}

      {/* IL FOGLIO — UNO SOLO, che cambia passo. */}
      <Sheet aperto={passo !== 'chiuso'} onChiudi={chiudi} titolo={titolo}>
        {/* L'ÀNCORA da cui si risale al pannello che scorre — v. il riquadro su
            `ancora`. `display: none`: non occupa spazio e non prende il `gap`
            della colonna dei figli del foglio. */}
        <span ref={ancora} aria-hidden="true" style={{ display: 'none' }} />

        {/* ② PASSO 1 — LA DOMANDA SOLA, E LE DUE STRADE PARI (⚖️ D335 · D344) */}
        {passo === 'scelta' && (
          <>
            <p
              style={{
                fontSize: tipografia.size.callout,
                fontWeight: tipografia.weight.semibold,
                color: 'var(--muted)',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              Hai rifatto la dichiarazione di{' '}
              <b style={{ color: 'var(--ink)' }}>{pazienteMostrato}</b>. Scegli come far sapere a{' '}
              {nomeStudio} che quella in mano non vale più.
            </p>

            {/* 🛑 LE DUE RIGHE SONO LO STESSO COMPONENTE, con gli stessi token e
                la stessa altezza: la parità di ⚖️ D335 non è un'intenzione, è la
                stessa anatomia usata due volte. Se un giorno una delle due
                diventasse più invitante, sarebbe la variante A1 — scartata. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.s }}>
              <RigaStrada
                glifo="💬"
                titolo="Glielo mando su WhatsApp"
                spiegazione="Ti mostro il messaggio, lo puoi cambiare"
                onApri={() => vaiA('messaggio')}
              />
              <RigaStrada
                glifo="📞"
                titolo="L’ho avvisato io, a voce"
                spiegazione="Resta scritto che l’hai fatto tu, oggi"
                onApri={programmaAVoce}
              />
            </div>

            {/* ⚖️ D326 · D329 — fondo `--fondo-superficie`, filo
                `--filo-superficie`, didascalia `--didascalia-superficie`: qui non
                si preme niente, la superficie delimita il blocco dal pannello. */}
            <Superficie didascalia="Perché te lo chiedo">
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--muted)',
                  margin: 0,
                }}
              >
                La legge vuole che il dentista sappia della correzione, e che resti scritto come
                gliel’hai detto.{' '}
                <b style={{ color: 'var(--ink)' }}>Il promemoria non si spegne da solo.</b>
              </p>
            </Superficie>
          </>
        )}

        {/* ③-a PASSO 2, STRADA WHATSAPP — il testo MODIFICABILE (⚖️ D334) */}
        {passo === 'messaggio' && (
          <>
            {/* 🛑 A MESSAGGIO GIÀ PARTITO NON SI TORNA ALLA SCELTA, e non è una
                gabbia: dalla scelta le due mosse sarebbero rimandare il messaggio
                o registrare «a voce» una telefonata che non c'è stata. Il fatto è
                avvenuto; l'unica cosa che resta da fare è scriverlo — o chiudere e
                rientrare, che riporta qui. */}
            {mandato === null && <TornaAllaScelta onClick={() => vaiA('scelta')} />}

            <CampoTestoLungo
              label="Il messaggio che manderai"
              valore={testo}
              onCambia={setTesto}
              massimo={TETTO_TESTO}
              soloLettura={mandato !== null}
              aiuto={
                mandato !== null
                  ? 'Il messaggio è già partito: quello che resta scritto è questo.'
                  : 'Puoi cambiarlo prima di mandarlo. Il nome del paziente non ci va.'
              }
            />

            {/* 🔴 IL RAMO SENZA GETTONE È PORTANTE, e non lo si nasconde: il testo
                proposto NON porta un collegamento morto (`buildAvvisoMessage`
                salta la riga), ma metà di ⚖️ D332 se ne va — la spinta parte, il
                posto dove guardare no. Si dice, invece di far credere che il
                dentista possa aprire qualcosa. */}
            {!portalToken && (
              <Riquadro tono="attesa" titolo="Il messaggio va senza collegamento">
                Di questo studio non ho il collegamento al portale: il messaggio dice che la
                dichiarazione è stata rifatta, ma non porta il collegamento per scaricarla.
              </Riquadro>
            )}

            {/* Il cellulare mancante si DICE. La strada più ricca — chiederlo qui
                — esiste già in casa alla consegna (⚖️ D183) e vuole una scrittura
                sull'anagrafica: fuori da questo mandato, riferita. */}
            {!telefonoStudio && (
              <Riquadro tono="attesa" titolo="Non ho il cellulare dello studio">
                WhatsApp si aprirà col messaggio pronto e ti farà scegliere il contatto.
              </Riquadro>
            )}

            {/* 🔴 IL CASO PEGGIORE, DETTO PER INTERO: il messaggio è uscito e la
                registrazione no. Il promemoria resta aperto (è la direzione
                recuperabile) e la via è una registrazione che NON rimanda il
                messaggio. */}
            {nonRegistrato && (
              <Riquadro tono="guasto" titolo="Il messaggio è partito, ma non l’ho scritto">
                {nonRegistrato}
                <span style={{ display: 'block', marginTop: 6 }}>
                  Il promemoria resta acceso: da qui lo registri senza rimandare niente al dentista.
                </span>
              </Riquadro>
            )}

            {mandato !== null ? (
              // 🛑 Al posto del tasto verde: registrare, mai rimandare. Un secondo
              //    collegamento aperto vorrebbe dire un secondo messaggio.
              <TastoSecondario
                onClick={() => {
                  if (!lavorando) void registra('dall_app', mandato)
                }}
              >
                {lavorando ? 'Un attimo…' : 'Registra l’avviso'}
              </TastoSecondario>
            ) : testoUsabile ? (
              // 🛑 IL TAP SI OSSERVA DA UN CONTENITORE, e non aggiungendo un
              //    `onClick` a `TastoWhatsApp`: §5.29 non lo prevede, quel
              //    componente è in produzione nel flusso di consegna, e cambiarne
              //    il contratto è fuori da questo mandato (riferito, R-E2).
              //    🔑 Il click sul collegamento risale QUI prima che il browser
              //    esegua l'azione predefinita: la registrazione parte nello
              //    stesso gesto e il collegamento si apre comunque. Nessuna
              //    finestra aperta a mano dopo un `await` — quella la bloccherebbe
              //    il browser.
              <div onClick={alTapDiInvio} style={{ width: '100%' }}>
                <TastoWhatsApp waUrl={waUrl}>Mandalo su WhatsApp</TastoWhatsApp>
              </div>
            ) : (
              // ⚠️ IL TASTO SPENTO EREDITA UN DIFETTO NOTO (⚖️ D349,
              //    `TastoPrimario.tsx:90`: faccia spenta a 1,15:1 in tema scuro).
              //    Si eredita e si dichiara — non si aggiusta da qui: la
              //    migrazione è per route, mai per componente (v3 §14).
              //    🔑 Perché un tasto spento e non il collegamento verde su un
              //    testo vuoto: il collegamento aprirebbe WhatsApp con un
              //    messaggio vuoto E farebbe rispondere 422 alla rotta. La forma
              //    è quella già in casa alla consegna (⚖️ D183): quando l'invio
              //    non è possibile, un tasto che spiega, non un collegamento.
              <TastoPrimario
                disabled
                motivoDisabilitato="Senza testo non c’è niente da mandare: scrivi il messaggio, o torna alla scelta e dillo a voce."
              >
                Mandalo su WhatsApp
              </TastoPrimario>
            )}
          </>
        )}

        {/* ③-b PASSO 2, STRADA A VOCE — ⚖️ D351: NON una conferma, LA FINESTRA.
            🔑 Il tocco sulla riga ha già deciso; qui non si chiede niente. Ciò che
               il Task 5 metteva dietro un secondo tocco — la rilettura di quello
               che resterà scritto — è rimasto, e ora **non si paga**: si legge
               mentre la finestra scorre. */}
        {passo === 'voce' && (
          <>
            <p
              style={{
                fontSize: tipografia.size.callout,
                fontWeight: tipografia.weight.semibold,
                color: 'var(--muted)',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              Da qui non parte nessun messaggio: resta scritto che{' '}
              <b style={{ color: 'var(--ink)' }}>l’hai avvisato tu</b>, e quando.
            </p>

            {/* 🛑 QUI NON C'È UN OROLOGIO SULLA RIGA «QUANDO», ed è la stessa
                scelta del Task 5: il momento lo scrive la rotta, e mostrarne uno
                prima della scrittura sarebbe una promessa su un valore che non è
                ancora stato preso. L'ora esatta si rilegge dal passo «Fatto».
                🔑 E vale ancora di più adesso: per questi secondi la scrittura
                **non è avvenuta**, quindi un'ora precisa sarebbe due volte falsa. */}
            <Superficie didascalia="Cosa resta scritto">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <RigaLetta chiave="Lavoro" valore={`n. ${numeroLavoro}`} />
                <RigaLetta chiave="Studio" valore={nomeStudio} />
                <RigaLetta chiave="Come" valore="a voce, da te" />
                <RigaLetta chiave="Quando" valore="oggi" />
              </div>
            </Superficie>

            {restanoSec !== null ? (
              <>
                {/* 🛑 LA FRASE DICE IL LIMITE **A PAROLE**, e il numero è un aiuto
                    per gli occhi. Chi legge con la voce sintetica sente «fra pochi
                    secondi» una volta; un contatore dentro una regione viva glielo
                    ripeterebbe dieci volte, che è il contrario di un aiuto. */}
                <p
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.5,
                    color: 'var(--muted)',
                    margin: 0,
                  }}
                >
                  Lo segno fra pochi secondi.{' '}
                  <b style={{ color: 'var(--ink)' }}>Se hai toccato per sbaglio, fermami adesso.</b>
                </p>
                <ViaDiFuga restanoSec={restanoSec} onAnnulla={annullaAVoce} />
              </>
            ) : (
              // La finestra è scaduta e la richiesta è in volo: §5.25 — «Un attimo…».
              // 🛑 Niente «Annulla» qui: da questo istante c'è davvero qualcosa che
              //    parte, e un annullo che non annulla è peggio di nessun annullo.
              <p style={{ fontSize: 14.5, color: 'var(--muted)', margin: 0 }}>Un attimo…</p>
            )}
          </>
        )}

        {/* ④ PASSO 3 — SI RILEGGE CIÒ CHE È STATO SCRITTO, dalla riga salvata */}
        {passo === 'fatto' && (
          <>
            <Riquadro tono="ok" titolo="Il dentista è avvisato">
              {leggiRiuscita(salvata, nomeStudio)}
              <span style={{ display: 'block', marginTop: 6 }}>
                Il promemoria si è spento: su questo lavoro non te lo chiedo più.
              </span>
            </Riquadro>
            <TastoPrimario onClick={chiudi}>Ho capito</TastoPrimario>
          </>
        )}
      </Sheet>
    </>
  )
}

/**
 * La frase che rilegge la riuscita, costruita SULLA RIGA SALVATA.
 *
 * 🔑 Perché dalla riga e non dalla scelta locale: la scelta locale è ciò che la
 * persona ha chiesto, la riga è ciò che è **rimasto scritto**. Sono la stessa
 * cosa quasi sempre — e quel «quasi» è esattamente il caso che vale la pena
 * mostrare.
 * 🛑 Ogni pezzo che manca si TOGLIE dalla frase invece di diventare un
 * «undefined»: il corpo di una risposta è un dato che arriva da fuori.
 */
function leggiRiuscita(riga: RigaSalvata | null, nomeStudio: string): string {
  const stato = riga?.stato
  const come =
    stato === 'comunicato_dall_app' || stato === 'comunicato_a_voce' ? COME_SI_LEGGE[stato] : null
  const quando = quandoLeggibile(riga?.comunicato_at)
  const pezzi = [`Resta scritto che hai avvisato ${nomeStudio}`]
  if (come) pezzi.push(come)
  if (quando) pezzi.push(quando)
  return `${pezzi.join(' · ')}.`
}

/**
 * Una delle DUE STRADE. 🛑 Un solo componente per entrambe, ed è il modo in cui
 * la parità di ⚖️ D335 è garantita dal codice invece che dall'attenzione: non
 * esiste un posto in cui dare più peso a una delle due senza darlo all'altra.
 *
 * Anatomia dal mockup approvato (⚖️ D344, classe `.riga`): `--fondo-superficie`,
 * filo `--filo-superficie`, `raggio.riga` 18, `minHeight` 60, gallone `›`.
 */
function RigaStrada(props: {
  glifo: string
  titolo: string
  spiegazione: string
  onApri: () => void
}) {
  const { glifo, titolo, spiegazione, onApri } = props
  return (
    <button
      type="button"
      onClick={onApri}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spazio.sm,
        width: '100%',
        background: 'var(--fondo-superficie)',
        border: '1px solid var(--filo-superficie)',
        borderRadius: raggio.riga,
        padding: `13px ${spazio.m}px`,
        textAlign: 'left',
        minHeight: 60,
        font: 'inherit',
        cursor: 'pointer',
      }}
    >
      <span aria-hidden style={{ fontSize: tipografia.size.heading, lineHeight: 1.1, flex: 'none' }}>
        {glifo}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: tipografia.size.body,
            fontWeight: tipografia.weight.bold,
            color: 'var(--ink)',
            lineHeight: 1.25,
          }}
        >
          {titolo}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 13.5,
            color: 'var(--muted)',
            marginTop: 3,
            lineHeight: 1.35,
          }}
        >
          {spiegazione}
        </span>
      </span>
      {/* `›` = «entra» (§4.4): promette un passo, non un atto compiuto. */}
      <span
        aria-hidden
        style={{
          color: 'var(--didascalia-superficie)',
          fontSize: tipografia.size.body,
          flex: 'none',
        }}
      >
        ›
      </span>
    </button>
  )
}

/** Una superficie dentro il foglio, con la sua didascalia (⚖️ D326 · D329). */
function Superficie(props: { didascalia: string; children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: raggio.riga,
        padding: `14px ${spazio.m}px`,
        background: 'var(--fondo-superficie)',
        border: '1px solid var(--filo-superficie)',
      }}
    >
      <p
        style={{
          fontSize: tipografia.size.caption,
          letterSpacing: tipografia.tracking.caption,
          textTransform: 'uppercase',
          fontWeight: tipografia.weight.extrabold,
          color: 'var(--didascalia-superficie)',
          margin: `0 0 ${spazio.s}px`,
        }}
      >
        {props.didascalia}
      </p>
      {props.children}
    </div>
  )
}

/** Una riga «chiave · valore» dentro una superficie: si legge, non si tocca. */
function RigaLetta(props: { chiave: string; valore: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: spazio.s, flexWrap: 'wrap' }}>
      <span
        style={{
          fontSize: tipografia.size.caption,
          letterSpacing: tipografia.tracking.caption,
          textTransform: 'uppercase',
          fontWeight: tipografia.weight.extrabold,
          color: 'var(--didascalia-superficie)',
          minWidth: 72,
        }}
      >
        {props.chiave}
      </span>
      <span
        style={{
          fontSize: tipografia.size.body,
          fontWeight: tipografia.weight.bold,
          color: 'var(--ink)',
          overflowWrap: 'anywhere',
        }}
      >
        {props.valore}
      </span>
    </div>
  )
}

const TONI = {
  ok: 'var(--green-tint)',
  attesa: 'var(--amber-tint)',
  guasto: 'var(--red-tint)',
} as const

/**
 * Il riquadro d'esito: la tinta dà il tono, **il titolo dà il significato** (L3).
 *
 * 🔴 IL TITOLO È `--ink`, E NON IL COLORE DELLA FAMIGLIA — MISURATO, non
 * preferito. Il foglio gemello scrive il titolo col colore del tono
 * (`DevoIntervenire.tsx`, `Esito`: `color: TONI[tono].ink`, 16px/700), e a quella
 * misura **non arriva a 4,5:1**:
 *   `misurato:` sonda sul DOM vivo del banco, 09/08/2026 —
 *   `--green` su `--green-tint` in chiaro = **4,50** (valore esatto **4,499**,
 *   cioè sotto la soglia) · `--red` sul red-tint composto in scuro
 *   (`rgb(64,33,30)`) = **4,09**.
 *   A 16px/700 la soglia è 4,5 e non 3: «testo grande» comincia a 18,66px.
 * ➡️ `--ink` sui tre fondi dà **15,53 · 15,44 · 15,35** in chiaro e
 *    **11,42 · 12,49 · 11,19** in scuro — passa con margine in entrambi i temi.
 * 🛑 E non si perde niente sull'asse L3: il significato non era nel colore del
 *    titolo, era nelle sue PAROLE («il messaggio è partito, ma non l'ho
 *    scritto»); la tinta resta come seconda fonte, non come unica.
 * 📮 Il gemello ha la stessa costruzione e lo stesso difetto: **riferito** nel
 *    resoconto del Task 5, non corretto da qui (R-E2 — è un altro mandato).
 */
function Riquadro(props: { tono: keyof typeof TONI; titolo: string; children: ReactNode }) {
  const { tono, titolo, children } = props
  return (
    <div style={{ borderRadius: raggio.riga, padding: `15px ${spazio.m}px`, background: TONI[tono] }}>
      <b style={{ display: 'block', fontSize: 16, marginBottom: 4, color: 'var(--ink)' }}>{titolo}</b>
      <span style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.45 }}>{children}</span>
    </div>
  )
}

/**
 * LA VIA DI FUGA DELLA LEGGE 6 (⚖️ D351) — «Annulla», e i secondi che restano.
 *
 * 🛑 `LinkQuieto` e non un tasto, e la spec lo impone: §5.5 lo dichiara
 * «*RISERVATO alle vie di fuga (L6) — "Aspetta, annulla la consegna"*», e vieta
 * ai tasti fisici di fare questo mestiere. 🔑 Il che risolve anche un problema di
 * ⚖️ D335: se la finestra portasse un tasto primario, la strada «a voce»
 * finirebbe per avere l'unico tasto fisico delle due — cioè tornerebbe a essere
 * la strada suggerita, che è il difetto per cui la variante A1 fu scartata.
 * Il bersaglio da 44 px lo porta il componente (`LinkQuieto.tsx:41-45`).
 *
 * 🛑 IL NUMERO È `aria-hidden`, e non è pigrizia: la frase accanto dice il limite
 * a parole, una volta. Un contatore leggibile dalla voce sintetica, dentro una
 * regione viva, si farebbe riannunciare a ogni secondo.
 * 🔑 E il colore non è mai l'unica fonte di stato (L3): il fatto — «sta per essere
 * scritto, puoi fermarlo» — sta nelle parole; il numero è solo il quanto.
 */
function ViaDiFuga(props: { restanoSec: number; onAnnulla: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spazio.m,
        flexWrap: 'wrap',
      }}
    >
      <LinkQuieto onClick={props.onAnnulla}>Annulla</LinkQuieto>
      <span
        aria-hidden
        style={{
          fontSize: 14.5,
          fontWeight: tipografia.weight.bold,
          color: 'var(--muted)',
          // Le cifre non ballano mentre il numero scende.
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {props.restanoSec}″
      </span>
    </div>
  )
}

/**
 * LA STRISCIA SULLA SCHEDA mentre una scrittura aspetta (⚖️ D351) — prende il
 * posto della riga, così la via di fuga **sopravvive alla chiusura del foglio**.
 * È la forma di `AnnullaConsegnaBanner`, che è il precedente di casa: la fuga sta
 * sulla pagina, non dentro un overlay, col tempo che scende accanto.
 *
 * 🛑 `--card` e `--line` come la riga che sostituisce, NON i token di superficie:
 * la scheda non deve saltare, e ⚖️ D330 ❌1 (deferito) lascia
 * `--fondo-superficie` a 1,23:1 dal pannello — un confine che qui non si vedrebbe.
 *
 * 🔑 `role="status"` SOLO quando il foglio è chiuso (`soloVia`), e la ragione è
 * precisa: a foglio aperto ciò che la persona sta leggendo è il pannello, e due
 * regioni vive che dicono la stessa cosa nello stesso istante sono rumore. La
 * striscia diventa l'unica portatrice della fuga nel momento in cui il foglio si
 * chiude — ed è quello il momento in cui va annunciata.
 *
 * ⚠️ SÌ, A FOGLIO APERTO CI SONO DUE «ANNULLA» NEL DOCUMENTO — dichiarato, non
 * scoperto. Non è una doppia via di fuga per chi usa l'app: lo `Sheet` monta
 * `aria-modal="true"` su entrambi i suoi rami (`Sheet.tsx:406,465`), cioè «dietro
 * non esiste niente», e la trappola del fuoco impedisce alla tastiera di
 * raggiungere ciò che sta fuori. Le prove usano `within(foglio)`, come già fanno
 * per i due «Chiudi» del foglio e dell'avviso.
 * 📌 `misurato:` alla chiusura i due coesistono ancora per la durata
 * dell'**animazione di uscita** del foglio — a 300 ms e a 700 ms il pannello è
 * ancora nel documento e sta scendendo (`top` 1144 → 1221 su un viewport da 844),
 * a 1500 ms `[role="dialog"]` è **zero**. Non è una perdita: è l'uscita.
 *
 * 🔴 E LA STRISCIA È PIÙ ALTA DELLA RIGA A 390 — misurato, e lo scrivo invece di
 * dire che la scheda «non salta»: **126 px contro 101**, cioè **25 px** di
 * scostamento a 390 e **0** a 768 e 1280 (la riga è 81 px là, la striscia 81).
 * Il motivo sta nell'anatomia: a 390 la via di fuga prende 84 px in larghezza e
 * comprime la colonna del testo a 177, che va a capo due volte in più.
 * 🔑 Perché va bene comunque, e sono due fatti misurati, non due opinioni:
 *   ① lo scambio avviene **nello stesso commit in cui il foglio si apre**, quindi
 *      lo spostamento accade **sotto lo scrim** — nessuno lo guarda muoversi;
 *   ② l'alternativa è peggiore di un ordine di grandezza: smontando la striscia il
 *      contenuto sotto salirebbe di **101 px** (tutta la riga), e alla chiusura del
 *      foglio la via di fuga non sarebbe **da nessuna parte**.
 * ⚠️ Il numero è preso su un banco con la MIA spaziatura di pagina: quella vera è
 * della scheda, e la decide il Task 6. Vale l'ordine di grandezza, non la cifra.
 */
function StrisciaAttesa(props: { restanoSec: number; soloVia: boolean; onAnnulla: () => void }) {
  const { restanoSec, soloVia, onAnnulla } = props
  return (
    <div
      role={soloVia ? 'status' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spazio.sm,
        flexWrap: 'wrap',
        width: '100%',
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: raggio.riga,
        padding: `${spazio.m}px`,
        minHeight: 52,
      }}
    >
      <span aria-hidden style={{ fontSize: tipografia.size.heading, lineHeight: 1 }}>
        📞
      </span>
      <span style={{ flex: 1, minWidth: 150 }}>
        <span
          style={{
            display: 'block',
            fontSize: tipografia.size.body,
            fontWeight: tipografia.weight.bold,
            color: 'var(--ink)',
          }}
        >
          L’hai avvisato tu, a voce
        </span>
        <span
          style={{
            display: 'block',
            fontSize: tipografia.size.label,
            color: 'var(--muted)',
            marginTop: 2,
          }}
        >
          Lo segno fra un attimo: puoi ancora fermarmi.
        </span>
      </span>
      <ViaDiFuga restanoSec={restanoSec} onAnnulla={onAnnulla} />
    </div>
  )
}

/** «‹ Torna alla scelta» — bersaglio ≥ 44 px, come il gemello. */
function TornaAllaScelta(props: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        alignSelf: 'flex-start',
        background: 'transparent',
        border: 'none',
        padding: 0,
        font: 'inherit',
        fontSize: 14.5,
        fontWeight: tipografia.weight.bold,
        color: 'var(--muted)',
        minHeight: 44,
        cursor: 'pointer',
      }}
    >
      <span aria-hidden>‹</span> Torna alla scelta
    </button>
  )
}
