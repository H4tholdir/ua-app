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
  const codice = testo(data.colore_dente)
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
  const zone = {
    codice_collo: testo(data.colore_collo),
    codice_corpo: testo(data.colore_corpo),
    codice_incisale: testo(data.colore_incisale),
  }
  const senzaColore = { scala: null, codice: null, codice_collo: null, codice_corpo: null, codice_incisale: null }
  const riga = (fdi: number, ruolo: RuoloDente): DentePayload =>
    ruolo === 'elemento'
      ? { fdi, ruolo, scala, codice, ...zone, provenienza: 'eseguito' }
      : { fdi, ruolo, ...senzaColore, provenienza: 'eseguito' }

  const elementi = numeriDente(data.denti_coinvolti)

  // 🔴 In quest'ondata il colore vive SULLA RIGA del dente: senza nemmeno un
  // elemento non c'è dove scriverlo. `lavori.colore_dente` non ha più uno
  // scrittore (Task 10) e il default di caso `lavori.colore_scala`/
  // `colore_codice` non è correggibile dopo la creazione (ondata b). Spedire
  // `denti: []` con un colore addosso vorrebbe dire «Salvato», ricarico, colore
  // sparito — la bugia esatta che questo task esiste per chiudere. E non è un
  // caso di frontiera: la maggior parte dei lavori non ha l'odontogramma
  // compilato. Si dice all'utente cosa manca, invece di perdere il dato.
  if (elementi.length === 0 && (codice || zone.codice_collo || zone.codice_corpo || zone.codice_incisale)) {
    return {
      ok: false,
      motivo: 'Il colore si registra sul dente: seleziona almeno un dente nell’odontogramma',
    }
  }

  return {
    ok: true,
    denti: [
      ...elementi.map((fdi) => riga(fdi, 'elemento')),
      ...numeriDente(data.denti_mancanti).map((fdi) => riga(fdi, 'mancante')),
      ...numeriDente(data.denti_impianti).map((fdi) => riga(fdi, 'impianto')),
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
    testo(data.colore_dente),
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
  isDirty: boolean
}

export function useLavoroForm(initial: Partial<Lavoro> = {}): UseLavoroFormReturn {
  const [data, setData] = useState<Partial<Lavoro>>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

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
      const { lavoro: salvato } = await res.json().catch(() => ({ lavoro: null }))
      if (salvato?.updated_at) setData((prev) => ({ ...prev, updated_at: salvato.updated_at }))

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

  return { data, update, save, saving, saved, saveError, isDirty }
}
