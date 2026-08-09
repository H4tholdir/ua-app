import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import {
  STATI_AVVISO,
  chiudeIlPromemoria,
  isStatoAvviso,
  ammetteTestoInviato,
} from '@/lib/avvisi/stati'
import type { StatoAvviso, StatoAvvisoChiuso } from '@/lib/avvisi/stati'
import { puoChiudereAvviso } from '@/lib/avvisi/ruoli'

/**
 * POST /api/lavori/[id]/avviso — segna un avviso al dentista come COMUNICATO,
 * dall'app o a voce. Task 4 dell'ondata «l'avviso al dentista».
 *
 * Corpo: `{ avviso_id: string, come: 'dall_app' | 'a_voce', testo?: string }`
 * → `200 { ok: true, avviso: { … } }`
 *
 * ⚖️ **D335 — i due modi valgono uguale**, e in entrambi si registra **chi** e
 * **quando**. Non c'è una via «di serie» e una «di ripiego»: un avviso dato di
 * persona chiude l'obbligo esattamente come uno mandato dall'app.
 *
 * ⚖️ **D339 — si scrive il testo MANDATO, e nessuna bozza.** Il testo arriva dal
 * client perché è modificabile (⚖️ D334) e perché **a mandarlo è una persona,
 * non l'app** (⚖️ D331): da qui non parte niente, si registra soltanto. 🛑 Per la
 * stessa ragione **questa rotta non può sapere se il messaggio è partito
 * davvero** — registra che l'odontotecnico dichiara di averlo mandato. Nessun
 * commento e nessuna prova deve far credere il contrario.
 *
 * ═══ IL PERIMETRO PER RUOLO — ⚖️ D342, DECISO IL 09/08/2026 ══════════════════
 * 🔄 **QUI C'ERA SCRITTO «DOMANDA APERTA, NON UNA DECISIONE», e non lo è più.**
 * La riga è **riscritta al suo posto** e non corretta in fondo: in un file lungo
 * vince ciò che si legge per primo, e una correzione messa *dopo* l'affermazione
 * che smentisce non la sostituisce — la lascia in piedi (`CLAUDE.md` §9, D296).
 *
 * ⚖️ **D342 — chi chiude un avviso sta *IN* laboratorio: `titolare` ·`tecnico` ·
 * `front_desk`. Esclusi `admin_rete` E `admin_sistema`, entrambi PER NOME.**
 * 🛑 **L'elenco e la motivazione di ogni nome vivono in `src/lib/avvisi/ruoli.ts`**
 * — un modulo foglia, senza import, che server, browser e prove possono leggere
 * tutti. Questa rotta lo **ri-esporta** (v. il riquadro più sotto) e usa
 * `puoChiudereAvviso`: qui non c'è nessuna seconda copia da tenere allineata.
 * 🔑 **La visibilità è un SOTTOINSIEME del permesso:** nessuno vede un promemoria
 * che non può chiudere. Non è un bicondizionale — si può mostrare *meno* di ciò
 * che si permette, mai il contrario. È il motivo per cui `ruoli.ts` esporta
 * **due** predicati e non uno.
 * 📌 Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
 * **centoquarantottesima tornata**.
 *
 * ═══ PERCHÉ I FILTRI DELL'AGGIORNAMENTO SONO TRE, E NESSUNO È DECORATIVO ════
 * Questa rotta scrive con `getServiceClient`, cioè `service_role`, che ha
 * `rolbypassrls = true`: **la RLS non la tocca affatto**, e lo dice la migration
 * che stringe i permessi (`20260809124517`, «il permesso per colonna è l'unica
 * cosa che limita davvero cosa una rotta può scrivere»).
 * - `laboratorio_id` — è la riga che tiene la scrittura dentro il laboratorio di
 *   chi ha chiesto. Senza, l'`avviso_id` di un altro laboratorio si chiudeva.
 * - `lavoro_id` — 🔴 **il piano non lo chiede, ed è un suo difetto**: il lavoro
 *   sta nel percorso e l'avviso nel corpo, e niente imponeva che i due
 *   parlassero dello stesso lavoro. È la stessa famiglia già scritta nella rotta
 *   modello (`eventi-qualita/route.ts:429-437`): «la FK composita difende dal
 *   caso *evento di un altro laboratorio*, non dal caso *evento dello stesso
 *   laboratorio ma di un ALTRO lavoro*, che passerebbe in silenzio». Qui non
 *   c'è nessuna FK a difendere: senza questo filtro l'indirizzo mentirebbe.
 * - `stato IN <aperti>` — è l'aggiornamento CONDIZIONATO, cioè il 409 senza
 *   corsa: due richieste concorrenti non possono vincere entrambe, e la seconda
 *   trova zero righe invece di riscrivere autore e data della prima.
 */

type RouteContext = { params: Promise<{ id: string }> }

// Forma UUID canonica — idioma di casa (`eventi-qualita/route.ts:61`): scarta
// PRIMA della query un id che farebbe fallire il cast `uuid` di Postgres con un
// `22P02` grezzo, cioè un 500 al posto di una frase.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * Tetto del testo registrato. **1000 è il valore di casa**, non un numero preso
 * a caso: lo portano già `eventi-qualita/route.ts:78`, `valutazioni/route.ts:42`
 * e `rifacimento/route.ts:85`. I route handler dell'App Router **non** impongono
 * un limite al corpo della richiesta, quindi senza questo tetto 5 MB incollati
 * finirebbero in banca dati senza un errore.
 * 📌 E il margine è misurato, non sperato: la proposta che l'app compone è lunga
 * **168 caratteri** (`buildAvvisoMessage` con un numero di lavoro nella forma
 * maggioritaria `STOR/2021/016` e un gettone uuid), cioè circa un sesto del
 * tetto. Chi riscrive il messaggio a mano ha spazio, chi ci incolla un file no.
 */
const LIMITE_TESTO = 1000

/**
 * `come` → `stato`. **DUE VOCABOLARI DIVERSI, e la traduzione vive qui perché è
 * l'unico posto che vede entrambi:** `come` è quello del contratto HTTP (⚖️ il
 * piano, riga 321), `stato` quello del `CHECK` in banca dati (`stati.ts`).
 *
 * 🛑 E NON È UN SECONDO ELENCO che si può accorciare per sbaglio: la riga sotto
 * la mappa è un **cancello di compilazione** che pretende che ogni stato
 * «chiuso» abbia il suo `come`.
 * `provato:` togliendo la riga `a_voce` da questa mappa e leggendo l'uscita **da
 * variabile** (mai dietro una pipe: la prima misura di questa prova ha letto
 * l'uscita di `head` e diceva `0`) —
 * `npx tsc --noEmit` → `TSC_EXIT=1` con
 * `src/app/api/lavori/[id]/avviso/route.ts(111,7): error TS2322: Type 'true' is
 * not assignable to type 'never'.` (09/08/2026 — la riga 111 di allora è
 * l'asserzione `_ogniStatoChiusoHaIlSuoCome` qui sotto, che questo riquadro ha
 * poi spostato di qualche riga).
 * ➡️ Cioè il giorno in cui `STATI_CHIUSI` guadagna un terzo stato, questa rotta
 * **non compila** finché non le si dice da quale `come` si raggiunge. Senza il
 * cancello, quello stato sarebbe semplicemente **irraggiungibile in silenzio**.
 */
const STATO_DA_COME = {
  dall_app: 'comunicato_dall_app',
  a_voce: 'comunicato_a_voce',
} as const satisfies Record<string, StatoAvvisoChiuso>

type Come = keyof typeof STATO_DA_COME

const _ogniStatoChiusoHaIlSuoCome: StatoAvvisoChiuso extends (typeof STATO_DA_COME)[Come]
  ? true
  : never = true
void _ogniStatoChiusoHaIlSuoCome

/**
 * Gli stati che **non** chiudono il promemoria, **derivati** da `stati.ts` e non
 * riscritti: `chiudeIlPromemoria()` è il punto in cui ⚖️ D335 è scritta una
 * volta sola, e un `'da_comunicare'` battuto a mano qui sarebbe la seconda copia
 * di un elenco — la riga 22 della coda dei difetti.
 */
const STATI_APERTI: StatoAvviso[] = STATI_AVVISO.filter((s) => !chiudeIlPromemoria(s))

/**
 * 🛑 **ALLOWLIST ESPLICITA DI CHIAVI, MAI BLOCKLIST** (`CLAUDE.md` §9). E le
 * chiavi fuori elenco si **rifiutano**, non si scartano: scartarle in silenzio è
 * la classe di difetto che `CLAUDE.md` §0C nomina per prima
 * (`src/app/api/lavori/[id]/route.ts:259-264`, «l'utente legge *Salvato* su un
 * dato che non c'è»).
 * 🔑 **E qui chiude un buco vero, non teorico:** senza questo controllo un corpo
 * con `visto_dal_dentista_at` o `comunicato_da` non avrebbe fatto danno — quelle
 * chiavi non entrano nel payload — ma nessuno l'avrebbe detto a chi le ha
 * mandate, e la prossima persona avrebbe creduto che l'app le accetti. La
 * ricevuta di lettura del dentista **non è scrivibile da nessun ruolo dell'app**
 * (migration `20260809124517`): la richiesta di scriverla è un malinteso da
 * dire, non da ignorare.
 */
const CHIAVI_AMMESSE = ['avviso_id', 'come', 'testo'] as const

/**
 * 🛑 **L'ELENCO NON VIVE PIÙ QUI, E LA SUA MOTIVAZIONE NEMMENO: STANNO IN
 * `src/lib/avvisi/ruoli.ts`.** Qui resta una **ri-esportazione**, mai una seconda
 * copia — chi importava `RUOLI_CHIUSURA_AVVISO` da questa rotta continua a
 * trovarlo, e i due posti restano un posto solo.
 *
 * 🔑 **Perché è stato spostato** (revisione del Task 6, 09/08/2026): `route.ts` è
 * un file speciale di Next e importa `getServiceClient`, che apre con
 * `import 'server-only'`. Chi importava l'elenco da qui **come valore** si
 * trascinava nel proprio grafo l'intero gestore della rotta; da un componente
 * client il fagotto non compilava affatto. La scheda del lavoro lo faceva davvero
 * (`lavori/[id]/page.tsx`), ed era l'unico import **di valore** verso una rotta
 * in tutto `src/`: gli altri undici sono `import type` e spariscono in
 * compilazione.
 * 📮 **Il Task 7 legge da `@/lib/avvisi/ruoli`**, non da qui: la striscia della
 * home mostra il promemoria **agli stessi tre**, e «*la visibilità è un
 * SOTTOINSIEME del permesso*» (verbale, centoquarantottesima tornata) regge solo
 * se i posti leggono **un elenco solo**.
 */
export { RUOLI_CHIUSURA_AVVISO } from '@/lib/avvisi/ruoli'

/**
 * `Object.hasOwn` e non `v in STATO_DA_COME` né `STATO_DA_COME[v]`: con
 * `'__proto__'`, `'constructor'` o `'toString'` le altre due forme risalgono al
 * prototipo di `Object` e restituiscono qualcosa di vero. È la lezione già
 * scritta nella rotta modello (`eventi-qualita/route.ts:41-46`), e qui morderebbe
 * più forte: il valore risalito finirebbe nella colonna `stato`.
 */
function isCome(v: unknown): v is Come {
  return typeof v === 'string' && Object.hasOwn(STATO_DA_COME, v)
}

function err(messaggio: string, status: number) {
  return NextResponse.json({ error: messaggio }, { status })
}

export async function POST(req: Request, { params }: RouteContext) {
  // Obbligatoria, e sorvegliata da una guardia meccanica dentro `verify:full`
  // (`scripts/check-csrf.sh`): ogni rotta mutante verifica l'origine, o è
  // esclusa con una ragione scritta. Qui non c'è nessuna ragione per escluderla:
  // l'autorizzazione è il cookie di sessione, cioè esattamente la credenziale
  // ambientale che un sito ostile potrebbe cavalcare.
  if (!isSameOrigin(req)) return err('Richiesta non consentita', 403)

  // `getFreshLabContext` e non `getLabContext`: è una mutazione, e l'identità di
  // una mutazione si verifica sulla rete, non sui claim locali.
  const context = await getFreshLabContext()
  if (!context) return err('Non autorizzato', 401)
  if (!context.laboratorioId) return err('Laboratorio non trovato', 403)

  // ⚖️ D342 — IL CANCELLO DI RUOLO, e sta QUI: dopo l'identità, **prima** di
  // qualunque lettura o scrittura. Il 403 arriva senza toccare la banca dati, ed
  // è provato dalla stessa coppia usata per il 422 («codice giusto» **+** «il
  // finto client non è stato chiamato»): `㉖` `㉗` `㉙`.
  // 📌 Prima di `assertLabOperativo` di proposito: un permesso negato per nome
  // non deve poter essere anticipato dalla guardia dell'abbonamento — e per
  // `admin_sistema` quella guardia fa comunque «bypass totale»
  // (`lab-guard.ts:50`), quindi da lì non passerebbe nessun rifiuto.
  // 🛑 E DOPO `!context.laboratorioId`, che NON è un ripiego: spostandolo sopra,
  // la prova `③` («un contesto senza laboratorio risponde 403») non
  // raggiungerebbe più la guardia che dichiara di provare — diventerebbe **vacua**.
  // E non si può riscriverla con un ruolo ammesso, perché quello stato **non
  // esiste in banca dati**: `provato:` `UPDATE public.utenti SET
  // laboratorio_id=NULL WHERE ruolo='titolare'` in transazione annullata →
  // `❌ 23514 … violates check constraint "utenti_lab_required_for_non_admin"`.
  // L'unico stato a laboratorio nullo che il banco ammette è `admin_sistema`.
  // ➡️ Le due guardie sono due, e provano due cose diverse: questa il NOME,
  // quella di sopra il fatto che ci sia un laboratorio su cui agire.
  if (!puoChiudereAvviso(context.ruolo)) {
    return err('Il tuo ruolo non può segnare un avviso al dentista come comunicato: lo fa chi lavora in laboratorio.', 403)
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const { id: lavoroId } = await params
  // 404 e non 400: un id impossibile è indistinguibile da uno inesistente, ed è
  // la stessa risposta che riceve chi cerca il lavoro di un altro laboratorio.
  if (!UUID_RE.test(lavoroId)) return err('Lavoro non trovato', 404)

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

  for (const chiave of Object.keys(corpo)) {
    if (!(CHIAVI_AMMESSE as readonly string[]).includes(chiave)) {
      return err(`Questa richiesta non accetta il campo «${chiave}»: da qui si può solo segnare l'avviso come comunicato.`, 422)
    }
  }

  const avvisoId = corpo.avviso_id
  if (typeof avvisoId !== 'string' || !UUID_RE.test(avvisoId)) {
    return err('Non ho capito di quale avviso si tratta: ricarica la scheda del lavoro e riprova.', 422)
  }

  const come = corpo.come
  if (!isCome(come)) {
    return err('Dicci come hai avvisato il dentista: dall\'app, oppure a voce.', 422)
  }
  const stato = STATO_DA_COME[come]

  // ── il testo (⚖️ D334 · D339) ───────────────────────────────────────────
  // 🔑 UNA SOLA FUNZIONE governa sia la RICHIESTA del testo sia la sua
  // SCRITTURA: `ammetteTestoInviato` (`stati.ts`), specchio del `CHECK`
  // `avviso_testo_solo_se_dall_app`. Due condizioni scritte a mano qui
  // potrebbero divergere, e la divergenza uscirebbe come un `23514` illeggibile
  // al banco invece di un 422 con una frase.
  const vuoleTesto = ammetteTestoInviato(stato)
  const testoGrezzo = corpo.testo
  let testo: string | null = null

  if (vuoleTesto) {
    // 🛑 IL 422 ARRIVA PRIMA DELLA BANCA DATI, e non è pignoleria: il `CHECK`
    // rifiuterebbe comunque un `comunicato_dall_app` senza testo, ma con un
    // `23514` che a un'operatrice al banco non dice cosa fare. La prova che lo
    // dimostra è la COPPIA di asserzioni in `api-avviso.test.ts` (`⑪`): 422
    // **e** il finto client che non riceve nessuna chiamata.
    if (typeof testoGrezzo !== 'string') {
      return err('Per registrare un avviso mandato dall\'app serve il testo che hai mandato.', 422)
    }
    // La stringa vuota (o di soli spazi) supererebbe il `CHECK`, che chiede solo
    // `NOT NULL`: in banca dati resterebbe la prova di un avviso senza avviso.
    if (testoGrezzo.trim().length === 0) {
      return err('Il testo dell\'avviso è vuoto: scrivi il messaggio che hai mandato al dentista.', 422)
    }
    if (testoGrezzo.length > LIMITE_TESTO) {
      return err(`Il testo dell'avviso è troppo lungo: accorcialo a ${LIMITE_TESTO} caratteri.`, 422)
    }
    // 🛑 Si registra **COSÌ COM'È**, senza `trim`: ⚖️ D339 dice «il testo
    // mandato», e ciò che il dentista ha ricevuto non lo decide questa rotta.
    // Il `trim` di sopra serve solo a decidere se è vuoto.
    testo = testoGrezzo
  } else if (testoGrezzo !== undefined && testoGrezzo !== null) {
    // 🛑 NON SI SCARTA IN SILENZIO. Il `CHECK` vieta un testo su ogni stato
    // diverso da `comunicato_dall_app` — compresa una bozza su `da_comunicare` —
    // perché ⚖️ D339 dice che la bozza proposta non si conserva. Chi manda un
    // testo con «l'ho avvisato a voce» sta chiedendo una cosa che la tabella
    // rifiuta: ignorarlo gli farebbe credere di aver salvato la telefonata.
    return err('Con «l\'ho avvisato di persona» non si registra nessun testo: il messaggio si conserva solo quando parte dall\'app.', 422)
  }

  // ── la scrittura: le QUATTRO colonne concesse, e nessuna di più ──────────
  // 🛑 `comunicato_da` viene dalla SESSIONE, mai dal corpo — e la colonna punta
  // a `public.utenti(id)`, che è la stessa chiave dell'utente autenticato
  // (`utenti_id_fkey → auth.users(id)`), quindi l'identificativo di sessione è
  // scrivibile lì **per disegno**.
  // 📌 `comunicato_at` la mette l'orologio del **processo Node**, e la scelta è
  // dichiarata: da PostgREST non si può mandare un'espressione SQL, quindi il
  // `now()` del database vorrebbe dire un trigger o una funzione — cioè una
  // migration, fuori dal mandato di questo compito. I server dell'app girano a
  // UTC sincronizzato, e `toISOString()` porta il fuso dentro il valore, quindi
  // il momento salvato è un istante e non una data ambigua.
  // ⚠️ Limite dichiarato invece di nascosto: `created_at` la mette il database e
  // `comunicato_at` il processo, quindi con orologi che divergono la seconda può
  // risultare di poco anteriore alla prima. Nessuna lettura di quest'ondata
  // ordina per `comunicato_at`, quindi oggi non rompe niente — chi un giorno lo
  // farà deve saperlo.
  const daScrivere: Record<string, unknown> = {
    stato,
    comunicato_at: new Date().toISOString(),
    comunicato_da: context.userId,
  }
  // `testo` è non-nullo **esattamente** quando `ammetteTestoInviato(stato)` è
  // vero (v. sopra). 🔑 E la chiave si OMETTE invece di mandare `null`: idioma
  // di casa (`eventi-qualita/route.ts:373-376`), e qui in più il `CHECK`
  // garantisce già `NULL` su una riga ancora `da_comunicare`.
  if (testo !== null) daScrivere.testo_inviato = testo

  const svc = getServiceClient()

  const COLONNE = 'id, lavoro_id, cliente_id, stato, comunicato_at, comunicato_da, testo_inviato'

  const { data: aggiornate, error: erroreUpdate } = await svc
    .from('avvisi_dentista')
    .update(daScrivere)
    .eq('id', avvisoId)
    .eq('laboratorio_id', context.laboratorioId)
    .eq('lavoro_id', lavoroId)
    .in('stato', STATI_APERTI)
    .select(COLONNE)

  if (erroreUpdate) {
    // Il testo di Postgres resta nei log del server: chi legge la risposta è
    // un'operatrice al banco, e «violates check constraint» non le dice cosa fare.
    console.error('[AVVISO] aggiornamento fallito:', erroreUpdate)
    return err('Non sono riuscita a segnare l\'avviso come comunicato: riprova fra un momento.', 500)
  }

  const righe = (aggiornate ?? []) as Array<Record<string, unknown>>

  if (righe.length === 0) {
    // Zero righe vuol dire tre cose diverse, e vanno distinte con una lettura
    // ristretta allo STESSO perimetro: senza i due filtri, un avviso di un altro
    // laboratorio riceverebbe un 409 — cioè la conferma che esiste.
    const { data: esistente } = await svc
      .from('avvisi_dentista')
      .select('id, stato')
      .eq('id', avvisoId)
      .eq('laboratorio_id', context.laboratorioId)
      .eq('lavoro_id', lavoroId)
      .maybeSingle()

    if (!esistente) return err('Avviso non trovato', 404)

    const statoTrovato = (esistente as { stato?: unknown }).stato
    if (isStatoAvviso(statoTrovato) && chiudeIlPromemoria(statoTrovato)) {
      return err('Questo avviso è già stato segnato come comunicato: ricarica la scheda del lavoro.', 409)
    }

    // Fail-closed. Ci si arriva solo con uno stato fuori dal vocabolario (che il
    // `CHECK` non ammette) o con una riga ancora aperta che l'aggiornamento non
    // ha toccato: entrambe le cose non dovrebbero esistere, e nessuna delle due
    // si legge come «riuscito».
    console.error('[AVVISO] zero righe aggiornate su un avviso raggiungibile:', {
      avvisoId,
      lavoroId,
      stato: statoTrovato,
    })
    return err('Non sono riuscita a segnare questo avviso: ricarica la scheda del lavoro e riprova.', 409)
  }

  // 🔑 La risposta è un SOVRAINSIEME di quella dichiarata dal piano
  // (`200 { ok: true }`), e la differenza è dichiarata: porta **la riga davvero
  // salvata**, così chi ha chiesto non deve rileggerla per sapere com'è finita.
  // 🛑 Nessun campo calcolato e nessuna etichetta da mostrare: il foglio non
  // esiste ancora (dopo questo compito c'è il cancello §0B), e inventare qui una
  // parola da stampare sarebbe un contratto d'interfaccia preso di striscio.
  return NextResponse.json({ ok: true, avviso: righe[0] }, { status: 200 })
}
