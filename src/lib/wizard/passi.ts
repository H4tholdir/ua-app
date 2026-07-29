// DS v3 §8 (Ondata (b), Task 4) — il contratto della macchina dei passi del
// wizard «Nuovo lavoro» adattivo. Spec: docs/superpowers/specs/2026-07-28-
// wizard-ondata-b-schermate-design.md §8 (righe 308-322).
//
// Modulo PURO: nessun `server-only`, nessuna rete, nessuna banca dati —
// importabile sia dal server (RSC) sia dal client (WizardNuovoLavoro.tsx e
// i suoi passi). Non conosce il tipo di lavoro né come si calcola la
// sequenza EFFETTIVA di un lavoro: quella la scrive T3
// (`src/lib/wizard/sequenza-passi.ts`, `sequenzaPassi(tipo)`), che IMPORTA
// questo contratto. Ogni funzione qui sotto lavora SEMPRE sulla sequenza che
// il chiamante passa come argomento, mai su una globale.
//
// Le tre leggi del contratto (brief T4 §2):
//  1. Il passo corrente si identifica per NOME, mai per indice. Motivo
//     scritto e da rispettare: la bozza salvata del wizard (persistenza.ts,
//     spec §7, `v:2`) sopravvive più a lungo di un rilascio. Se un flag di
//     tipo (T2) cambiasse nel frattempo e una bozza venisse riaperta per
//     indice, riaprirebbe **sul passo sbagliato coi dati giusti** — nessun
//     errore, nessun test rosso. Ecco perché ogni funzione qui sotto prende
//     un `NomePasso`, mai un numero.
//  2. Il rendering è per nome: chi disegna chiede «quale passo è questo?»
//     confrontando `NomePasso` con una stringa, mai contando un indice —
//     nessuna funzione qui sotto espone o richiede un indice.
//  3. La ✕ di uscita (D21, riformulata per la sequenza variabile — non più
//     «dal passo 2» ma «quando il passo NON è il primo DELLA SEQUENZA»,
//     perché con la sequenza variabile "il passo 2" non vuol dire più
//     niente): vedi `mostraUscita` sotto.
//
// «Fatto» NON è un passo di questa sequenza: è la conclusione — accertato
// (brief T4 §3.1) leggendo `WizardNuovoLavoro.tsx`. Quando `fatto` è
// valorizzato, `CorpoWizard` ritorna `<FrameFatto>` bypassando per intero
// testata (back + `ProgressDots`) e `RenderPasso` (righe 438-452);
// `RenderPasso` non conosce un ramo "Fatto", solo `passo === 1 | 2 | 3`
// (righe 510-544). Se «Fatto» fosse un passo di `SEQUENZA_CANONICA`, la ✕
// comparirebbe anche lì (è sempre "non il primo") e il contratto direbbe che
// si può "tornare indietro" dentro la conclusione — falso: `FrameFatto` non
// ha una testata, non riceve `vaIndietro`.

/** I nomi dei passi del wizard adattivo (spec §8). */
export type NomePasso = 'dentista' | 'tipo' | 'paziente' | 'denti' | 'colore' | 'foto' | 'cassetta'

/**
 * L'ordine canonico completo: l'ordine in cui i passi compaiono QUANDO CI
 * SONO (spec §8 — dentista → tipo → paziente → [denti] → [colore] → foto →
 * [cassetta]). NON è "la sequenza di un lavoro": quella la calcola T3
 * filtrando questo elenco sui flag del tipo (T2). Le funzioni sotto non
 * leggono mai questa costante da sole — lavorano sulla sequenza che il
 * chiamante passa come argomento (può essere un sottoinsieme, in un altro
 * ordine, o del tutto sintetica nei test).
 */
export const SEQUENZA_CANONICA: readonly NomePasso[] = [
  'dentista',
  'tipo',
  'paziente',
  'denti',
  'colore',
  'foto',
  'cassetta',
]

/**
 * `nome` appartiene alla sequenza data? Base di tutte le altre funzioni:
 * ogni altra funzione qui sotto instrada prima da qui (o da un confronto
 * sullo stesso `indexOf`), così il caso "nome fuori sequenza" — inclusa una
 * stringa fuori dall'union `NomePasso` arrivata a runtime — è un unico
 * comportamento dichiarato, non ripetuto in cinque varianti indipendenti.
 */
export function isPassoNellaSequenza(nome: NomePasso, sequenza: readonly NomePasso[]): boolean {
  return sequenza.includes(nome)
}

/**
 * È il primo passo DELLA SEQUENZA DATA (non della sequenza canonica)?
 * Casi limite dichiarati: `nome` non presente in `sequenza` → `false` (non
 * può essere "il primo" di una sequenza a cui non appartiene); `sequenza`
 * vuota → `false` per costruzione, coperto dallo stesso ramo.
 */
export function isPrimoPasso(nome: NomePasso, sequenza: readonly NomePasso[]): boolean {
  if (!isPassoNellaSequenza(nome, sequenza)) return false
  return sequenza[0] === nome
}

/**
 * È l'ultimo passo DELLA SEQUENZA DATA? Stessi casi limite di `isPrimoPasso`.
 * Su una sequenza a un solo elemento, quell'elemento è primo E ultimo
 * insieme — entrambe le funzioni tornano `true` per lo stesso nome.
 */
export function isUltimoPasso(nome: NomePasso, sequenza: readonly NomePasso[]): boolean {
  if (!isPassoNellaSequenza(nome, sequenza)) return false
  return sequenza[sequenza.length - 1] === nome
}

/**
 * Il passo prima di `nome` nella sequenza data, o `null` se `nome` è il
 * primo, se `nome` non appartiene a `sequenza`, o se `sequenza` è vuota.
 * Scritta con un confronto ESPLICITO sull'indice (`indice <= 0` copre sia
 * "non presente" `-1` sia "già il primo" `0` con lo stesso significato:
 * "nessun precedente") — mai un `indexOf` nudo lasciato a cadere per
 * coincidenza in un ramo sbagliato.
 */
export function passoPrecedente(nome: NomePasso, sequenza: readonly NomePasso[]): NomePasso | null {
  const indice = sequenza.indexOf(nome)
  if (indice <= 0) return null
  return sequenza[indice - 1]
}

/**
 * Il passo dopo `nome` nella sequenza data, o `null` se `nome` è l'ultimo,
 * se `nome` non appartiene a `sequenza`, o se `sequenza` è vuota.
 */
export function passoSuccessivo(nome: NomePasso, sequenza: readonly NomePasso[]): NomePasso | null {
  const indice = sequenza.indexOf(nome)
  if (indice === -1 || indice === sequenza.length - 1) return null
  return sequenza[indice + 1]
}

/**
 * La ✕ di uscita (D21 riformulata, brief T4 §2.3): compare quando `nome` NON
 * è il primo passo DELLA SEQUENZA data. Non più «dal passo 2» — con la
 * sequenza variabile "il passo 2" non vuol dire più niente: può essere
 * "tipo" (sequenza completa) o "foto" (sequenza senza denti/colore).
 *
 * Caso limite dichiarato, come SCELTA e non come coincidenza aritmetica:
 * `nome` fuori sequenza (bozza/tipo desincronizzati, l'esatto scenario della
 * Legge 1 sopra) → `true`, la ✕ COMPARE. Fra i due possibili difetti — la ✕
 * assente quando servirebbe, o presente quando non servirebbe — il primo
 * intrappola l'odontotecnico dentro un wizard che non sa più dove sia;
 * il secondo gli lascia comunque una via d'uscita visibile. Un nome fuori
 * sequenza è già un bug del chiamante: questa funzione non lo nasconde
 * dietro un controllo mancante, fallisce "aperta" verso l'uscita.
 * `sequenza` vuota → stesso ramo, stesso risultato `true` (nessun nome può
 * essere "il primo" di una sequenza vuota, quindi fallisce aperta anche qui).
 */
export function mostraUscita(nome: NomePasso, sequenza: readonly NomePasso[]): boolean {
  return !isPrimoPasso(nome, sequenza)
}
