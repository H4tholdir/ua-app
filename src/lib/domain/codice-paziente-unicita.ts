import type { getServiceClient } from '@/lib/supabase/server-service'
import { derivaAlias } from '@/lib/cassette/parco-shared'

// Task 7 (ondata b) — la lettura di unicità del codice paziente.
//
// 🔑 PERCHÉ QUESTA FUNZIONE ESISTE: dal 29/07/2026 l'indice unico
// `pazienti_codice_lab_uidx` (T5) rifiuta un codice doppio guardando TUTTO il
// laboratorio, senza distinguere dentista né stato (D34):
//   (laboratorio_id, lower(btrim(codice_paziente)))
//   WHERE codice_paziente IS NOT NULL AND btrim(codice_paziente) <> ''
// Ma il "riconoscimento" che il wizard usa oggi per capire CHI occupa un
// codice (`crea-lavoro.ts:250-255`) guarda un solo dentista
// (`cliente_id` in `GET /api/pazienti`), taglia a `.limit(500)` e filtra
// `archiviato = false` — tre restrizioni che l'indice non ha. Il divieto è
// quindi "più largo" del riconoscimento: un utente può ricevere un rifiuto
// corretto senza che l'interfaccia sappia dire chi occupa il codice.
//
// Questa funzione rispecchia il predicato dell'indice ALLA LETTERA:
//   · chiave = laboratorio_id + lower(btrim(codice)) — MAI cliente_id (D15:
//     il vincolo è per laboratorio, non per dentista — non si riapre qui);
//   · nessun `.limit()`;
//   · nessun filtro su `archiviato` né su `deleted_at`: deve trovare ANCHE il
//     paziente che l'interfaccia non mostra più, perché è proprio quel caso a
//     produrre un rifiuto senza spiegazione.
//
// Non risponde "occupato sì/no": risponde CHI occupa il codice, con i due
// dati assegnati a questo task dalla decisione D36 — il nome visibile del
// paziente e la data del suo ultimo lavoro. Il testo per l'utente ("È lei:
// usa la sua scheda") è T15, non qui: questa funzione non produce frasi, solo
// dati.
//
// 🔴 Non usa RPC. `svc` è INIETTATO (mai `getServiceClient()` chiamato qui
// dentro) — stesso schema di `risolviColoreCaso` (`lib/api/colore-caso.ts`):
// una casa sola, testabile passando un mock della query-chain, riusabile da
// qualunque chiamante server-side abbia già un client in mano. Chi inietta
// `svc` con `getServiceClient()` AGGIRA LA RLS: l'isolamento fra laboratori
// qui dentro è SOLO l'`.eq('laboratorio_id', labId)` esplicito, non un
// dettaglio — è l'unico argine.

export type OccupanteCodice = {
  id: string
  /**
   * Il nome da mostrare — MAI la colonna `cognome` da sola: 911 pazienti su
   * 916 hanno `cognome`/`nome` a `NULL` e `nome_cognome` uguale al codice
   * (misurato, v. rapporto). Si riusa `derivaAlias`
   * (`lib/cassette/parco-shared.ts`) — la funzione GEMELLA di
   * `cognomeEffettivo` che fa la stessa guardia sul lato lettura: alias se
   * `nome_cognome` non è il codice travestito, altrimenti `null`. Qui il
   * fallback è il codice stesso (con la maiuscola conservata, MAI la chiave
   * normalizzata): un paziente-wizard senza alias esiste comunque, e "è lei"
   * deve poter dire qualcosa anche quando l'unico dato è il codice.
   */
  nomeVisibile: string
  /** ISO 8601 (`lavori.data_ingresso`, mai `updated_at`: una correzione lo
   *  alzerebbe). `null` se il paziente non ha ancora nessun lavoro — non deve
   *  sparire dal risultato per questo. */
  dataUltimoLavoro: string | null
}

export type EsitoUnicitaCodice = { occupato: false } | { occupato: true; paziente: OccupanteCodice }

/**
 * Normalizza come l'indice: `lower(btrim(...))`.
 * ⚠️ `trim()` di JavaScript toglie PIÙ di `btrim()` di Postgres (tab, a-capo,
 * spazi unicode) — divergenza accettata e dalla parte sicura, stessa nota già
 * scritta in `dati-wizard.ts:50-53` e `api/pazienti/route.ts:120-124`: al più
 * questa funzione tratta come "vuoto" un codice che a database sarebbe
 * ancora un codice, mai il contrario.
 * Ritorna `null` per stringa vuota o di soli spazi: l'indice esclude quel
 * caso dal predicato (`btrim(codice_paziente) <> ''`), quindi non può mai
 * collidere — un codice così non "occupa" nulla.
 */
function chiaveNormalizzata(codice: string): string | null {
  const pulito = codice.trim()
  return pulito.length > 0 ? pulito.toLowerCase() : null
}

type CandidatoRiga = {
  id: string
  codice_paziente: string | null
  nome_cognome: string | null
  lavori: { data_ingresso: string }[] | null
}

/**
 * Trova chi occupa `codice` nel laboratorio `labId`, secondo l'identica
 * chiave dell'indice unico. `codiceGrezzo` è `unknown` di proposito: il
 * chiamante non deve pre-validare il tipo, la guardia è qui.
 *
 * Forma della query (P6-forma, provata su PostgREST — v. rapporto §3-4):
 * innesto `lavori(data_ingresso)` con `order`+`limit` PER PADRE (grafia
 * `referencedTable`, non `foreignTable`, deprecata) e `deleted_at is null`
 * sui lavori. 🛑 Innesto lasciato SEMPLICE — MAI `!inner`, che restituirebbe
 * `[]` e cancellerebbe dal risultato i pazienti senza lavori.
 */
export async function trovaOccupanteCodice(
  svc: ReturnType<typeof getServiceClient>,
  labId: string,
  codiceGrezzo: unknown
): Promise<EsitoUnicitaCodice> {
  if (typeof codiceGrezzo !== 'string') return { occupato: false }
  const chiave = chiaveNormalizzata(codiceGrezzo)
  if (!chiave) return { occupato: false }

  // 🛑 Rispecchia pazienti_codice_lab_uidx ALLA LETTERA (D34 + D34-bis):
  // nessun `.eq('cliente_id', …)`, nessun `.limit()`, nessun filtro su
  // `archiviato` né su `deleted_at` di `pazienti`.
  //
  // 🔑 Il pattern ilike è `%chiave%`, VOLUTAMENTE largo, non il letterale
  // esatto. Un pattern esatto avrebbe reso l'ilike il VERO cancello (non più
  // "ottimizzazione di banda"): un codice con `_`/`%` (es. `PZ_0042`) sarebbe
  // stato interpretato come wildcard da ILIKE, e senza poter verificare qui
  // se un escape dei metacaratteri sopravvive intatto al giro
  // supabase-js → PostgREST → query string, quel percorso avrebbe potuto
  // FAR SPARIRE un candidato vero (falso "libero" su un codice occupato) —
  // esattamente il difetto che T7 esiste per chiudere. Con `%…%` un
  // metacarattere nel codice può solo ALLARGARE il pattern (mai stringerlo):
  // il confronto esatto sotto (`chiaveNormalizzata`) resta l'UNICA fonte di
  // verità, l'ilike è di nuovo solo un pre-filtro di banda (stesso principio
  // di `dati-wizard.ts:36-53`). Effetto collaterale accettato: recupera anche
  // l'eventuale riga con spazi residui ai bordi (misurato zero oggi, v.
  // rapporto), che un pattern esatto avrebbe perso.
  //
  // 🔴 ECCEZIONE — il backslash NON allarga, CANCELLA (rilievo Importante,
  // review T7): a differenza di `%`/`_`, per Postgres il backslash è di
  // default il carattere di escape DENTRO LIKE/ILIKE. Un backslash lasciato
  // grezzo nel pattern viene consumato per spegnere il carattere successivo
  // e sparisce dal confronto — mentre nel dato memorizzato resta. Provato sul
  // catalogo vivo: `SELECT c ILIKE '%'||c||'%' FROM (VALUES
  // ('pz'||chr(92)||'0042')) v(c)` → `false`. Un codice con un backslash non
  // troverebbe più sé stesso: "libero" restituito su un codice OCCUPATO, in
  // silenzio. Si raddoppia quindi SOLO il backslash prima di incorniciare col
  // `%…%` — `%`/`_` restano intoccati, il ragionamento sopra su quei due resta
  // valido com'è.
  const chiaveEscapata = chiave.replace(/\\/g, '\\\\')
  const { data, error } = await svc
    .from('pazienti')
    .select('id, codice_paziente, nome_cognome, lavori(data_ingresso)')
    .eq('laboratorio_id', labId)
    .ilike('codice_paziente', `%${chiaveEscapata}%`)
    .order('data_ingresso', { referencedTable: 'lavori', ascending: false })
    .limit(1, { referencedTable: 'lavori' })
    .is('lavori.deleted_at', null)

  // G9 — mai il testo grezzo del DB al chiamante: un errore di lettura
  // degrada a "libero" invece di risalire. Chi chiama non riceve MAI un 500
  // per colpa di questa lettura ausiliaria: il caso peggiore è lo stesso
  // comportamento di oggi (nessun riconoscimento), non uno nuovo.
  // 🔴 CONTRATTO per ogni chiamante futuro: questa funzione può SOLO
  // rifiutare un'autorizzazione, mai concederla. "libero" qui non significa
  // "il codice è scrivibile" — l'arbitro vero resta l'indice unico a
  // database, che rifiuterà comunque un INSERT/UPDATE doppio. Un errore di
  // rete che facesse degradare questa lettura non deve mai essere letto
  // come un via libera silenzioso a saltare quel vincolo.
  if (error || !data) return { occupato: false }

  const candidati = data as unknown as CandidatoRiga[]
  const trovato = candidati.find(
    (p) => p.codice_paziente != null && chiaveNormalizzata(p.codice_paziente) === chiave
  )
  if (!trovato || trovato.codice_paziente == null) return { occupato: false }

  const alias = derivaAlias({
    codice_paziente: trovato.codice_paziente,
    nome_cognome: trovato.nome_cognome,
  })
  const nomeVisibile = alias ?? trovato.codice_paziente
  const dataUltimoLavoro = trovato.lavori?.[0]?.data_ingresso ?? null

  return {
    occupato: true,
    paziente: { id: trovato.id, nomeVisibile, dataUltimoLavoro },
  }
}
