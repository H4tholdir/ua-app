// La regola di scrittura di `pazienti.(nome, cognome)` — spec
// `docs/superpowers/specs/2026-07-27-nome-cognome-paziente-design.md` §5,
// «la tabella delle quattro combinazioni».
//
// PERCHÉ QUESTA FUNZIONE ESISTE, e perché è UNA sola: il trigger DB
// `sync_paziente_nome_cognome` (002_fase2_schema.sql:121-134) è dichiarato
// `BEFORE INSERT OR UPDATE` e compone `nome_cognome := upper(cognome) || ' '
// || upper(nome)` SOLO quando nome e cognome sono ENTRAMBI non-null. Da qui
// tre trappole, tutte silenziose (nessun test diventa rosso, nessun errore
// compare):
//
//   1. `nome: null` → il trigger non compone → `nome_cognome` viola il
//      NOT NULL → 500 → `crea-lavoro.ts` lo tratta come bloccante → NESSUN
//      lavoro creato.
//   2. cognome E nome entrambi `''` → `nome_cognome` diventa `' '` (uno
//      spazio). In `src/lib/consegna/precheck.ts:40-43` la catena `??` si
//      ferma su `''` (che NON è nullish) e non arriva mai a
//      `codice_paziente` → elemento 4 dell'Allegato XIII fallito →
//      CONSEGNA BLOCCATA; e `src/lib/pdf/generate-ddc.ts:93` stampa un
//      campo paziente vuoto in un documento firmato.
//   3. cognome = codice mentre il nome è pieno → `nome_cognome` diventa
//      `PZ-0042 GIUSEPPE`, che `derivaAlias` (parco-shared.ts:69-75) NON
//      annulla (non coincide col codice) → la targa scrive «Pz-0042
//      Giuseppe», col codice passato per titleCase contro la regola che lo
//      vuole sempre letterale.
//
// Dopo la tappa 1 gli scrittori di quelle due colonne sono TRE (il wizard,
// `POST /api/pazienti`, `PATCH /api/pazienti/[id]`): la regola vive qui una
// volta sola, e ognuno di loro la applica. Il difetto originale nasceva
// proprio da due pezzi di codice che componevano in modo diverso.

export type CoppiaNomePaziente = { cognome: string; nome: string }

/**
 * Risolve la coppia da scrivere su `pazienti.(cognome, nome)` a partire da
 * ciò che l'utente ha digitato, secondo la tabella §5.
 *
 * Il principio in una riga: **quando è piena una sola casella, ci si comporta
 * esattamente come la casella unica di oggi** — quel valore va nel cognome, il
 * nome resta `''`.
 *
 * Ritorna `null` SOLO nel caso degenere in cui non c'è nulla da scrivere
 * (nemmeno il codice): il chiamante DEVE rifiutare la scrittura invece di
 * lasciar passare una coppia vuota, che produrrebbe la trappola 2.
 * `null` è deliberatamente diverso da `{cognome:'', nome:''}`: quest'ultimo
 * non deve mai poter uscire da qui.
 *
 * ⚠️ PRECONDIZIONE DEL CHIAMANTE: `cognome` dev'essere già passato per
 * `cognomeEffettivo(cognomeDaDB, codice)` quando viene dal database o da un
 * client. Qui dentro la guardia NON si può fare: `{cognome:'X', nome:'Y',
 * codice:'X'}` è indistinguibile fra «X è il codice scritto dal wizard» (da
 * togliere) e «l'utente ha digitato X come cognome» (da tenere). Passando il
 * valore grezzo si riapre la trappola 3.
 */
export function risolviNomePaziente(input: {
  cognome?: string | null
  nome?: string | null
  codice?: string | null
}): CoppiaNomePaziente | null {
  const cognome = (input.cognome ?? '').trim()
  const nome = (input.nome ?? '').trim()
  const codice = (input.codice ?? '').trim()

  if (cognome) return { cognome, nome }
  // Intenzionale, non uno scambio: una casella sola si comporta come la
  // casella unica di ieri — il valore va nel cognome (spec §5, riga 3).
  if (nome) return { cognome: nome, nome: '' }
  if (codice) return { cognome: codice, nome: '' }
  return null
}

/**
 * Il cognome «vero», cioè quello da mostrare in un campo etichettato
 * «Cognome». I pazienti creati dal wizard senza nome hanno il CODICE dentro
 * `cognome` (è l'invariante 2): mostrarlo in un campo «Cognome» inviterebbe a
 * cancellarlo, e cancellarlo è esattamente la trappola 2.
 *
 * Gemella di `derivaAlias` (parco-shared.ts:69-75), che fa la stessa guardia
 * a valle su `nome_cognome`. Il confronto è case-insensitive perché il
 * trigger scrive in MAIUSCOLO.
 */
export function cognomeEffettivo(
  cognome: string | null | undefined,
  codice: string | null | undefined
): string {
  const c = (cognome ?? '').trim()
  if (!c) return ''
  const cod = (codice ?? '').trim()
  if (cod && c.toLowerCase() === cod.toLowerCase()) return ''
  return c
}
