'use client'

// Ondata B ③ — T7: il ramo «colore» di `ModificaRigaSheet`, con dentro il
// GESTO D212 («era scritto così sulla prescrizione?»).
//
// ══ PERCHÉ UN COMPONENTE SOLO CON TRE PASSI, E NON TRE SHEET INCATENATI ═════
// 🛑 Gli overlay v3 tengono UNA entry di history per l'INTERA pila aperta
//    (`storia-overlay.ts`), e la disfano con `history.back()` quando la pila si
//    svuota. Tre `Sheet` in catena — chiudo il primo, apro il secondo nello
//    stesso commit — svuoterebbero la pila e la riempirebbero di nuovo: il
//    `history.back()` è ASINCRONO e arriverebbe DOPO il `pushState` del foglio
//    nuovo, che si chiuderebbe da solo. È esattamente la classe di difetto già
//    pagata due volte su questo ramo (D-2, e il visore che si richiudeva da
//    solo — v. il commento in `SchedaLavoroV3.tsx`).
//    Un solo `Sheet` che resta APERTO mentre cambia `passo` = una entry sola,
//    nessuna corsa, e corrisponde al mockup: i fogli si succedono nello stesso
//    posto.
//
// ══ COSA SCRIVE OGNI VIA ════════════════════════════════════════════════════
// Chi apre questo foglio sta cambiando IL COLORE DEL LAVORO. La domanda D212
// non chiede SE cambiarlo: chiede CHE COSA sta succedendo, e da lì dipende
// che cosa succede alla TRASCRIZIONE.
//   · «Sul foglio c'è scritto X» (typo) → `POST …/prescrizione/typo` riscrive
//     lo snapshot, POI la PATCH allinea il colore vivo. Entrambi: la
//     trascrizione era sbagliata, quindi era sbagliato anche il colore che ne
//     era stato derivato. Fermarsi al primo lascerebbe la Dichiarazione con
//     prescritto ≠ realizzato e NESSUNA divergenza a registro — uno
//     scostamento muto su un documento a valore legale.
//   · «No: lo stiamo cambiando noi» (divergenza) → `POST …/prescrizione/
//     divergenza` APPENDE al registro (la trascrizione NON si tocca: resta ciò
//     che il dentista ha prescritto), POI la PATCH aggiorna il realizzato.
//   · «Lascia stare» → niente, nessuna chiamata.
// L'ORDINE non è indifferente: prima si REGISTRA, poi si scrive il vivo. Al
// contrario, un fallimento della seconda chiamata lascerebbe il colore
// cambiato senza nessuna traccia del perché — il verso peggiore.
//
// ══ IL REGISTRO NON RICEVE MAI UNA VOCE FALSA (review T7, Critical) ═════════
// `divergenze` è APPEND-ONLY e finisce nella Dichiarazione di Conformità: una
// voce sbagliata non si cancella e non si corregge, resta per sempre. Tre
// percorsi la producevano, e sono chiusi qui — i dettagli stanno accanto al
// codice di ciascuno:
//   FIX 1 · valore fuori catalogo → il catalogo si controlla ALL'INGRESSO del
//           ramo divergenza, prima di ogni scrittura. (Non tocca la via typo:
//           la trascrizione è verbatim, D210.)
//   FIX 2 · ordine invertito → PRIMA la PATCH del colore vivo, POI l'append.
//           Fra un buco rimediabile («manca il motivo, riprova») e una bugia
//           permanente («cambiato per X» senza nessun cambio) si sceglie il
//           buco.
//   FIX 3 · da uno stato GIÀ divergente il gesto D212 non si ripresenta (il
//           suo sottotitolo sarebbe falso e la via typo lascerebbe orfana la
//           divergenza vecchia): si va dritti al «Perché cambia?», e una
//           seconda voce a registro è il fatto vero.
//
// ══ IL GETTONE ══════════════════════════════════════════════════════════════
// 🛑 `atteso_updated_at` è una STRINGA OPACA end-to-end: mai un `new Date()`,
//    mai un riparsing. `timestamptz` ha i microsecondi, `Date` di JS no: un
//    solo giro di riparsing renderebbe il 409 PERMANENTE (v. il cappello di
//    `prescrizione/typo/route.ts`). Ogni scrittura che tocca `lavori.updated_at`
//    — la rotta typo E la PATCH — restituisce il gettone nuovo, e da lì si
//    riparte.
//
// ══ IL COLORE VIVO E IL CATALOGO ════════════════════════════════════════════
// `PATCH /api/lavori/[id]` normalizza la coppia col catalogo `colori_dentali`
// (`risolviColoreCaso`) e, se il codice non c'è, AZZERA la coppia e risponde
// comunque 200: `scartato` non esce dalla rotta. Un `A3,5` (la virgola del
// mockup!) cancellerebbe quindi il colore mentre l'utente legge «salvato».
// Qui si controlla PRIMA con `scalaDelCodice` (lo specchio dei 48 codici che
// vive in `@/lib/domain/colore-dente`, tenuto onesto da
// `tests/unit/colore-dente-idratazione.test.ts`) e, se il codice non è del
// catalogo, la PATCH NON parte e lo si DICE.
// 🛑 La trascrizione invece si salva com'è, sempre: è testo del medico (D210),
//    non un valore di catalogo. Le due cose hanno regole diverse apposta.
// ✅ RILIEVO CHIUSO il 05/08/2026 (D248), e vale la pena sapere come è finita:
//    diceva «*la PATCH scarta il colore in silenzio: `risolviColoreCaso`
//    restituisce `scartato` e la rotta non lo legge né lo rimanda; il controllo
//    di qui è una rete del client, non la chiusura del buco*». Ora la rotta lo
//    rimanda — `colore_scartato: true`, e **solo** quando c'è qualcosa da dire
//    (`api/lavori/[id]/route.ts`).
// 🔑 Il controllo di QUESTO file resta, ed è giusto che resti: evita un giro di
//    rete inutile e dà la risposta subito, sul posto. Ma **non è più l'unica
//    difesa** — che era il punto del rilievo: una garanzia che vive solo nel
//    client non è una garanzia, e `scalaDelCodice` è un secondo elenco dei 48
//    codici, quindi una cosa che può divergere dal catalogo.

import { useState } from 'react'
import { motion } from 'motion/react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { scalaDelCodice } from '@/lib/domain/colore-dente'
// 🔑 Il confronto trascritto↔digitato è UNO SOLO, e vive con gli stati della
//    riga: se il gesto D212 e la riga della scheda decidessero «uguale» con due
//    regole diverse, la scheda mostrerebbe uno scostamento che il foglio non
//    chiede — o viceversa.
import { uguagliaColore } from '@/lib/lavori/colore-riga-scheda'
import { MOTIVI_DIVERGENZA, type MotivoDivergenza } from '@/lib/domain/prescrizione-costanti'
import { molla } from '@/design-system/v3/motion'
import { vibra } from '@/design-system/v3/haptic'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'

/** Le quattro pastiglie del motivo, testi VERBATIM dal mockup
 *  `2026-08-04-ondata-b-B-typo-divergenza.html` scena 2. 🛑 Le CHIAVI vengono
 *  dal dizionario chiuso importato (`MOTIVI_DIVERGENZA`), mai riscritte a
 *  mano: una quinta lista qui sarebbe l'unico posto in cui il dizionario può
 *  divergere in silenzio. `Record<MotivoDivergenza, string>` fa fallire la
 *  compilazione se il dizionario cresce e questa mappa no. */
const ETICHETTA_MOTIVO: Record<MotivoDivergenza, string> = {
  richiesta_dentista: "Me l'ha chiesto il dentista",
  esigenza_tecnica: 'Esigenza tecnica',
  materiale_non_disponibile: 'Materiale non disponibile',
  altro: 'Altro',
}

const MSG_RETE = 'Non è stato possibile salvare. Riprova.'

/** Il colore è cambiato ma il motivo NON è a registro: si dice forte, perché è
 *  la Dichiarazione a restare senza la spiegazione dello scostamento. Il foglio
 *  resta aperto sul passo del motivo, così il gesto si ripete da lì. */
const MSG_MOTIVO_NON_REGISTRATO =
  'Il cambio è fatto, ma il motivo NON è stato registrato: riprova, o la Dichiarazione resterà senza la spiegazione.'

type Passo = 'valore' | 'gesto' | 'motivo'

/** Che cosa il foglio ha cambiato davvero, per l'aggiornamento ottimistico
 *  della scheda. Ogni chiave è indipendente: una via può riuscire a metà, e
 *  il padre deve poter applicare solo la metà avvenuta. */
export type EsitoColore = {
  /** La coppia scritta su `lavori.colore_scala`/`colore_codice`. */
  colore?: { scala: string; codice: string }
  /** Il nuovo `contenuto.colore` dello snapshot (solo via typo). */
  trascritto?: string
  /** Una divergenza sul campo `colore` è entrata a registro. */
  divergenza?: boolean
  /** Il gettone nuovo — STRINGA OPACA, mai ricostruita. */
  updatedAt?: string
}

export type DatiColore = {
  /** Il colore VIVO attuale (quello che la riga mostra); '' se non c'è. */
  valoreIniziale: string
  /** `contenuto.colore` dello snapshot, `undefined` se non trascritto (V2). */
  trascritto?: string
  /** Come si chiama il dentista, per la frase di provenienza. */
  dentista: string
  /** Una divergenza sul colore è GIÀ a registro (stato «c» della riga). Da lì
   *  il gesto D212 NON si ripresenta: v. FIX 3 nel cappello del file. */
  giaDivergente?: boolean
  /** `lavori.updated_at` — il gettone di partenza. STRINGA, mai una `Date`. */
  updatedAt: string
  onSalvato: (esito: EsitoColore) => void
}

/**
 * ModificaColoreSheet — il foglio «Colore» della scheda e, dentro, il gesto
 * D212. Mockup: `2026-08-04-ondata-b3-schermate-vere.html` scene
 * `sheet-colore` e `gesto-d212`, più `2026-08-04-ondata-b-B-typo-divergenza.html`
 * scena 2 per il ramo del motivo. I testi sono INVARIATI alla lettera; i
 * VALORI dimostrativi del mockup («A3», «Dr. Colombo») sono dati di scena e
 * qui arrivano dal lavoro vero — nota di fedeltà §4 di
 * `docs/design/decisions/2026-08-04-ondata-b3-schermate-vere.md`.
 */
export function ModificaColoreSheet(props: {
  aperto: boolean
  onChiudi: () => void
  lavoroId: string
  titolo: string
  onErrore: (msg: string) => void
} & DatiColore) {
  const { aperto, onChiudi, lavoroId, titolo, trascritto, dentista, giaDivergente = false, onSalvato, onErrore } = props

  const [passo, setPasso] = useState<Passo>('valore')
  const [valore, setValore] = useState(props.valoreIniziale)
  const [motivo, setMotivo] = useState<MotivoDivergenza | null>(null)
  const [nota, setNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  // Il gettone VIVE QUI e avanza a ogni scrittura riuscita: dopo un 409 la
  // rotta restituisce quello corrente, e la via si ripreme senza ricaricare.
  const [gettone, setGettone] = useState(props.updatedAt)

  /** Il valore digitato, ripulito solo dagli spazi ai bordi: è ciò che si
   *  confronta e ciò che si manda. La trascrizione NON si normalizza oltre
   *  (D210), il codice di catalogo lo fa il server. */
  const nuovo = valore.trim()

  const TITOLI_PASSO: Record<Passo, string> = {
    valore: titolo,
    gesto: 'Era scritto così sulla prescrizione?',
    motivo: 'Perché cambia?',
  }

  /**
   * Scrive il COLORE VIVO (default di caso) con `PATCH /api/lavori/[id]`.
   * Ritorna che cosa è successo: il chiamante decide che cosa dire, perché la
   * frase giusta dipende da che cosa era già riuscito prima.
   */
  async function scriviColoreVivo(
    codiceGrezzo: string
  ): Promise<
    | { esito: 'ok'; colore: { scala: string; codice: string }; updatedAt?: string }
    | { esito: 'fuori_catalogo' }
    | { esito: 'errore' }
  > {
    // Stessa normalizzazione del wizard (`crea-lavoro.ts`): il catalogo
    // distingue le maiuscole — «A3» c'è, «a3» no.
    const codice = codiceGrezzo.trim().toUpperCase()
    const scala = scalaDelCodice(codice)
    if (scala === null) return { esito: 'fuori_catalogo' }

    try {
      const res = await fetch(`/api/lavori/${lavoroId}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        // La coppia viaggia SEMPRE INTERA: mezza coppia viola
        // `lavori_colore_caso_coppia_ck`.
        body: JSON.stringify({ colore_scala: scala, colore_codice: codice }),
      })
      if (!res.ok) return { esito: 'errore' }
      // ⚠️ Questa rotta risponde con `error`, non `errore`: le due famiglie di
      //    rotte hanno chiavi diverse e in questo file si incontrano. Qui non
      //    si legge nessuna delle due — il messaggio è nostro — ma il gettone
      //    sì: la PATCH riscrive `lavori.updated_at`, quindi quello vecchio è
      //    già scaduto nel momento in cui questa risposta arriva.
      const corpo = (await res.json().catch(() => null)) as { lavoro?: { updated_at?: string } } | null
      const updatedAt = corpo?.lavoro?.updated_at
      if (updatedAt) setGettone(updatedAt)
      return { esito: 'ok', colore: { scala, codice }, updatedAt }
    } catch {
      return { esito: 'errore' }
    }
  }

  /** «Il colore del lavoro non è cambiato», detto per la ragione giusta. */
  function messaggioVivoNonScritto(esito: 'fuori_catalogo' | 'errore', codice: string): string {
    return esito === 'fuori_catalogo'
      ? `«${codice}» non è un codice del catalogo colori: il colore del lavoro non è cambiato.`
      : 'Il colore del lavoro non si è aggiornato. Riprova dalla riga Colore.'
  }

  /**
   * FIX 1 — **IL CATALOGO SI CONTROLLA PRIMA DI ENTRARE NEL RAMO DIVERGENZA**,
   * non dopo l'append.
   *
   * 🔴 Il difetto che chiude (Critical della review): un valore fuori catalogo
   *    («A3,5», la virgola) faceva APPENDERE la divergenza e solo dopo
   *    `scalaDelCodice` annullava la PATCH. Il registro restava a dire
   *    «*cambiato per esigenza tecnica*» mentre **niente era cambiato**: una
   *    voce FALSA su un registro append-only che finisce nella Dichiarazione.
   * 🛑 Vale SOLO per questo ramo: la via typo resta **libera dal catalogo**,
   *    perché lì si scrive la TRASCRIZIONE, che è verbatim per legge di
   *    prodotto (D210) — «A3,5» sul foglio è «A3,5» nello snapshot.
   */
  function vaiAlMotivo(): void {
    if (scalaDelCodice(nuovo.trim().toUpperCase()) !== null) {
      setPasso('motivo')
      return
    }
    onErrore(
      `«${nuovo}» non è un codice del catalogo colori: il lavoro non può usare questo valore. ` +
        (giaDivergente
          ? 'Correggi il valore.'
          : // La seconda via è sullo schermo solo quando si arriva da D212: da
            // uno stato già divergente quel foglio non si apre, e indicare una
            // strada che non c'è sarebbe peggio del silenzio.
            "Correggi il valore — o, se è quello che c'è scritto sul foglio, usa l'altra via.")
    )
  }

  // ── Passo 1: il salvataggio del valore ───────────────────────────────────
  async function salvaValore() {
    if (nuovo === '') {
      onErrore('Scrivi un colore, oppure chiudi senza salvare.')
      return
    }
    // 🔑 Il confronto è tollerante (trim + maiuscole): il trascritto è come
    //    digitato, il vivo è normalizzato dal catalogo — un confronto stretto
    //    aprirebbe la domanda sul caso NORMALE.
    if (trascritto !== undefined) {
      if (giaDivergente) {
        // FIX 3 — DA UNO STATO GIÀ DIVERGENTE IL GESTO D212 NON SI RIPRESENTA.
        // 🔴 Il difetto che chiude: lì il sottotitolo di D212 («*il colore di
        //    questo lavoro è trascritto dal foglio di X*») sarebbe FALSO — una
        //    divergenza è già a registro — e la via typo riscriverebbe la
        //    trascrizione lasciando la vecchia divergenza ORFANA, a puntare a
        //    una differenza che non esiste più.
        // Si va dritti al «Perché cambia?»: una SECONDA voce a registro è
        // legittima (la RPC appende a un array), ed è il fatto vero.
        // 🔑 Due eccezioni, che sarebbero due voci false:
        //    · il valore torna a quello PRESCRITTO → non si sta divergendo, si
        //      sta rientrando: salvataggio semplice, nessuna nuova voce;
        //    · il valore non è cambiato → non è successo niente.
        if (!uguagliaColore(nuovo, trascritto) && !uguagliaColore(nuovo, props.valoreIniziale)) {
          vaiAlMotivo()
          return
        }
      } else if (!uguagliaColore(nuovo, trascritto)) {
        // Il gesto D212 si apre SOLO se c'è una trascrizione da difendere e il
        // valore se ne discosta. Senza snapshot non c'è nessuna domanda da
        // fare: è un salvataggio semplice (requisito 3).
        setPasso('gesto')
        return
      }
    }
    setSalvando(true)
    try {
      const scritto = await scriviColoreVivo(nuovo)
      if (scritto.esito !== 'ok') {
        onErrore(messaggioVivoNonScritto(scritto.esito, nuovo))
        return
      }
      onSalvato({ colore: scritto.colore, updatedAt: scritto.updatedAt })
      onChiudi()
    } finally {
      setSalvando(false)
    }
  }

  // ── Via A: «Sul foglio c'è scritto X» — il refuso di trascrizione ────────
  async function viaTypo() {
    setSalvando(true)
    try {
      let risposta: Response
      try {
        risposta = await fetch(`/api/lavori/${lavoroId}/prescrizione/typo`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          // 🛑 Il gettone si spedisce COSÌ COM'È.
          body: JSON.stringify({ campo: 'colore', valore: nuovo, atteso_updated_at: gettone }),
        })
      } catch {
        onErrore(MSG_RETE)
        return
      }

      // 🛑 Queste rotte rispondono `errore`, MAI `error`.
      const corpo = (await risposta.json().catch(() => null)) as
        | { errore?: string; esito?: string; updated_at?: string }
        | null

      if (!risposta.ok) {
        if (corpo?.esito === 'conflitto' && typeof corpo.updated_at === 'string') {
          // Il gettone nuovo arriva nel corpo del 409: si aggiorna e si
          // RESTA qui. Riprovare da soli sovrascriverebbe in silenzio la
          // modifica di un altro — la seconda pressione la decide l'utente.
          setGettone(corpo.updated_at)
          onErrore('Il lavoro è stato modificato da qualcun altro nel frattempo. Premi di nuovo per riprovare.')
          return
        }
        onErrore(corpo?.errore ?? MSG_RETE)
        return
      }

      if (typeof corpo?.updated_at === 'string') setGettone(corpo.updated_at)

      // La trascrizione è corretta. Ora il colore vivo, che portava lo stesso
      // refuso: se non si può scrivere, lo si dice — mai un «fatto» a metà.
      const scritto = await scriviColoreVivo(nuovo)
      if (scritto.esito !== 'ok') {
        onSalvato({ trascritto: nuovo, updatedAt: corpo?.updated_at })
        onErrore(`La trascrizione è corretta. ${messaggioVivoNonScritto(scritto.esito, nuovo)}`)
        onChiudi()
        return
      }
      onSalvato({ trascritto: nuovo, colore: scritto.colore, updatedAt: scritto.updatedAt })
      onChiudi()
    } finally {
      setSalvando(false)
    }
  }

  // ── Via B: «No: lo stiamo cambiando noi» — la divergenza ─────────────────
  //
  // FIX 2 — **PRIMA LA PATCH DEL COLORE VIVO, POI L'APPEND A REGISTRO.**
  // 🔴 L'ordine era invertito, ed era sbagliato. Il criterio non è «quale
  //    scrittura è più importante», è **quale fallimento si può rimediare**:
  //    · append riuscito e PATCH fallita → il registro dice «cambiato per il
  //      motivo X» e NIENTE è cambiato. Una voce **falsa** su un registro
  //      **append-only** che finisce nella Dichiarazione: non si cancella, non
  //      si corregge, resta per sempre.
  //    · PATCH riuscita e append fallito → il colore è cambiato e il motivo
  //      manca. Una nota mancante **si riprova**, ed è ciò che il messaggio
  //      chiede di fare, col foglio che resta aperto sul motivo.
  //    Fra un buco rimediabile e una bugia permanente si sceglie il buco.
  // 🔑 Coerente con V9 (trasparenza, mai bloccante): non si impedisce il
  //    cambio perché il motivo non è passato — si dice forte che manca.
  async function registraDivergenza() {
    if (motivo === null) return
    setSalvando(true)
    try {
      // ① Il colore vivo. Il catalogo è già stato controllato all'ingresso del
      //    ramo (FIX 1): qui `fuori_catalogo` non dovrebbe più capitare, ma il
      //    ramo resta — una rete che si toglie perché «non può scattare» è una
      //    rete che si toglie e basta.
      const scritto = await scriviColoreVivo(nuovo)
      if (scritto.esito !== 'ok') {
        // Nessun append: senza il cambio, una voce a registro sarebbe falsa.
        // Il foglio resta aperto sul motivo, il gesto si ripete.
        onErrore(messaggioVivoNonScritto(scritto.esito, nuovo))
        return
      }

      // ② Il registro. Da qui in poi il colore È cambiato: qualunque cosa
      //    succeda, il padre deve saperlo.
      let risposta: Response
      try {
        risposta = await fetch(`/api/lavori/${lavoroId}/prescrizione/divergenza`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          // 🛑 Niente `atteso_updated_at`: questa rotta lo rifiuta come chiave
          //    ignota (è un APPEND, non una sovrascrittura). La nota parte solo
          //    se c'è davvero: la rotta tratta vuoto e assente allo stesso modo,
          //    ma il corpo dice quello che intende.
          body: JSON.stringify({
            campo: 'colore',
            motivo,
            ...(nota.trim() !== '' ? { nota } : {}),
          }),
        })
      } catch {
        onSalvato({ colore: scritto.colore, updatedAt: scritto.updatedAt })
        onErrore(MSG_MOTIVO_NON_REGISTRATO)
        return
      }

      if (!risposta.ok) {
        const corpo = (await risposta.json().catch(() => null)) as { errore?: string } | null
        onSalvato({ colore: scritto.colore, updatedAt: scritto.updatedAt })
        // Il messaggio della rotta se c'è (dice «congelata», «non trovato»…),
        // ma sempre insieme al fatto che pesa: il cambio è già avvenuto.
        onErrore(`${MSG_MOTIVO_NON_REGISTRATO}${corpo?.errore ? ` (${corpo.errore})` : ''}`)
        return
      }

      onSalvato({ divergenza: true, colore: scritto.colore, updatedAt: scritto.updatedAt })
      onChiudi()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo={TITOLI_PASSO[passo]}>
      {passo === 'valore' && (
        <>
          <p style={stileSotto}>
            Adesso è <b style={stileForte}>{props.valoreIniziale || '—'}</b>
            {trascritto !== undefined
              ? ` — trascritto dalla prescrizione di ${dentista}.`
              : ' — scelto dal laboratorio.'}
          </p>
          <CampoTesto label="Colore" valore={valore} onCambia={setValore} autoFocus />
          <TastoPrimario disabled={salvando} onClick={salvaValore}>
            Salva
          </TastoPrimario>
        </>
      )}

      {passo === 'gesto' && trascritto !== undefined && (
        <>
          {/* Testo INVARIATO dal mockup, col solo nome del dentista al posto
              del valore dimostrativo «Dr. Colombo» (nota di fedeltà §4). */}
          <p style={stileSotto}>
            Il colore di questo lavoro è <b style={stileForte}>trascritto dal foglio di {dentista}</b>. Dimmi
            che cosa sta succedendo, così la Dichiarazione dice la verità.
          </p>

          {/* Il prima→dopo: il valore precedente resta LEGGIBILE, mai oscurato. */}
          <div style={stileCambio}>
            <span>
              <span style={{ ...stileCambioValore, ...stileCambioPrima }}>{trascritto}</span>
              <span style={stileCambioEtichetta}>trascritto</span>
            </span>
            <span aria-hidden="true" style={stileCambioFreccia}>
              →
            </span>
            <span>
              <span style={stileCambioValore}>{nuovo}</span>
              <span style={stileCambioEtichetta}>nuovo</span>
            </span>
          </div>

          {/* Le due vie: NESSUN default preselezionato — la scelta è un atto. */}
          <Via
            tono="blue"
            nome={`Sul foglio c'è scritto ${nuovo}`}
            sotto="avevo copiato male: correggo la trascrizione"
            disabilitata={salvando}
            onScegli={viaTypo}
            icona={<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />}
          />
          <Via
            tono="amber"
            nome="No: lo stiamo cambiando noi"
            sotto={`il foglio resta ${trascritto} — la Dichiarazione mostrerà prescritto e realizzato`}
            disabilitata={salvando}
            // FIX 1 — MAI `setPasso('motivo')` nudo: il catalogo si controlla
            // qui, all'ingresso del ramo, non dopo l'append.
            onScegli={vaiAlMotivo}
            icona={
              <>
                <path d="M16 3h5v5" />
                <path d="M8 3H3v5" />
                <path d="M21 3l-7 7" />
                <path d="M3 3l7 7" />
                <path d="M12 22v-8" />
              </>
            }
          />

          {/* La terza via del mockup. Fa la stessa cosa del «Chiudi» che
              `Sheet` mette sempre in fondo (L6: mai una X come unica uscita), e
              la ripetizione è VOLUTA: qui «non cambio niente» è una RISPOSTA
              alla domanda, non un'uscita generica — chi ha appena letto due vie
              deve trovare la terza dove sono le altre due. */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LinkQuieto onClick={onChiudi}>Lascia stare, non cambio niente</LinkQuieto>
          </div>
        </>
      )}

      {passo === 'motivo' && trascritto !== undefined && (
        <>
          <p style={stileSotto}>
            Il prescritto resta <b style={stileForte}>{trascritto}</b>, il realizzato diventa{' '}
            <b style={stileForte}>{nuovo}</b>. Una riga di motivo, e la differenza è coperta.
          </p>

          {/* FIX 3 — arrivando DRITTI qui da uno stato già divergente, il foglio
              D212 (che è quello che porta il prima→dopo) non si è mai aperto: il
              valore precedente sparirebbe dalla vista di chi lo sta cambiando.
              Si ripete qui, e il «prima» è il REALIZZATO vecchio — non il
              trascritto, che è un'altra cosa e sta già nella riga sopra. */}
          {giaDivergente && (
            <div style={stileCambio}>
              <span>
                <span style={{ ...stileCambioValore, ...stileCambioPrima }}>
                  {props.valoreIniziale || '—'}
                </span>
                <span style={stileCambioEtichetta}>realizzato</span>
              </span>
              <span aria-hidden="true" style={stileCambioFreccia}>
                →
              </span>
              <span>
                <span style={stileCambioValore}>{nuovo}</span>
                <span style={stileCambioEtichetta}>nuovo</span>
              </span>
            </div>
          )}

          <div style={stileGrigliaPastiglie}>
            {MOTIVI_DIVERGENZA.map((m) => (
              <PastigliaMotivo
                key={m}
                testo={ETICHETTA_MOTIVO[m]}
                scelta={motivo === m}
                onScegli={() => setMotivo(m)}
              />
            ))}
          </div>

          <CampoTesto
            label="Nota (se serve)"
            valore={nota}
            onCambia={setNota}
            // Gate L2 05/08 — a 390 il testo d'esempio precedente («es. richiesta
            // al telefono, 4 agosto») veniva tagliato a metà glifo, senza ellissi
            // né sfumatura: un esempio che finisce dentro una lettera si legge
            // come un guasto. Più corto, ci sta intero.
            placeholder="es. richiesta al telefono"
          />

          {/* Si torna DA DOVE SI È ARRIVATI: dal foglio D212 quando c'è passato,
              dal campo del valore quando lo si è saltato (FIX 3). Rimandare a un
              foglio mai visto sarebbe una porta che si apre sul niente. */}
          <TastoSecondario disabled={salvando} onClick={() => setPasso(giaDivergente ? 'valore' : 'gesto')}>
            Torna indietro
          </TastoSecondario>
          <TastoPrimario
            disabled={salvando || motivo === null}
            motivoDisabilitato="Scegli prima perché il colore cambia"
            onClick={registraDivergenza}
          >
            Registra il cambio
          </TastoPrimario>
        </>
      )}
    </Sheet>
  )
}

/**
 * Via — una delle due strade del gesto D212 (mockup `.via`). Bersaglio 64 di
 * altezza, ben oltre i 44 di legge; il glifo è decorativo (`aria-hidden`), il
 * significato sta tutto nelle due righe di testo — mai nel colore da solo (L3).
 */
function Via(props: {
  tono: 'blue' | 'amber'
  nome: string
  sotto: string
  icona: React.ReactNode
  disabilitata: boolean
  onScegli: () => void
}) {
  const { tono, nome, sotto, icona, disabilitata, onScegli } = props
  return (
    <>
      <style>{`
        .ds-via-d212:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
      `}</style>
      <motion.button
        type="button"
        className="ds-via-d212 ds-tap-v3"
        disabled={disabilitata}
        onClick={onScegli}
        whileTap={disabilitata ? undefined : { scale: 0.98 }}
        transition={molla.press}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spazio.m - 2,
          width: '100%',
          minHeight: 64,
          textAlign: 'left',
          background: 'var(--card)',
          border: '1.5px solid var(--line)',
          borderRadius: raggio.riga,
          boxShadow: 'var(--sh-press)',
          cursor: disabilitata ? 'default' : 'pointer',
          fontFamily: tipografia.famiglia,
          padding: '12px 16px',
          opacity: disabilitata ? 0.6 : 1,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            flex: 'none',
            borderRadius: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `var(--${tono}-tint)`,
            color: `var(--${tono})`,
          }}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {icona}
          </svg>
        </span>
        <span style={{ flex: 1 }}>
          <span
            style={{
              display: 'block',
              fontSize: tipografia.size.body,
              fontWeight: tipografia.weight.extrabold,
              color: 'var(--ink)',
            }}
          >
            {nome}
          </span>
          <span
            style={{
              // 13.5 e NON `tipografia.size.label` (13) — corretto dalla revisione
              // del gate L2, 05/08. Il numero era quasi giusto, il RUOLO no:
              // §4.1 definisce `label` come etichetta MAIUSCOLA 800/+0.16em, e
              // questa è una sotto-riga descrittiva minuscola in semibold. Il
              // 13.5 non è un valore inventato: è quello che le anatomie §5.41
              // e §5.42 usano per questo stesso ruolo (`FoglioCategoria.tsx:403`
              // lo rende così), e che il gemello `AllegaPrescrizioneSheet` porta.
              // ⚠️ Il difetto vero è che la scala §4.1 non ha un gradino per
              //    questo ruolo — riferito, non risolvibile qui.
              fontSize: 13.5,
              display: 'block',
              fontWeight: tipografia.weight.semibold,
              color: 'var(--muted)',
              marginTop: 2,
              lineHeight: 1.35,
            }}
          >
            {sotto}
          </span>
        </span>
      </motion.button>
    </>
  )
}

/**
 * PastigliaMotivo — una delle quattro scelte del motivo (mockup `.pastiglia`,
 * stessa griglia di `FoglioCategoria` §5.41). `aria-pressed` porta lo stato:
 * il colore non è mai l'unica fonte (L3).
 */
function PastigliaMotivo(props: { testo: string; scelta: boolean; onScegli: () => void }) {
  const { testo, scelta, onScegli } = props
  return (
    <>
      <style>{`
        .ds-pastiglia-motivo:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
      `}</style>
      <motion.button
        type="button"
        className="ds-pastiglia-motivo ds-tap-v3"
        aria-pressed={scelta}
        // Gate L2 05/08 — la pastiglia dichiara di specchiare FoglioCategoria
        // §5.41 (FoglioCategoria.tsx:227) e ChipScelta, che vibrano a ogni
        // selezione: stessa anatomia, stesso feedback. Solo `vibra`, mai
        // `suona`: è una scelta fra opzioni esistenti, non una cosa che nasce.
        onClick={() => {
          vibra('selection')
          onScegli()
        }}
        whileTap={{ scale: 0.97 }}
        transition={molla.press}
        style={{
          minHeight: 60,
          borderRadius: raggio.riga,
          border: 'none',
          cursor: 'pointer',
          background: scelta ? 'var(--ink)' : 'var(--bg-deep)',
          color: scelta ? 'var(--bg)' : 'var(--ink)',
          fontFamily: tipografia.famiglia,
          fontSize: 15,
          fontWeight: tipografia.weight.bold,
          padding: '0 12px',
          lineHeight: 1.25,
        }}
      >
        {testo}
      </motion.button>
    </>
  )
}

// 14.5 era fuori dalla scala chiusa §4.1 (fra 13 e 15.5 non c'è nulla): il ruolo
// è quello della didascalia di foglio, che il sistema serve a 15.5 (gate L2 05/08).
const stileSotto = {
  margin: 0,
  fontSize: tipografia.size.callout,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--muted)',
  lineHeight: 1.45,
} as const

const stileForte = { color: 'var(--ink)', fontWeight: tipografia.weight.bold } as const

const stileCambio = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spazio.m - 2,
  background: 'var(--bg-deep)',
  borderRadius: raggio.riga,
  padding: spazio.m,
} as const

const stileCambioValore = {
  fontSize: tipografia.size.heading,
  fontWeight: tipografia.weight.extrabold,
  color: 'var(--ink)',
} as const

/** Il valore di prima resta LEGGIBILE: barrato, mai nascosto — chi corregge
 *  deve poter vedere da dove viene. */
const stileCambioPrima = {
  color: 'var(--muted)',
  textDecoration: 'line-through',
  textDecorationThickness: 2,
} as const

const stileCambioFreccia = {
  fontSize: tipografia.size.body,
  fontWeight: tipografia.weight.extrabold,
  // `--muted` come l'etichetta accanto: la freccia vive nella STESSA scatola
  // `--bg-deep`, dove `--faint` misura 4,17:1 (sotto AA in chiaro). È
  // `aria-hidden` e quindi decorativa — difendibile lasciarla lì — ma la
  // ragione scritta venti righe più sotto vale identica anche per lei, e una
  // regola applicata a metà è una regola che la prossima revisione riapre.
  color: 'var(--muted)',
} as const

// Gate L2 del 05/08 — DUE correzioni sulla stessa etichetta (TRASCRITTO/NUOVO):
// ① 11.5 stava SOTTO il minimo della scala §4.1 (caption 12.5) — stesso difetto
//    che D87 aveva già corretto su FoglioCategoria;
// ② `--faint` su `--bg-deep` misura 4,17:1, sotto AA. Il fix di `--faint` della
//    rev. 3.1 era stato verificato su `--bg` (4,56 ✓) ma non su `--bg-deep`:
//    stesso buco che D193 ha chiuso in dark enumerando i fondi. Qui si sposta
//    l'etichetta su `--muted` invece di ritoccare il token, che vive ovunque.
const stileCambioEtichetta = {
  display: 'block',
  textAlign: 'center',
  marginTop: 3,
  fontSize: tipografia.size.caption,
  fontWeight: tipografia.weight.extrabold,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--muted)',
} as const

const stileGrigliaPastiglie = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: spazio.s,
} as const
