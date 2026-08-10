// src/lib/avvisi/portale.ts
//
// Task 8 dell'ondata «l'avviso al dentista» — LA SEZIONE «Avvisi dal
// laboratorio» nel portale del dentista (⚖️ D346, mockup B1) e la sua eredità
// ⚖️ D354: UNA card per lavoro, l'unione dei campi corretti, l'ULTIMA
// dichiarazione da scaricare, la ricevuta di lettura scritta su OGNI riga
// mostrata.
//
// 🔑 PERCHÉ UN FILE NUOVO E NON UNA TERZA/QUARTA FUNZIONE IN `queries.ts`.
//    Quel modulo si dichiara «LE DUE LETTURE di avvisi_dentista» (poi diventate
//    tre con `avvisoPerLaStriscia`, per una DOMANDA nuova, non una terza
//    strada per la stessa). Qui la domanda è ANCORA diversa e più ampia: non
//    «quali avvisi», ma «quali LAVORI hanno un avviso, con che dichiarazione
//    viva e con quale frase». Le funzioni di questo file leggono `lavori` e
//    `dichiarazioni_conformita`, non `avvisi_dentista` — la lettura grezza
//    degli avvisi resta `archivioCliente` (`queries.ts:346`), riusata
//    com'è, senza duplicati.
//
// 🛑 QUESTO FILE NON HA UN CANCELLO DI RUOLO, ED È GIUSTO COSÌ: il portale del
//    dentista non ha ruoli applicativi, il suo cancello è il token
//    (`archivioCliente` lo dice di sé: «per il portale va bene così»).

import { descriviCampiCorretti } from '@/lib/avvisi/messaggio'
import type { AvvisoRiga } from '@/lib/avvisi/queries'
import { minimizzaPhi } from '@/lib/portale/minimizza-phi'
import type { getServiceClient } from '@/lib/supabase/server-service'

type Svc = ReturnType<typeof getServiceClient>

// ═══════════════════════════════════════════════════════════════════════════
// 1. raggruppaPerLavoro — UNA card per lavoro, l'unione dei campi (⚖️ D354)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UN gruppo per lavoro: l'unione (senza doppioni) dei `campi_corretti` di
 * TUTTI gli avvisi di quel lavoro, la data dell'avviso PIÙ RECENTE, e TUTTI
 * gli id degli avvisi che compongono il gruppo — servono a `segnaAvvisiVisti`
 * per scrivere la ricevuta su ognuno di essi, non solo sul più recente.
 */
export interface CardAvviso {
  lavoroId: string
  avvisoIds: string[]
  campiCorretti: string[]
  dataPiuRecente: string
}

/**
 * ⚖️ D354 — «UNA card PER LAVORO che abbia almeno un avviso»: qui è dove
 * l'unione si costruisce, in un posto solo (stesso principio di
 * `DAL_PIU_VECCHIO` in `queries.ts`: la regola vive UNA volta, non una per
 * ogni chiamante).
 *
 * 🛑 IL MASSIMO DI `created_at` SI CALCOLA, NON SI ASSUME DALL'ORDINE
 *    DELL'INPUT. `archivioCliente` restituisce le righe dal più recente, e in
 *    quell'ordine il primo incontro di un `lavoro_id` porterebbe già la data
 *    giusta — ma far dipendere la correttezza da un ordinamento scelto altrove
 *    è una promessa che questo modulo non controlla. Il confronto stringa fra
 *    due ISO 8601 con lo stesso fuso (`timestamptz` via PostgREST è sempre
 *    UTC con `Z`) ordina correttamente senza bisogno di `new Date(...)`.
 *
 * 🔑 D336 — IL VALORE VECCHIO NON PUÒ COMPARIRE QUI PER COSTRUZIONE:
 *    `campi_corretti` porta solo NOMI di campo (stringhe come `descrizione`),
 *    mai un valore. Questa funzione non riceve altro dalla riga che nomi e
 *    date: non ha, strutturalmente, un dato da cui un valore vecchio potrebbe
 *    entrare — stessa garanzia-per-firma di `buildAvvisoMessage`.
 */
export function raggruppaPerLavoro(righe: readonly AvvisoRiga[]): CardAvviso[] {
  const ordine: string[] = []
  const gruppi = new Map<string, { avvisoIds: string[]; campi: Set<string>; dataPiuRecente: string }>()

  for (const r of righe) {
    let g = gruppi.get(r.lavoro_id)
    if (!g) {
      g = { avvisoIds: [], campi: new Set<string>(), dataPiuRecente: r.created_at }
      gruppi.set(r.lavoro_id, g)
      ordine.push(r.lavoro_id)
    }
    g.avvisoIds.push(r.id)
    for (const campo of r.campi_corretti) g.campi.add(campo)
    if (r.created_at > g.dataPiuRecente) g.dataPiuRecente = r.created_at
  }

  return ordine.map((lavoroId) => {
    const g = gruppi.get(lavoroId) as { avvisoIds: string[]; campi: Set<string>; dataPiuRecente: string }
    return {
      lavoroId,
      avvisoIds: g.avvisoIds,
      campiCorretti: Array.from(g.campi),
      dataPiuRecente: g.dataPiuRecente,
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. fraseAvviso — la frase delle voci, SOLO nel portale (⚖️ D334 · D336)
// ═══════════════════════════════════════════════════════════════════════════

/** Elenco in italiano: «a», «a e b», «a, b e c» — mai la virgola di Oxford. */
function elenca(voci: readonly string[]): string {
  if (voci.length === 0) return ''
  if (voci.length === 1) return voci[0]
  return `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`
}

/**
 * La frase che la card mostra al dentista — il dettaglio che ⚖️ D334 vieta su
 * WhatsApp e ammette SOLO qui.
 *
 * 🛑 NESSUN VERBO CHE DEVE CONCORDARE COL GENERE/NUMERO DELLE VOCI. Il
 *    mockup approvato (B1) scriveva «sono cambiati i denti indicati e le
 *    caratteristiche prescritte» — ma «cambiati» è maschile plurale e non
 *    concorda con «il paziente» (richiederebbe «è cambiato») né con «la
 *    descrizione» («è cambiata»): con un'unione arbitraria di voci di generi
 *    diversi non esiste UN participio che vada sempre bene. Si tiene
 *    l'apertura del mockup («La dichiarazione è stata rifatta:») e si chiude
 *    con l'elenco nudo, senza un secondo verbo — grammaticalmente sempre
 *    corretto, qualunque sia la combinazione di voci.
 *
 * 🔑 USA `descriviCampiCorretti` (⚖️ D336, garanzia di firma: non riceve un
 *    valore, quindi non può mostrarlo) — non reinventa la traduzione qui.
 */
export function fraseAvviso(campiCorretti: readonly string[]): string {
  const descrizioni = descriviCampiCorretti(campiCorretti)
  if (descrizioni.length === 0) return 'La dichiarazione è stata rifatta.'
  return `La dichiarazione è stata rifatta: ${elenca(descrizioni)}.`
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. lavoriPerLeCard — i lavori con avviso: numero, paziente, la DdC viva
// ═══════════════════════════════════════════════════════════════════════════

/** Riga di `lavori` coi soli campi che la card mostra, più la dichiarazione
 *  ATTIVA (`stato <> 'annullata'`) di quel lavoro, se c'è. */
export interface LavoroConAvviso {
  lavoroId: string
  numeroLavoro: string
  pazienteNomeSnapshot: string | null
  descrizione: string
  stato: string
  ddcStoragePathPdf: string | null
}

/**
 * I lavori che hanno almeno un avviso, con l'UNICA dichiarazione ancora viva
 * (se c'è — il pattern `.neq('ddc.stato', 'annullata')` è lo stesso già usato
 * da `page.tsx` per `lavoriConsegnati`, righe ~344-359, riusato com'è per
 * ⚖️ D354).
 *
 * 🛑 `stato` DI `lavori` VIAGGIA ANCHE SE LA CARD NON LO MOSTRA DIRETTAMENTE:
 *    serve a `costruisciCardAvviso` per decidere il CHIP di download, perché
 *    la rotta `/api/portale/[token]/lavori/[lavoro_id]/[documento]` filtra
 *    `.eq('stato', 'consegnato')` (righe 45-52) OLTRE alla dichiarazione non
 *    annullata. Offrire il chip quando la rotta lo rifiuterebbe sarebbe un
 *    link morto: il predicato del chip dev'essere IDENTICO a quello della
 *    rotta, non un secondo predicato che spera di coincidere.
 *
 * 🔑 `cliente_id` + `laboratorio_id`, ENTRAMBI: il client è di servizio (`svc`,
 *    `rolbypassrls = true`), quindi queste due `.eq()` sono l'UNICA cosa che
 *    impedisce alla card di un lavoro di un altro cliente/laboratorio di
 *    comparire — stessa ragione già scritta in `queries.ts:13-20`.
 */
export async function lavoriPerLeCard(
  svc: Svc,
  filtro: { lavoroIds: string[]; clienteId: string; laboratorioId: string }
): Promise<LavoroConAvviso[]> {
  if (filtro.lavoroIds.length === 0) return []

  const { data, error } = await svc
    .from('lavori')
    .select(
      `
      id, numero_lavoro, paziente_nome_snapshot, descrizione, stato,
      ddc:dichiarazioni_conformita(storage_path_pdf)
    `
    )
    .in('id', filtro.lavoroIds)
    .eq('cliente_id', filtro.clienteId)
    .eq('laboratorio_id', filtro.laboratorioId)
    .is('deleted_at', null)
    .neq('ddc.stato', 'annullata')

  if (error || !data) {
    console.error('[AVVISI] lavoriPerLeCard: lettura fallita —', error?.message)
    return []
  }

  return (
    data as unknown as Array<{
      id: string
      numero_lavoro: string
      paziente_nome_snapshot: string | null
      descrizione: string
      stato: string
      ddc: { storage_path_pdf: string | null } | { storage_path_pdf: string | null }[] | null
    }>
  ).map((r) => {
    // Stessa cautela di `mapLavoroConsegnato` in `page.tsx`: PostgREST può
    // restituire un embed to-one come oggetto o come array a seconda di come
    // inferisce la cardinalità.
    const ddcRaw = r.ddc
    const ddcRow = Array.isArray(ddcRaw) ? (ddcRaw[0] ?? null) : ddcRaw
    return {
      lavoroId: r.id,
      numeroLavoro: r.numero_lavoro,
      pazienteNomeSnapshot: r.paziente_nome_snapshot,
      descrizione: r.descrizione,
      stato: r.stato,
      ddcStoragePathPdf: ddcRow?.storage_path_pdf ?? null,
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. costruisciCardAvviso — dai gruppi + dai lavori, la card che si rende
// ═══════════════════════════════════════════════════════════════════════════

/** Ciò che `page.tsx` rende per ogni card. `avvisoIds` resta a bordo (non
 *  solo per uso interno): è da qui, DOPO il filtro sui lavori risolti, che si
 *  ricava l'elenco di id da segnare visti — «tutte le righe MOSTRATE». */
export interface CardAvvisoPortale {
  lavoroId: string
  avvisoIds: string[]
  numeroLavoro: string
  pazienteMostrato: string
  frase: string
  dataPiuRecente: string
  ddcUrl: string | null
}

/**
 * Unisce i gruppi (§1) con le righe di `lavori` (§3) in ciò che la pagina
 * rende.
 *
 * 🛑 UN GRUPPO SENZA LAVORO RISOLTO NON PRODUCE UNA CARD — difensivo: le due
 *    letture condividono lo stesso `clienteId`/`laboratorioId`, quindi in
 *    pratica ogni gruppo trova il suo lavoro; ma se un giorno non lo trovasse
 *    (riga soft-cancellata fra le due letture, corsa rarissima), il silenzio
 *    è la scelta giusta: mostrare una card senza numero/paziente sarebbe
 *    peggio di ometterla, e chi conta gli id da segnare (`page.tsx`, sul
 *    risultato di QUESTA funzione) non troverà quegli id — non si scrive un
 *    visto per un avviso che il dentista non ha visto.
 *
 * 🔑 IL CHIP DI DOWNLOAD RIPETE LO STESSO PREDICATO DELLA ROTTA
 *    (`stato === 'consegnato' && ddcStoragePathPdf`): v. il riquadro su
 *    `lavoriPerLeCard`. La CARD invece non ha questo cancello — ⚖️ D354 vieta
 *    un filtro di stato sull'avviso, quindi un lavoro riaperto (senza
 *    dichiarazione viva, quindi senza chip) mostra comunque la sua card.
 */
export function costruisciCardAvviso(
  gruppi: readonly CardAvviso[],
  lavori: readonly LavoroConAvviso[],
  opts: { token: string }
): CardAvvisoPortale[] {
  const mappa = new Map(lavori.map((l) => [l.lavoroId, l]))
  const cards: CardAvvisoPortale[] = []

  for (const g of gruppi) {
    const l = mappa.get(g.lavoroId)
    if (!l) continue

    const ddcUrl =
      l.stato === 'consegnato' && l.ddcStoragePathPdf
        ? `/api/portale/${opts.token}/lavori/${g.lavoroId}/ddc`
        : null

    cards.push({
      lavoroId: g.lavoroId,
      avvisoIds: g.avvisoIds,
      numeroLavoro: l.numeroLavoro,
      // Stesso campo, stesso formato del portale di oggi (`page.tsx`, `mapLavoro`):
      // paziente minimizzato, e se manca si scende sulla descrizione.
      pazienteMostrato: minimizzaPhi(l.pazienteNomeSnapshot) ?? l.descrizione,
      frase: fraseAvviso(g.campiCorretti),
      dataPiuRecente: g.dataPiuRecente,
      ddcUrl,
    })
  }

  return cards
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. segnaAvvisiVisti — la ricevuta di lettura, via SECURITY DEFINER (§2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scrive la ricevuta di lettura del dentista (⚖️ D332) chiamando la funzione
 * `avvisi_segna_visti` (migration dedicata, §2 del brief): NULL→now() solo
 * alla prima visione, mai un UPDATE diretto — non concesso a nessun ruolo
 * dell'app (migration 20260809124517).
 *
 * 🛑 PER NOME DI ARGOMENTO, NON POSIZIONALE: PostgREST chiama le RPC per nome
 *    di parametro, e senza un generic `Database` su `getServiceClient` `tsc`
 *    non verifica né il nome della funzione né quello degli argomenti (stessa
 *    trappola già documentata in `20260809133546_correggi_e_riemetti_con_avviso.sql`).
 *    La sonda sul catalogo vivo (FASE 6b/§2) chiama con `p_ids => …,
 *    p_laboratorio_id => …` per lo stesso motivo.
 *
 * 🔑 UN GUASTO QUI NON FA CADERE LA PAGINA: la ricevuta di lettura non è il
 *    motivo per cui il dentista è venuto — vede comunque i suoi avvisi. Si
 *    logga e si torna `false`, stesso idioma di `vuotoConNota`/`nienteConNota`
 *    in `queries.ts`.
 */
export async function segnaAvvisiVisti(svc: Svc, ids: string[], laboratorioId: string): Promise<boolean> {
  if (ids.length === 0) return true

  const { error } = await svc.rpc('avvisi_segna_visti', { p_ids: ids, p_laboratorio_id: laboratorioId })
  if (error) {
    console.error('[AVVISI] segnaAvvisiVisti: RPC fallita —', error.message)
    return false
  }
  return true
}
