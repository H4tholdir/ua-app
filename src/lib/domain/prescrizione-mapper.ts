// src/lib/domain/prescrizione-mapper.ts
//
// normalizzaPrescrizione — la lettura dell'embed `lavori_prescrizioni` per
// GET /api/lavori/[id] (ondata B, Task 6). Funzione PURA, sul modello di
// `risolviColore` (colore-dente.ts): vive fuori dalla route così da essere
// testabile senza montare la catena Supabase, e riusabile da chi altro
// leggerà lo stesso embed (T7 — la scheda).
//
// 🔴 LA FORMA DELL'EMBED NON È SCONTATA, ed è il motivo per cui questa
// funzione esiste invece di un accesso diretto a `lavoro.prescrizione`.
// `lavori_prescrizioni` porta `UNIQUE(lavoro_id)` (20260804150306:48) — una
// riga per lavoro, sempre — ma la FK usata per l'embed
// (`prescrizione:lavori_prescrizioni(*)`) è COMPOSITA
// (lavoro_id, laboratorio_id) → lavori(id, laboratorio_id)
// (20260804150306:51-52), e lo UNIQUE non copre la coppia esatta: i tipi
// generati marcano perciò la relazione `isOneToOne: false`
// (database.types.ts:3421-3426), quindi l'ATTESA è che PostgREST restituisca
// l'embed come ARRAY (0 o 1 elementi), non un oggetto singolo — stesso caso
// già gestito, con la STESSA riserva, per `ddc:dichiarazioni_conformita(*)`
// in `lavori/[id]/page.tsx:51-55`: «mai verificato empiricamente». Qui non è
// stato verificato nemmeno a banco (R-P1: non provato, quindi non marcato
// come fatto) — per questo la funzione normalizza ENTRAMBE le forme, non
// solo quella attesa: se PostgREST sorprendesse restituendo un oggetto
// singolo, il risultato resta corretto lo stesso. Questa funzione normalizza
// QUALUNQUE forma arrivi (array, oggetto, null, undefined, o un valore del
// tutto inatteso) in un `LavoroPrescrizione | undefined` — `undefined`
// quando il lavoro non ha ancora una trascrizione, MAI un oggetto vuoto (V2:
// l'assenza è un'informazione, non un default silenzioso).
//
// 🔑 GUARDIE RUNTIME SU `fonte_tipo`, `contenuto` E `divergenze` — SIMMETRICHE
// (fix dalla review del Task 6, prima che T7 costruisca una UI che si fida
// ciecamente di `Divergenza.campo`). I tipi generati dichiarano tutti e tre
// più larghi del dominio (R27, prescrizione-costanti.ts:6-13: i client
// Supabase di questo repo non passano il generico <Database>, quindi
// `fonte_tipo`/`contenuto`/`divergenze` arrivano come `string | null` /
// `Json` / `Json` — mai la forma stretta). Un cast diretto su uno solo dei
// tre e non sugli altri due sarebbe stato un altro «elenco che sembra
// completo e non lo è» (CLAUDE.md §6).
//
// Le tre guardie NON sono identiche, perché il ripiego legittimo non è lo
// stesso ovunque:
// - `fonte_tipo` fuori dalle 4 forme di D202 (impossibile per il CHECK di
//   tabella, 20260804150306:31 — quindi un IMPOSSIBILE DIFESO, non un caso
//   atteso a monte) ripiega su `null`, perché `null` è GIÀ una forma
//   legittima del dominio (V7, "in attesa di conferma scritta"): non si perde
//   informazione vera, si perde solo un valore che non doveva esistere.
// - `campo`/`motivo` di una `divergenze[]` NON hanno un ripiego legittimo: un
//   valore fuori dizionario lì (dati legacy — prima della migration
//   20260804211256 `lavoro_prescrizione_registra_divergenza` non validava
//   `p_campo`/`p_motivo`, sonda S3 del Task 5: `'pippo'` e perfino `NULL`
//   accettati con esito `ok`) è un FATTO REALMENTE ACCADUTO — qualcuno ha
//   registrato una divergenza — che scartarlo perderebbe. Si tiene, marcato
//   onestamente con `ValoreDizionario<T>` (`@/types/domain`): la forma valida
//   `T` quando conforme, altrimenti `{ noto: false, valore: <testo grezzo> }`.
//   🛑 PERCHÉ NON `T | string` (rifiutato in review): niente OBBLIGA la UI a
//   gestire il ramo `{ noto: false }` più di quanto obblighi con `string` —
//   uno switch incompleto compila comunque in entrambi i casi. La differenza
//   è cosa succede quando la UI SCRIVE l'esaustività esplicitamente (un
//   `default: assertNever(valore)`, pattern già in uso altrove nel dominio):
//   con `T | string` quel `default` è IRRAGGIUNGIBILE per il compilatore
//   solo in apparenza (uno `string` qualunque soddisfa il tipo, quindi
//   `assertNever` non scatta mai a compile-time sul serio); con
//   `ValoreDizionario`, il ramo `{ noto: false, valore: string }` è un
//   membro dell'unione REALE — un `default` che lo dimentica produce un
//   errore di compilazione con nome, non un buco silenzioso. `typeof valore
//   === 'string'` è la guardia con cui la UI separa i due rami.
// - `utente_id` non ha un dizionario chiuso, ma HA un ripiego onesto:
//   `null`, esattamente come per `fonte_tipo`. La RPC che scrive le
//   divergenze non ha un CHECK su `p_utente` (a differenza di
//   `lavori_prescrizioni_conferma_ck`, 20260804152403:354-356) — un valore
//   mancante è quindi un'anomalia (mai prodotta dall'unico chiamante
//   applicativo oggi) ma NON un motivo per perdere l'intera voce: si marca
//   con una spia e si legge come `null` (fix da review — la prima stesura
//   scartava la voce qui, perdendo una divergenza realmente registrata
//   senza che nessun dizionario lo giustificasse).
// - `registrata_at` non ha un ripiego: nessun chiamante lo può omettere
//   (`now()` lato RPC, non un parametro), quindi la sua assenza non è
//   un'anomalia isolata, è la riga INTERA a non essere strutturalmente una
//   divergenza — l'UNICA condizione per cui una voce si scarta.
// - `nota` è nullable per schema E documentata come facoltativa dall'unico
//   chiamante: `null`/assente è già legittimo (nessuna spia); un tipo
//   diverso da stringa o null è l'unico caso che avvisa, ripiegando su
//   `null` (stesso principio di `fonte_tipo`: non c'è informazione persa che
//   valga la pena portare a valle, «nota» non ha un dizionario e un valore
//   malformato non è un fatto, è rumore).
// - `contenuto` è normalizzato CHIAVE PER CHIAVE: `elementi` dev'essere un
//   array di numeri, `colore`/`tipo` devono essere stringhe. Una chiave
//   presente ma della forma sbagliata si scarta (NON si tiene onesta come
//   campo/motivo): a differenza di una divergenza registrata, un valore di
//   `contenuto` malformato non è «un fatto avvenuto in una forma
//   inattesa» — è rumore che, se tenuto, si spaccerebbe per una trascrizione
//   vera (V2: chiave presente = trascritta). Scartarlo equivale a trattarlo
//   come non trascritto, la stessa semantica già in vigore per la chiave
//   assente.

import type { Divergenza, LavoroPrescrizione, PrescrizioneContenuto, ValoreDizionario } from '@/types/domain'
import { isCampoTypo, isFonteTipo, isMotivoDivergenza } from './prescrizione-costanti'

/** Rappresentazione testuale onesta di un valore grezzo fuori dizionario,
 *  per `ValoreDizionario.valore` — mai un cast, sempre qualcosa di leggibile
 *  in un log o in una UI di debug. */
function comeTesto(v: unknown): string {
  if (typeof v === 'string') return v
  try {
    const serializzato = JSON.stringify(v)
    if (serializzato !== undefined) return serializzato
  } catch {
    // valore non serializzabile (es. riferimento circolare): si ripiega sotto.
  }
  return String(v)
}

/** Legge un valore di un dizionario chiuso: la forma valida se `isValido` la
 *  riconosce, altrimenti un `{ noto: false, valore }` che conserva il testo
 *  grezzo — mai scartato, mai un cast cieco. */
function leggiValoreDizionario<T extends string>(
  raw: unknown,
  isValido: (v: unknown) => v is T,
  percorso: string
): ValoreDizionario<T> {
  if (isValido(raw)) return raw
  console.warn(
    `[normalizzaPrescrizione] ${percorso} fuori dal dizionario chiuso — valore grezzo conservato:`,
    raw
  )
  return { noto: false, valore: comeTesto(raw) }
}

/** `nota` è nullable per schema E documentata come FACOLTATIVA dall'unico
 *  chiamante (`divergenza/route.ts:77-88`, «nota: facoltativa»): `null`/assente
 *  sono già legittimi, nessuna spia. Un tipo diverso da stringa o null avvisa
 *  e ripiega su `null` — non c'è un dizionario da cui `nota` possa deviare,
 *  quindi non c'è un ripiegamento «onesto» diverso da null che valga la pena
 *  portare a valle. */
function leggiNota(raw: unknown, percorso: string): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'string') return raw
  console.warn(`[normalizzaPrescrizione] ${percorso} non è una stringa né null — letta come null:`, raw)
  return null
}

/** `utente_id` — a differenza di `nota` — NON è documentato come opzionale da
 *  nessun chiamante: `lavoro_prescrizione_registra_divergenza` non ha un
 *  CHECK su `p_utente` (a differenza di `lavori_prescrizioni_conferma_ck`,
 *  che rende una conferma anonima impossibile per costruzione —
 *  20260804152403:354-356), ma l'UNICO chiamante applicativo oggi
 *  (`divergenza/route.ts:103`) passa sempre `context.userId`, mai null.
 *  Quindi qui un valore mancante È un'anomalia — sempre marcata con una
 *  spia, a differenza di `nota` — ma ripiega su `null` invece di scartare
 *  la voce: `null` è comunque la rappresentazione onesta di «attore
 *  assente», non richiede un dizionario da cui deviare (fix da review: la
 *  prima stesura scartava l'intera voce qui, perdendo una divergenza
 *  realmente registrata senza una ragione strutturale — la stessa classe di
 *  difetto silenzioso che la guardia su campo/motivo doveva chiudere). */
function leggiUtenteId(raw: unknown, percorso: string): string | null {
  if (typeof raw === 'string') return raw
  console.warn(`[normalizzaPrescrizione] ${percorso} assente o non valido — letto come null:`, raw)
  return null
}

/** Normalizza `divergenze` voce per voce. Una voce che non è un oggetto, o
 *  priva di un `registrata_at` valido, si scarta (nessun chiamante lo può
 *  omettere: la sua assenza è corruzione strutturale della riga, non
 *  un'anomalia isolata). `campo`/`motivo`/`utente_id` invece non si scartano
 *  mai: si marcano onestamente (vedi `leggiValoreDizionario`/`leggiUtenteId`). */
function normalizzaDivergenze(raw: unknown): Divergenza[] {
  if (!Array.isArray(raw)) {
    if (raw !== null && raw !== undefined) {
      console.warn('[normalizzaPrescrizione] divergenze non è un array — lette come []:', raw)
    }
    return []
  }

  const risultato: Divergenza[] = []

  raw.forEach((voce, indice) => {
    if (voce === null || typeof voce !== 'object' || Array.isArray(voce)) {
      console.warn(`[normalizzaPrescrizione] divergenze[${indice}] non è un oggetto — voce scartata:`, voce)
      return
    }

    const v = voce as Record<string, unknown>

    // `registrata_at` è `now()` lato RPC — nessun chiamante lo passa, quindi
    // la sua assenza non è un'anomalia isolata: è la riga INTERA a non essere
    // strutturalmente una divergenza scritta da quella RPC. Si scarta (unica
    // chiave per cui la voce viene buttata).
    const registrata_at = typeof v.registrata_at === 'string' ? v.registrata_at : null
    if (registrata_at === null) {
      console.warn(
        `[normalizzaPrescrizione] divergenze[${indice}] senza registrata_at valido — voce scartata:`,
        voce
      )
      return
    }

    risultato.push({
      campo: leggiValoreDizionario(v.campo, isCampoTypo, `divergenze[${indice}].campo`),
      motivo: leggiValoreDizionario(v.motivo, isMotivoDivergenza, `divergenze[${indice}].motivo`),
      nota: leggiNota(v.nota, `divergenze[${indice}].nota`),
      utente_id: leggiUtenteId(v.utente_id, `divergenze[${indice}].utente_id`),
      registrata_at,
    })
  })

  return risultato
}

/** Normalizza `contenuto` chiave per chiave: `elementi` dev'essere un array
 *  di numeri, `colore`/`tipo` devono essere stringhe. Una chiave presente ma
 *  della forma sbagliata si SCARTA (non si tiene onesta come campo/motivo di
 *  una divergenza): un `contenuto` malformato non è un fatto avvenuto in una
 *  forma inattesa, è rumore — tenerlo si spaccerebbe per una trascrizione
 *  vera (V2). Scartare la chiave equivale a trattarla come non trascritta.
 *
 *  🔑 ESPORTATA l'08/08/2026 (Task C dell'atto unico), e per una ragione sola:
 *  la correzione delle caratteristiche prescritte deve sapere quali sotto-chiavi
 *  esistono — `elementi`, `colore`, `tipo` — e quell'elenco NON si ricopia. Una
 *  seconda copia diverge dalla prima il giorno in cui una quarta sotto-chiave
 *  nasce, e diverge **in silenzio**. Si chiama questa. */
export function normalizzaContenuto(raw: unknown): PrescrizioneContenuto {
  if (raw === null || raw === undefined) {
    return {}
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn('[normalizzaPrescrizione] contenuto non è un oggetto — letto come {}:', raw)
    return {}
  }

  const c = raw as Record<string, unknown>
  const risultato: PrescrizioneContenuto = {}

  if ('elementi' in c) {
    if (Array.isArray(c.elementi) && c.elementi.every((el) => typeof el === 'number')) {
      risultato.elementi = c.elementi as number[]
    } else {
      console.warn('[normalizzaPrescrizione] contenuto.elementi non è un array di numeri — scartato:', c.elementi)
    }
  }

  if ('colore' in c) {
    if (typeof c.colore === 'string') {
      risultato.colore = c.colore
    } else {
      console.warn('[normalizzaPrescrizione] contenuto.colore non è una stringa — scartato:', c.colore)
    }
  }

  if ('tipo' in c) {
    if (typeof c.tipo === 'string') {
      risultato.tipo = c.tipo
    } else {
      console.warn('[normalizzaPrescrizione] contenuto.tipo non è una stringa — scartato:', c.tipo)
    }
  }

  return risultato
}

export function normalizzaPrescrizione(raw: unknown): LavoroPrescrizione | undefined {
  const riga = Array.isArray(raw) ? raw[0] : raw

  if (riga === null || riga === undefined || typeof riga !== 'object') {
    return undefined
  }

  const r = riga as Record<string, unknown>

  let fonte_tipo: LavoroPrescrizione['fonte_tipo'] = null
  const fonteGrezza = r.fonte_tipo
  if (fonteGrezza !== null && fonteGrezza !== undefined) {
    if (isFonteTipo(fonteGrezza)) {
      fonte_tipo = fonteGrezza
    } else {
      console.warn(
        '[normalizzaPrescrizione] fonte_tipo fuori dal dizionario chiuso (D202) — letto come null:',
        fonteGrezza
      )
    }
  }

  return {
    id: r.id as string,
    laboratorio_id: r.laboratorio_id as string,
    lavoro_id: r.lavoro_id as string,
    contenuto: normalizzaContenuto(r.contenuto),
    divergenze: normalizzaDivergenze(r.divergenze),
    fonte_tipo,
    fonte_immagine_id: (r.fonte_immagine_id as string | null) ?? null,
    fonte_riferimento: (r.fonte_riferimento as string | null) ?? null,
    numero_prescrizione: (r.numero_prescrizione as string | null) ?? null,
    confermata_da: (r.confermata_da as string | null) ?? null,
    confermata_at: (r.confermata_at as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }
}
