import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import {
  NATURE,
  ORIGINI_INFORMAZIONE,
  STATI_DISPOSITIVO,
  POTENZIALI_DI_DANNO,
  isMotivo,
  naturaDaMotivo,
} from '@/lib/domain/qualita-costanti'
import type {
  Motivo,
  Natura,
  OrigineInformazione,
  StatoDispositivo,
  PotenzialeDiDanno,
} from '@/lib/domain/qualita-costanti'
import { classifica } from '@/lib/qualita/classifica'
import { effettoDaMotivoEScelta, richiedeScelta } from '@/lib/qualita/effetti'
import type { Scelta } from '@/lib/qualita/effetti'
import { trasferisciCassettaAlRifacimento } from '@/lib/rifacimento/cassetta'
import { istanteDaTestoRoma } from '@/lib/utils/data-roma'

/**
 * POST /api/lavori/[id]/eventi-qualita — registra IL FATTO e RESTITUISCE la
 * proposta di classificazione. **Non deposita il giudizio** (spec §6, D267):
 * la firma è dell'utente, non dell'applicazione, e a scriverla è la seconda
 * rotta (`/api/eventi-qualita/[id]/valutazioni`).
 *
 * 🔑 PERCHÉ LA VALIDAZIONE STA TUTTA PRIMA DELL'INSERT, e non è pignoleria:
 * `classifica(f: FattiEvento, …)` (`src/lib/qualita/classifica.ts:127`) ha una
 * firma STRETTA — quattro campi obbligatori, tutti unioni chiuse — e con un
 * oggetto malformato lancia un `TypeError`. Se il confine HTTP valida PRIMA di
 * costruire `FattiEvento`, quel `TypeError` diventa irraggiungibile da qui: un
 * corpo storto esce **422**, mai **500**. Un 500 al posto di un 422 sarebbe un
 * blocco, e D262 dice che la PWA non dà blocchi.
 *
 * 🔑 L'ORDINE DELLE DUE GUARDIE SUL MOTIVO È PORTANTE (e invertirlo non si
 * vede): `isMotivo` (`qualita-costanti.ts:128`) regge qualunque `unknown`;
 * `naturaDaMotivo` (`:139`) presuppone un motivo GIÀ valido e indicizza un
 * `Record` — con `'constructor'` o `'__proto__'` risalirebbe al prototipo di
 * `Object` e restituirebbe una funzione al posto di una natura. Prima la
 * guardia, poi la derivazione. Mai il contrario.
 *
 * 🛑 NESSUN CANCELLO DI STATO, ed è una scelta dichiarata: a differenza del
 * modello che questa rotta imita (`rifacimento/route.ts:136`, che rifiuta i
 * lavori annullati) qui non si blocca su `lavori.stato`. D266 — l'evento non
 * cambia lo stato del lavoro — e D262 — registrare resta economico: un fatto
 * su un lavoro annullato è comunque un fatto, e rifiutarlo lo farebbe sparire
 * dal registro invece che dal problema.
 */

type RouteContext = { params: Promise<{ id: string }> }

// Forma UUID canonica — idioma di casa (`cassetta/route.ts:15`). Serve a
// scartare PRIMA della query un id di path che farebbe fallire il cast `uuid`
// di Postgres con un `22P02` grezzo (rilievo noto M3-T4-1 del registro).
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * Quanto avanti può stare `conosciuto_il` rispetto all'orologio del server
 * prima di essere rifiutato. Non è una difesa: è **necessaria**. La spec §5
 * precompila il campo con «adesso» preso dal telefono, e l'orologio di un
 * telefono può stare qualche minuto avanti — senza tolleranza si rifiuterebbe
 * il valore predefinito legittimo.
 */
const TOLLERANZA_OROLOGIO_MS = 5 * 60 * 1000

/**
 * Tetto dei campi di testo libero. Stesso valore del modello di casa
 * (`rifacimento/route.ts:167`): i route handler dell'App Router **non**
 * impongono un limite al corpo della richiesta, quindi senza questo tetto 5 MB
 * incollati in un campo finirebbero in banca dati senza un errore.
 */
const LIMITE_TESTO_LIBERO = 1000

/**
 * ⚖️ **D286 — L'AMBIGUITÀ CHE STAVA SCRITTA QUI È CHIUSA (06/08/2026).**
 *
 * Fin qui `conosciuto_il` passava per `Date.parse`, e questo riquadro dichiarava
 * un'ambiguità lasciata aperta: una data e ora **senza fuso** JavaScript la
 * legge nell'ora locale di **chi esegue**. Il server dell'app gira a UTC, quindi
 * `2026-08-06T10:00` — che è **esattamente** ciò che manda un campo
 * `datetime-local` dal telefono di un'operatrice italiana — veniva salvato come
 * le **12:00 di Roma**: due ore in avanti sul momento zero dei termini
 * dell'Art. 87.
 *
 * Francesco ha deciso: «*sempre l'app deve seguire l'orario italiano di Roma,
 * quello di qualsiasi dispositivo in Italia*». La lettura vive in
 * `istanteDaTestoRoma` (`src/lib/utils/data-roma.ts`) — **lì e non qui**, perché
 * è la stessa regola che serve a ogni superficie futura che manda un momento.
 *
 * 🔑 **`Date.parse` non compare più in questa rotta**, e non è una preferenza di
 * stile: `Date.parse('01/08/2026')` non è un errore per JavaScript, è l'**8
 * gennaio**. La funzione condivisa fa la guardia di forma e la lettura in un
 * passaggio solo, così non possono divergere.
 */

// `post_consegna_correzioni` è `SMALLINT` (`002_fase2_schema.sql:75`): oltre
// questo valore l'incremento traboccherebbe. Irraggiungibile nella pratica,
// ma un fail-soft che aborta la richiesta sarebbe peggio del contatore fermo.
const SMALLINT_MAX = 32767

/**
 * Il vocabolario del bivio (D304), scritto QUI e non dedotto da
 * `MOTIVI_CON_SCELTA`: quello elenca i **motivi** che aprono il bivio, questo i
 * **valori** che il bivio ammette. Sono due elenchi diversi che si somigliano,
 * ed è esattamente il genere di coppia che si accorcia per sbaglio.
 * 🔑 Specchio del CHECK vivo (`20260807171033_evento_scelta_intervento.sql`): un
 * valore in più qui sarebbe un `23514` illeggibile a runtime invece di un 422.
 */
const SCELTE = ['si_sistema', 'si_rifa'] as const

function inVocabolario<T extends string>(vocabolario: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (vocabolario as readonly string[]).includes(v)
}

function err(messaggio: string, status: number) {
  return NextResponse.json({ error: messaggio }, { status })
}

export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return err('Richiesta non consentita', 403)
  }

  const context = await getFreshLabContext()
  if (!context) return err('Non autorizzato', 401)
  if (!context.laboratorioId) return err('Laboratorio non trovato', 403)

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const { id: lavoro_id } = await params
  // 404, non 400: un id che non può esistere è indistinguibile da uno che non
  // esiste — la stessa risposta che riceve chi cerca il lavoro di un altro
  // laboratorio. Nessuna informazione su cosa c'è in banca dati.
  if (!UUID_RE.test(lavoro_id)) return err('Lavoro non trovato', 404)

  // ── il corpo ────────────────────────────────────────────────────────────
  let grezzo: unknown
  try {
    grezzo = await req.json()
  } catch {
    return err('Non sono riuscita a leggere i dati inviati: riprova.', 400)
  }
  if (grezzo === null || typeof grezzo !== 'object' || Array.isArray(grezzo)) {
    return err('Non sono riuscita a leggere i dati inviati: riprova.', 400)
  }
  const corpo = grezzo as Record<string, unknown>

  // ── i quattro fatti + il momento zero (spec §5) ─────────────────────────
  const motivo = corpo.motivo
  if (!isMotivo(motivo)) {
    return err('Scegli il motivo dall\'elenco: senza quello la registrazione non si può salvare.', 422)
  }

  // `motivo_libero`: obbligatorio e non vuoto per `altro` (specchio del CHECK
  // `evento_altro_ha_testo`, `20260806140823:30`), facoltativo altrimenti.
  const motivoLiberoGrezzo = corpo.motivo_libero
  if (motivoLiberoGrezzo !== undefined && motivoLiberoGrezzo !== null && typeof motivoLiberoGrezzo !== 'string') {
    return err('La descrizione libera deve essere un testo.', 422)
  }
  if (typeof motivoLiberoGrezzo === 'string' && motivoLiberoGrezzo.length > LIMITE_TESTO_LIBERO) {
    return err(`La descrizione libera è troppo lunga: accorciala a ${LIMITE_TESTO_LIBERO} caratteri.`, 422)
  }
  // Normalizzata come `note` (più sotto): soli spazi → `null`, mai la stringa
  // VUOTA. Prima ci finiva, ed è un valore che un filtro «senza descrizione»
  // non riconosce come vuoto.
  const motivoLibero =
    typeof motivoLiberoGrezzo === 'string' && motivoLiberoGrezzo.trim().length > 0
      ? motivoLiberoGrezzo.trim()
      : null

  // 🔑 `natura` NON è un secondo campo da compilare: è la derivazione fissa di
  // `motivo` (spec §5). L'unica eccezione è `altro`, per cui `naturaDaMotivo`
  // restituisce `null` — e la colonna è `NOT NULL`. Lì la natura **si chiede**,
  // non si indovina: lo dice la spec §5 in tabella («si chiede, non si
  // indovina: l'utente sceglie la natura fra le precedenti»). Dedurre una
  // natura di ripiego cambierebbe la classificazione, cioè un numero che
  // finisce in un documento dovuto per legge.
  const naturaDerivata = naturaDaMotivo(motivo)
  const naturaGrezza = corpo.natura
  let natura: Natura
  if (naturaDerivata === null) {
    if (!motivoLibero) {
      return err('Hai scelto «altro»: scrivi in due parole di cosa si tratta.', 422)
    }
    if (!inVocabolario(NATURE, naturaGrezza)) {
      return err('Hai scelto «altro»: indica anche di che genere di problema si tratta.', 422)
    }
    // 🛑 UNA SOLA NATURA È VIETATA DA «ALTRO», ed è quella che PORTA UN'AZIONE.
    // D288 deriva l'effetto dal MOTIVO: `errore_registrazione` come motivo
    // riapre il lavoro e annulla la dichiarazione; come natura scelta a mano da
    // «altro» non riaprirebbe niente — ma `classifica()` restituirebbe lo stesso
    // il perché che dice «il lavoro torna fra quelli pronti». Sarebbe una
    // PROMESSA CHE NESSUNO MANTIENE, cioè il difetto §8.1 in un altro vestito.
    // 📌 Chiude la foglia pericolosa del ritrovamento R8 (Task 4): le altre due
    // esenzioni restano raggiungibili, perché nessuna delle due porta un'azione
    // automatica e quindi nessuna può promettere ciò che non succede.
    if (naturaGrezza === 'errore_registrazione') {
      return err('Per registrare che il tasto «consegna» è stato premuto per sbaglio scegli il motivo «ho sbagliato a premere consegna»: da «altro» il lavoro non tornerebbe indietro.', 422)
    }
    natura = naturaGrezza
  } else {
    // Una `natura` che arriva dal client su un motivo derivabile non si scarta
    // in silenzio: o coincide con la derivazione, o è un malinteso da dire.
    // Uno scarto muto è la classe di difetto «Salvato su un dato che non c'è».
    if (naturaGrezza !== undefined && naturaGrezza !== null && naturaGrezza !== naturaDerivata) {
      return err('Il genere di problema si ricava dal motivo scelto e non si può impostare a mano.', 422)
    }
    natura = naturaDerivata
  }

  const origine = corpo.origine_informazione
  if (!inVocabolario(ORIGINI_INFORMAZIONE, origine)) {
    return err('Indica da chi è arrivata la segnalazione, scegliendo dall\'elenco.', 422)
  }

  const statoDispositivo = corpo.stato_dispositivo
  if (!inVocabolario(STATI_DISPOSITIVO, statoDispositivo)) {
    return err('Indica dov\'era il manufatto quando è emerso il problema, scegliendo dall\'elenco.', 422)
  }

  // 🛑 LA COMBINAZIONE CHE DISTRUGGEREBBE UNA PROVA DI LEGGE — e non è teorica:
  // prima di questa guardia passava.
  // «Ho premuto consegna per sbaglio» e «il manufatto era già uscito» non
  // possono essere veri insieme: se è uscito, la consegna È avvenuta. Ma con
  // `stato_dispositivo = 'applicato'` accadevano due cose insieme —
  //   ① `classifica()` proponeva **INCIDENTE** (dispositivo uscito + potenziale
  //      di danno: il passo ① scatta prima delle esenzioni, D276);
  //   ② l'effetto derivato dal motivo chiamava comunque `riapri_lavoro_atomica`,
  //      che porta la dichiarazione a `annullata` **incondizionatamente**.
  // 🔑 Cioè si annullava il documento di un manufatto uscito DAVVERO, che è
  // esattamente ciò che D293 vieta: quella dichiarazione è l'unica prova che il
  // manufatto è esistito ed è andato a un paziente, e `annullata` lì non
  // significherebbe «superata» ma cancellata.
  // ➡️ La guardia sta nell'API e non nell'interfaccia: il confine di un atto
  // distruttivo su un documento a valore legale non si affida a una schermata.
  // ⚠️ `non_noto` è rifiutato con gli altri, e non è pignoleria: chi dichiara di
  // aver premuto per sbaglio è la stessa persona che ha premuto — se non sa se
  // il manufatto sia uscito, allora non sa nemmeno di aver sbagliato tasto.
  if (motivo === 'errore_registrazione' && statoDispositivo !== 'mai_uscito_dal_lab') {
    return err('Se il manufatto era già uscito dal laboratorio, la consegna è avvenuta davvero: scegli il motivo che descrive che cosa è successo dopo, non «ho sbagliato a premere consegna».', 422)
  }

  // ── il bivio (D304 · D305) ──────────────────────────────────────────────
  // 🛑 La guardia sta QUI e non nell'interfaccia: è la lezione pagata tre volte
  // il 07/08 — una coppia incoerente (motivo, azione) che arriva a un atto che
  // crea o sposta cose non si ferma con una schermata.
  // ⚠️ E sta DOPO la guardia sulla `natura` (:199-201) di proposito: un corpo
  // sbagliato due volte deve sentirsi dire per prima la cosa che ha sbagliato
  // prima. L'ordine è sorvegliato da una prova.
  const sceltaGrezza = corpo.scelta_intervento
  let scelta: Scelta | null = null
  if (richiedeScelta(motivo)) {
    if (!inVocabolario(SCELTE, sceltaGrezza)) {
      return err('Dicci come si procede: si sistema questo manufatto, oppure se ne fa uno nuovo?', 422)
    }
    scelta = sceltaGrezza
  } else if (sceltaGrezza !== undefined && sceltaGrezza !== null) {
    // Non si scarta in silenzio: è la classe di difetto «Salvato su un dato che
    // non c'è» — stesso trattamento già riservato a `natura` (:199-201).
    return err('Su questo motivo non c\'è nessuna scelta da fare: l\'effetto si ricava dal motivo stesso.', 422)
  }

  // 🛑 GEMELLA DELLA GUARDIA SU `errore_registrazione`: se il manufatto non è mai
  // uscito dal laboratorio, non può essere andato alla persona sbagliata — quel
  // caso è «ho premuto consegna per sbaglio», che ha il suo motivo e la sua
  // transizione (distruttiva, e per questo va scelta apposta).
  // ⚠️ A differenza del suo modello, questa combinazione è RAGGIUNGIBILE dal
  // foglio «Devo intervenire», dove «Mai uscito» è una pastiglia liberamente
  // toccabile: impedirla PRIMA del modulo compilato è il Passo 4 del Task 9.
  // La guardia qui resta comunque, perché è qui che sta il confine.
  if (motivo === 'destinatario_errato' && statoDispositivo === 'mai_uscito_dal_lab') {
    return err('Se il manufatto non è mai uscito dal laboratorio non può essere andato alla persona sbagliata: se hai premuto «consegna» per errore, scegli quel motivo.', 422)
  }

  // `potenziale_di_danno` è facoltativo: se manca, il default lo mette il
  // DATABASE (`DEFAULT 'da_valutare'`, `20260806140823:24`). Non si scrive un
  // secondo default qui, o i due potrebbero divergere in silenzio.
  const potenzialeGrezzo = corpo.potenziale_di_danno
  const potenzialeInviato = potenzialeGrezzo !== undefined && potenzialeGrezzo !== null
  if (potenzialeInviato && !inVocabolario(POTENZIALI_DI_DANNO, potenzialeGrezzo)) {
    return err('Il potenziale di danno indicato non è fra quelli previsti.', 422)
  }

  // 🔑 `conosciuto_il` arriva dal CLIENT ed è modificabile: è il momento zero
  // dei termini dell'Art. 87 (MDCG 2023-3 Q15, la *awareness date*), non la
  // data di creazione della riga. La notizia può essere arrivata ieri al
  // telefono.
  const conosciutoGrezzo = corpo.conosciuto_il
  if (typeof conosciutoGrezzo !== 'string' || conosciutoGrezzo.trim().length === 0) {
    return err('Indica quando siete venuti a saperlo: da lì partono i termini di legge.', 422)
  }
  // 🛑 Forma e lettura in un passaggio solo (D286): un momento senza fuso vale
  // sull'orologio di ROMA, mai su quello del processo.
  const esitoConosciuto = istanteDaTestoRoma(conosciutoGrezzo)
  if (!esitoConosciuto.ok) {
    if (esitoConosciuto.causa === 'ora_inesistente') {
      // L'ultima domenica di marzo l'ora fra le 2 e le 3 non esiste: le lancette
      // saltano avanti. Il messaggio dice COSA FARE, non cosa è vietato.
      return err(
        'Quella notte gli orologi italiani sono andati avanti di un\'ora, e l\'ora che hai indicato non è esistita: scrivi le 3:00 o un orario più tardi.',
        422
      )
    }
    return err(
      'La data in cui siete venuti a saperlo va scritta nel formato internazionale anno-mese-giorno, con il fuso in coda — per esempio 2026-08-06T14:30:00Z, oppure la sola data 2026-08-06. Scritta come 01/08/2026 non si può leggere senza rischiare di scambiare il giorno con il mese.',
      422
    )
  }
  const conosciutoMs = esitoConosciuto.ms
  // Solo un limite SUPERIORE, e la mancanza di quello inferiore è deliberata:
  // una data sbagliata nel passato rende la scadenza **più** stretta, che è la
  // direzione dell'Art. 87(7) (nel dubbio si segnala). Una data nel futuro fa
  // il contrario — sposta avanti una scadenza di legge — e non descrive nessun
  // fatto possibile: non si può sapere oggi ciò che si saprà domani.
  if (conosciutoMs > Date.now() + TOLLERANZA_OROLOGIO_MS) {
    return err('La data in cui siete venuti a saperlo è nel futuro: correggila con il giorno in cui ve l\'hanno detto.', 422)
  }

  const noteGrezze = corpo.note
  if (noteGrezze !== undefined && noteGrezze !== null && typeof noteGrezze !== 'string') {
    return err('Le note devono essere un testo.', 422)
  }
  if (typeof noteGrezze === 'string' && noteGrezze.length > LIMITE_TESTO_LIBERO) {
    return err(`Le note sono troppo lunghe: accorciale a ${LIMITE_TESTO_LIBERO} caratteri.`, 422)
  }
  const note = typeof noteGrezze === 'string' && noteGrezze.trim().length > 0 ? noteGrezze.trim() : null

  // ⚖️ D277 — la gravità si CHIEDE, non si deduce, e si chiede a chi CONFERMA,
  // non a chi registra: qui non c'è ancora un giudizio a cui appenderla, e
  // nessuna colonna dove salvarla. Rifiutata invece che scartata in silenzio.
  if (corpo.risposta_gravita !== undefined) {
    return err('La domanda sulla gravità si risponde al momento di confermare la valutazione, non qui.', 422)
  }

  const svc = getServiceClient()

  // ── il lavoro dev'essere di QUESTO laboratorio ──────────────────────────
  // La FK composita `(lavoro_id, laboratorio_id)` (20260806142910:32) impedirebbe
  // comunque un evento sul lavoro di un altro laboratorio, ma con un `23503`
  // grezzo: qui si risponde 404, che è ciò che deve leggere chi chiede.
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, post_consegna_correzioni')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!lavoro) return err('Lavoro non trovato', 404)

  // ── il FATTO ────────────────────────────────────────────────────────────
  // 🛑 `laboratorio_id` e `created_by` vengono dalla SESSIONE, mai dal corpo.
  const daScrivere: Record<string, unknown> = {
    laboratorio_id: context.laboratorioId,
    lavoro_id,
    motivo,
    motivo_libero: motivoLibero,
    natura,
    origine_informazione: origine,
    conosciuto_il: new Date(conosciutoMs).toISOString(),
    stato_dispositivo: statoDispositivo,
    note,
    created_by: context.userId,
  }
  if (potenzialeInviato) daScrivere.potenziale_di_danno = potenzialeGrezzo
  // 🔑 La chiave si manda SOLO quando c'è una scelta — non `null` esplicito. Il
  // CHECK in banca dati ammette un valore soltanto sui due motivi del bivio, e
  // una colonna che nasce `NULL` da sola non ha bisogno che glielo si dica.
  if (scelta !== null) daScrivere.scelta_intervento = scelta

  const { data: evento, error: erroreInsert } = await svc
    .from('eventi_qualita')
    .insert(daScrivere)
    .select(
      'id, lavoro_id, motivo, motivo_libero, natura, origine_informazione, conosciuto_il, stato_dispositivo, potenziale_di_danno, note, created_at, created_by'
    )
    .single()

  if (erroreInsert || !evento) {
    // Il testo di Postgres resta nei log del server: chi legge la risposta è
    // un'operatrice al banco, e «violates check constraint» non le dice cosa
    // fare (precondizione ② del brief).
    console.error('[EVENTI-QUALITA] insert fallito:', erroreInsert)
    const codice = erroreInsert?.code
    if (codice === '23503') return err('Lavoro non trovato', 404)
    if (codice === '23514') {
      return err('Uno dei dati di questa registrazione non è stato accettato: rivedi il motivo e la descrizione, poi riprova.', 422)
    }
    return err('Non sono riuscita a salvare la registrazione: riprova fra un momento.', 500)
  }

  const rigaSalvata = evento as { potenziale_di_danno?: unknown }

  // La proposta si calcola DOPO il salvataggio, sulla riga davvero salvata:
  // così `potenziale_di_danno` ha un solo valore vero — quello che sta in
  // banca dati — anche quando il default lo ha messo il database.
  const potenzialeSalvato: PotenzialeDiDanno = inVocabolario(POTENZIALI_DI_DANNO, rigaSalvata.potenziale_di_danno)
    ? rigaSalvata.potenziale_di_danno
    // 🛑 Il ripiego è `da_valutare`, MAI `nessuno`: `nessuno` salta del tutto
    // il test dell'incidente (`classifica.ts:136`) ed è esattamente il
    // «generatore silenzioso di sotto-classificazione» che la spec §5 vieta.
    : 'da_valutare'

  const proposta = classifica({
    natura,
    origine: origine as OrigineInformazione,
    statoDispositivo: statoDispositivo as StatoDispositivo,
    potenzialeDiDanno: potenzialeSalvato,
  })

  // ── L'EFFETTO OPERATIVO (D288) ──────────────────────────────────────────
  // 🔑 DUE PIANI, DUE RISPOSTE. `proposta` è il piano della QUALITÀ (è un
  // incidente? un reclamo?); `effetto` è il piano OPERATIVO (che cosa succede
  // adesso al lavoro e alla dichiarazione). D288: «le due righe non erano in
  // contraddizione, parlavano di due piani diversi».
  // 🔑 L'EFFETTO VIAGGIA GIÀ RISOLTO (spec §4.3). Per i due difetti la riga
  // fissa dichiara `scelta_richiesta` e il suo `perche` è formulato **come una
  // domanda aperta**: restituirlo così farebbe ristampare alla schermata finale
  // la domanda a cui la persona ha appena risposto.
  const effetto = effettoDaMotivoEScelta(motivo, scelta)

  // 🔴 PASSO 4-bis — L'IDENTIFICATIVO DELL'EVENTO SI PRENDE DA QUI, MAI DAL CORPO.
  // Il trigger `assert_same_lab_rifacimento` guarda solo i due lavori, mai
  // l'evento; la FK composita difende dal caso «evento di un altro laboratorio»,
  // **non** dal caso «evento dello stesso laboratorio ma di un ALTRO lavoro»,
  // che passerebbe in silenzio — e `rifacimento_evento_unique` a quel punto
  // BRUCEREBBE quell'evento, facendo uscire 23505 a un rifacimento legittimo
  // successivo. Questa rotta è l'ultimo punto in cui l'identificativo giusto può
  // essere garantito, e ce l'ha in mano: l'evento l'ha appena inserito lei, su
  // questo lavoro.
  const eventoId = (evento as { id: string }).id

  // 🛑 PERCHÉ L'AZIONE PARTE QUI, senza un terzo tocco di conferma. D269 fissa
  // il costo in **due tap invece di uno** — «Devo intervenire», poi il motivo —
  // e Francesco l'ha accettato in quella misura. D288: «nessuna casella "vuoi
  // anche rientrare in produzione?": il motivo È già la risposta». Una conferma
  // in più dopo il motivo sarebbe un terzo tap che nessuna decisione autorizza.
  // ⚠️ La conferma esiste, ma sta PRIMA: è la domanda d'ingresso di D283/D288
  // («vuoi reintervenire su questo lavoro, o hai premuto per sbaglio?»); e per i
  // due difetti c'è **anche** il bivio, che è una risposta, non una conferma.
  //
  // 🛑 LE DUE GEMELLE NON SI SCAMBIANO, E LA DIFFERENZA STA NEL NOME.
  // `riapri_lavoro_atomica` annulla la dichiarazione **incondizionatamente**:
  // è giusto solo dove la premessa è «la consegna non è mai avvenuta».
  // `riporta_a_pronto_atomica` la lascia viva: è la transizione dei casi in cui
  // il manufatto è uscito davvero e il documento diceva il vero (D293). Nessun
  // parametro decide fra le due — decide il nome della funzione chiamata.
  let esitoAzione: EsitoAzione | undefined
  if (effetto.azione === 'riapri_lavoro') {
    esitoAzione = await chiamaRipristino(svc, 'riapri_lavoro_atomica', lavoro_id, context.laboratorioId, eventoId)
  } else if (effetto.azione === 'torna_pronto') {
    esitoAzione = await chiamaRipristino(svc, 'riporta_a_pronto_atomica', lavoro_id, context.laboratorioId, eventoId)
  } else if (effetto.azione === 'crea_rifacimento') {
    esitoAzione = await creaRifacimento(svc, context.laboratorioId, lavoro_id, eventoId, motivo)
  }

  await incrementaCorrezioni(
    svc,
    context.laboratorioId,
    lavoro_id,
    (lavoro as { post_consegna_correzioni?: unknown }).post_consegna_correzioni,
    statoDispositivo
  )

  // 🛑 `{ evento, proposta, effetto }` — e nessuna `valutazione`: l'app propone,
  // una persona conferma (spec §6). Il giudizio lo deposita la seconda rotta.
  // 🔑 IL QUARTO CAMPO SI CHIAMA `esito_azione`, e `riapertura` NON resta come
  // sinonimo: un nome che dice «riapertura» su un'azione che **crea** un lavoro
  // è un testo falso — la stessa famiglia di difetto già chiusa in
  // `classifica.ts` il 07/08, dove un ramo solo serviva due casi opposti.
  return NextResponse.json(
    esitoAzione ? { evento, proposta, effetto, esito_azione: esitoAzione } : { evento, proposta, effetto },
    { status: 201 }
  )
}

/**
 * L'esito dell'AZIONE, e sono TRE COSE DIVERSE — un booleano le appiattirebbe,
 * ed è proprio l'appiattimento che nasconde i guasti:
 * - `applicato` — l'azione è andata a buon fine. I tre campi facoltativi sono i
 *   **caveat**, uno per azione: `dichiarazione_assente` (riapertura su un dato
 *   vecchio senza dichiarazione), `dichiarazione_viva` (la promessa «resta
 *   valida» non aveva oggetto), `lavoro_nuovo` (il rifacimento appena nato);
 * - `non_applicabile` — non c'era niente da fare (il lavoro non è consegnato, o
 *   non esiste): **non è un guasto**, e chiamarlo tale insegnerebbe a ignorare
 *   gli avvisi;
 * - `fallito` — **il guasto vero**, quello che una persona deve vedere.
 *
 * 🔄 SI CHIAMAVA `Riapertura`, e il nome è cambiato col Task 7: da qui passano
 * anche un ritorno «col documento intatto» e la **creazione** di un lavoro
 * nuovo. Chiamare «riapertura» un atto che crea sarebbe un testo falso.
 */
type EsitoAzione =
  | {
      stato: 'applicato'
      dichiarazione_assente?: boolean
      dichiarazione_viva?: boolean
      lavoro_nuovo?: { id: string; numero_lavoro: string }
    }
  | { stato: 'non_applicabile'; motivo: 'non_trovato' | 'non_consegnato' | 'evento_non_valido' }
  | { stato: 'fallito'; messaggio: string }

const MESSAGGIO_RIPRISTINO_FALLITO =
  'La registrazione è salva, ma il lavoro non è tornato indietro da solo: riportalo tu fra quelli pronti, oppure riprova fra un momento.'

const MESSAGGIO_RIFACIMENTO_FALLITO =
  'La registrazione è salva, ma il lavoro nuovo non è stato creato: crealo dalla scheda, oppure riprova fra un momento.'

/**
 * Le DUE RPC di ripristino, e ciascuna col **suo** caveat.
 *
 * 🛑 PERCHÉ LA CHIAVE È DICHIARATA QUI E NON ANNUSATA DALLA RISPOSTA. Una
 * funzione che accettasse `ddc_assente` **oppure** `ddc_viva` da entrambe le RPC
 * risponderebbe `applicato` **senza nessuno dei due campi** il giorno in cui una
 * delle due cambiasse forma — cioè perderebbe il caveat in silenzio, che è
 * esattamente il difetto che i caveat esistono per chiudere. Con la chiave
 * dichiarata, una divergenza di forma si vede: il campo esce `false`, cioè la
 * direzione prudente (un avviso in più, mai uno in meno).
 *
 * 🛑 E IL `satisfies` NON È DECORAZIONE. `provato:` senza di esso, cambiando
 * `'dichiarazione_viva'` in `'dichiarazione_vive'`, `npx tsc --noEmit` esce **0**:
 * la chiave calcolata si allarga e il refuso passa. Il campo finirebbe nella
 * risposta con un nome che nessuna schermata legge — cioè il caveat sparirebbe
 * **in silenzio**, che è esattamente il difetto che questo blocco esiste per
 * chiudere. Con il vincolo, lo stesso refuso è un errore di compilazione.
 */
type RpcRipristino = 'riapri_lavoro_atomica' | 'riporta_a_pronto_atomica'
type ChiaveCaveat = 'dichiarazione_assente' | 'dichiarazione_viva'

const CAVEAT_RIPRISTINO = {
  riapri_lavoro_atomica: { daRpc: 'ddc_assente', inRisposta: 'dichiarazione_assente' },
  riporta_a_pronto_atomica: { daRpc: 'ddc_viva', inRisposta: 'dichiarazione_viva' },
} as const satisfies Record<RpcRipristino, { daRpc: string; inRisposta: ChiaveCaveat }>

/**
 * Chiama una delle due RPC di ripristino — la distruttiva (D288, motivo
 * `errore_registrazione`) o quella che lascia vivo il documento (D291 · D304).
 *
 * 🛑 NON È FAIL-SOFT, ed è la differenza con `incrementaCorrezioni` qui sotto.
 * Un contatore che non si aggiorna è un numero interno impreciso; un lavoro che
 * NON torna indietro mentre l'utente crede di sì è la famiglia §8.1 della spec,
 * «fallire dichiarando successo». Quindi: la richiesta risponde **201** perché
 * il fatto è salvato e non si butta via — ma l'esito negativo **viaggia nella
 * risposta**, non solo nei log del server.
 *
 * ⚠️ E il campo negativo va DISEGNATO: la schermata «Devo intervenire» rende
 * visibile `esito_azione.stato === 'fallito'`. Un campo negativo che nessuno
 * disegna è indistinguibile da un successo, e riaprirebbe lo stesso difetto
 * dall'altro lato.
 */
async function chiamaRipristino(
  svc: ReturnType<typeof getServiceClient>,
  nome: RpcRipristino,
  lavoro_id: string,
  laboratorio_id: string,
  evento_id: string
): Promise<EsitoAzione> {
  const caveat = CAVEAT_RIPRISTINO[nome]
  try {
    const { data, error } = await svc.rpc(nome, {
      p_lavoro_id: lavoro_id,
      p_laboratorio_id: laboratorio_id,
      p_evento_id: evento_id,
    })
    if (error) {
      // Il testo di Postgres («dichiarazione in stato incoerente») resta nei
      // log: chi legge la risposta è un'operatrice al banco.
      console.error(`[EVENTI-QUALITA] ${nome} fallita:`, error)
      return { stato: 'fallito', messaggio: MESSAGGIO_RIPRISTINO_FALLITO }
    }
    const risposta = (data ?? {}) as Record<string, unknown>
    if (risposta.esito === 'ok') {
      return { stato: 'applicato', [caveat.inRisposta]: risposta[caveat.daRpc] === true }
    }
    if (
      risposta.esito === 'non_trovato' ||
      risposta.esito === 'non_consegnato' ||
      risposta.esito === 'evento_non_valido'
    ) {
      return { stato: 'non_applicabile', motivo: risposta.esito }
    }
    // Un esito fuori dai quattro che la funzione dichiara di restituire non si
    // legge come successo: fail-closed, come ogni altro ingresso ignoto di
    // quest'ondata.
    console.error(`[EVENTI-QUALITA] ${nome}: esito inatteso`, data)
    return { stato: 'fallito', messaggio: MESSAGGIO_RIPRISTINO_FALLITO }
  } catch (e) {
    console.error(`[EVENTI-QUALITA] ${nome} — eccezione:`, e)
    return { stato: 'fallito', messaggio: MESSAGGIO_RIPRISTINO_FALLITO }
  }
}

/**
 * Crea il rifacimento (D306). **NON è fail-soft** sul lavoro nuovo: se non
 * nasce, l'utente deve saperlo. È fail-soft SOLO sul trasferimento della
 * cassetta (D309), come già fa il percorso HTTP esistente — un cassetto non
 * spostato non annulla un lavoro già creato.
 *
 * 🔑 `p_motivo` porta il motivo VERO. La RPC non valida quel campo
 * (`20260805201640:113,157`) e la rotta HTTP del rifacimento non accetta questi
 * due valori: l'unico guardiano dei due nomi nuovi è questa derivazione. Un
 * `altro` di ripiego perderebbe l'unica informazione che conta.
 */
async function creaRifacimento(
  svc: ReturnType<typeof getServiceClient>,
  laboratorio_id: string,
  lavoro_id: string,
  evento_id: string,
  motivo: Motivo
): Promise<EsitoAzione> {
  try {
    const { data, error } = await svc.rpc('crea_rifacimento_atomico', {
      p_lavoro_originale_id: lavoro_id,
      p_motivo: motivo,               // 'difetto_lavorazione' | 'difetto_materiale' — il CHECK li accetta
      p_rilevato_in: 'post_consegna', // l'unico valore vero qui: il problema è emerso dopo la consegna
      p_costo_interno: null,
      p_note: null,
      p_evento_id: evento_id,
    })
    if (error) {
      // 23505 = questo evento ha già il suo rifacimento. Non è un guasto: è il
      // secondo tocco, o il ritentativo dopo un timeout. Si restituisce quello
      // che c'è invece di crearne un altro e bruciare un progressivo d'anno.
      if (error.code === '23505') {
        const { data: gia } = await svc
          .from('lavori_rifacimenti')
          .select('lavoro_nuovo:lavori!lavori_rifacimenti_lavoro_nuovo_id_fkey(id, numero_lavoro)')
          // 🛑 Il filtro sul laboratorio non è ridondante con l'indice unico:
          // quella lettura è a chiave di servizio, quindi senza RLS. È la riga
          // che tiene la lettura dentro il laboratorio di chi ha chiesto.
          .eq('laboratorio_id', laboratorio_id)
          .eq('evento_id', evento_id)
          .maybeSingle()
        const nuovo = (gia as { lavoro_nuovo?: { id: string; numero_lavoro: string } } | null)?.lavoro_nuovo
        if (nuovo) return { stato: 'applicato', lavoro_nuovo: nuovo }
      }
      console.error('[EVENTI-QUALITA] crea_rifacimento_atomico fallita:', error)
      return { stato: 'fallito', messaggio: MESSAGGIO_RIFACIMENTO_FALLITO }
    }
    const r = data as { lavoro_nuovo_id?: string; numero_lavoro?: string }
    if (!r?.lavoro_nuovo_id || !r?.numero_lavoro) {
      console.error('[EVENTI-QUALITA] crea_rifacimento_atomico: risposta inattesa', data)
      return { stato: 'fallito', messaggio: MESSAGGIO_RIFACIMENTO_FALLITO }
    }
    // ⚖️ D309 — fail-soft, e l'helper è lo STESSO del percorso HTTP esistente
    // (`src/lib/rifacimento/cassetta.ts`): due copie divergerebbero, e il tecnico
    // troverebbe il cassetto vuoto a seconda del bottone premuto.
    await trasferisciCassettaAlRifacimento(svc, laboratorio_id, lavoro_id, r.lavoro_nuovo_id)
    return { stato: 'applicato', lavoro_nuovo: { id: r.lavoro_nuovo_id, numero_lavoro: r.numero_lavoro } }
  } catch (e) {
    console.error('[EVENTI-QUALITA] crea_rifacimento_atomico — eccezione:', e)
    return { stato: 'fallito', messaggio: MESSAGGIO_RIFACIMENTO_FALLITO }
  }
}

/**
 * Incrementa `lavori.post_consegna_correzioni` — colonna esistente dal
 * 002 e **mai incrementata finora**.
 *
 * **Fail-soft assoluto**, e il motivo è lo stesso del trasferimento cassetta in
 * `rifacimento/route.ts`: quando questa funzione parte l'evento è GIÀ salvato.
 * Un contatore che non si aggiorna è un numero interno impreciso; una richiesta
 * che fallisce dopo la scrittura è un fatto di qualità che l'utente crede
 * perduto e registra due volte.
 *
 * **Perché non incrementa sempre** — la colonna nasce come metrica di consegna
 * (`src/types/domain.ts:367`, «Tracking CONSEGNA — metriche NSM») e si chiama
 * *post_consegna*: un evento su un manufatto `mai_uscito_dal_lab` non è una
 * correzione post-consegna, e contarlo lì falserebbe la metrica. Il predicato
 * usato è **lo stesso** che governa la biforcazione ISO in `classifica.ts:128`
 * (`statoDispositivo !== 'mai_uscito_dal_lab'`), non un secondo criterio
 * inventato qui: `non_noto` conta, perché nel dubbio si tratta come uscito.
 *
 * ⚠️ **La corsa che resta, dichiarata invece di nascosta:** leggi-modifica-scrivi
 * non è atomico. L'`UPDATE` porta il valore letto come condizione (confronta-e-
 * scambia), quindi un incremento concorrente **non sovrascrive** l'altro: lo
 * fa fallire in silenzio, e si perde un'unità del contatore, mai un dato. La
 * chiusura vera sarebbe `SET x = x + 1` dentro una RPC — cioè una migration,
 * fuori dal mandato di questo compito.
 */
async function incrementaCorrezioni(
  svc: ReturnType<typeof getServiceClient>,
  laboratorio_id: string,
  lavoro_id: string,
  valoreLetto: unknown,
  statoDispositivo: StatoDispositivo
): Promise<void> {
  if (statoDispositivo === 'mai_uscito_dal_lab') return
  if (typeof valoreLetto !== 'number' || !Number.isFinite(valoreLetto)) {
    console.warn('[EVENTI-QUALITA] post_consegna_correzioni non leggibile, incremento saltato:', valoreLetto)
    return
  }
  if (valoreLetto >= SMALLINT_MAX) {
    console.warn('[EVENTI-QUALITA] post_consegna_correzioni al massimo di SMALLINT, incremento saltato')
    return
  }
  try {
    const { error } = await svc
      .from('lavori')
      .update({ post_consegna_correzioni: valoreLetto + 1 })
      .eq('id', lavoro_id)
      .eq('laboratorio_id', laboratorio_id)
      .eq('post_consegna_correzioni', valoreLetto)
      .select('post_consegna_correzioni')
    if (error) {
      console.error('[EVENTI-QUALITA] incremento post_consegna_correzioni fallito (fail-soft):', error)
    }
  } catch (e) {
    console.error('[EVENTI-QUALITA] incremento post_consegna_correzioni — eccezione (fail-soft):', e)
  }
}
