// src/lib/domain/prescrizione-costanti.ts
//
// CASA UNICA dei tre dizionari chiusi della prescrizione (ondata B, spec §3-§4).
// Modello: `categorie-foto.ts`, e per la stessa ragione.
//
// 🔴 La rete che tiene questi elenchi allineati ai vincoli che il DATABASE
//    esegue è `tests/unit/prescrizione-costanti-spia-migration.test.ts`, ed è
//    l'UNICA: su questo repo `tsc` non vede le query. I quattro fabbricanti del
//    client (`src/lib/supabase/{server-service,server-user,browser-anon,
//    middleware-client}.ts`) creano il client SENZA il generico `<Database>`,
//    quindi nessun tipo generato incontra mai una chiamata RPC — e i tipi
//    generati sarebbero comunque più larghi del dominio (`fonte_tipo: string`,
//    non l'unione dei quattro valori). Rilievo R27, 30/07/2026.
//    ➡️ Chi tocca uno di questi elenchi tocca la migration nello stesso
//       salvataggio, o la spia si accende.
//
// 🛑 NESSUNA COPIA LOCALE. Una quarta lista scritta a mano dentro una route
//    (`['foglio', …].includes(v)`) non la vedrebbe nessuno: né la spia, né
//    `tsc`. Sarebbe l'unico posto in cui il dizionario può divergere in
//    silenzio — e un dizionario divergente qui significa un 23514 crudo
//    (500 illeggibile) al posto di un 422 che dice cosa correggere.

// ── Le 4 forme della fonte (D202) ──────────────────────────────────────────
// Vincolo in banca dati, DUE volte: il CHECK di tabella
// (`20260804150306:30`, che RIFIUTA) e la guardia dentro
// `lavoro_prescrizione_allega_fonte` (`20260804152403:163`, che risponde
// `fonte_tipo_non_valido` invece di far esplodere il CHECK).
//
// ⚠️ `null` è un valore LEGITTIMO della colonna, e non è un buco: è la V7 —
//    la prescrizione data a voce o al telefono NON è una fonte, e resta «in
//    attesa di conferma scritta» col solo `fonte_riferimento` valorizzato.
export const FONTE_TIPI = ['foglio', 'email', 'modulo', 'piattaforma'] as const
export type FonteTipo = (typeof FONTE_TIPI)[number]

// ── I campi dello snapshot correggibili come typo (D212) ───────────────────
// Vincolo in banca dati, DUE volte, e le due si tengono insieme:
//  · `lavoro_prescrizione_correggi_typo` (`20260804152403:242`) — quale chiave
//    dello snapshot si può riscrivere;
//  · `lavoro_prescrizione_registra_divergenza` (`20260804211256:76`, M-T3-1
//    del 04/08/2026) — su quale campo si può registrare uno scostamento.
// Entrambe rispondono `campo_non_valido`.
//
// ⚠️ `tipo` è correggibile ma NON viene trascritto alla creazione: entra nello
//    snapshot solo alla conferma di consegna (D213), copiato da
//    `lavori.tipo_dispositivo`.
export const CAMPI_TYPO = ['elementi', 'colore', 'tipo'] as const
export type CampoTypo = (typeof CAMPI_TYPO)[number]

// ── I motivi di una divergenza prescritto/eseguito (V9, D212) ──────────────
// Vincolo in banca dati: `lavoro_prescrizione_registra_divergenza`
// (`20260804211256:80` — la funzione è stata RICREATA dal Task 5, quindi il
// corpo vivo NON è più in 20260804152403) → esito `motivo_non_valido`.
export const MOTIVI_DIVERGENZA = [
  'richiesta_dentista',
  'esigenza_tecnica',
  'materiale_non_disponibile',
  'altro',
] as const
export type MotivoDivergenza = (typeof MOTIVI_DIVERGENZA)[number]

const INSIEME_FONTE = new Set<string>(FONTE_TIPI)
const INSIEME_CAMPI = new Set<string>(CAMPI_TYPO)
const INSIEME_MOTIVI = new Set<string>(MOTIVI_DIVERGENZA)

/** `true` se il valore è una delle 4 forme della fonte. La usa la route per
 *  rispondere 422 invece di lasciar arrivare al database un valore che il
 *  CHECK respinge con un 23514 illeggibile.
 *
 *  🔑 Il controllo di TIPO non è pedanteria: dal corpo di una richiesta JSON
 *     arrivano numeri, `null`, array e oggetti. Un `FONTE_TIPI.includes(v as
 *     never)` accetterebbe `undefined` senza accorgersene. */
export function isFonteTipo(v: unknown): v is FonteTipo {
  return typeof v === 'string' && INSIEME_FONTE.has(v)
}

/** `true` se il valore è un campo dello snapshot correggibile. */
export function isCampoTypo(v: unknown): v is CampoTypo {
  return typeof v === 'string' && INSIEME_CAMPI.has(v)
}

/** `true` se il valore è un motivo di divergenza ammesso.
 *
 *  🔴 Per il CAMPO della divergenza si usa `isCampoTypo`. Fino al Task 5 la RPC
 *     `lavoro_prescrizione_registra_divergenza` NON validava `p_campo`
 *     (provato a banco, sonda S3: `'pippo'` e `NULL` rispondevano `ok`) e la
 *     route era l'UNICA guardia. Dal 04/08/2026 il buco è chiuso anche in
 *     banca dati (`20260804211256`, esito `campo_non_valido`, provato in
 *     transazione annullata) — ma la route resta la PRIMA, ed è quella che
 *     risponde 422 con un messaggio leggibile invece di un esito da mappare. */
export function isMotivoDivergenza(v: unknown): v is MotivoDivergenza {
  return typeof v === 'string' && INSIEME_MOTIVI.has(v)
}
