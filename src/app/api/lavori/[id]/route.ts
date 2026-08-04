import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { MACRO_SLUGS } from '@/lib/domain/tipi-lavoro'
import { triggerPushToUser } from '@/lib/notifications/trigger'
// Stessa normalizzazione del colore di caso che usa `POST /api/lavori` (Task
// 11): una sola casa, due chiamanti. Vedi GRUPPO C nella tabella qui sotto.
import { risolviColoreCaso } from '@/lib/api/colore-caso'
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
  ...LOCKED_PRICE_FIELDS,
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
  const { data: existing } = await svc
    .from('lavori')
    .select('incluso_in_fattura, tecnico_id, numero_lavoro')
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
      payload[field] = body[field]
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
  // 🔑 Le due chiavi si scrivono sempre INSIEME o nessuna delle due. Se il body
  // non le nomina, il caso non si tocca affatto: è così che la scheda tiene il
  // caso fermo finché sono le RIGHE a portare il colore (la precedenza riga→caso
  // mostrerebbe comunque la riga, e riscrivere il caso sarebbe una seconda
  // verità che nessuno vede). ⚠️ Nel momento in cui le righe si svuotano, invece,
  // la scheda le NOMINA — anche per azzerarle: quel caso torna leggibile e deve
  // tornare vero. La condizione sta di là, in `useLavoroForm.ts`
  // (`coloreDelleRighe`), ed è la stessa con cui `idrataColoreScheda` lo rilegge.
  if ('colore_scala' in payload || 'colore_codice' in payload) {
    const colore = await risolviColoreCaso(svc, payload.colore_scala, payload.colore_codice)
    payload.colore_scala = colore.colore_scala
    payload.colore_codice = colore.colore_codice
  }

  // Validazione enum tipo_dispositivo (B2): solo se il campo è presente nel payload
  if (payload.tipo_dispositivo !== undefined && !(MACRO_SLUGS as string[]).includes(payload.tipo_dispositivo as string)) {
    return NextResponse.json({ error: 'tipo_dispositivo non valido' }, { status: 422 })
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

  return NextResponse.json({ lavoro })
}
