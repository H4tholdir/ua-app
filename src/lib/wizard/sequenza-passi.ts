// Ondata (b), Task 3 (brief T3) — deriva dai flag di T2 (`tipi-lavoro.ts`)
// quali passi del contratto T4 (`wizard/passi.ts`) compaiono per un dato
// tipo di lavoro, e calcola cosa si perde quando l'utente torna indietro e
// cambia una risposta a monte (D17, verbale
// docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md riga 60).
//
// Modulo PURO come `wizard/passi.ts`: nessuna interfaccia, nessun tocco al
// wizard esistente, nessun tocco alla banca dati.
//
// `StatoWizard` (WizardNuovoLavoro.tsx) oggi non ha ancora la forma finale
// che gli darà quest'ondata (porta ancora `passo: 1|2|3` e i campi vecchi
// alias/elemento/colore) — è compito di altri task (T9, T14, T21), non di
// questo. Per questo `cosaSiPerde` NON importa `StatoWizard`: dichiara qui
// sotto (`StatoMinimoPerdita`) il tipo minimo di cui ha davvero bisogno.
// Quando `StatoWizard` crescerà con `cognome`/`nome`/`pazienteIdScelto`/
// `denti`/`colori`/`cassettaId` (nomi già dati dal piano, T3 §2.3 —
// `denti`→`denti`, `colore`→`colori`, `paziente`→`pazienteIdScelto`, e la
// dipendenza del passo paziente da `cliente`), la compatibilità arriva da
// sé: TypeScript confronta le FORME, non i nomi dei tipi — chi chiamerà
// questa funzione (T21) passerà un oggetto che soddisfa questa forma,
// eventualmente costruendolo da `stato` con un piccolo adattatore lì (non
// qui: `tipo` in `StatoWizard` è oggi `TipoScelto` — `{kind:'catalogo',
// tipoId}` oppure `{kind:'libero', testo}` — quindi estrarre un `tipoId:
// string | null` da quella union è comunque compito di chi ha lo stato
// vero, non di questo modulo che non lo conosce).

import type { NomePasso } from '@/lib/wizard/passi'
import { SEQUENZA_CANONICA } from '@/lib/wizard/passi'
import { trovaTipo } from '@/lib/domain/tipi-lavoro'

/**
 * I passi che compaiono per QUALUNQUE tipo di lavoro, mai condizionali
 * (brief §2.1): `dentista`, `tipo`, `paziente`, `foto` (D8 — la foto è
 * incondizionata, è l'unica ragione per cui i tipi che non chiedono niente
 * non restano senza fotocamera) e `cassetta` (ultimo passo, saltabile — W4,
 * ma comunque SEMPRE nella sequenza: "saltabile" è un comportamento
 * dell'interfaccia, non l'assenza del passo).
 */
const PASSI_FISSI: ReadonlySet<NomePasso> = new Set<NomePasso>([
  'dentista',
  'tipo',
  'paziente',
  'foto',
  'cassetta',
])

/**
 * L'elenco dei NOMI di passo per un tipo di lavoro, nell'ordine di
 * `SEQUENZA_CANONICA` (brief §2.1).
 *
 * Firma: prende un `id` (stringa), non un `TipoLavoro` intero — è la stessa
 * forma in cui il tipo scelto viaggia nello stato del wizard oggi
 * (`TipoScelto.tipoId`) e in una bozza serializzata (`persistenza.ts`), che
 * è JSON: un `TipoLavoro` intero non ci passerebbe meglio di un id.
 *
 * Comportamento DICHIARATO per un `id` che non esiste nel catalogo
 * (`trovaTipo` torna `undefined`) — inclusa la stringa vuota, che non è
 * l'id di nessun tipo: la sequenza MINIMA, cioè SOLO i 5 passi fissi, MAI i
 * due condizionali (`denti`, `colore`). Non è la coincidenza di un `find`
 * che torna `undefined` lasciata cadere in un ramo qualsiasi: è la stessa
 * scelta di `mostraUscita` in `passi.ts` — quella funzione fallisce APERTA
 * verso il mostrare l'uscita quando il nome non è riconosciuto; questa
 * fallisce verso il CHIEDERE DI MENO quando il tipo non è riconosciuto. Le
 * due possibili sviste sono "chiedere denti/colore per un tipo che non li
 * prevede" (fastidioso: un passo di troppo) o "non chiederli per un tipo che
 * li prevede davvero" (più grave: dati mancanti a un lavoro reale) — ma un
 * id fuori catalogo è già un bug del chiamante (bozza rimasta indietro
 * rispetto a un catalogo cambiato, o input corrotto), non un tipo reale che
 * il laboratorio ha scelto: in quel caso è più sicuro chiedere di meno che
 * inventare un condizionale su un tipo che non esiste.
 */
export function sequenzaPassi(id: string): readonly NomePasso[] {
  const tipo = trovaTipo(id)
  return SEQUENZA_CANONICA.filter((passo) => {
    if (PASSI_FISSI.has(passo)) return true
    if (passo === 'denti') return tipo?.prevedeDenti === true
    // D42: 'libero' NON apre il passo colore in quest'ondata — la
    // tavolozza delle tinte non dentali è un'altra ondata. Il passo colore
    // compare SOLO per 'catalogo' (confronto stretto, non un `!== 'nessuno'`
    // che lascerebbe passare anche 'libero').
    // ⚠️ NON riguarda mandato: per il gruppo `scheletrato*` la fonte dice
    // "colore sì SE porta denti", ma nel catalogo (T2) `prevedeColore` è
    // 'catalogo' INCONDIZIONATO — quindi qui il passo 'colore' compare
    // sempre per quei 4 tipi, a prescindere dai denti scelti. Per mandato
    // esplicito (brief T3 §0) questa condizionalità NON si implementa qui:
    // si ricaverebbe a valle dai denti effettivamente indicati, come già
    // avviene per l'arcata ("dedotta") — riferito, non corretto di
    // nascosto (R-E2), vedi rapporto §6.
    if (passo === 'colore') return tipo?.prevedeColore === 'catalogo'
    // Nessun altro NomePasso è condizionale — ramo qui solo per
    // esaustività: PASSI_FISSI copre già dentista/tipo/paziente/foto/
    // cassetta, quindi questo `return false` non è mai raggiunto con i 7
    // valori oggi validi di NomePasso.
    return false
  })
}

/**
 * Il tipo minimo di cui `cosaSiPerde` ha bisogno — SOLO i campi che legge
 * davvero (censimento R-P6, motivato campo per campo nel rapporto §2):
 *
 * - `tipoId`: per calcolare — via `sequenzaPassi` — se i passi 'denti'/
 *   'colore' ci sono in QUESTO stato. `null` finché il passo 'tipo' non è
 *   stato ancora compilato.
 * - `cliente`: SOLO il suo `id` è letto (mai `label`) — serve a rilevare se
 *   il DENTISTA cambia fra i due stati (seconda perdita di D17).
 * - `pazienteIdScelto`: il paziente scelto dall'ARCHIVIO in questo stato
 *   (non un nome/cognome liberi digitati a mano) — `null` se nessuno. È il
 *   dato che D17 dice di perdere quando il dentista cambia:
 *   `pazienti.cliente_id` è NOT NULL, la scheda appartiene a quello studio.
 * - `denti` / `colori`: letti SOLO per sapere se il passo che li porta
 *   aveva DAVVERO qualcosa quando sparisce da precedente a successivo —
 *   tipizzati come array generico apposta: questo modulo non conosce (e non
 *   deve conoscere) la forma esatta che T9/T14 daranno al dente o al colore
 *   scelto, legge solo "c'è qualcosa o no" (`.length`).
 */
export type StatoMinimoPerdita = {
  tipoId: string | null
  cliente: { id: string } | null
  pazienteIdScelto: string | null
  denti: readonly unknown[] | null
  colori: readonly unknown[] | null
}

/** I nomi dei dati che `cosaSiPerde` può segnalare — nomina il dato, non il passo: l'interfaccia (T21) li userà per dire all'utente COSA sta per perdere. */
export type NomeDatoPerso = 'denti' | 'colori' | 'paziente'

/**
 * `v` porta un valore utile, non solo la sua assenza — array vuoto conta
 * come "niente" allo stesso titolo di `null` (il passo era presente ma non
 * ci si era ancora scritto nulla). Confronto `!= null` (non `!== null`)
 * DELIBERATO: tratta `undefined` come `null` — una chiave assente (bozza
 * JSON con un campo mancante, `persistenza.ts:62-66` fa `JSON.parse` senza
 * validare la forma) non deve leggersi come "un valore c'è".
 */
function haQualcosa(v: readonly unknown[] | null | undefined): boolean {
  return v != null && v.length > 0
}

/**
 * L'UNICA tabella dichiarata qui: «passo → dato che porta» (brief §2.3),
 * per i due passi CONDIZIONALI sul tipo. Ogni riga dice quale campo di
 * `StatoMinimoPerdita` segnala che il passo portava davvero qualcosa.
 * `paziente` non è in questa tabella: il suo passo è FISSO — non sparisce
 * mai per un cambio di tipo (§2.1) — ma DIPENDE da un altro passo, il
 * dentista (`cliente`): vive nel corpo di `cosaSiPerde` sotto, con la sua
 * regola propria, non nella diff di sequenza che guida questa tabella.
 */
const PASSO_CONDIZIONALE_DATO: ReadonlyArray<{
  passo: Extract<NomePasso, 'denti' | 'colore'>
  perso: NomeDatoPerso
  aveva: (s: StatoMinimoPerdita) => boolean
}> = [
  { passo: 'denti', perso: 'denti', aveva: (s) => haQualcosa(s.denti) },
  { passo: 'colore', perso: 'colori', aveva: (s) => haQualcosa(s.colori) },
]

/**
 * Che cosa si perde tornando indietro e cambiando la risposta che porta da
 * `precedente` a `successivo` — D17: l'avviso compare SOLO se qualcosa si
 * perde DAVVERO, mai "a sproposito" (variante (b) scartata da D17: svuotare
 * in silenzio è la classe di difetto di `api/lavori/[id]/route.ts:259-264`).
 *
 * Firma a DUE STATI, non due tipi (bloccante già trovato e risolto, brief
 * §2.2): una firma `(tipoPrecedente, tipoNuovo)` non vede il dentista, e i
 * casi reali di D17 sono due — cambiare il TIPO (svuota di senso denti e
 * colore già scelti) e cambiare il DENTISTA (invalida il paziente scelto
 * dall'archivio).
 *
 * Si appoggia su `sequenzaPassi` per denti/colore — MAI una seconda lista a
 * mano (D17, riga finale: sarebbe lo stesso difetto daccapo): un passo è
 * "perso" quando c'era nella sequenza di `precedente` e non c'è più in
 * quella di `successivo`, E il campo che gli corrisponde (tabella sopra)
 * aveva davvero un valore in `precedente`. Se l'id di `precedente` non è
 * nel catalogo, `sequenzaPassi` gli attribuisce la sequenza minima (stessa
 * regola dichiarata sopra) — quindi un id sconosciuto non "aveva" mai i
 * passi condizionali da perdere: comportamento coerente, non un caso a
 * parte.
 *
 * Il paziente si perde quando il `cliente` (dentista) cambia FRA i due
 * stati E `precedente.pazienteIdScelto` non è `null` — indipendentemente
 * dal tipo: è una dipendenza del passo 'paziente' dal passo 'dentista', non
 * una voce della sequenza condizionata dal tipo.
 */
export function cosaSiPerde(
  precedente: StatoMinimoPerdita,
  successivo: StatoMinimoPerdita
): NomeDatoPerso[] {
  const seqPrima = sequenzaPassi(precedente.tipoId ?? '')
  const seqDopo = sequenzaPassi(successivo.tipoId ?? '')

  const persi: NomeDatoPerso[] = []

  for (const riga of PASSO_CONDIZIONALE_DATO) {
    const spariva = seqPrima.includes(riga.passo) && !seqDopo.includes(riga.passo)
    if (spariva && riga.aveva(precedente)) persi.push(riga.perso)
  }

  const clientePrima = precedente.cliente?.id ?? null
  const clienteDopo = successivo.cliente?.id ?? null
  // `!= null` DELIBERATO (non `!== null`), stessa ragione di `haQualcosa`
  // sopra: una `pazienteIdScelto` assente (`undefined`, chiave mancante in
  // una bozza JSON malformata) non deve leggersi come "un paziente scelto".
  if (clientePrima !== clienteDopo && precedente.pazienteIdScelto != null) {
    persi.push('paziente')
  }

  return persi
}
