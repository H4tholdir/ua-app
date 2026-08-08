import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { testoVivoDaCorpo } from '@/lib/utils/testo'
import { MACRO_SLUGS } from '@/lib/domain/tipi-lavoro'
import { triggerPushToUser } from '@/lib/notifications/trigger'
// Stessa normalizzazione del colore di caso che usa `POST /api/lavori` (Task
// 11): una sola casa, due chiamanti. Vedi GRUPPO C nella tabella qui sotto.
import { risolviColoreCaso } from '@/lib/api/colore-caso'
// La tinta del manufatto (D42, Task 4-5): stessa forma del colore di caso, ma
// un catalogo diverso e una regola in più — la famiglia ammessa la decide il
// TIPO del lavoro. Vedi GRUPPO D nella tabella qui sotto.
import { risolviTinta } from '@/lib/api/tinta'
import { famigliaDiMacro } from '@/lib/domain/tinta'
// La lettura dello snapshot della prescrizione (Task 6, ondata B ③): la GET
// non aveva alcun embed su `lavori_prescrizioni` — la funzione normalizza la
// forma array-vs-oggetto che PostgREST restituisce (vedi il commento sopra
// `GET` più sotto). NON costruisce UI: la scheda (T7) legge da qui.
import { normalizzaPrescrizione } from '@/lib/domain/prescrizione-mapper'

// Campi prezzo da bloccare quando il lavoro è già incluso in fattura
const LOCKED_PRICE_FIELDS = [
  'prezzo_unitario',
  'listino_id',
  'codice_iva',
  'natura_iva',
] as const

// Allowlist esplicita dei campi di `lavori` scrivibili via questa route.
// CLAUDE.md: "PATCH allowlist: API PATCH di risorse lab usa sempre allowlist
// esplicita di campi — MAI blocklist". Qualunque chiave del body non presente
// qui viene scartata silenziosamente (incluse le relazioni annidate che il
// GET restituisce via embed PostgREST — appuntamenti, fasi, immagini, cliente,
// paziente, tecnico, lavorazioni, materiali, ddc, prescrizione (Task 6, ondata
// B ③) — che NON sono colonne dirette della tabella `lavori` e causavano un
// 500 "column not found" se inoltrate, perché la blocklist precedente non le
// conosceva. ⚠️ `denti` manca da questo elenco da prima del Task 6 (embed
// presente dal Task 10, mai aggiunto qui) — trovato scrivendo questa riga,
// FUORI dal mandato di T6 (R-E2): riferito in task-6-report.md, non corretto
// qui.
//
// Fonti verificate per ogni campo (grep mirati sul form + su altri caller
// della stessa route):
// - TabDati.tsx:        tipo_dispositivo, descrizione, richiedente_nome,
//                        data_consegna_prevista, ora_consegna, priorita,
//                        dispositivo_semilavorato, note_interne
// - TabAccettazione.tsx: tipo_impronte, disinfettante_usato,
//                        lotto_disinfettante, materiali_allegati,
//                        anamnesi_bruxismo, anamnesi_difficolta_manuali,
//                        anamnesi_precauzioni
// - TabClinica.tsx:      effetti_speciali, tecnica_colore,
//                        anamnesi_altri_dispositivi
//                        (denti_coinvolti, denti_mancanti, denti_impianti,
//                        colore_dente, colore_collo, colore_corpo,
//                        colore_incisale NON passano più di qui — vedi
//                        SENTINELLA DENTI + COLORE sotto)
// - TabDate.tsx:         data_prima_prova, data_seconda_prova,
//                        data_terza_prova, spedizione_corriere,
//                        spedizione_tracking, spedizione_data_prevista
// - LavoroCard.tsx:      tecnico_id, priorita (assegnazione tecnico/priorità
//                        dalla lista lavori, stessa route PATCH root)
// - FK_FIELDS validati sotto: cliente_id, paziente_id, tecnico_id, ciclo_id
// - LOCKED_PRICE_FIELDS applicati dopo il filtro: prezzo_unitario, listino_id,
//   codice_iva, natura_iva (editabili finché non incluso_in_fattura)
//
// Esclusi deliberatamente (verificato: nessun writer nel form React attuale):
// arcata, colorazione_esterna, impronta_digitale,
// norma_riferimento, richiedente_email, stato_fisico, tipo_arco,
// codice_interno, anamnesi_note, classe_rischio, paziente_nascita_snapshot,
// paziente_nome_snapshot, prescrizione_digitale_id, spedizione_note,
// spedizione_stato — oltre a IMMUTABLE, segnalazione_* (route dedicata
// /segnala e /segnala/risolvi), is_rifacimento/rifacimento_motivo (RPC
// crea_rifacimento_atomico), tracciabilita_materiali_ok/da_conformare/
// materiali_incompleti_dettaglio (calcolati server-side in orchestrate.ts),
// buono_*/file_stl_url/immagini_urls (gestiti da altri processi/route).
// numero_prescrizione: escluso CON ragione (non più «nessun writer») — vive
// su lavori_prescrizioni, scrittura via RPC dedicate (ondata B, spec §3). La
// colonna omonima su `lavori` è legacy: riaprirla qui sarebbe una seconda
// penna sullo stesso fatto, la classe già pagata con numero_cassetta.
// Test di regressione: tests/unit/lavori-patch-istituzione-sanitaria.test.ts.
//   🪦 E DALL'08/08/2026 (D319) LA RAGIONE È ANCORA PIÙ SEMPLICE, perché
//   `lavori.numero_prescrizione` è un CIMITERO DICHIARATO: non la legge né la
//   scrive più nessuno. Il numero della prescrizione non è un contenuto dovuto
//   dall'Allegato XIII punto 1 — che sulla prescrizione chiede il NOME di chi ha
//   prescritto e le CARATTERISTICHE indicate nella prescrizione — quindi è
//   uscito dal documento, dalle voci correggibili della dichiarazione e
//   dall'allowlist della RPC `correggi_e_riemetti_atomica`. Ultimo lettore:
//   `generate-ddc.ts` (chiave `prescrizione_id`), tolto. Ultimo scrittore:
//   l'UPDATE di quella RPC, tolto. `provato:` 0 lavori su 299 la portano.
//   ⚠️ Questa riga NON riapre niente e NON è un invito: la voce non torna in
//   allowlist, perché non c'è più niente da correggere. Sta qui perché fra sei
//   mesi qualcuno non creda viva una colonna che nessuno alimenta — l'errore
//   R34, già pagato una volta.
// ═══ SENTINELLA D7 (spec portale-dentista-v2 §7) ══════════════════════════
// proposta_dentista e proposta_at NON devono MAI entrare in questa allowlist:
// si scrivono SOLO dall'API portale (/api/portale/[token]/fatturazione/[id]).
// Test di regressione: tests/unit/lavori-patch-invariante-d7.test.ts
// ═══════════════════════════════════════════════════════════════════════════
// ═══ SENTINELLA CASSETTA (spec parete-cassette §10, modello invariante D7) ══
// numero_cassetta NON deve MAI rientrare in questa allowlist: da qui in avanti
// si scrive SOLO tramite le RPC atomiche cassetta_assegna_atomica/
// cassetta_libera_atomica (POST /api/lavori/[id]/cassetta), mai con un UPDATE
// diretto — altrimenti si desincronizza dalla riga viva di `cassette_lavori`.
// Test di regressione: tests/unit/lavori-patch-sentinella-cassetta.test.ts
// La const è esportata (era interna) solo per permettere a quel test di
// leggerla — non per essere riusata altrove.
// ═══════════════════════════════════════════════════════════════════════════
// ═══ SENTINELLA DENTI + COLORE (spec wizard-nuovo-lavoro §4) ═══════════════
// denti_coinvolti, denti_mancanti, denti_impianti, colore_dente, colore_collo,
// colore_corpo, colore_incisale NON devono MAI rientrare in questa allowlist.
// Il dato clinico per-dente vive in `lavori_denti` e si scrive SOLO dalle due
// RPC atomiche: `lavoro_denti_sostituisci_atomica` (PUT /api/lavori/[id]/denti)
// e `lavoro_crea_atomico` (POST /api/lavori).
//
// 🔑 La ragione, come chiede la direttiva «ogni campo del lavoro si corregge,
// fino alla consegna», è scritta qui e NON è «nessun writer nel form React»:
// sono DUE SORGENTI DELLO STESSO FATTO CLINICO. Con le colonne ancora
// scrivibili, la scheda del lavoro e il wizard potrebbero dichiarare denti
// diversi per lo stesso lavoro senza che nulla se ne accorga — ed è la classe
// di difetto già pagata una volta con `numero_cassetta`.
// Bonus chiuso qui: denti_mancanti/denti_impianti passavano SENZA VALIDAZIONE
// (verbale §6-sexies ⑨), stessa classe del difetto «2.6». Il `ruolo` della riga
// (`elemento|mancante|impianto|escluso|incollato`) li assorbe tutti e tre in una
// colonna sola, tipata.
//
// ── TABELLA DI DESTINAZIONE — dove va a scriversi ogni nome uscito di qui ───
// Obbligatoria (R-P6). Motivo: il ciclo di filtro qui sotto
// (`for (const field of PATCHABLE_FIELDS)`) SCARTA IN SILENZIO ogni chiave
// fuori allowlist — nessun 422, nessun errore. Un nome che esce senza uno
// scrittore rediretto è un dato che smette di salvarsi senza che nessuno se ne
// accorga: l'utente legge «Salvato» su un dato che non c'è.
//
// ⚠️ I sette nomi NON hanno tutti lo stesso regime. Verificato sul corpo delle
// RPC (20260727120300_lavori_denti_rpc.sql:115-121 e :205-211): la
// denormalizzazione riscrive denti_coinvolti/mancanti/impianti e NON tocca
// nessuna delle quattro colonne del colore.
//
//   GRUPPO A — la colonna su `lavori` RESTA VIVA, riscritta dalle RPC come
//   denormalizzazione (identico regime di `numero_cassetta`):
//     denti_coinvolti → lavori_denti (ruolo 'elemento') + denorm. RPC
//                       · wizard → POST /api/lavori (Task 11)
//                       · scheda → PUT /api/lavori/[id]/denti (Task 12)
//     denti_mancanti  → lavori_denti (ruolo 'mancante') + denorm. RPC
//                       · wizard → POST (Task 11) · scheda → PUT /denti (Task 12)
//     denti_impianti  → lavori_denti (ruolo 'impianto') + denorm. RPC
//                       · wizard → POST (Task 11) · scheda → PUT /denti (Task 12)
//
//   GRUPPO B — QUESTE QUATTRO COLONNE non hanno più nessuno scrittore: il dato
//   si sposta altrove e su di ESSE non torna indietro. ⚠️ Aggiornato dal Task
//   12-bis: «altrove» non è più solo `lavori_denti`. Il colore di base ha DUE
//   destinazioni, e una sola alla volta.
//     colore_dente    → SE una riga porterà il colore (c'è almeno un ELEMENTO e
//                       il colore non è vuoto): lavori_denti.codice (+ .scala)
//                       · wizard → POST /api/lavori, `p_denti` (Task 11)
//                       · scheda → PUT /api/lavori/[id]/denti (Task 12)
//                     → ALTRIMENTI — nessun elemento, OPPURE il colore azzerato:
//                       il DEFAULT DI CASO `lavori.colore_scala`/`colore_codice`
//                       — che sono colonne di `lavori` ma NON sono queste
//                       · wizard → POST /api/lavori (Task 11)
//                       · scheda → questa PATCH, allowlist qui sotto (Task 12-bis)
//                       🔑 «altrimenti» è la STESSA condizione con cui
//                       `idrataColoreScheda` decide di LEGGERE il caso: si scrive
//                       dove si legge (`useLavoroForm.ts`, `coloreDelleRighe`).
//                       Senza l'azzeramento in questo ramo il caso resterebbe
//                       valorizzato sotto delle righe svuotate e il colore
//                       vecchio riapparirebbe al ricaricamento — misurato il
//                       28/07/2026 su un lavoro nato dal wizard, che è la forma
//                       normale.
//                       🔑 «si può succedere di voler inserire il colore ad
//                       esempio su di una protesi totale senza indicare il
//                       dente» (Francesco, 28/07/2026): il colore dell'intero
//                       dispositivo è un dato legittimo, non un dato incompleto.
//     colore_collo    → lavori_denti.codice_collo    · scheda → PUT /denti (Task 12)
//     colore_corpo    → lavori_denti.codice_corpo    · scheda → PUT /denti (Task 12)
//     colore_incisale → lavori_denti.codice_incisale · scheda → PUT /denti (Task 12)
//                       ⚠️ LIMITE DICHIARATO (Task 12-bis): senza elementi le tre
//                       zone non hanno NESSUNA destinazione — il default di caso
//                       è una coppia (scala, codice) e basta. Il form si ferma e
//                       lo dice, invece di buttarle via in silenzio.
//
//   GRUPPO C — i due nomi che ENTRANO nell'allowlist col Task 12-bis, ed è
//   additivo, non un ritorno indietro:
//     colore_scala  ┐ il DEFAULT DI CASO. Nati col Task 5, MAI stati in questa
//     colore_codice ┘ allowlist, un solo scrittore (il form della scheda). Non
//                     è il rischio del Task 10: là i sette nomi uscivano perché
//                     avevano DUE penne in conflitto sullo stesso fatto clinico.
//                     🛑 NON passano per copia: la coppia si normalizza col
//                     catalogo (`risolviColoreCaso`) prima dell'UPDATE, perché
//                     `lavori_colore_caso_fk` + `lavori_colore_caso_coppia_ck`
//                     fanno fallire con un 500 sia mezza coppia sia un «a3»
//                     minuscolo. Test: tests/unit/lavori-patch-colore-caso.test.ts
//
// ⚠️ Conseguenza del GRUPPO B: da qui in avanti `lavori.colore_dente`,
// `colore_collo`, `colore_corpo`, `colore_incisale` restano ferme all'ultimo
// valore ricevuto prima di questo deploy. Chi deve LEGGERE il colore lo legge
// da `lavori_denti` con la precedenza riga→caso di
// `src/lib/domain/colore-dente.ts`, mai da quelle quattro colonne. Il default di
// caso vive in `lavori.colore_scala`/`colore_codice`, scritte alla creazione da
// `lavoro_crea_atomico` e corrette da questa PATCH.
//
// ⚠️ Il GRUPPO A non è una contraddizione: quelle tre colonne restano VIVE come
// denormalizzazione, scritta dalle due RPC insieme alle righe di `lavori_denti`.
// La Dichiarazione di Conformità (DdcTemplate.tsx:258) e la scheda
// (SchedaLavoroV3.tsx:286) le leggono ancora fino all'ondata (c). «Sentinella»
// qui vuol dire: nessuno le scrive A MANO. Non: nessuno le scrive.
// Test di regressione: tests/unit/lavori-patch-sentinella-denti.test.ts
// ═══════════════════════════════════════════════════════════════════════════
export const PATCHABLE_FIELDS = [
  'tipo_dispositivo',
  'descrizione',
  'richiedente_nome',
  // P37 (ondata B ②): l'istituzione sanitaria del prescrittore — nasce dal
  // POST e si corregge da qui fino alla consegna (direttiva §9).
  'istituzione_sanitaria',
  'data_consegna_prevista',
  'ora_consegna',
  'priorita',
  'dispositivo_semilavorato',
  'note_interne',
  'tipo_impronte',
  'disinfettante_usato',
  'lotto_disinfettante',
  'materiali_allegati',
  'anamnesi_bruxismo',
  'anamnesi_difficolta_manuali',
  'anamnesi_precauzioni',
  'effetti_speciali',
  'tecnica_colore',
  'anamnesi_altri_dispositivi',
  'data_prima_prova',
  'data_seconda_prova',
  'data_terza_prova',
  'spedizione_corriere',
  'spedizione_tracking',
  'spedizione_data_prevista',
  'cliente_id',
  'paziente_id',
  'tecnico_id',
  'ciclo_id',
  // GRUPPO C (Task 12-bis) — il default di caso. Nessun valore di queste due
  // chiavi arriva all'UPDATE così com'è: il blocco «IL COLORE DI CASO» dentro
  // la PATCH le riscrive entrambe con la coppia normalizzata sul catalogo.
  'colore_scala',
  'colore_codice',
  // GRUPPO D (D42) — la tinta del manufatto, per i tre tipi che hanno un colore
  // NON dentale. Come il GRUPPO C, nessun valore di queste due chiavi arriva
  // all'UPDATE così com'è: il blocco «LA TINTA DEL MANUFATTO» dentro la PATCH le
  // riscrive con la coppia normalizzata sul catalogo, e le azzera se il tipo
  // cambia e non le compete più (D117).
  'tinta_famiglia',
  'tinta_codice',
  ...LOCKED_PRICE_FIELDS,
] as const

/**
 * D242 — i campi di testo che NON accettano una stringa vuota come valore.
 *
 * 🔑 Perché servono, e perché sono proprio questi due. `richiedente_nome` ha
 * due scrittori che possono mandare `''`: il gettone «+ Nuovo» della scheda
 * (`TabDati.tsx:283`) e chiunque chiami l'API. Una stringa vuota è la SECONDA
 * ortografia di «non c'è», e i documenti che escono dal laboratorio ne
 * conoscono una sola (`null`): il ripiego sul nome del cliente non scattava e
 * la Dichiarazione di Conformità usciva senza il nome del medico, col
 * controllo di consegna verde. Si normalizza QUI, al confine, così la
 * schermata resta libera di scrivere come le viene comodo.
 * 📌 `istituzione_sanitaria` è il campo gemello (P37): oggi nessun documento
 * lo stampa, sta qui come prevenzione dichiarata per l'ondata che lo stamperà.
 */
const CAMPI_TESTO_NORMALIZZATI: ReadonlySet<string> = new Set([
  'richiedente_nome',
  'istituzione_sanitaria',
])

/**
 * ⚖️ D308 — I CINQUE CAMPI STAMPATI NON SI CORREGGONO FINCHÉ LA DICHIARAZIONE
 * È VIVA.
 *
 * 🔑 Il fatto che l'ha generata: togliere l'annullamento della dichiarazione
 * (per non cancellare la prova di una consegna avvenuta, D293) ha spento il
 * meccanismo che faceva arrivare le correzioni sul documento. Senza questo
 * cancello, un manufatto può uscire con una dichiarazione che nomina un'altra
 * persona, e ogni controllo resta verde: `precheckMDR` misura il lavoro vivo,
 * mai la dichiarazione (`src/lib/consegna/precheck.ts`), e `generateDdC` trova
 * quella già emessa e restituisce quella senza rigenerare nulla
 * (`src/lib/pdf/generate-ddc.ts:383-392`). **Art. 21(2) MDR:** la dichiarazione
 * è messa a disposizione di *un determinato paziente*, identificato per nome o
 * codice — l'identità è la cosa che non può divergere.
 *
 * 🛑 NON è un blocco cieco (D262: la PWA dà aiuti, non blocchi): il messaggio
 * nomina il percorso che RIEMETTE — «Devo intervenire» → «C'è un dato sbagliato
 * sulla dichiarazione» (`errore_dato_dichiarazione`, `motivi-ui.ts:74`), che
 * annulla la vecchia CONSERVANDOLA e ne emette una nuova con `sostituisce_id`
 * (`riemettiDdC`). Il percorso è costruito e provato.
 *
 * 🔑 E NON CONTRADDICE LA DIRETTIVA DEL 27/07 («ogni campo del lavoro si
 * corregge, fino alla consegna»), che va letta col confine che le ha dato il
 * panel normativo del 29/07: la finestra si aggancia all'EMISSIONE della
 * dichiarazione, e con una dichiarazione viva è chiusa **per queste cinque voci
 * soltanto**. Ogni altro campo resta correggibile — la prova ③ di
 * `tests/unit/lavori-patch-campi-stampati-d308.test.ts` lo tiene fermo.
 *
 * ⚠️ Confine dichiarato (spec §1.1): la regola vale per OGNI lavoro con
 * dichiarazione viva, non solo per quelli tornati a `pronto` dall'ondata «si
 * deve sempre poter intervenire». È più larga del perimetro dell'ondata, ed è
 * deliberato: restringerla al caso nuovo lascerebbe la stessa porta aperta su
 * tutti gli altri.
 *
 * La const è esportata solo perché le prove possano leggerla — non per essere
 * riusata altrove (stessa ragione di `PATCHABLE_FIELDS`).
 */
export const CAMPI_STAMPATI = [
  'paziente_id',
  'cliente_id',
  'richiedente_nome',
  'tipo_dispositivo',
  'descrizione',
] as const

type RouteContext = { params: Promise<{ id: string }> }

/**
 * A1: notifica push al tecnico su assegnazione di un lavoro.
 *
 * MAPPING tecnici→utenti (verificato su database.types.ts): `lavori.tecnico_id`
 * referenzia `tecnici.id`, NON `utenti.id`. `triggerPushToUser` invece filtra
 * `push_subscriptions.user_id`, colonna che referenzia `auth.users(id)` (= `utenti.id`,
 * migration 20260521000001_push_subscriptions.sql). Serve quindi risolvere
 * `tecnici.utente_id` (FK verso `utenti`, nullable) prima di poter inviare il push —
 * NON si può passare `tecnico_id` direttamente come user_id.
 * (Stessa risoluzione applicata anche in `prove/route.ts` → `notificaProvaRientrata`,
 * fix del 20/07/2026 della deviazione pre-esistente.)
 *
 * Chiamata con `await` dal chiamante (non `void`: su Vercel il lavoro avviato
 * ma non atteso dopo la response può essere interrotto a metà se l'istanza si
 * congela) — non deve MAI lanciare né far fallire la risposta della PATCH
 * (try/catch onnicomprensivo, silenzioso come `triggerPushToUser` stesso).
 */
async function notificaAssegnazione(
  svc: ReturnType<typeof getServiceClient>,
  tecnicoId: string,
  laboratorioId: string,
  numeroLavoro: string,
  lavoroId: string
): Promise<void> {
  try {
    const { data: tecnico } = await svc
      .from('tecnici')
      .select('utente_id')
      .eq('id', tecnicoId)
      .eq('laboratorio_id', laboratorioId)
      .is('deleted_at', null)
      .single()

    if (!tecnico?.utente_id) return

    // GDPR: MAI nome paziente nel payload push — solo numero lavoro + link.
    await triggerPushToUser(tecnico.utente_id, laboratorioId, {
      title: 'Nuovo lavoro assegnato',
      body: `Il lavoro n.${numeroLavoro} è stato assegnato a te`,
      url: `/lavori/${lavoroId}`,
    })
  } catch {
    // Mai lanciare — un fallimento qui non deve mai influenzare la risposta PATCH.
  }
}

/**
 * Lettura del lavoro.
 *
 * 🔴 `denti:lavori_denti(*)` è la STRADA DEL RITORNO del colore. Dal Task 10 le
 * quattro `lavori.colore_*` non hanno più alcuno scrittore (vedi GRUPPO B nella
 * tabella di destinazione qui sopra): restano nella riga per lo snapshot della
 * fatturazione, ma non sono più il dato vivo. Chi legge il colore da questa
 * risposta lo prende dalle righe, con la precedenza riga → caso di
 * `src/lib/domain/colore-dente.ts` — mai dalle quattro colonne.
 *
 * 🔴 `prescrizione:lavori_prescrizioni(*)` (Task 6, ondata B ③): prima di
 * questo task la scheda non aveva NESSUNA via di lettura dello snapshot
 * della prescrizione — il `select('*')` non lo embeddava affatto. S8 ha
 * provato che la lettura è permessa (RLS per tenant + GRANT SELECT,
 * 20260804150306:73-80): mancava solo la richiesta dell'embed.
 * `lavori_prescrizioni` porta `UNIQUE(lavoro_id)` — relazione uno-a-uno per
 * costruzione — ma la FK usata per l'embed è composita
 * (lavoro_id, laboratorio_id) e lo UNIQUE non copre la coppia esatta: i tipi
 * generati marcano la relazione `isOneToOne: false`
 * (database.types.ts:3421-3426), quindi l'ATTESA è che PostgREST restituisca
 * questo embed come array, non oggetto singolo (stesso caso già gestito, con
 * la STESSA riserva, per `ddc` in `lavori/[id]/page.tsx:51-55`: «mai
 * verificato empiricamente» — qui non lo è stato nemmeno a banco, R-P1:
 * NON provato, quindi non marcato come fatto). `normalizzaPrescrizione`
 * (`@/lib/domain/prescrizione-mapper`) per questo normalizza ENTRAMBE le
 * forme, non solo quella attesa — se PostgREST sorprendesse restituendo un
 * oggetto singolo, il codice resta corretto lo stesso. Passa dalla stessa
 * funzione anche il caso «nessuna riga»: `undefined`, mai un oggetto vuoto
 * (V2).
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }

    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    const { data: lavoro, error } = await svc
      .from('lavori')
      .select(`
        *,
        cliente:clienti(*),
        paziente:pazienti(*),
        tecnico:tecnici(*),
        lavorazioni:lavori_lavorazioni(*),
        appuntamenti:lavori_appuntamenti(*),
        immagini:lavori_immagini(*),
        fasi:lavori_fasi(*, fase:fasi_produzione(*)),
        materiali:lavori_materiali(*),
        ddc:dichiarazioni_conformita(*),
        denti:lavori_denti(*),
        prescrizione:lavori_prescrizioni(*)
      `)
      .eq('id', id)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .neq('ddc.stato', 'annullata')
      .is('lavori_immagini.deleted_at', null)
      .single()

    if (error || !lavoro) {
      const status = error?.code === 'PGRST116' ? 404 : 500
      return NextResponse.json(
        { error: error?.message ?? 'Lavoro non trovato' },
        { status }
      )
    }

    // Normalizzazione array-vs-oggetto dell'embed (vedi commento sopra) — si
    // riassegna la proprietà così tutto il resto della risposta vede sempre
    // un `LavoroPrescrizione` singolo o `undefined`, mai la forma grezza.
    lavoro.prescrizione = normalizzaPrescrizione(lavoro.prescrizione)

    return NextResponse.json({ lavoro })
  })
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params

  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard

  const svc = getServiceClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Verifica se il lavoro è già incluso in fattura — legge anche tecnico_id/numero_lavoro
  // per la notifica push su riassegnazione (A1, vedi notificaAssegnazione sopra).
  //
  // 🛑 LE TRE COLONNE DELLA TINTA NON SONO DECORO (D42, Task 5). Senza
  // `tipo_dispositivo` il blocco più sotto calcolerebbe `macroDopo` a
  // `undefined` ogni volta che il body NON cambia il tipo — e `famigliaDiMacro`
  // risponde `null` a tutto ciò che non conosce, quindi OGNI correzione di
  // tinta verrebbe scartata. Senza `tinta_famiglia`/`tinta_codice`, il ramo
  // D117 non troverebbe mai una tinta da togliere: sarebbe **codice morto che
  // passa i test coi finti**. Chi tocca questa riga guardi la prova ② di
  // `tests/unit/tinte-patch.test.ts`, che controlla le colonne CHIESTE.
  //
  // 🛑 E LE ALTRE QUATTRO COLONNE SONO IL CANCELLO D308, non decoro nemmeno
  // loro. `tipo_dispositivo` c'era già; `descrizione`, `richiedente_nome`,
  // `cliente_id`, `paziente_id` entrano qui perché il cancello confronta il
  // valore CHIESTO con quello MEMORIZZATO. Una colonna non richiesta torna
  // `undefined`, che pareggia con qualunque `null` in arrivo: il cancello
  // smetterebbe di accendersi **in silenzio** su quel campo. La prova ⑯ di
  // `lavori-patch-campi-stampati-d308.test.ts` guarda le colonne CHIESTE, non
  // quelle risposte — stessa forma della ② di `tinte-patch.test.ts`.
  const { data: existing } = await svc
    .from('lavori')
    .select('incluso_in_fattura, tecnico_id, numero_lavoro, tipo_dispositivo, tinta_famiglia, tinta_codice, descrizione, richiedente_nome, cliente_id, paziente_id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // Allowlist esplicita: tiene solo le chiavi in PATCHABLE_FIELDS, scartando
  // silenziosamente qualunque altro campo (relazioni annidate, campi
  // immutabili/di stato, campi calcolati server-side, ecc. — vedi commento
  // sopra PATCHABLE_FIELDS per l'elenco completo di ciò che è escluso e perché).
  const payload: Record<string, unknown> = {}
  for (const field of PATCHABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = CAMPI_TESTO_NORMALIZZATI.has(field)
        ? testoVivoDaCorpo(body[field])
        : body[field]
    }
  }

  // ═══ ⚖️ D308 — I CINQUE CAMPI STAMPATI (cappello sopra CAMPI_STAMPATI) ═════
  // Sta QUI, subito dopo l'allowlist, per due ragioni:
  //   ① `richiedente_nome` è già passato per `testoVivoDaCorpo` (D242), quindi
  //      `''` e `null` sono già la STESSA ortografia di «non c'è» e non si
  //      contano come una correzione (prova ⑪);
  //   ② è prima di ogni scrittura, che è l'unica cosa che deve essere vera.
  //
  // 🛑 SI GUARDA IL VALORE, NON LA CHIAVE — e questa è la correzione più
  // importante di questo blocco, contro la stesura del piano che filtrava con
  // `c in aggiornamenti`. La scheda del lavoro manda l'INTERA riga a ogni
  // salvataggio (`src/hooks/useLavoroForm.ts:316`, `const patchBody = { ...data }`,
  // con i soli `delete` di `numero_cassetta`, dei sette denti/colore e — se non
  // cambiata — della tinta): i cinque nomi sono SEMPRE nel corpo, anche quando
  // l'utente ha toccato le sole note. Un cancello a chiave-presente avrebbe reso
  // il lavoro di SOLA LETTURA su ogni campo appena esiste una dichiarazione
  // viva, e sarebbe stata una violazione della direttiva del 27/07 travestita da
  // conformità. Prove che tengono fermo il confine: ⑤ (i cinque presenti e
  // identici + una nota cambiata → 200) e ⑥ (lo stesso corpo con una voce
  // davvero cambiata → 422).
  //
  // Il confronto è su `?? null` perché le due sponde scrivono l'assenza in due
  // modi (`undefined` da un corpo che non nomina, `null` dalla colonna): il
  // resto è uguaglianza stretta, così un tipo sbagliato conta come CAMBIO e
  // viene rifiutato invece di scivolare (fail-closed, prova ⑫).
  const memorizzato: Record<(typeof CAMPI_STAMPATI)[number], unknown> = {
    paziente_id: existing.paziente_id,
    cliente_id: existing.cliente_id,
    richiedente_nome: existing.richiedente_nome,
    tipo_dispositivo: existing.tipo_dispositivo,
    descrizione: existing.descrizione,
  }
  const stampatiCambiati = CAMPI_STAMPATI.filter(
    (campo) => campo in payload && (payload[campo] ?? null) !== (memorizzato[campo] ?? null)
  )
  if (stampatiCambiati.length > 0) {
    // `head: true` non porta righe: è il modo di chiedere «ce n'è almeno una»
    // senza scaricare la dichiarazione intera.
    // 🔑 «Viva» = `stato <> 'annullata'`, MAI un elenco di stati enumerati: è la
    // stessa definizione dell'indice parziale `ddc_lavoro_attiva_unique`
    // (`20260710090000:15-17`), della RPC `riporta_a_pronto_atomica`
    // (`20260807182614:92-94`) e di `generateDdC` (`generate-ddc.ts:383-387`).
    // Due definizioni della stessa cosa divergono. `stato` è `NOT NULL`
    // (`schema.sql:1265`), quindi `<>` non lascia scappare righe con lo stato
    // assente.
    // 🛑 La lettura resta DENTRO il laboratorio del chiamante (`laboratorio_id`):
    // una dichiarazione di un altro laboratorio non deve né bloccare né essere
    // osservabile da qui (prova ⑭).
    const { count: ddcVive, error: erroreDdc } = await svc
      .from('dichiarazioni_conformita')
      .select('id', { count: 'exact', head: true })
      .eq('lavoro_id', id)
      .eq('laboratorio_id', context.laboratorioId)
      .neq('stato', 'annullata')

    // 🛑 FAIL-CLOSED, e non è pignoleria: senza questo ramo un errore di lettura
    // darebbe `count: null`, `(null ?? 0) > 0` sarebbe falso e il campo stampato
    // passerebbe. Un cancello che si apre quando non riesce a guardare non è un
    // cancello. Prova ⑰.
    if (erroreDdc) {
      return NextResponse.json(
        { error: 'Non riesco a controllare la dichiarazione di questo lavoro: riprova fra un momento.' },
        { status: 500 }
      )
    }

    if ((ddcVive ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            'Questo dato è già stampato sulla dichiarazione consegnata, e cambiarlo qui la lascerebbe indietro. Per correggerlo apri «Devo intervenire» e scegli «dato sbagliato sulla dichiarazione»: l\'app rifà il documento e conserva quello vecchio.',
        },
        { status: 422 }
      )
    }
  }

  // ═══ IL COLORE DI CASO: la coppia si NORMALIZZA, non si copia ══════════════
  // Task 12-bis. `colore_scala`/`colore_codice` sono in allowlist, ma il valore
  // grezzo del body non può arrivare all'UPDATE: tre vincoli lo aspettano al
  // varco (riletti dal catalogo di sistema il 28/07/2026)
  //   lavori_colore_caso_coppia_ck CHECK ((colore_scala IS NULL) = (colore_codice IS NULL))
  //   lavori_colore_caso_fk        FOREIGN KEY (colore_scala, colore_codice)
  //                                  REFERENCES colori_dentali(scala, codice)
  //   lavori_colore_scala_check    CHECK (colore_scala IS NULL OR colore_scala =
  //                                  ANY ('vita_classical','vita_3d_master','fuori_scala'))
  // Mezza coppia, un «a3» minuscolo o un codice inventato farebbero fallire
  // l'UPDATE con un 500 — e con lui si perderebbe OGNI altra correzione dello
  // stesso salvataggio. La regola dura del Task 11 vale identica qui: **si
  // perde il colore, non il lavoro.**
  //
  // 🔑 È IL CODICE A COMANDARE — corretto con D260 (06/08/2026), e la frase che
  // c'era prima («le due chiavi si scrivono sempre INSIEME o nessuna delle due»)
  // era in contraddizione col contratto dichiarato in `colore-caso.ts:63-70`,
  // che ammette apposta `colore_codice` senza `colore_scala`. Due contratti
  // diversi scritti nello stesso repository: da quella frase è nato il rilievo
  // qui sotto sulla tinta.
  //   · codice presente → si normalizza la coppia sul catalogo (la scala, se non
  //     arriva, la deduce il catalogo: è il caso NORMALE, quello che manda il form);
  //   · codice assente → non c'è nessuna richiesta di colore. La scala orfana si
  //     BUTTA dal corpo (se restasse, l'UPDATE violerebbe
  //     `lavori_colore_caso_coppia_ck` → 500, e con lui si perderebbe ogni altra
  //     correzione dello stesso salvataggio) e il caso salvato NON si tocca.
  // Se il body non nomina il colore, il caso non si tocca affatto: è così che la
  // scheda tiene il caso fermo finché sono le RIGHE a portare il colore (la
  // precedenza riga→caso mostrerebbe comunque la riga, e riscrivere il caso
  // sarebbe una seconda verità che nessuno vede). ⚠️ Nel momento in cui le righe
  // si svuotano, invece, la scheda lo NOMINA — anche per azzerarlo: quel caso
  // torna leggibile e deve tornare vero. La condizione sta di là, in
  // `useLavoroForm.ts` (`coloreDelleRighe`), ed è la stessa con cui
  // `idrataColoreScheda` lo rilegge.
  if (!('colore_codice' in payload)) delete payload.colore_scala
  let coloreScartato = false
  if ('colore_codice' in payload) {
    const colore = await risolviColoreCaso(svc, payload.colore_scala, payload.colore_codice)
    payload.colore_scala = colore.colore_scala
    payload.colore_codice = colore.colore_codice
    // ✅ D248 (05/08/2026) — il rilievo M2 del 28/07 è servito QUI, dove
    // mancava. `risolviColoreCaso` produce `scartato` da luglio con la sua
    // ragione scritta — «*"si perde il colore, mai il lavoro" giustifica il NON
    // far fallire; NON giustifica il non dirlo*» — il POST lo rimanda e il
    // wizard lo mostra; **questa rotta lo riceveva e lo buttava via**.
    // ⚠️ ONESTÀ SULL'ESPOSIZIONE — e questo blocco è già stato riscritto UNA
    // VOLTA perché diceva il falso (revisione di ramo, 05/08/2026). Diceva che
    // «la pagina di modifica toglie il colore dal corpo (`useLavoroForm.ts:325`)»:
    // **`:325-326` lo tolgono, ma `:340-341` lo RIMETTONO** ogni volta che
    // nessun dente porta colore. Quel client il colore lo manda eccome.
    // ✅ La conclusione regge lo stesso, per un motivo diverso e misurato: quel
    // campo è una TENDINA di 19 codici (`TabClinica.tsx:8-14`), tutti e 19
    // presenti in `colori_dentali`; e il foglio della scheda verifica col
    // catalogo prima di mandare. Quindi oggi lo scarto non è raggiungibile.
    // 🔴 IL GIORNO IN CUI LO DIVENTA, dichiarato perché non colga di sorpresa:
    // basta allargare le scale ammesse o rendere quel campo testo libero — e
    // allora `colore_scartato` serve davvero, ma **nessuno lo legge ancora**.
    // 🔑 Il senso resta quello: non si ripara un danno visibile oggi, si toglie
    // una garanzia dal client, dove il cappello di `colore-caso.ts` dice da
    // luglio che non può stare — «i client saranno più d'uno», e lo specchio dei
    // 48 codici che vive nel client **è** un secondo elenco che può divergere.
    coloreScartato = colore.scartato
  }

  // Validazione enum tipo_dispositivo (B2): solo se il campo è presente nel payload
  if (payload.tipo_dispositivo !== undefined && !(MACRO_SLUGS as string[]).includes(payload.tipo_dispositivo as string)) {
    return NextResponse.json({ error: 'tipo_dispositivo non valido' }, { status: 422 })
  }

  // ═══ LA TINTA DEL MANUFATTO (D42) ══════════════════════════════════════════
  // Due cose in un blocco solo, perché dipendono dallo stesso fatto — quale tipo
  // avrà il lavoro DOPO questo salvataggio:
  //   (a) se il body porta una tinta, si normalizza sul catalogo;
  //   (b) D117 — se il tipo cambia e la tinta presente non gli compete più, la si
  //       TOGLIE e LO SI DICHIARA. Il salvataggio riesce: `tipo_dispositivo` è
  //       già correggibile, e senza questo trattamento il CHECK
  //       `lavori_tinta_tipo_ck` farebbe fallire una correzione legittima con un
  //       errore grezzo del database. 🛑 Togliere sì, in silenzio mai.
  //
  // 🔎 PERCHÉ `macroDopo` PUÒ VENIRE DAL BODY, e fin dove arriva la garanzia —
  // scritto così perché la prima stesura diceva di più di quanto fosse vero.
  // Il valore è lecito perché finisce nella STESSA scrittura: è davvero il tipo
  // che il lavoro avrà. Sta DOPO la validazione `MACRO_SLUGS` per due ragioni
  // oneste — non si spende una query sul catalogo per una richiesta che sta per
  // essere rifiutata, e si ragiona su un valore verificato.
  // ⚠️ MA NON È UNA DIFESA, e dirlo tale sarebbe una falsa sicurezza:
  // `provato:` spostando questo blocco PRIMA della validazione, **tutte e nove
  // le prove restano verdi**. Il motivo è che `famigliaDiMacro` risponde `null`
  // a ogni nome che non conosce, e conosce **solo** `ortodonzia` e
  // `bite_splint` — entrambi dentro `MACRO_SLUGS`: un tipo inventato cade lì e
  // la tinta viene scartata comunque.
  // 🔴 L'ordine tornerebbe a contare il giorno in cui `famigliaDiMacro`
  // imparasse una macro che `MACRO_SLUGS` non ha. Oggi non può succedere in
  // silenzio: la prova «OGNI tipo con prevedeColore libero sta sotto una macro
  // che ha una famiglia» (`tests/unit/tinta-dominio.test.ts`) si accende da sé.
  const macroDopo = (payload.tipo_dispositivo ?? existing.tipo_dispositivo) as string
  let tintaRimossa: { famiglia: string; codice: string } | null = null
  let tintaScartata = false

  // ✅ RILIEVO DELLA REVISIONE DI RAMO (Minore, 05/08/2026) — CHIUSO con D260
  // il 06/08/2026, e **su entrambi i gemelli nella stessa passata**, come il
  // rilievo stesso chiedeva. Diceva: questo `if` entrava su una qualsiasi delle
  // due chiavi, quindi un corpo col solo `tinta_famiglia` risolveva a
  // `NESSUNA_TINTA` e **azzerava una tinta valida senza dichiararlo**.
  //
  // 🔑 LA PREMESSA È STATA RIVERIFICATA PRIMA DI SCRIVERE LA REGOLA, ed è il
  // pezzo che vale più della correzione. Il rinvio poggiava su «la forma è
  // identica al gemello del colore»; l'handoff del 06/08 aveva messo la frase
  // in dubbio, notando che per il colore mezza coppia è il caso normale. Il
  // dubbio era rivolto alla METÀ SBAGLIATA: le mezze coppie sono due e vanno al
  // contrario. Il codice senza la chiave secondaria è normale e voluto in
  // ENTRAMBI (`colore-caso.ts:89-98` deduce la scala, `tinta.ts:94-97` deduce la
  // famiglia); la chiave secondaria senza il codice azzera in muto in ENTRAMBI.
  // Quindi la premessa reggeva davvero, e la regola è UNA.
  //
  // 🛑 E LA CHIAVE ORFANA SI TOGLIE **PRIMA** DELLA CATENA, non in un ramo suo:
  // così il caso ricade esattamente su «il body non nomina la tinta», compreso
  // il ramo D117 qui sotto. Con un `else if` un cambio di tipo accompagnato da
  // una famiglia orfana avrebbe tolto la tinta **in silenzio** — lo stesso
  // difetto, spostato di due righe. La prova che lo tiene fermo è la ⑥ di
  // `tests/unit/lavori-patch-mezza-coppia.test.ts`.
  if (!('tinta_codice' in payload)) delete payload.tinta_famiglia
  if ('tinta_codice' in payload) {
    const tinta = await risolviTinta(svc, payload.tinta_famiglia, payload.tinta_codice, macroDopo)
    payload.tinta_famiglia = tinta.tinta_famiglia
    payload.tinta_codice = tinta.tinta_codice
    // 🔑 `scartata` distingue «l'utente ha cancellato la tinta» (nessun avviso:
    // era un'intenzione) da «la tinta chiesta non si è potuta registrare» (che
    // va detto, o «si corregge dalla scheda» non vale — chi deve correggere non
    // sa di doverlo fare). Il campo lo produce `risolviTinta`; qui viaggia fino
    // alla risposta. ⚠️ Destinazione dichiarata: lo leggono il foglietto della
    // scheda (T7, D247) e la pagina di modifica (T8) — un campo senza un lettore
    // scritto è un interruttore che non fa niente.
    tintaScartata = tinta.scartata
  } else if (existing.tinta_famiglia && famigliaDiMacro(macroDopo) !== existing.tinta_famiglia) {
    // Il body non nomina la tinta, ma il tipo cambia e la tinta esistente non
    // c'entra più: la si toglie NELLA STESSA scrittura.
    tintaRimossa = { famiglia: existing.tinta_famiglia as string, codice: existing.tinta_codice as string }
    payload.tinta_famiglia = null
    payload.tinta_codice = null
  }

  // Se incluso in fattura: rimuovi i campi prezzo dal payload per protezione
  if (existing.incluso_in_fattura) {
    for (const field of LOCKED_PRICE_FIELDS) {
      delete payload[field]
    }
  }

  // N4: se il prezzo è gestito dalle righe di lavorazione, prezzo_unitario è
  // read-only (eccezione: azzeramento a null = riconciliazione, consentito).
  // Se il lavoro è incluso in fattura, prezzo_unitario è già stato rimosso
  // dal payload sopra, quindi questo blocco non scatta (composizione con il
  // lock fattura senza query extra).
  if ('prezzo_unitario' in payload && payload.prezzo_unitario !== null) {
    const { count: righeAttive } = await svc
      .from('lavori_lavorazioni')
      .select('id', { count: 'exact', head: true })
      .eq('lavoro_id', id)
      .is('deleted_at', null)
    if ((righeAttive ?? 0) > 0) {
      return NextResponse.json({ error: 'prezzo gestito dalle righe di lavorazione' }, { status: 422 })
    }
  }

  // Fix cross-tenant FK: validare che cliente_id, paziente_id, tecnico_id, ciclo_id
  // appartengano al laboratorio dell'utente prima di aggiornare
  const FK_FIELDS = [
    { field: 'cliente_id',  table: 'clienti' },
    { field: 'paziente_id', table: 'pazienti' },
    { field: 'tecnico_id',  table: 'tecnici' },
    { field: 'ciclo_id',    table: 'cicli_produzione' },
  ] as const

  for (const { field, table } of FK_FIELDS) {
    if (payload[field] != null) {
      const { data: fkRow } = await svc
        .from(table)
        .select('id')
        .eq('id', payload[field] as string)
        .eq('laboratorio_id', context.laboratorioId)
        .is('deleted_at', null)
        .single()
      if (!fkRow) {
        return NextResponse.json(
          { error: `${field} non appartiene a questo laboratorio` },
          { status: 403 }
        )
      }
    }
  }

  // Forza aggiornamento timestamp (non allowlisted: sempre gestito server-side)
  payload.updated_at = new Date().toISOString()

  const { data: lavoro, error: updateError } = await svc
    .from('lavori')
    .update(payload)
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .select('id, numero_lavoro, stato, updated_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // A1: push al tecnico su assegnazione — SOLO quando tecnico_id cambia verso
  // un valore non-null. Awaited (non `void`): su runtime serverless (Vercel)
  // il lavoro non atteso dopo la response può essere terminato a metà se
  // l'istanza si congela subito dopo l'invio — stesso pattern di
  // prove/route.ts (push "prova rientrata"), che attende triggerPushToUser
  // prima di rispondere. notificaAssegnazione non lancia mai (try/catch
  // onnicomprensivo, come triggerPushToUser stesso), quindi l'await non può
  // far fallire questa risposta.
  if (payload.tecnico_id && payload.tecnico_id !== existing.tecnico_id) {
    await notificaAssegnazione(
      svc,
      payload.tecnico_id as string,
      context.laboratorioId,
      existing.numero_lavoro,
      id
    )
  }

  // Additivo (D42): nessun client esistente si accorge dei due campi in più, e
  // compaiono SOLO quando c'è qualcosa da dire — `tinta_rimossa` quando il
  // cambio di tipo ha tolto una tinta che c'era, `tinta_scartata` quando una
  // tinta era stata chiesta e non si è potuta registrare.
  // ⚠️ FORMA DICHIARATA, perché differisce da quella del POST e la differenza
  // non deve sembrare una svista: qui i campi compaiono **solo quando c'è
  // qualcosa da dire**, mentre `POST /api/lavori` manda `colore_scartato` a
  // ogni creazione (anche `false`). Il POST non si tocca — è pubblicato e ha un
  // lettore che si aspetta quella forma (`crea-lavoro.ts`). Chi legge di qui usi
  // `=== true`, non la presenza della chiave.
  return NextResponse.json({
    lavoro,
    ...(tintaRimossa ? { tinta_rimossa: tintaRimossa } : {}),
    ...(tintaScartata ? { tinta_scartata: true } : {}),
    ...(coloreScartato ? { colore_scartato: true } : {}),
  })
}
