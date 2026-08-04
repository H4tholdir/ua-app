// src/lib/lavori/colore-riga-scheda.ts
//
// T7 (ondata B ③) — gli STATI della riga «Colore» della scheda lavoro.
// Funzione PURA, fuori dal componente sul modello di `stato-pill.ts` e
// `urgenza.ts`: la riga ha CINQUE esiti possibili e ognuno ha una ragione
// diversa — provarli montando la scheda intera vorrebbe dire non provarli.
//
// 🔑 IL VALORE VIVO NON SI RICALCOLA QUI. Arriva da `idrataColoreScheda`
//    (`@/lib/domain/colore-dente`), che è l'UNICA casa della precedenza
//    «riga di dente → default di caso». Due letture divergenti dello stesso
//    fatto sono esattamente il difetto che quel modulo esiste per impedire —
//    già pagato una volta con `numero_cassetta`.
//    ⚠️ Quello che qui si deriva IN PIÙ è soltanto DA DOVE viene il colore
//    (`daRiga`), che `idrataColoreScheda` non restituisce. Si usa lo STESSO
//    predicato che usa lei per scegliere la riga («coppia COMPLETA: scala e
//    codice»), non uno somigliante: se quel predicato cambiasse, questo va
//    cambiato con lui — il test gemello in
//    `tests/unit/colore-riga-scheda.test.ts` fissa l'accoppiamento.
//
// 🔴 PERCHÉ `daRiga` DECIDE LA SOLA LETTURA (limite dichiarato, riferito nel
//    referto di T7). L'unica via di scrittura del colore vivo che esiste oggi
//    è `PATCH /api/lavori/[id]` con la coppia `colore_scala`/`colore_codice`,
//    e quella scrive il DEFAULT DI CASO. Se il colore vivo lo porta una riga
//    di `lavori_denti`, la precedenza riga→caso continuerebbe a mostrare la
//    riga: la scrittura sarebbe «una seconda verità che nessuno vede» (parole
//    del commento della rotta stessa, `src/app/api/lavori/[id]/route.ts`).
//    Quindi in quel caso la riga NON offre il tocco, invece di offrire un
//    gesto che non può atterrare — stesso principio di `eliminabile` nella
//    scheda: «una voce spenta invita comunque». La via per quei lavori resta
//    la scheda clinica (`?tab=clinica` → `PUT /api/lavori/[id]/denti`).
//
// 🛑 IL CONFRONTO trascritto↔vivo NORMALIZZA SOLO PER DECIDERE, mai per
//    salvare. Il trascritto è testo COME DIGITATO (D210: mai trim, mai
//    uppercase), il colore vivo è un codice di catalogo normalizzato dal
//    server (`risolviColoreCaso` fa `trim().toUpperCase()`): un confronto
//    stretto direbbe che «a3 » e «A3» sono uno scostamento, e il gesto D212
//    si aprirebbe sul caso NORMALE invece che sull'eccezione. Si applica la
//    stessa regola che il wizard usa per derivare il vivo dal digitato
//    (`crea-lavoro.ts`: `colore.trim().toUpperCase()`) — e NIENTE di più:
//    piegare la virgola sul punto è una decisione da panel, non da qui, e
//    farlo di nascosto lascerebbe la virgola nella trascrizione senza che
//    nessuno l'abbia mai chiesto.

import type { Divergenza, LavoroPrescrizione } from '@/types/domain'
import { idrataColoreScheda, type DefaultCaso, type RigaColore } from '@/lib/domain/colore-dente'

/** I cinque esiti della riga. `assente` non compare qui: è il `null` di ritorno. */
export type StatoRigaColore =
  /** (a) Il colore viene dalla prescrizione ed è quello che il lavoro porta. */
  | 'trascritto'
  /** (b) Il colore l'ha scelto il laboratorio: niente da trascrivere (V2). */
  | 'laboratorio'
  /** (c) Uno scostamento REGISTRATO: prescritto e realizzato convivono. */
  | 'divergente'
  /** (e) Vivo e trascritto differiscono e NESSUNO l'ha dichiarato. */
  | 'scostato'

export type RigaColoreScheda = {
  stato: StatoRigaColore
  /** Il valore grande della riga (`—` se una divergenza c'è ma il vivo manca). */
  valore: string
  /** Sottotitolo 14/500 `--muted` sotto il valore (§5.10 `sub`). */
  sub?: string
  /** Pastiglia di provenienza (§5.10, emendamento 04/08/2026) — SOLO dove la
   *  provenienza esiste davvero, cioè sullo stato (a). */
  pastiglia?: { testo: string; tono: 'green' }
  /** La riga apre il foglio di correzione? (v. il blocco 🔴 in testa al file) */
  modificabile: boolean
  /** Il colore vivo lo porta una riga di dente, non il default di caso. */
  daRiga: boolean
  /** `contenuto.colore` dello snapshot, se trascritto: è il termine di
   *  paragone del gesto D212 e il «prima» del suo prima→dopo. */
  trascritto?: string
}

export const PASTIGLIA_PRESCRIZIONE = { testo: '✓ dalla prescrizione', tono: 'green' } as const
const SUB_LABORATORIO = 'scelto dal laboratorio'
/** Nessun colore vivo registrato: si dichiara il vuoto, non lo si nasconde. */
const VALORE_ASSENTE = '—'

/**
 * Trascritto e vivo sono lo stesso colore? Normalizzazione MINIMA e solo per
 * decidere (v. il blocco 🛑 in testa al file): `trim().toUpperCase()`, la
 * stessa che il wizard applica per derivare il codice di catalogo dal testo
 * digitato. La virgola NON si piega sul punto: `A3,5` e `A3.5` restano due
 * digitazioni diverse, e la domanda del gesto D212 si fa.
 */
export function uguagliaColore(a: string, b: string): boolean {
  return a.trim().toUpperCase() === b.trim().toUpperCase()
}

/** `true` se la divergenza è registrata SUL COLORE. Un `campo` fuori dal
 *  dizionario arriva come `{ noto: false, valore }` (`ValoreDizionario`, Task
 *  6) e non è mai `=== 'colore'`: una riga legacy col testo grezzo «colore»
 *  NON si spaccia per una divergenza vera — nessun cast, nessun dubbio. */
function eSulColore(d: Divergenza): boolean {
  return d.campo === 'colore'
}

/** Il colore vivo lo porta una riga di dente? STESSO PREDICATO di
 *  `idrataColoreScheda` («coppia completa»): se una riga ce l'ha, è lei che
 *  quella funzione sceglie, quindi `risolviColore` risponde `da: 'dente'`. */
function coloreDaUnaRiga(denti: readonly RigaColore[] | null | undefined): boolean {
  return (denti ?? []).some((r) => r.scala !== null && r.codice !== null)
}

/**
 * Gli stati della riga «Colore» della scheda (vincolo 0B-5).
 *
 * Ritorna `null` quando NON c'è colore da nessuna parte — né vivo né
 * trascritto: la riga non compare affatto, invece di comparire vuota.
 */
export function derivaRigaColore(input: {
  denti: readonly RigaColore[] | null | undefined
  caso: DefaultCaso
  prescrizione: LavoroPrescrizione | undefined
  congelata: boolean
}): RigaColoreScheda | null {
  const { denti, caso, prescrizione, congelata } = input

  const vivo = idrataColoreScheda(denti, caso).colore_dente
  const trascritto = prescrizione?.contenuto.colore
  const daRiga = coloreDaUnaRiga(denti)

  // (d) — niente da nessuna parte: nessuna riga.
  if (vivo === null && trascritto === undefined) return null

  // 🔴 Il tocco si offre solo dove può atterrare (v. il blocco in testa).
  const modificabile = !congelata && !daRiga
  const comune = { modificabile, daRiga, trascritto }

  // (b) — il colore c'è ma non è trascritto: è una scelta del laboratorio, e
  // si DICE (l'assenza di pastiglia da sola non basta — riserva 5 del panel).
  if (trascritto === undefined) {
    return { ...comune, stato: 'laboratorio', valore: vivo as string, sub: SUB_LABORATORIO }
  }

  // (c) — uno scostamento registrato: la scheda mostra prescritto E
  // realizzato, come la via «lo stiamo cambiando noi» di D212 promette.
  // 🔑 Si guarda PRIMA dell'uguaglianza: un registro non si cancella perché
  //    più tardi qualcuno è tornato sul valore prescritto — il fatto è
  //    avvenuto, e la pastiglia verde su un lavoro con una divergenza a
  //    registro sarebbe una provenienza che la riga non può garantire.
  if ((prescrizione?.divergenze ?? []).some(eSulColore)) {
    return {
      ...comune,
      stato: 'divergente',
      valore: vivo ?? VALORE_ASSENTE,
      sub: `prescritto: ${trascritto}`,
    }
  }

  // (a) — trascritto, e il lavoro lo porta com'è. Il colore vivo può mancare
  // (un codice fuori catalogo si perde alla creazione, `risolviColoreCaso`):
  // la trascrizione resta comunque il dato vero, e si mostra lei.
  if (vivo === null || uguagliaColore(vivo, trascritto)) {
    return {
      ...comune,
      stato: 'trascritto',
      valore: vivo ?? trascritto,
      pastiglia: PASTIGLIA_PRESCRIZIONE,
    }
  }

  // (e) — vivo e trascritto differiscono e NESSUNO l'ha dichiarato. Non è
  // uno stato del brief, ma è RAGGIUNGIBILE oggi: la scheda clinica
  // (`?tab=clinica`) cambia il colore senza passare per il gesto D212. Qui la
  // pastiglia verde asserirebbe una provenienza che il dato non ha più: si
  // mostrano i due valori e basta, senza inventare una divergenza che nessuno
  // ha registrato.
  return { ...comune, stato: 'scostato', valore: vivo, sub: `prescritto: ${trascritto}` }
}
