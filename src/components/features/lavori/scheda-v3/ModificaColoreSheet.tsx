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
// ⚠️ Rilievo riferito, NON corretto qui (R-E2): la PATCH scarta il colore in
//    silenzio: `risolviColoreCaso` restituisce `scartato` e la rotta non lo
//    legge né lo rimanda. Il controllo di qui è una rete del client, non la
//    chiusura del buco.

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
  const { aperto, onChiudi, lavoroId, titolo, trascritto, dentista, onSalvato, onErrore } = props

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

  // ── Passo 1: il salvataggio del valore ───────────────────────────────────
  async function salvaValore() {
    if (nuovo === '') {
      onErrore('Scrivi un colore, oppure chiudi senza salvare.')
      return
    }
    // 🔑 Il gesto D212 si apre SOLO se c'è una trascrizione da difendere e il
    //    valore se ne discosta. Senza snapshot non c'è nessuna domanda da
    //    fare: è un salvataggio semplice (requisito 3).
    // 🔑 Il confronto è tollerante (trim + maiuscole): il trascritto è come
    //    digitato, il vivo è normalizzato dal catalogo — un confronto stretto
    //    aprirebbe la domanda sul caso NORMALE.
    if (trascritto !== undefined && !uguagliaColore(nuovo, trascritto)) {
      setPasso('gesto')
      return
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
  async function registraDivergenza() {
    if (motivo === null) return
    setSalvando(true)
    try {
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
        onErrore(MSG_RETE)
        return
      }

      if (!risposta.ok) {
        const corpo = (await risposta.json().catch(() => null)) as { errore?: string } | null
        onErrore(corpo?.errore ?? MSG_RETE)
        return
      }

      const scritto = await scriviColoreVivo(nuovo)
      if (scritto.esito !== 'ok') {
        onSalvato({ divergenza: true })
        onErrore(`Il cambio è registrato. ${messaggioVivoNonScritto(scritto.esito, nuovo)}`)
        onChiudi()
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
            onScegli={() => setPasso('motivo')}
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
            placeholder="es. richiesta al telefono, 4 agosto"
          />

          <TastoSecondario disabled={salvando} onClick={() => setPasso('gesto')}>
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
              display: 'block',
              fontSize: 13.5,
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
        onClick={onScegli}
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

const stileSotto = {
  margin: 0,
  fontSize: 14.5,
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
  color: 'var(--faint)',
} as const

const stileCambioEtichetta = {
  display: 'block',
  textAlign: 'center',
  marginTop: 3,
  fontSize: 11.5,
  fontWeight: tipografia.weight.extrabold,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--faint)',
} as const

const stileGrigliaPastiglie = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: spazio.s,
} as const
