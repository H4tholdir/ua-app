// src/lib/avvisi/archivio.ts
//
// Task 9 dell'ondata «l'avviso al dentista» — LA PRESENTAZIONE dell'archivio
// nella scheda del cliente (⚖️ D337): la lettura di supporto dei nomi di chi
// ha comunicato, e la funzione pura che traduce le righe grezze di
// `archivioCliente` in ciò che `clienti/[id]/page.tsx` mostra.
//
// 🔑 PERCHÉ UN FILE NUOVO E NON UNA FUNZIONE IN `queries.ts`. Quel modulo
//    legge `avvisi_dentista` (e il suo cancello di ruolo, `archivioPerSchedaCliente`,
//    resta lì accanto alla lettura che avvolge). Questo file legge `utenti` —
//    la «lettura di supporto per i nomi di chi ha comunicato», esplicitamente
//    ammessa dal brief Task 9 §1 («col modello di casa») — e compone la
//    presentazione. Stesso principio di `portale.ts` (Task 8): le due
//    domande sono diverse, e la seconda vive dove non confonde la prima.
//
// 🛑 `clienti/[id]/page.tsx` È UN COMPONENTE SERVER ASINCRONO: nessuna prova
//    unitaria lo rende (stessa lezione, già pagata due volte in questa
//    ondata — Task 6 su `lavori/[id]/page.tsx`, Task 8 su
//    `portale/[token]/page.tsx`). Ogni riga con posta in gioco normativa —
//    ⚖️ D336 (mai un valore vecchio), ⚖️ D337 (niente allarme) — sta qui,
//    dove una prova la esercita davvero (`tests/unit/avvisi-archivio.test.ts`).

import { descriviCampiCorretti } from '@/lib/avvisi/messaggio'
import type { AvvisoRiga } from '@/lib/avvisi/queries'
import { isStatoAvviso, chiudeIlPromemoria, type StatoAvvisoChiuso } from '@/lib/avvisi/stati'
import type { getServiceClient } from '@/lib/supabase/server-service'

type Svc = ReturnType<typeof getServiceClient>

// ═══════════════════════════════════════════════════════════════════════════
// 1. formattaQuando — l'istante nelle parole del banco, SEMPRE Europe/Rome
// ═══════════════════════════════════════════════════════════════════════════

/**
 * «9 agosto 2026, 14:00». 🛑 `timeZone: 'Europe/Rome'` è ESPLICITO: questo
 * modulo lo consuma un componente SERVER, e senza fuso dichiarato
 * `toLocaleDateString`/`toLocaleTimeString` formattano nel fuso del
 * PROCESSO — UTC su Vercel. Un avviso comunicato alle 00:30 di Roma
 * mostrerebbe il giorno prima (stesso difetto già pagato e corretto in
 * `clienti/[id]/page.tsx:219-231` per la data del DPA, e in
 * `portale/[token]/page.tsx:57-73` per `formatDataAvviso`).
 *
 * 🔑 Torna `null` invece di una stringa inventata quando il valore non è un
 * istante leggibile: il precedente in casa è `quandoLeggibile` in
 * `AvvisoDentista.tsx` — «*la riuscita si rilegge senza orologio piuttosto
 * che con un orologio inventato*». Qui vale doppio: `comunicato_at` e
 * `visto_dal_dentista_at` sono entrambi legittimamente `NULL` (un avviso
 * ancora aperto, o mai visto dal dentista), e quello NON è un guasto da
 * mascherare — è un fatto da non scrivere.
 */
export function formattaQuando(iso: string | null): string | null {
  if (!iso) return null
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return null
  const data = quando.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  })
  const ora = quando.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  })
  return `${data}, ${ora}`
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. nomiComunicatori — la lettura di supporto per «chi» (brief §1, ammessa)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Risolve `comunicato_da` (un `uuid` verso `public.utenti`) in un nome
 * leggibile, per gli id **che servono davvero** — non tutto il laboratorio,
 * a differenza del modello citato dal brief (`leggiTecniciSenzaAnagrafica`,
 * che legge l'intero laboratorio perché la striscia lo chiede lab-wide). Qui
 * la domanda è più stretta: solo gli autori delle righe che l'archivio sta
 * per mostrare.
 *
 * 🛑 `laboratorio_id` NON È DECORATIVO. Il client è quello di servizio
 *    (`rolbypassrls = true`): questa `.eq()` è l'unica cosa che impedisce di
 *    risolvere per errore il nome di un utente di un ALTRO laboratorio (uno
 *    stesso `uuid`, in teoria, non può collidere fra laboratori — ma la
 *    difesa in profondità è il modello di casa su ogni lettura di questo
 *    client: `queries.ts:13-20`, `portale.ts:157-160`).
 *
 * 🔑 **NESSUN FILTRO SU `deleted_at`, ED È DELIBERATO.** La colonna gemella
 *    `comunicato_da` è stata disegnata `REFERENCES public.utenti(id, laboratorio_id)`
 *    (dall'11/08/2026 FK composita `avvisi_dentista_comunicato_da_fk`, riga 59) **senza**
 *    `ON DELETE SET NULL` proprio perché l'azione referenziale è un `UPDATE`
 *    di `avvisi_dentista`, e la migration lo dice per esteso (`20260809123206`,
 *    righe 48-54): un CHECK vivo pretende l'autore su ogni riga chiusa, quindi
 *    l'autore deve sopravvivere alla cancellazione (soft) dell'utente. Filtrare
 *    `deleted_at IS NULL` qui vorrebbe dire far sparire dall'archivio — che è
 *    la PROVA ex Art. 5(2) GDPR — il nome di chi ha lasciato il laboratorio:
 *    l'esatto contrario della scelta già fatta un piano più in basso.
 *    ⚠️ Questo SI DISCOSTA dalla regola di casa «N11: filtro `deleted_at`
 *    SEMPRE» (`lab-context.ts`): è uno scostamento dichiarato, non
 *    dimenticato, e vale SOLO per questa lettura di un `uuid` già noto e
 *    fidato (arriva da `avvisi_dentista`, non da un input esterno).
 *
 * 🛑 Un guasto di lettura non porta giù la scheda — la mappa torna vuota, e
 *    ogni «chi» si legge col ripiego di `costruisciRigheArchivio` — ma il
 *    silenzio non è muto: resta nei log, stesso idioma di `vuotoConNota` in
 *    `queries.ts`.
 */
export async function nomiComunicatori(
  svc: Svc,
  ids: readonly (string | null)[],
  laboratorioId: string
): Promise<Map<string, string>> {
  const univoci = Array.from(new Set(ids.filter((id): id is string => !!id)))
  if (univoci.length === 0) return new Map()

  const { data, error } = await svc
    .from('utenti')
    .select('id, nome, cognome')
    .in('id', univoci)
    .eq('laboratorio_id', laboratorioId)

  if (error || !data) {
    console.error('[AVVISI] nomiComunicatori: lettura fallita —', error?.message)
    return new Map()
  }

  return new Map(
    (data as Array<{ id: string; nome: string; cognome: string }>).map((u) => [
      u.id,
      `${u.nome} ${u.cognome}`,
    ])
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 2-bis. numeriLavoro — la lettura di supporto per «quale lavoro» (⚖️ D356,
//        tornata 154, chiude M-T9-2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Risolve `lavoro_id` (un `uuid` verso `public.lavori`) nel `numero_lavoro`
 * leggibile — **stesso modello di `nomiComunicatori`** qui sopra (brief §1:
 * «col modello di casa»): lettura batch per id, dedup, filtro laboratorio,
 * log + ripiego mai un crash. Il vincolo «nessuna query nuova sulla tabella
 * avvisi» resta intatto: questa legge `lavori`, non `avvisi_dentista`.
 *
 * `provato:` `database.types.ts:2688` — su `lavori` il tipo è
 * `numero_lavoro: string`, non nullabile (la riga nullabile a 6219 è la
 * VISTA `lavori_dashboard`, non questa tabella).
 *
 * 🛑 `laboratorio_id` NON È DECORATIVO, stessa ragione di `nomiComunicatori`
 *    qui sopra: il client è quello di servizio (`rolbypassrls = true`), e
 *    questa `.eq()` è l'unica cosa che impedisce di risolvere per errore il
 *    numero di un lavoro di un ALTRO laboratorio.
 *
 * 🛑 Un guasto di lettura (o un `lavoro_id` orfano) non porta giù la scheda:
 *    la mappa torna vuota (o senza quella chiave), e `costruisciRigheArchivio`
 *    mostra la riga SENZA numero — mai un crash. Il silenzio non è muto:
 *    resta nei log, stesso idioma di `nomiComunicatori`.
 *
 * ⚠️ NESSUN FILTRO SU `deleted_at` (`lavori` ce l'ha), ED È UNA SCELTA
 *    DICHIARATA, non una copia distratta di `nomiComunicatori`: questo
 *    archivio è la prova ex Art. 5(2) GDPR di CHI è stato comunicato COSA —
 *    il numero del lavoro a cui una comunicazione appartiene resta un fatto
 *    storico anche se il lavoro viene poi cancellato (soft-delete). Filtrare
 *    `deleted_at IS NULL` farebbe sparire il numero da una riga d'archivio
 *    vera, col ripiego «SENZA numero» — lo stesso ragionamento del commento
 *    su `nomiComunicatori`, qui applicato a `lavori` invece che a `utenti`.
 */
export async function numeriLavoro(
  svc: Svc,
  ids: readonly (string | null)[],
  laboratorioId: string
): Promise<Map<string, string>> {
  const univoci = Array.from(new Set(ids.filter((id): id is string => !!id)))
  if (univoci.length === 0) return new Map()

  const { data, error } = await svc
    .from('lavori')
    .select('id, numero_lavoro')
    .in('id', univoci)
    .eq('laboratorio_id', laboratorioId)

  if (error || !data) {
    console.error('[AVVISI] numeriLavoro: lettura fallita —', error?.message)
    return new Map()
  }

  return new Map(
    (data as Array<{ id: string; numero_lavoro: string }>).map((l) => [l.id, l.numero_lavoro])
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. costruisciRigheArchivio — quando · come · chi · vista/non vista
// ═══════════════════════════════════════════════════════════════════════════

/** Ciò che `clienti/[id]/page.tsx` rende per ogni comunicazione dell'archivio. */
export interface RigaArchivioCliente {
  id: string
  lavoroId: string
  /** `false` per una riga ancora `da_comunicare`. Determina SOLO quali campi
   *  hanno un valore (`quando`/`chi`), MAI uno stile: ⚖️ D337 vieta un
   *  segnale d'allarme, e la forma neutra la sceglie la pagina. */
  chiuso: boolean
  /** «Dall'app, su WhatsApp» · «A voce» · «Da comunicare» per una riga
   *  aperta — sempre una frase neutra, mai una parola d'urgenza. */
  comeLabel: string
  /** `comunicato_at`, formattato Europe/Rome. `null` per una riga aperta
   *  (il CHECK `avviso_comunicato_ha_autore_e_data` lo garantisce NULL). */
  quando: string | null
  /** Il nome di chi ha comunicato, o `null` per una riga aperta
   *  (`comunicato_da` è NULL finché non si chiude). Per una riga chiusa il
   *  nome è SEMPRE una stringa — mai `null` — grazie al ripiego dichiarato
   *  quando l'id non risolve dalla mappa (utente sconosciuto/guasto). */
  chi: string | null
  /** `visto_dal_dentista_at`, formattato Europe/Rome, o `null` se il
   *  dentista non l'ha ancora aperto nel portale. */
  vistoLabel: string | null
  /** ⚖️ D336 — SOLO nomi di campo, mai un valore: `descriviCampiCorretti`
   *  non riceve altro che `campi_corretti`, quindi non può mostrarne uno. */
  campiDescritti: string[]
  /** ⚖️ D356 — `numero_lavoro` del lavoro a cui la comunicazione appartiene,
   *  risolto dalla lettura di supporto `numeriLavoro`. `null` quando il
   *  lavoro non si risolve (id orfano, lettura fallita): la riga si mostra
   *  SENZA numero, mai un crash. */
  numeroLavoro: string | null
}

const COME_ARCHIVIO: Record<StatoAvvisoChiuso, string> = {
  comunicato_dall_app: 'Dall’app, su WhatsApp',
  comunicato_a_voce: 'A voce',
}

/** ⚖️ D337 — la parola per una riga ancora aperta: un fatto, non un allarme. */
const COME_APERTO = 'Da comunicare'

/** ⚠️ Difensivo: non dovrebbe essere raggiungibile (`avviso_stato_vocabolario`
 *  è un CHECK vivo), ma una riga con uno stato fuori vocabolario non sparisce
 *  in silenzio — stesso idioma di `CAMPO_NON_PIU_PREVISTO` in `messaggio.ts`. */
const COME_SCONOSCIUTO = 'Stato non riconosciuto'

/** Chi ha comunicato, quando la riga è chiusa ma l'id non risolve dalla
 *  mappa (utente non trovato o lettura di supporto fallita). Un ripiego
 *  dichiarato, mai un buco silenzioso — idioma di `CAMPO_NON_PIU_PREVISTO`. */
const RIPIEGO_CHI = 'un utente del laboratorio'

function classificaStato(stato: string, logGuasto: (stato: string) => void): { chiuso: boolean; comeLabel: string } {
  if (!isStatoAvviso(stato)) {
    logGuasto(stato)
    return { chiuso: false, comeLabel: COME_SCONOSCIUTO }
  }
  if (chiudeIlPromemoria(stato)) {
    return { chiuso: true, comeLabel: COME_ARCHIVIO[stato] }
  }
  return { chiuso: false, comeLabel: COME_APERTO }
}

/**
 * Traduce le righe grezze di `archivioCliente`/`archivioPerSchedaCliente` in
 * ciò che la sezione «Comunicazioni» mostra — funzione PURA: nessuna lettura,
 * nessun orologio nascosto (`formattaQuando` prende sempre l'istante dalla
 * riga, mai `new Date()`).
 *
 * 🛑 NESSUN RAGGRUPPAMENTO PER LAVORO, a differenza di `raggruppaPerLavoro`
 *    (Task 8): qui ogni riga è una comunicazione a sé — «cliente con DUE
 *    comunicazioni chiuse» (brief §4, prova ⑤) sono DUE righe distinte, non
 *    una unione. ⚠️ Conseguenza dichiarata di ⚖️ D354 (Task 4-quater): un
 *    atto che chiude più promemoria dello stesso lavoro in un colpo solo
 *    produce più righe con lo STESSO `comunicato_at`/`comunicato_da`/`stato`,
 *    diverse solo nei `campi_corretti` — sono comunque atti distinti nel
 *    registro, e l'archivio li mostra entrambi.
 *
 * ⚠️ **L'ORDINE VIENE DA `archivioCliente`** (`created_at DESC`), non da
 *    `comunicato_at`: la rotta di chiusura documenta che i due orologi
 *    (database vs processo Node) possono divergere di poco
 *    (`avviso/route.ts:391-395`) — quindi le date mostrate non sono
 *    garantite strettamente monotone riga per riga. Limite noto, non corretto
 *    qui: la fonte dell'ordine resta unica (`DAL_PIU_VECCHIO`/`archivioCliente`
 *    in `queries.ts`), e riordinare qui sarebbe una seconda regola sulla
 *    stessa cosa.
 */
export function costruisciRigheArchivio(
  righe: readonly AvvisoRiga[],
  nomi: ReadonlyMap<string, string>,
  // ⚖️ D356 — terzo parametro, OPZIONALE: le chiamate esistenti (prima di
  //  questa decisione) restano valide senza toccarle, e tornano
  //  `numeroLavoro: null` su ogni riga (ripiego dichiarato, mai un `undefined`).
  numeri: ReadonlyMap<string, string> = new Map()
): RigaArchivioCliente[] {
  return righe.map((r) => {
    const { chiuso, comeLabel } = classificaStato(r.stato, (stato) =>
      console.error('[AVVISI] costruisciRigheArchivio: stato fuori vocabolario —', { id: r.id, stato })
    )

    return {
      id: r.id,
      lavoroId: r.lavoro_id,
      chiuso,
      comeLabel,
      quando: formattaQuando(r.comunicato_at),
      chi: r.comunicato_da ? (nomi.get(r.comunicato_da) ?? RIPIEGO_CHI) : null,
      vistoLabel: formattaQuando(r.visto_dal_dentista_at),
      campiDescritti: descriviCampiCorretti(r.campi_corretti),
      numeroLavoro: numeri.get(r.lavoro_id) ?? null,
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. etichettaVisto — ⚖️ D357 (tornata 154, chiude M-T9-3)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * La parola per la riga «vista/non vista», nelle TRE forme che può assumere:
 *
 * 1. riga ANCORA APERTA (`chiuso === false`) → **«Non ancora comunicata»**,
 *    A PRESCINDERE da `vistoLabel`
 * 2. riga CHIUSA ma non vista (`vistoLabel === null`) → «Non ancora vista
 *    dal dentista» (invariato)
 * 3. riga VISTA (e CHIUSA) → la data di visione (invariato)
 *
 * 🔴 `chiuso` SI CONTROLLA PER PRIMO, E NON È UN DETTAGLIO D'ORDINE: la
 *    combinazione «ancora aperta MA vista» non è teorica — è RAGGIUNGIBILE.
 *    Il portale marca `visto_dal_dentista_at` su TUTTI gli id del gruppo di
 *    un lavoro (`portale/[token]/page.tsx:495-496` →
 *    `avvisiCards.flatMap((c) => c.avvisoIds)`), e quel gruppo viene da
 *    `raggruppaPerLavoro(archivioCliente(...))` — che unisce **tutti** gli
 *    avvisi di un lavoro, aperti e chiusi (⚖️ D354: «l'unione... di TUTTI gli
 *    avvisi di quel lavoro», `portale.ts:47`; `archivioCliente` non filtra
 *    per `stato`, `queries.ts:346-358`). Un lavoro con un avviso già chiuso E
 *    uno ancora `da_comunicare` mostra al dentista una card sola (D354), e la
 *    ricevuta di lettura marca ANCHE l'id ancora aperto. Se questa funzione
 *    controllasse `vistoLabel` per primo, quella riga stamperebbe «Vista dal
 *    dentista il —» per una correzione che il laboratorio non ha ancora
 *    detto di aver fatto: peggio del difetto che D357 chiude (M-T9-3).
 *
 * 🔑 ESTRATTA QUI E NON LASCIATA NEL JSX: `clienti/[id]/page.tsx` è un
 *    componente SERVER asincrono e nessuna prova unitaria lo rende (stessa
 *    nota in testa a questo file, già vera per `costruisciRigheArchivio`).
 *    La parola giusta ha posta in gioco normativa — ⚖️ D337 vieta un segnale
 *    d'allarme, e prima di D357 «Non ancora vista dal dentista» compariva
 *    ANCHE per una riga mai comunicata, un valore letteralmente falso — quindi
 *    vive dove una prova la esercita davvero, non dove nessuna prova arriva.
 *
 * 🛑 D337 regge: questa funzione sceglie SOLO la parola, mai uno stile — il
 *    colore/badge restano quelli che il JSX già usa per ogni riga, invariati
 *    dalle tre forme.
 */
export function etichettaVisto(riga: Pick<RigaArchivioCliente, 'chiuso' | 'vistoLabel'>): string {
  if (!riga.chiuso) return 'Non ancora comunicata'
  if (riga.vistoLabel) return `Vista dal dentista il ${riga.vistoLabel}`
  return 'Non ancora vista dal dentista'
}
