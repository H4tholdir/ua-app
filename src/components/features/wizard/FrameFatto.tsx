'use client'

// DS v3 §7.3 (Ondata 2, Task 12 · rivisto dall'ondata B ③, T3) — FrameFatto:
// il frame «Fatto!» del wizard. Copy/anatomia da wizard.html:399-440 (FRAME 4):
// check Ø92 tint verde, titolo 35/800, sub, le carte di riepilogo, il box
// «CONSEGNA SUGGERITA» (frase RISOLTA — mai una scelta qui, la scelta vive
// nello sheet «Cambia data», vedi DEVIAZIONE nel mockup su L1 "una cosa alla
// volta"), UN SOLO TastoPrimario + i link quieti.
//
// ── LE DUE CARTE (D224, ondata B ③) ────────────────────────────────────────
// Fino a ieri il riepilogo era una carta sola, «Il lavoro». Adesso sono due, e
// la seconda si chiama «La prescrizione» perché risponde a una domanda che
// prima nessuna schermata poneva: che cosa di questo lavoro viene dal FOGLIO
// DEL DENTISTA, e che cosa invece l'abbiamo deciso noi. È la stessa distinzione
// su cui poggia la Dichiarazione di Conformità, e vale la pena vederla il
// giorno in cui il lavoro nasce, non il giorno in cui si consegna.
// · «Il lavoro» — Dentista · Prescritto da (solo se c'è) · Lavoro · Paziente ·
//   Colore SE è una scelta di laboratorio (colore sganciato, nessuna pastiglia).
// · «La prescrizione» — Elementi e Colore SE trascritti (con la pastiglia
//   «✓ dalla prescrizione») + la riga «Foglio del dentista», che chiude la
//   carta dicendo se l'originale è in archivio o manca ancora.
// Le didascalie stanno FUORI dalle carte (mockup), e ogni carta è una `section`
// con `aria-labelledby`: chi naviga a voce sente in quale delle due si trova.
//
// ── IL ROSSO CAMBIA MESTIERE ───────────────────────────────────────────────
// Senza il foglio allegato, la cosa più importante che si possa fare da questa
// schermata è allegarlo: il rosso diventa «Allega la prescrizione» e apre il
// foglio a2 (`AllegaPrescrizioneSheet`). La foto dell'impronta non sparisce —
// scende a link quieto, resta a un tap. Con il foglio in archivio il rosso
// torna «Fotografa l'impronta», e il quieto gemello si toglie di mezzo.
// 🛑 «In archivio» vuol dire UN'IMMAGINE, non una promessa (vincolo 0B-4):
//    la terza voce del foglio a2 registra da dove arriverà la prescrizione, e
//    quella riga resta AMBRA col rosso che continua a chiederla. La
//    Dichiarazione si appoggia all'originale, e un promemoria non lo è.
//
// Nessuna testata-dots (il mockup lo dice esplicitamente): questo frame
// sostituisce interamente la vista wizard, non è più "un passo fra 3".
//
// Mount: `suona('fatta')` + `vibra('success')` (stessa coppia di PillFase,
// §5.4 — "fatta" ha un solo suono/haptic in tutto il DS) — guardia via
// `useRef` contro il doppio-invoke di React StrictMode (mai due suoni per
// un solo "Fatto!"). Se `accessoriFalliti` non è vuoto, lo stesso mount
// avvisa con `useAvvisi().errore` — fail-soft: il lavoro esiste già, manca
// solo un dettaglio recuperabile dalla scheda.
//
// Foto dell'impronta: input file nascosto (accept image/*, capture environment
// — apre la fotocamera su mobile) pilotato via ref dal comando di turno, che
// sia il rosso o il link quieto (niente <label> attorno al tasto fisico:
// TastoPrimario è un bottone di libreria, non componibile come contenitore di
// un <input> nascosto). Ripetibile: dopo un upload riuscito il Frame resta il
// Fatto (nessuna navigazione), coerente con "puoi fotografare più pagine".

import { useEffect, useId, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { CardInfo, RigaDato } from '@/components/ds/CardInfo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { useAvvisi } from '@/components/ds/Avviso'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'
import { troppoGrande } from '@/lib/storage/limite-caricamento'
import { caricaImmagineDiretta, ErroreCaricamento } from '@/lib/storage/carica-diretto-client'
import { mappaElementi, type AccessorioFallito } from '@/lib/wizard/crea-lavoro'
import type { ColoreOrigine } from './WizardNuovoLavoro'
import { CambiaDataSheet } from './CambiaDataSheet'
import { AllegaPrescrizioneSheet, type FonteAllegata } from './AllegaPrescrizioneSheet'
import type { FonteTipo } from '@/lib/domain/prescrizione-costanti'

// Duplicati localmente (nota O1b, W7 — non esportati da nessun modulo
// esistente, vedi ricognizione Task 12): stessa lista di
// `src/lib/dashboard/pile-home-shared.ts`, più i mesi (assenti lì).
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

/** "giovedì 16 luglio" — VERBATIM wizard.html:434. */
function giornoEsteso(d: Date): string {
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`
}

// Task 11: `dettagli` non esiste più. Denti e colore nascono DENTRO la
// transazione del lavoro (POST /api/lavori → lavoro_crea_atomico) e non possono
// più fallire da soli; quello che può ancora mancare è ciò che la casella
// «Elemento» conteneva e non era un dente, il colore che non è in catalogo — e
// la foto.
//
// M2 (28/07/2026): il colore ENTRA in questo elenco. Il server lo scarta e crea
// comunque il lavoro («si perde il colore, mai il lavoro»), ma quella regola
// giustifica il non far fallire, NON il non dirlo: prima di oggi si digitava
// «A3,5» con la virgola, il colore finiva nel cestino e la schermata diceva
// «Fatto!» senza una parola.
//
// 🔑 `Record<AccessorioFallito, string>` sull'unione di `crea-lavoro.ts`, non su
// una copia locale: un quarto accessorio aggiunto là SPEGNE la compilazione qui
// finché non ha la sua frase.
const ETICHETTE_ACCESSORIO: Record<AccessorioFallito, string> = {
  elementi: 'gli elementi',
  colore: 'il colore',
  foto: 'la foto',
}

/**
 * Il pronome della seconda frase concorda con ciò che manca: «gli elementi» è
 * già plurale, e più cose insieme fanno plurale maschile (regola dell'italiano
 * per un elenco di genere misto) → «Li»; «il colore» da solo → «Lo»; «la foto»
 * da sola → «La».
 *
 * ⚠️ Prima di M2 la frase diceva «Li» sempre, perché tutti i casi possibili
 * erano `['elementi']` o `['elementi','foto']` — tranne `['foto']` da solo, che
 * leggeva «Non sono riuscita a salvare la foto. Li aggiungi dalla scheda.»
 * (già sbagliato, mai notato). Attaccare «il colore» a un «Li» fisso avrebbe
 * aggiunto un secondo errore invece di toglierne uno.
 */
const PRONOME_SINGOLO: Record<AccessorioFallito, string> = {
  elementi: 'Li',
  colore: 'Lo',
  foto: 'La',
}

/** «A», «A e B», «A, B e C» — mai «A e B e C». */
function elenca(pezzi: string[]): string {
  if (pezzi.length <= 1) return pezzi.join('')
  return `${pezzi.slice(0, -1).join(', ')} e ${pezzi[pezzi.length - 1]}`
}

/**
 * Copy della famiglia di casa (Task 12): dice COSA manca e COSA fare, e
 * "…aggiungi dalla scheda." resta invariato — è l'unica via di correzione, e
 * la direttiva «ogni campo del lavoro si corregge, fino alla consegna» la
 * garantisce.
 */
function messaggioAccessoriFalliti(
  accessoriFalliti: AccessorioFallito[],
  // D231① (gate L2 05/08, rilievo M3-T39-7): vero quando la carta «La
  // prescrizione» sta MOSTRANDO il colore con la pastiglia «✓ dalla
  // prescrizione». In quel caso il colore non è perduto — è perduto il colore
  // del LAVORO (il codice non è in catalogo), mentre la trascrizione del foglio
  // è scritta. Dire «non sono riuscita a salvare il colore» sopra una carta che
  // lo mostra è una frase falsa, e chi la legge crede alla frase.
  coloreTrascrittoSalvo = false,
): string {
  const coloreSoloDaApplicare = coloreTrascrittoSalvo && accessoriFalliti.includes('colore')
  const persiDavvero = coloreSoloDaApplicare
    ? accessoriFalliti.filter((a) => a !== 'colore')
    : accessoriFalliti

  const frasi: string[] = []
  if (persiDavvero.length > 0) {
    const elenco = elenca(persiDavvero.map((a) => ETICHETTE_ACCESSORIO[a]))
    const pronome = persiDavvero.length === 1 ? PRONOME_SINGOLO[persiDavvero[0]] : 'Li'
    frasi.push(`Non sono riuscita a salvare ${elenco}. ${pronome} aggiungi dalla scheda.`)
  }
  if (coloreSoloDaApplicare) {
    frasi.push(
      "Il colore l'ho trascritto dal foglio, ma non l'ho potuto applicare al lavoro: lo scegli dalla scheda.",
    )
  }
  return frasi.join(' ')
}

/** La pastiglia di provenienza (D224): dice che quel dato viene dal foglio del
 *  dentista, non da una scelta del laboratorio. Una sola costante, così le due
 *  righe che la portano non possono divergere in una revisione futura. */
const PASTIGLIA_PRESCRIZIONE = { testo: '✓ dalla prescrizione', tono: 'green' } as const

/** Come si chiama, in italiano da banco, ciascuna delle quattro forme della
 *  fonte. `Record<FonteTipo, …>` e non un `switch`: una quinta forma aggiunta
 *  al dizionario SPEGNE la compilazione qui finché non ha il suo nome — la
 *  stessa rete di `ETICHETTE_ACCESSORIO` qui sopra. */
const FORMA_FONTE: Record<FonteTipo, string> = {
  foglio: 'foglio a mano',
  modulo: 'modulo',
  email: 'email',
  piattaforma: 'piattaforma',
}

/** «dente 26» · «denti 26, 27, 31» — mai «1 elementi». Il singolare e il
 *  plurale sono la differenza fra una frase scritta da una persona e una
 *  scritta da un programma. */
function etichettaDenti(denti: number[]): string {
  return `${denti.length === 1 ? 'dente' : 'denti'} ${denti.join(', ')}`
}

export function FrameFatto(props: {
  lavoro: { id: string; numero_lavoro: string }
  elemento: string
  colore: string
  coloreOrigine?: ColoreOrigine
  richiedenteNome?: string
  accessoriFalliti: AccessorioFallito[]
  dentista: string
  lavoroLabel: string
  pz: string
  giorni: number
  daStoria: boolean
  dataConsegna: Date
  onTornaHome: () => void
  /** Iniettabile per i test (stesso schema di CampoData.tsx). */
  oggi?: Date
}) {
  const {
    lavoro, elemento, colore, coloreOrigine, richiedenteNome,
    accessoriFalliti, dentista, lavoroLabel, pz, giorni, daStoria, dataConsegna, onTornaHome, oggi,
  } = props
  const { avvisa, errore } = useAvvisi()

  const idCartaLavoro = useId()
  const idCartaPrescrizione = useId()

  const [dataAttuale, setDataAttuale] = useState(dataConsegna)
  const [sheetAperto, setSheetAperto] = useState(false)
  const [foglioFonteAperto, setFoglioFonteAperto] = useState(false)
  // Stesso contratto della `key` di CambiaDataSheet: il foglio a2 tiene un
  // passo interno (le tre voci ↔ la promessa) e deve ripartire dalle voci a
  // ogni apertura, senza un effect di reset.
  const [chiaveFoglioFonte, setChiaveFoglioFonte] = useState(0)
  const [fonte, setFonte] = useState<FonteAllegata | null>(null)
  // Contratto di CambiaDataSheet.tsx (vedi JSDoc lì): la key cambia ad ogni
  // apertura così il componente rimonta fresco, ripartendo da `dataAttuale`
  // corrente invece di un residuo dell'apertura precedente — senza bisogno
  // di un useEffect di reset (vietato da react-hooks/set-state-in-effect).
  const [chiaveSheet, setChiaveSheet] = useState(0)
  const [caricandoFoto, setCaricandoFoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function apriCambiaData() {
    setChiaveSheet((c) => c + 1)
    setSheetAperto(true)
  }

  function apriFoglioFonte() {
    setChiaveFoglioFonte((c) => c + 1)
    setFoglioFonteAperto(true)
  }

  // ── Che cosa la schermata può AFFERMARE (e che cosa no) ──────────────────
  // Ogni riga qui sotto è una cosa che è stata davvero scritta in banca dati.
  // Le condizioni non sono estetica: una riga che compare quando il dato non
  // c'è è esattamente la bugia che questa ondata esiste per uccidere.

  // I denti sono quelli che il POST ha davvero mandato: si passa dalla STESSA
  // funzione che ha deciso cosa mandare (`mappaElementi`), non da una seconda
  // lettura della casella. Ciò che non è stato capito è già raccontato
  // dall'avviso `accessoriFalliti` e qui NON compare.
  const dentiPrescritti = mappaElementi(elemento).denti

  const coloreDigitato = colore.trim()
  const coloreScartato = accessoriFalliti.includes('colore')
  const coloreSganciato = coloreOrigine === 'lab'

  // TRASCRITTO → carta «La prescrizione», con pastiglia.
  // 🔑 Resta vero ANCHE se il colore è finito fuori catalogo: la trascrizione e
  //    il colore di caso sono due strade indipendenti sul server — lo snapshot
  //    lo compone `componiSnapshot` dal testo grezzo (`componi-snapshot.ts:41`),
  //    mentre a scartare è `risolviColoreCaso`, che tocca solo `lavori.colore_*`.
  //    Quello che si perde è il colore del LAVORO, mai la trascrizione.
  const mostraColoreTrascritto = !coloreSganciato && coloreDigitato !== ''

  // SGANCIATO → carta «Il lavoro», senza pastiglia. Ma se è stato scartato non
  // è stato salvato NIENTE (nessuna trascrizione, e il codice non è in
  // catalogo): la riga sparisce, e a raccontare la perdita resta l'avviso —
  // che dice anche da dove si rimedia.
  const mostraColoreDiLaboratorio = coloreSganciato && coloreDigitato !== '' && !coloreScartato

  // Nome del prescrittore, ripulito dagli spazi: se resta niente, la riga non
  // esiste. Un `null` e uno spazio dicono la stessa cosa a chi legge.
  const richiedentePulito = (richiedenteNome ?? '').trim()

  // 🛑 IL CONFINE MDR (vincolo 0B-4): «verde» vuol dire che l'originale è in
  //    archivio, e l'originale è un'IMMAGINE. Una fonte col solo riferimento è
  //    una promessa — si registra, si mostra, ma non inverdisce niente e non
  //    toglie al rosso il suo mestiere.
  const fonteConImmagine = fonte?.immagineId != null

  // Guardia contro il doppio-invoke di React StrictMode: il ref sopravvive
  // alla cleanup+remount sintetico, quindi il secondo mount lo trova già
  // `true` e salta suono/vibra/avviso — mai due volte per un solo "Fatto!".
  const montatoUnaVoltaRef = useRef(false)
  useEffect(() => {
    if (montatoUnaVoltaRef.current) return
    montatoUnaVoltaRef.current = true
    suona('fatta')
    vibra('success')
    if (accessoriFalliti.length > 0) {
      errore(messaggioAccessoriFalliti(accessoriFalliti, mostraColoreTrascritto))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function apriFileInput() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Oltre il limite la piattaforma taglia PRIMA dell'applicazione e la rotta
    // risponde un 413 grezzo che qui diventava «Non sono riuscita a salvare la
    // foto. Riprova.» — un ciclo chiuso: riprovare con lo stesso file dà lo
    // stesso esito. Si controlla prima, e si dice cosa cambiare.
    // 📌 Il tetto ora è quello del corridoio DIRETTO (50MB, il limite vero del
    //    magazzino): da T4 i byte non passano più dalla funzione, e il muro dei
    //    ~4,2MB della piattaforma non li incontra nemmeno.
    const tropo = troppoGrande(file, { corridoio: 'diretto' })
    if (tropo) {
      errore(tropo)
      return
    }
    setCaricandoFoto(true)
    try {
      // La rotta pretende `categoria` (una delle sette di `categorie-foto.ts`,
      // validata con `isCategoriaFoto`), non più `descrizione` — rifiuta con
      // 422 chi manda il campo vecchio.
      //
      // ── D97, CHIUSA DALL'ONDATA B ③ ─────────────────────────────────────
      // Questo punto ha una storia: T11 aveva registrato la perdita («il
      // dettaglio *era la prescrizione* non è più registrato da nessuna
      // parte»), T11-bis l'aveva instradato su 'altro' come ripiego DICHIARATO,
      // D91 aveva dato una casa alla prescrizione e il valore era diventato
      // 'prescrizione'. Restava però un difetto che D97 aveva messo agli atti
      // senza poterlo chiudere: **il tasto prometteva DUE cose («Fotografa
      // impronta e prescrizione») e il dato ne registrava UNA**.
      // 🔑 Ora la prescrizione ha una strada sua — il foglio a2, che la carica
      //    con la SUA categoria e la lega alla riga della fonte. Quindi questo
      //    input torna a essere quello che dice di essere: l'IMPRONTA.
      // ⚠️ Le tre copie della promessa cambiano INSIEME, e due erano nascoste:
      //    il testo del tasto (che si legge), l'`aria-label` dell'input (che si
      //    ascolta) e questo valore (che si salva). Cambiarne una sola avrebbe
      //    lasciato in piedi lo stesso difetto, detto più piano.
      await caricaImmagineDiretta({
        lavoroId: lavoro.id,
        file,
        categoria: 'impronta',
      })
      avvisa('Foto salvata ✓')
    } catch (err) {
      // 🔑 La frase del server, quando c'è, dice cosa cambiare («pesa 62,0 MB e
      //    il massimo è 50MB»); la generica dice solo che è andata male. Il
      //    modulo del caricamento porta già quella del server dentro
      //    `ErroreCaricamento`.
      errore(
        err instanceof ErroreCaricamento
          ? err.message
          : 'Non sono riuscita a salvare la foto. Riprova.'
      )
    } finally {
      setCaricandoFoto(false)
    }
  }

  const suffisso = daStoria
    ? `di solito ci mettete ${giorni} giorni.`
    : `tempo tipico per questo lavoro: ${giorni} giorni.`

  return (
    <div>
      <div style={stileHead}>
        <div className="ds-fatto-check" aria-hidden="true" style={stileCheck}>
          <svg
            viewBox="0 0 24 24"
            width="46"
            height="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12.5l5.5 5.5L20 7" />
          </svg>
        </div>
        <h1 style={stileTitolo}>Fatto!</h1>
        <p style={stileSub}>Il lavoro è nato. Lo trovi fra gli «Appena arrivati», da confermare.</p>
      </div>

      {/* ── Carta ① «Il lavoro» — la caption sta FUORI dalla carta (mockup) ── */}
      <section aria-labelledby={idCartaLavoro} style={{ marginTop: spazio.ml }}>
        <p id={idCartaLavoro} style={stileCardTitolo}>Il lavoro</p>
        <CardInfo>
          <RigaDato chiave="Dentista" valore={dentista} />
          {/* Adiacente a «Dentista», e SOLO se c'è (vincolo 0B-9). */}
          {richiedentePulito !== '' && <RigaDato chiave="Prescritto da" valore={richiedentePulito} />}
          <RigaDato chiave="Lavoro" valore={lavoroLabel} />
          <RigaDato chiave="Paziente" valore={pz} />
          {/* Il colore SGANCIATO atterra qui, senza pastiglia: non viene dal
              foglio del dentista, è una scelta del laboratorio. */}
          {mostraColoreDiLaboratorio && <RigaDato chiave="Colore" valore={coloreDigitato} />}
        </CardInfo>
      </section>

      {/* ── Carta ② «La prescrizione» — ciò che viene dal foglio del dentista ── */}
      <section aria-labelledby={idCartaPrescrizione} style={{ marginTop: spazio.sm }}>
        <p id={idCartaPrescrizione} style={stileCardTitolo}>La prescrizione</p>
        <CardInfo>
          {dentiPrescritti.length > 0 && (
            <RigaDato
              chiave="Elementi"
              valore={etichettaDenti(dentiPrescritti)}
              pastiglia={PASTIGLIA_PRESCRIZIONE}
            />
          )}
          {mostraColoreTrascritto && (
            <RigaDato chiave="Colore" valore={coloreDigitato} pastiglia={PASTIGLIA_PRESCRIZIONE} />
          )}
          <RigaDato
            chiave="Foglio del dentista"
            valore={
              fonteConImmagine ? (
                <span className="ds-fonte-miniatura" aria-hidden="true" style={stileMiniatura}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="7" x2="16" y2="7" />
                    <line x1="8" y1="11" x2="16" y2="11" />
                    <line x1="8" y1="15" x2="13" y2="15" />
                  </svg>
                </span>
              ) : fonte ? (
                fonte.riferimento
              ) : (
                <span style={stilePastigliaAmbraSola}>Da allegare</span>
              )
            }
            pastiglia={
              fonte === null
                ? undefined
                : fonteConImmagine
                  ? { testo: `✓ Allegata · ${FORMA_FONTE[fonte.tipo]}`, tono: 'green' }
                  : { testo: 'Da allegare', tono: 'amber' }
            }
          />
        </CardInfo>
      </section>

      <div style={{ marginTop: spazio.sm }}>
        <p style={stileCardTitolo}>Consegna suggerita</p>
        <div style={stileConsegnaBox}>
          <p style={stileFrase}>
            Pronta per <strong>{giornoEsteso(dataAttuale)}</strong> — {suffisso}
          </p>
          <div style={{ marginTop: 10 }}>
            <LinkQuieto onClick={apriCambiaData}>Cambia data</LinkQuieto>
          </div>
        </div>
      </div>

      {/* ── Il rosso cambia mestiere ─────────────────────────────────────────
          Senza il foglio allegato l'unica cosa che vale un tasto rosso è il
          foglio: la foto dell'impronta scende a link quieto e resta a un tap.
          Con il foglio in archivio, il rosso torna quello di sempre. */}
      <div style={{ marginTop: spazio.ml }}>
        {fonteConImmagine ? (
          <TastoPrimario onClick={apriFileInput} disabled={caricandoFoto} motivoDisabilitato="Un attimo…">
            Fotografa l&apos;impronta
          </TastoPrimario>
        ) : (
          <TastoPrimario onClick={apriFoglioFonte} disabled={caricandoFoto} motivoDisabilitato="Un attimo…">
            Allega la prescrizione
          </TastoPrimario>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Carica la foto dell'impronta"
        onChange={handleFileChange}
        style={stileInputNascosto}
      />

      {/* I quieti sono IMPILATI, mai affiancati (vincolo 0B-3): a 390px due
          bersagli da 44 accostati a 28px di distanza si prendono l'uno per
          l'altro col pollice. Ordine: prima l'azione, poi l'uscita.
          ⚠️ Deviazione DICHIARATA dal mockup, che li mette in riga a gap 28. */}
      <div style={stileQuieti}>
        {!fonteConImmagine && <LinkQuieto onClick={apriFileInput}>Fotografa l&apos;impronta</LinkQuieto>}
        <LinkQuieto onClick={onTornaHome}>Torna alla home</LinkQuieto>
      </div>

      <AllegaPrescrizioneSheet
        key={chiaveFoglioFonte}
        aperto={foglioFonteAperto}
        onChiudi={() => setFoglioFonteAperto(false)}
        lavoroId={lavoro.id}
        onFonte={setFonte}
      />

      <CambiaDataSheet
        key={chiaveSheet}
        aperto={sheetAperto}
        onChiudi={() => setSheetAperto(false)}
        lavoroId={lavoro.id}
        suggerita={dataConsegna}
        dataAttuale={dataAttuale}
        onConfermata={setDataAttuale}
        oggi={oggi}
      />
    </div>
  )
}

// D233① «compattiamo» (Francesco, gate L2 05/08) — gli spazi neutri si stringono.
// ⚠️ Ogni passo qui sotto sta sulla griglia §4.2 (4/8/12/16/20/24/32/44): 18 e
//    14 NON ci sono, e 14 è ammesso solo sul regime viewport ≤700px — la prima
//    stesura di questo compattamento li aveva usati, e la revisione li ha presi.
// 🛑 NON si tocca: il cerchio Ø92 (valore verbatim del mockup approvato) né il
//    gap 44 fra i due link quieti, che è un vincolo di SICUREZZA del pollice
//    (0B-3: sotto quella misura le due aree da 44px si sovrappongono e il tap
//    finisce sul bersaglio sbagliato). Sono le due sole leve capaci di
//    recuperare molto, ed entrambe costerebbero una decisione, non un ritocco.
const stileHead: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: spazio.sm,
  marginTop: spazio.xs,
}

// wizard.html:179 .fatto-check — Ø92, tint verde.
const stileCheck: CSSProperties = {
  width: 92,
  height: 92,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--green-tint)',
  color: 'var(--green)',
}

// wizard.html:184 .fatto-title — 35/800, VERBATIM brief Step 2 ("35/800").
const stileTitolo: CSSProperties = {
  fontSize: tipografia.size.question,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: tipografia.tracking.titoli,
  color: 'var(--ink)',
}

// wizard.html:185 .fatto-sub — 16/600, letterale fuori scala (come altrove nel wizard).
const stileSub: CSSProperties = {
  fontSize: 16,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--muted)',
  maxWidth: 300,
}

// wizard.html:187 .card-title — caption 12.5/800 maiuscola faint.
const stileCardTitolo: CSSProperties = {
  fontSize: tipografia.size.caption,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: tipografia.tracking.caption,
  textTransform: 'uppercase',
  color: 'var(--faint)',
  marginBottom: spazio.xs,
}

// Stessa materia-carta di CardInfo (raggio.tile, sh-card) — non riesportata
// da CardInfo.tsx (stile module-private), duplicata qui per il box "consegna"
// che non è fatto di RigaDato ma di una frase libera.
const stileConsegnaBox: CSSProperties = {
  borderRadius: raggio.tile,
  padding: '16px 20px',
  background: 'var(--card)',
  boxShadow: 'var(--sh-card)',
}

const stileFrase: CSSProperties = {
  fontSize: tipografia.size.body,
  fontWeight: tipografia.weight.bold,
  color: 'var(--ink)',
  lineHeight: 1.4,
  margin: 0,
}

// Pattern "visually-hidden" (identico a PassoPaziente.tsx RigaFoto): mai
// `display:none`, che toglierebbe l'input dal focus/dall'albero a11y.
const stileInputNascosto: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
}

// Mockup `.fonte-mini` — la fonte allegata si vede prima di leggerla: un
// riquadro 44×44 col glifo del documento. NON è la foto vera (una fonte può
// essere un PDF, che non ha anteprima), e non deve esserlo: qui basta dire
// «c'è», il documento si apre dalla scheda.
const stileMiniatura: CSSProperties = {
  width: 44,
  height: 44,
  flex: 'none',
  borderRadius: raggio.riga - 6,
  background: 'var(--bg-deep)',
  color: 'var(--muted)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

// La pastiglia ambra quando è l'UNICA cosa che la riga ha da dire (nessuna
// fonte ancora): allora sta nel posto del valore, non sotto — è il valore.
// Stessa materia della pastiglia di `RigaDato` (§5.10, estensione D224).
const stilePastigliaAmbraSola: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 11px',
  borderRadius: raggio.pill,
  background: 'var(--amber-tint)',
  color: 'var(--amber)',
  fontSize: tipografia.size.caption,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

// Vincolo 0B-3 — impilati, con aria fra i due: mai due bersagli da 44 accostati
// in orizzontale a distanza di pollice.
// gap: spazio.xxl (44), NON spazio.sm — LinkQuieto ha hit-box 44px ottenuto con
// padding verticale 13px + margin negativo -13px uguale e contrario (vedi
// LinkQuieto.tsx): fra due hit-box consecutivi la distanza reale è
// gap - 13 (margin del primo) - 13 (margin del secondo) = gap - 26. Con
// spazio.sm (12) dava -14px (sovrapposizione, il secondo elemento del DOM
// vince il tap); con spazio.xxl (44) dà 18px d'aria vera.
const stileQuieti: CSSProperties = {
  // 🛑 20, e NON meno — trovato dalla revisione del gate L2, 05/08. `LinkQuieto`
  //    compra la sua hit-box da 44px con `padding 13px 0` + `margin -13px 0`:
  //    quel −13 risale DENTRO questo marginTop (i margini di un flex item non
  //    collassano), quindi l'aria vera fra l'area toccabile del rosso e quella
  //    del primo quieto è `marginTop − 13`. Con 14 faceva **1px**: un pollice
  //    2px basso sul rosso «Allega la prescrizione» apriva la fotocamera, o —
  //    a fonte allegata — se ne andava dalla schermata con «Torna alla home».
  //    È la stessa aritmetica che il blocco 🛑 sopra `stileHead` protegge fra i
  //    DUE quieti, e il compattamento l'aveva rotta dall'altro lato. Con 20 fa
  //    7px, più di prima (erano 5), ed è un passo di griglia §4.2.
  marginTop: spazio.ml,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: spazio.xxl,
}
