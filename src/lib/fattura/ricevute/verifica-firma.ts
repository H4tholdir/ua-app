// Verifica della firma XAdES-BES sulle ricevute PEC del Sistema di Interscambio
// (SdI) — attualmente in modalità FALLBACK "quarantena-all".
//
// PERCHÉ il fallback (non implementazione reale)
// ------------------------------------------------
// Spike Task 6 (spec D-4): docs/superpowers/specs/2026-07-16-spike-xades-esito.md
// (§Sintesi, §3, §7). I messaggi SdI reali sono firmati con il transform XML-DSig
// `http://www.w3.org/2002/06/xmldsig-filter2` (XPath Filter 2.0, `Filter="subtract"`
// su `descendant::ds:Signature`). NÉ `xml-crypto` NÉ `xadesjs`/`xmldsigjs`
// implementano quel transform (verificato leggendo i sorgenti di entrambe: nessuna
// registra un canonicalization/transform algorithm per quell'URI). Un tentativo di
// patch custom (rimozione DOM del nodo Signature, stessa logica di
// enveloped-signature) NON riproduce il digest atteso sull'esempio ufficiale SdI
// (caso 9 del PoC, `scripts/tmp/spike-xades.ts`) — la vera semantica "subtract" di
// XPath Filter 2.0 opera su node-set, non su sottoalberi DOM, ed è un lavoro di
// canonicalizzazione specialistico fuori scope per uno spike timeboxed.
//
// Il gate del 15/07/2026 (§7 del doc esito) ha delegato la decisione a un panel di
// 3 advisor (security, architettura, backend): verdetto UNANIME 3/3 di conferma del
// fallback. Con il fallback attivo, questa funzione ritorna SEMPRE 'fallita': ogni
// ricevuta SdI resta in quarantena e le transizioni di stato avvengono SOLO via
// override manuale del titolare (mai un default a 'valida', mai un bypass). La
// pipeline di parsing (Task 7, parse-ricevuta-sdi.ts) e di matching non dipendono da
// questa funzione e procedono invariate.
//
// L'INTERFACCIA resta comunque quella del motore di verifica reale (async, ritorna
// 'valida' | 'fallita', accetta un trust anchor iniettabile) perché — come giudicato
// dal panel — è il punto di reversibilità: quando la verifica reale sarà disponibile,
// il motore sotto questa firma è sostituibile senza toccare la pipeline chiamante
// (parsing, matching, UI di quarantena/override).
//
// COSA serve per riattivare la verifica reale (backlog, §7 del doc esito):
//   1. Procurare 2-3 ricevute SdI reali e recenti + trust anchor di produzione
//      (certificato SdI/Sogei) con procedura di rotazione documentata (D-4) — la
//      fixture ufficiale attuale (tests/fixtures/ricevute-sdi/ufficiale-RC-v1.0.xml)
//      ha un certificato di test scaduto (2011-2014), non un trust anchor reale.
//   2. Riconfermare che SdI v1.8.1 (specifiche attuali) usi ancora xmldsig-filter2 —
//      la fixture disponibile è del 2011-2014.
//   3. Secondo spike dedicato (~1-2 gg): (a) valutare `xmlsec-wasm` in Node/Vercel
//      reale; (b) validare una patch filter2 contro `xmlsec1 --verify` CLI come
//      oracolo byte-per-byte. Se non converge: valutare un microservizio esterno
//      (EU-DSS / Apache Santuario).
//   4. Il meccanismo di pinning/fail-closed/anti-wrapping validato nello spike (§2
//      del doc esito: trust anchor mai da truststore di sistema, whole-document
//      Reference con URI="", esattamente una ds:Signature) resta valido e riusabile
//      per il motore reale — non va ripensato, solo collegato al transform corretto.

/**
 * Verifica la firma XAdES-BES di una ricevuta SdI.
 *
 * MODALITÀ FALLBACK: ritorna SEMPRE 'fallita' — vedi commento di modulo sopra per
 * il motivo (gap transform xmldsig-filter2, spike Task 6 + panel §7) e per cosa
 * serve per riattivare la verifica reale. Fail-closed per costruzione: nessun input,
 * per quanto valido/patologico, produce mai 'valida' né un'eccezione.
 *
 * @param xml - Buffer XML della ricevuta SdI. Non ispezionato nel fallback: la
 *   funzione ritorna 'fallita' prima di qualunque parsing/crypto, quindi qualsiasi
 *   input (incluso buffer vuoto, spazzatura, XML malformato o payload XXE) è
 *   gestito in modo uniforme e sicuro senza mai lanciare.
 * @param _trustAnchorPem - Trust anchor PEM iniettabile. Fa parte dell'interfaccia
 *   del motore di verifica reale (per i test/rotazione futura del certificato SdI
 *   pinnato) ma è INUTILIZZATO nel fallback — prefissato `_` per questo motivo.
 * @returns Sempre `Promise<'fallita'>` nel fallback attuale.
 */
export async function verificaFirmaRicevuta(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- fallback: nessun input è ispezionato (vedi commento di modulo sopra); `xml` mantiene il nome esatto dell'interfaccia pinnata dal brief, quindi non può essere prefissato con `_`.
  xml: Buffer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- già prefissato `_` per convenzione, ma il progetto non configura un argsIgnorePattern per `^_` quindi il warning va comunque silenziato esplicitamente.
  _trustAnchorPem?: string
): Promise<'valida' | 'fallita'> {
  return 'fallita'
}
