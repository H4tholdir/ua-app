'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lavoro } from '@/types/domain'
import { scalaDelCodice } from '@/lib/domain/colore-dente'
import { isFdiValido } from '@/lib/domain/denti-fdi-dominio'

// Campi prezzo da escludere quando il lavoro è già incluso in fattura
const PRICE_FIELDS: Array<keyof Lavoro> = [
  'prezzo_unitario',
  'listino_id',
  'codice_iva',
  'natura_iva',
]

// ═══ SENTINELLE DENTI + COLORE (spec wizard §4, Task 10) ═══════════════════
// Questi sette nomi sono usciti da PATCHABLE_FIELDS e
// `src/app/api/lavori/[id]/route.ts:320-324` scarta IN SILENZIO ogni chiave
// fuori allowlist: se partissero nella PATCH, l'utente leggerebbe «Salvato» su
// un dato che il server ha buttato via. La loro penna è `PUT /api/lavori/[id]/
// denti`. Stessa disciplina di `numero_cassetta` poche righe più sotto: si
// tolgono ALLA SORGENTE, non ci si affida al filtro del server.
const CAMPI_DENTI_COLORE = [
  'denti_coinvolti', 'denti_mancanti', 'denti_impianti',
  'colore_dente', 'colore_collo', 'colore_corpo', 'colore_incisale',
] as const

type RuoloDente = 'elemento' | 'mancante' | 'impianto'

type DentePayload = {
  fdi: number
  ruolo: RuoloDente
  scala: string | null
  codice: string | null
  codice_collo: string | null
  codice_corpo: string | null
  codice_incisale: string | null
  provenienza: 'eseguito'
}

type EsitoDenti =
  | { ok: true; denti: DentePayload[] }
  | { ok: false; motivo: string }

const testo = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : null

/**
 * I numeri di dente rappresentabili, ordinati.
 *
 * ⚠️ LIMITE DICHIARATO: `lavori.denti_coinvolti` è `text[]` e prima di
 * quest'ondata accettava qualunque stringa — «2.6» è esattamente il difetto che
 * l'ondata (a) esiste per chiudere. Un valore così non è rappresentabile in
 * `lavori_denti.fdi` (smallint + CHECK strutturale) e non è nemmeno mostrabile
 * nell'odontogramma, quindi non può viaggiare. Non è input dell'utente — è
 * residuo di dati vecchi — e dopo il primo salvataggio la denormalizzazione
 * della RPC lo toglie anche dalla colonna. Sbarrare il salvataggio, invece,
 * lascerebbe quel lavoro incorreggibile per sempre.
 */
function numeriDente(v: unknown): number[] {
  return (Array.isArray(v) ? v : []).map(Number).filter(isFdiValido).sort((a, b) => a - b)
}

/**
 * 🔑 IL COLORE CHE LE RIGHE PORTERANNO dopo questo salvataggio — `null` quando
 * **nessuna riga lo porterà**, azzeramento compreso.
 *
 * È la domanda che decide tutto qui dentro, e ha UNA sola risposta perché è la
 * stessa condizione con cui `idrataColoreScheda` decide di **leggere** il
 * default di caso (`colore-dente.ts`: `righe.find(r => r.scala !== null &&
 * r.codice !== null)`, e in mancanza il ripiego sul caso). **Si scrive dove si
 * legge**: è quella simmetria — non una regola in più — a rendere il campo
 * correggibile.
 *
 * ⚠️ Il discriminante è «c'è almeno un ELEMENTO», non «c'è almeno un dente»: una
 * riga `mancante` o `impianto` non può portare un colore (le RPC lo scrivono sui
 * soli elementi, e `lavori_denti_zone_ck` pretende comunque la scala). La
 * distinzione NON sparisce riformulando la regola: si raccoglie qui, in un posto
 * solo, invece di stare scritta a mano in tre.
 *
 * 🔴 IL DIFETTO CHE QUESTA FUNZIONE CHIUDE (riprodotto il 28/07/2026). La prima
 * formulazione del Task 12-bis era «quando ci sono elementi, il caso non si
 * tocca». Ma un lavoro nato dal wizard con elemento **e** colore ha il colore
 * nel CASO e le righe SENZA — è la forma normale, non un caso limite (il wizard
 * non stampa il colore su ogni dente: sarebbe una prescrizione per-dente che il
 * dentista non ha dato). Con quella regola CAMBIARE il colore funzionava,
 * AZZERARLO no: le righe restavano senza colore, il caso restava valorizzato, la
 * precedenza riga→caso ricadeva sul caso e il colore vecchio riappariva al
 * ricaricamento. Un campo che non si può azzerare è un campo che non si
 * corregge — contro la direttiva permanente «ogni campo del lavoro si corregge,
 * fino alla consegna».
 */
function coloreDelleRighe(data: Partial<Lavoro>): string | null {
  return numeriDente(data.denti_coinvolti).length > 0 ? testo(data.colore_dente) : null
}

/**
 * La lista di denti che il PUT deve vedere, tradotta dal modello vecchio (tre
 * liste separate) a quello nuovo (righe con un `ruolo`).
 *
 * Finché l'ondata (b) non offre il colore per singolo dente, il colore del
 * lavoro va sui soli elementi: è la tendina unica di `TabClinica` che parla per
 * tutto il caso. `provenienza: 'eseguito'` perché questo è ciò che il
 * laboratorio dichiara dalla scheda, non ciò che il dentista aveva prescritto —
 * distinzione che servirà al precheck di consegna (W20/W22).
 */
function costruisciDenti(data: Partial<Lavoro>): EsitoDenti {
  const elementi = numeriDente(data.denti_coinvolti)
  const senzaColore = { scala: null, codice: null, codice_collo: null, codice_corpo: null, codice_incisale: null }
  const altreRighe = [
    ...numeriDente(data.denti_mancanti).map((fdi) => ({ fdi, ruolo: 'mancante' as const, ...senzaColore, provenienza: 'eseguito' as const })),
    ...numeriDente(data.denti_impianti).map((fdi) => ({ fdi, ruolo: 'impianto' as const, ...senzaColore, provenienza: 'eseguito' as const })),
  ]

  const zone = {
    codice_collo: testo(data.colore_collo),
    codice_corpo: testo(data.colore_corpo),
    codice_incisale: testo(data.colore_incisale),
  }

  // ═══ NESSUN ELEMENTO: il colore non passa di qui, va sul DEFAULT DI CASO ═══
  // Task 12-bis, e la ragione è di dominio, non tecnica: «si può succedere di
  // voler inserire il colore ad esempio su di una protesi totale senza indicare
  // il dente» (Francesco, 28/07/2026). Il colore che vale per l'intero
  // dispositivo è un dato legittimo, non un dato monco — e la sua casa è
  // `lavori.colore_scala`/`colore_codice`, scritta dalla PATCH poco più sotto.
  // ⚠️ Il discriminante è «nessun ELEMENTO», non «nessun dente»: una riga
  // `mancante` o `impianto` non può portare un colore (le RPC lo scrivono sui
  // soli elementi, e `lavori_denti_zone_ck` pretende comunque la scala).
  if (elementi.length === 0) {
    // 🛑 LIMITE DICHIARATO, non una dimenticanza: il default di caso è una
    // COPPIA (scala, codice) e basta — non ha zone da offrire — e
    // `lavori.colore_collo`/`corpo`/`incisale` sono sentinelle del Task 10,
    // senza più nessuno scrittore. Le tre zone senza un dente non hanno NESSUNA
    // destinazione: l'unica alternativa a dirlo sarebbe buttarle via in
    // silenzio, che è esattamente la bugia contro cui è nata quest'ondata.
    // Il colore per singolo dente (e quindi le zone) è ondata (b).
    if (zone.codice_collo || zone.codice_corpo || zone.codice_incisale) {
      return {
        ok: false,
        motivo: 'Le zone del colore si registrano sul dente: seleziona almeno un dente nell’odontogramma',
      }
    }
    // Nessun controllo sul codice: qui non viaggia. Un colore che il catalogo
    // non conosce lo degrada il server (`risolviColoreCaso`), che è l'unico a
    // vedere il catalogo vero — e si perde il colore, mai il lavoro.
    return { ok: true, denti: altreRighe }
  }

  // Qui gli elementi ci sono di sicuro (il ramo senza è già uscito), quindi
  // `coloreDelleRighe` vale `testo(data.colore_dente)`: si passa lo stesso di
  // prima, ma dalla funzione che risponde alla domanda «quale colore porteranno
  // le righe» — la stessa che decide se il caso viaggia nella PATCH. Due
  // risposte diverse alla stessa domanda sono il difetto che il 12-bis ha già
  // pagato una volta.
  const codice = coloreDelleRighe(data)
  const scala = scalaDelCodice(codice)
  if (codice && !scala) {
    // Spedire il codice senza scala violerebbe `lavori_denti_coppia_ck`;
    // spedire il dente senza il colore sarebbe la perdita silenziosa che questo
    // task esiste per chiudere. Si dice, e non si salva.
    return { ok: false, motivo: `Colore «${codice}» non riconosciuto: riselezionalo prima di salvare` }
  }

  // 🔴 Le zone del ceramista viaggiano SEMPRE, anche quando manca il colore di
  // base. In quel caso `lavori_denti_zone_ck` le rifiuta e la route risponde
  // 422 con le sue parole: un errore visibile è la cosa giusta: toglierle qui
  // per non far arrabbiare il server sarebbe di nuovo il no-op silenzioso.
  return {
    ok: true,
    denti: [
      ...elementi.map((fdi) => ({ fdi, ruolo: 'elemento' as const, scala, codice, ...zone, provenienza: 'eseguito' as const })),
      ...altreRighe,
    ],
  }
}

/**
 * L'impronta dei sette campi, per non spedire il PUT quando non è cambiato
 * nulla di clinico.
 *
 * Non è un'ottimizzazione. `PUT /denti` è a SOSTITUZIONE INTEGRALE e riscrive
 * ogni riga con `provenienza: 'eseguito'`: mandarlo a ogni salvataggio vorrebbe
 * dire che correggere un refuso nella descrizione cancella la traccia di ciò
 * che il dentista aveva PRESCRITTO. E su un lavoro con dati clinici imperfetti
 * (zone senza base, un FDI legacy fuori dominio) un 422 dal PUT bloccherebbe il
 * salvataggio di QUALUNQUE altro campo del lavoro.
 * Si confrontano gli INPUT, non il payload costruito: così un colore che il
 * catalogo non conosce non impedisce di salvare finché nessuno lo tocca.
 */
function impronta(data: Partial<Lavoro>): string {
  return JSON.stringify([
    numeriDente(data.denti_coinvolti),
    numeriDente(data.denti_mancanti),
    numeriDente(data.denti_impianti),
    // 🔴 Il colore di BASE esce dall'impronta quando non ha righe dove
    // atterrare (Task 12-bis): senza elementi va sul default di caso, cioè
    // nella PATCH, e far partire il PUT per lui sarebbe una sostituzione
    // integrale a vuoto — che però cancella per davvero la provenienza
    // `prescritto` delle righe rimaste, e su dati clinici imperfetti può
    // rispondere 422 e bloccare il salvataggio di QUALUNQUE altro campo.
    // Il `null` di `coloreDelleRighe` tiene ferma la forma dell'array: un
    // cambiamento di lunghezza cambierebbe la stringa da solo, non per un dato
    // diverso.
    coloreDelleRighe(data),
    // Le tre zone restano SEMPRE nell'impronta: non hanno una seconda
    // destinazione, e senza di loro qui il fermo che le dichiara non
    // scatterebbe mai — la zona sparirebbe in silenzio.
    testo(data.colore_collo),
    testo(data.colore_corpo),
    testo(data.colore_incisale),
  ])
}

interface UseLavoroFormReturn {
  data: Partial<Lavoro>
  update: (updates: Partial<Lavoro>) => void
  save: (id: string) => Promise<void>
  saving: boolean
  saved: boolean
  saveError: string | null
  /** D42 T8 (D251 · D248) — quello che il SERVER ha fatto e che il corpo della
   *  risposta dichiara: una tinta tolta col cambio di tipo (D117), una tinta o
   *  un colore chiesti e non registrabili. Non sono errori di salvataggio — il
   *  salvataggio è riuscito — quindi non passano da `saveError`, che accenderebbe
   *  «riprova» su un gesto andato a buon fine. Vuoto quando non c'è nulla da dire. */
  avvisi: string[]
  isDirty: boolean
}

export function useLavoroForm(initial: Partial<Lavoro> = {}): UseLavoroFormReturn {
  const [data, setData] = useState<Partial<Lavoro>>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [avvisi, setAvvisi] = useState<string[]>([])
  const [isDirty, setIsDirty] = useState(false)

  // 🛑 LA TINTA COM'ERA QUANDO LA PAGINA È NATA — serve a sapere se l'utente
  //    l'ha davvero cambiata. Senza, il corpo della PATCH la nomina SEMPRE
  //    (`{ ...data }`) e il ramo D117 della rotta — «al cambio di tipo la tinta
  //    si toglie E LO DICHIARA» — diventa irraggiungibile: chi cambia il tipo si
  //    sente dire «non sono riuscita a registrare la tinta che hai chiesto»,
  //    cioè un invito a riprovare un gesto che non ha mai fatto. (P8-①)
  const tintaIniziale = useRef({
    famiglia: initial.tinta_famiglia ?? null,
    codice: initial.tinta_codice ?? null,
  })

  // Track whether data has been touched since last successful save
  // Ref is used for autosave timer to avoid stale closure; state is for UI
  const isDirtyRef = useRef(false)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // L'impronta dei sette campi clinici come sono OGGI nel database — cioè come
  // sono arrivati con l'idratazione, e poi come li ha lasciati l'ultimo PUT
  // riuscito. Inizializzata pigramente: il form si ridisegna a ogni tasto
  // premuto, e `useRef(impronta(initial))` rifarebbe il lavoro ogni volta per
  // buttarlo via.
  const dentiInviatiRef = useRef<string | null>(null)
  if (dentiInviatiRef.current === null) dentiInviatiRef.current = impronta(initial)

  const save = useCallback(async (id: string) => {
    if (!isDirtyRef.current) return

    setSaving(true)
    setSaved(false)
    setSaveError(null)

    try {
      // ═══ DENTI E COLORE: endpoint dedicato, PRIMA della PATCH ═════════════
      // I sette campi non passano più dalla PATCH (vedi CAMPI_DENTI_COLORE):
      // vanno dove vivono adesso, cioè nelle righe di `lavori_denti`.
      const improntaOra = impronta(data)
      if (improntaOra !== dentiInviatiRef.current) {
        const esito = costruisciDenti(data)
        if (!esito.ok) {
          setSaveError(esito.motivo)
          throw new Error(esito.motivo)
        }

        const resDenti = await fetch(`/api/lavori/${id}/denti`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          // 🔑 Il gettone di concorrenza viaggia COSÌ COM'È, senza mai passare
          // da un `new Date(...)`: `timestamptz` ha precisione al microsecondo,
          // `Date` di JS al millisecondo. Un riparsing troncherebbe `.123456` a
          // `.123` e il confronto dentro la RPC non tornerebbe MAI uguale: 409
          // permanente, che nemmeno ricaricando la pagina si sana.
          body: JSON.stringify({ atteso_updated_at: data.updated_at ?? null, denti: esito.denti }),
        })

        if (!resDenti.ok) {
          const json = await resDenti.json().catch(() => ({}))
          const msg = resDenti.status === 409
            ? 'Qualcun altro ha modificato questo lavoro: ricarica la pagina'
            : (json.error ?? `Salvataggio denti fallito (${resDenti.status})`)
          setSaveError(msg)
          throw new Error(msg)   // niente PATCH dopo un salvataggio denti fallito
        }

        dentiInviatiRef.current = improntaOra

        // 🔴 OBBLIGATORIO, non una rifinitura. La RPC fa `UPDATE lavori SET
        // updated_at = now()`: da questo istante il valore che abbiamo in
        // memoria è VECCHIO. Senza riallinearlo, il salvataggio SUCCESSIVO
        // manderebbe ancora il timestamp di prima e prenderebbe un 409 — anche
        // senza nessun altro utente collegato. Il controllo di concorrenza deve
        // accorgersi dei conflitti VERI, non inciampare sul proprio passo.
        const { updated_at: nuovoUpdatedAt } = await resDenti.json().catch(() => ({ updated_at: null }))
        if (nuovoUpdatedAt) setData((prev) => ({ ...prev, updated_at: nuovoUpdatedAt }))
      }

      // Build patch body — exclude price fields if included in invoice
      const patchBody: Partial<Lavoro> = { ...data }
      if (data.incluso_in_fattura) {
        for (const field of PRICE_FIELDS) {
          delete patchBody[field]
        }
      }
      // numero_cassetta è MORTO come campo del form (Task 16, spec §10/R1): la
      // posizione fisica si assegna SOLO dalla Parete (POST /api/lavori/[id]/
      // cassetta). `data` la contiene ancora perché è una colonna del lavoro
      // caricato, quindi `{ ...data }` la porterebbe nel payload — il server
      // l'ha tolta da PATCHABLE_FIELDS (no-op silenzioso), ma va tolta ALLA
      // SORGENTE così il PATCH del form non la invia MAI.
      delete patchBody.numero_cassetta
      // Sentinelle denti + colore: la loro penna è il PUT qui sopra.
      for (const campo of CAMPI_DENTI_COLORE) {
        delete patchBody[campo]
      }

      // ═══ LA TINTA VIAGGIA SOLO SE È STATA CAMBIATA (P8-①) ═══════════════
      // Stessa disciplina di `numero_cassetta` e dei sette denti/colore qui
      // sopra, per una ragione diversa e più sottile: non è che la chiave venga
      // scartata dal server — è in allowlist e verrebbe accettata — ma la sua
      // sola PRESENZA dirotta la rotta sul ramo «l'utente ha chiesto una tinta»,
      // rendendo irraggiungibile quello di D117 («il cambio di tipo l'ha tolta»).
      // I due rami dicono all'utente due cose diverse, e una delle due sarebbe
      // falsa. 🔑 Si confronta col valore di PARTENZA, non con `null`: cancellare
      // una tinta («Nessuna») è un cambiamento e deve viaggiare.
      const tintaCambiata =
        (data.tinta_famiglia ?? null) !== tintaIniziale.current.famiglia ||
        (data.tinta_codice ?? null) !== tintaIniziale.current.codice
      if (!tintaCambiata) {
        delete patchBody.tinta_famiglia
        delete patchBody.tinta_codice
      }

      // ═══ IL COLORE DI CASO — l'altra destinazione, e una sola alla volta ═══
      // Task 12-bis. `{ ...data }` porta con sé la coppia COM'È NEL DATABASE, e
      // sarebbe quella sbagliata due volte: stantia rispetto a ciò che l'utente
      // ha appena scritto, e con una scala che non sta col codice nuovo — il
      // server filtrerebbe il catalogo per quella scala, non troverebbe nulla e
      // scarterebbe un colore validissimo. Si tolgono ENTRAMBE, e si rimette il
      // solo CODICE: la scala la deduce il server dal catalogo `colori_dentali`
      // (contratto dichiarato in `src/lib/api/colore-caso.ts`), che è l'unico a
      // vederlo davvero — il client ne ha solo uno specchio.
      delete patchBody.colore_scala
      delete patchBody.colore_codice

      // 🛑 SI SCRIVE DOVE SI LEGGE, e la condizione è LETTERALMENTE la stessa.
      // `idrataColoreScheda` legge il caso quando nessuna riga porta una coppia
      // colore completa; quindi il caso si scrive esattamente allora — e
      // «allora» comprende l'AZZERAMENTO, che è il caso in cui la vecchia
      // formulazione («con degli elementi il caso non si tocca») lasciava il
      // colore vecchio riemergere al ricaricamento.
      //
      // ⚠️ Il pericolo che quella formulazione voleva evitare resta chiuso: un
      // caso rimasto indietro dietro delle righe colorate non è leggibile
      // (`risolviColore` prende la riga), e l'istante in cui diventerebbe
      // leggibile — le righe che si svuotano — è lo stesso istante in cui questa
      // condizione diventa vera e lo riallinea. La verità visibile resta UNA.
      if (coloreDelleRighe(data) === null) {
        patchBody.colore_codice = testo(data.colore_dente)
      }

      const res = await fetch(`/api/lavori/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const msg = json.error ?? `Salvataggio fallito (${res.status})`
        setSaveError(msg)
        throw new Error(msg)
      }

      // Stessa cura del PUT, e per la stessa ragione: anche la PATCH scrive
      // `updated_at` (route.ts:382, poi il trigger `trg_lavori_updated_at`) e
      // lo restituisce nella select. Senza questo riallineamento basterebbe un
      // salvataggio di soli campi ordinari per far prendere un 409 fasullo al
      // PRIMO salvataggio clinico successivo.
      const corpo = await res.json().catch(() => ({ lavoro: null }))
      const salvato = corpo?.lavoro
      if (salvato?.updated_at) setData((prev) => ({ ...prev, updated_at: salvato.updated_at }))

      // ═══ QUELLO CHE IL SERVER HA FATTO, E CHE QUALCUNO DEVE LEGGERE ═══════
      // D251 (tinta) e D248 (colore): tre campi additivi che compaiono solo
      // quando c'è qualcosa da dire. Fino a qui NESSUNA superficie li leggeva —
      // e un campo senza lettore è l'interruttore che c'è e non fa niente.
      // 🛑 Non passano da `saveError`: il salvataggio è RIUSCITO, e accendere
      //    «riprova» su un gesto andato a buon fine manda l'utente a ripetere
      //    all'infinito una cosa già fatta.
      const nuoviAvvisi: string[] = []
      if (corpo?.tinta_rimossa) {
        nuoviAvvisi.push(
          'Ho tolto la tinta: questo tipo di lavoro non la prevede. Puoi sceglierne una nuova se il tipo la ammette.'
        )
      }
      if (corpo?.tinta_scartata) {
        nuoviAvvisi.push('La tinta che hai scelto non è stata registrata: controlla che sia adatta a questo tipo di lavoro.')
      }
      if (corpo?.colore_scartato) {
        nuoviAvvisi.push('Il colore che hai scritto non è stato registrato: non è fra quelli del catalogo.')
      }
      setAvvisi(nuoviAvvisi)

      // La tinta appena salvata diventa il nuovo punto di partenza, o il
      // salvataggio successivo la manderebbe di nuovo credendola cambiata.
      if (tintaCambiata) {
        tintaIniziale.current = {
          famiglia: data.tinta_famiglia ?? null,
          codice: data.tinta_codice ?? null,
        }
      }

      isDirtyRef.current = false
      setIsDirty(false)
      setSaved(true)

      // Reset saved indicator after 3s
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }, [data])

  const update = useCallback((updates: Partial<Lavoro>) => {
    setData((prev) => ({ ...prev, ...updates }))
    isDirtyRef.current = true
    setIsDirty(true)
    setSaved(false)
  }, [])

  // Autosave: debounced 30s after last update
  // Only fires if there's a pending lavoro id stored in form data
  useEffect(() => {
    const lavoroId = data.id
    if (!lavoroId || !isDirtyRef.current) return

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(() => {
      // save() rilancia l'errore dopo aver impostato saveError (per far sì
      // che i chiamanti espliciti, es. il bottone CONSEGNA, possano
      // intercettarlo prima di navigare). Qui il timer non ha alcun
      // chiamante che osservi la Promise: senza il .catch() un fallimento
      // di rete diventerebbe una unhandled rejection. saveError è già
      // stato impostato dentro save() prima del throw, quindi l'utente
      // vede comunque il feedback — non serve altra gestione qui.
      void save(lavoroId).catch(() => {})
    }, 30_000)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [data, save])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [])

  return { data, update, save, saving, saved, saveError, avvisi, isDirty }
}
