'use client'

// DS v3 §5.16 · ondata B ③ / T9 — «La prescrizione del dentista»: il foglio a2.
//
// È la casa dell'unico gesto che la Dichiarazione di Conformità pretende e che
// il wizard non poteva ancora fare: allegare la fonte, cioè il foglio del
// dentista in qualunque forma sia arrivato. Si apre dal rosso del «Fatto!»
// quando la fonte manca (FrameFatto), e riporta al chiamante ciò che il server
// ha davvero scritto.
//
// ── I TESTI SONO D222, INVARIATI ALLA LETTERA ──────────────────────────────
// Titolo, sottotesto e le tre voci (nome + sottotitolo) vengono dalla scena
// `a2-fatto-vero` del mockup `docs/design/mockups/2026-08-04-ondata-b3-schermate-vere.html`
// e sono già decisi: non si riscrivono, non si accorciano, non si "migliorano".
//
// ── IL TIPO DI FONTE SI DEDUCE DAL GESTO, MAI DA UNA DOMANDA (spec §4.2) ───
// Le quattro forme (`FONTE_TIPI`) non compaiono da nessuna parte a schermo.
// Chi scatta o sceglie un'immagine sta allegando un `foglio`; chi sceglie un
// PDF un `modulo`; chi dice «non ce l'ho ancora qui» sceglie fra due canali
// che SONO i due tipi restanti (`email` / `piattaforma`). L'odontotecnico non
// deve mai imparare un vocabolario per compiere il gesto più frequente.
//
// ── LA TERZA VOCE: RISOLUZIONE DEL CONTROLLORE (gate L2 con Francesco) ─────
// D222 fissa il NOME della voce («Non ce l'ho ancora qui») ma non la forma di
// ciò che succede dopo. La risoluzione adottata: un PASSO LEGGERO dentro lo
// stesso foglio — due pastiglie «Per email» / «Dalla piattaforma» + una casella
// facoltativa «Da dove arriva?» + una conferma. Nessuna via preselezionata
// (stesso principio del gesto D212): scegliere per l'utente è affermare al suo
// posto. E il testo libero resta FACOLTATIVO perché la rotta pretende comunque
// un corpo (`fonte/route.ts:114-118`, «almeno un corpo»): quando la casella
// resta vuota parte un riferimento di riposo ONESTO («Arriva per email»), che
// dice esattamente quanto si sa e non un carattere di più.
//
// 🛑 QUESTA VOCE NON FA DIVENTARE VERDE NIENTE (vincolo 0B-4, MDR). Registra
//    una PROMESSA, non una prova: il chiamante riceve `immagineId: null` e la
//    riga della fonte resta ambra, col rosso che continua a chiedere il foglio.
//    La Dichiarazione si appoggia all'originale, e un promemoria non è un
//    originale.
//
// ── LE VOCI SONO DISEGNATE QUI, E LA RAGIONE VA SCRITTA ────────────────────
// L'anatomia è quella di `MenuVoce` (§5.34) — min-height 56, icona Ø38 radius
// 11 tinta neutra, chevron `--faint` — ma NON si usa quel componente: la sua
// unica riga secondaria (`nota`) è `var(--red)`, perché nel menù ⋯ serve ad
// avvisare di un'azione distruttiva. Qui le tre righe sotto il nome sono
// descrizioni quiete (`--muted`), e passarle da `nota` le dipingerebbe di
// rosso. Estendere §5.34 sarebbe un cambio di superficie del DS senza mandato:
// il vuoto è RIFERITO (R-E2), non colmato di nascosto.
//
// ── CONTRATTO COL CHIAMANTE (identico a CambiaDataSheet) ───────────────────
// Questo componente NON azzera il proprio passo interno a ogni riapertura con
// un effect (violerebbe react-hooks/set-state-in-effect). Il chiamante lo monta
// con una `key` che cambia a ogni apertura, così un rimontaggio fresco riparte
// sempre dalle tre voci invece che dal passo della promessa in cui l'utente si
// era fermato la volta prima.

import { useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { ChipScelta } from '@/components/ds/ChipScelta'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { CampoTesto } from '@/components/ds/Campo'
import { useAvvisi } from '@/components/ds/Avviso'
import { MAX_UPLOAD_DIRETTO_ETICHETTA, troppoGrande } from '@/lib/storage/limite-caricamento'
import { caricaImmagineDiretta, ErroreCaricamento } from '@/lib/storage/carica-diretto-client'
import { spazio, tipografia, raggio } from '@/design-system/v3/tokens'
// 🛑 Il dizionario si IMPORTA, mai si riscrive: è la stessa costante che la
// rotta usa per rifiutare con 422 (`fonte/route.ts:78`), ed è sorvegliata
// contro il vincolo in banca dati dalla spia delle migration.
import { isFonteTipo, type FonteTipo } from '@/lib/domain/prescrizione-costanti'

/** Ciò che il chiamante riceve quando la fonte è stata scritta: la forma
 *  NORMALIZZATA che il server ha davvero registrato, non l'eco di ciò che
 *  abbiamo spedito. `immagineId: null` = promessa, non prova (vincolo 0B-4). */
export type FonteAllegata = {
  tipo: FonteTipo
  immagineId: string | null
  riferimento: string | null
}

/** I due canali della terza voce. Sono due dei quattro `FONTE_TIPI`, e il tipo
 *  lo dice: se il dizionario cambiasse, questa riga smetterebbe di compilare. */
type Canale = Extract<FonteTipo, 'email' | 'piattaforma'>

/** Il riferimento di riposo quando la casella resta vuota. Dice quanto si sa —
 *  il canale — e nulla di più: la rotta rifiuta una stringa vuota (422,
 *  `fonte/route.ts:107`) e inventare un dettaglio sarebbe peggio del vuoto. */
const RIFERIMENTO_DI_RIPOSO: Record<Canale, string> = {
  email: 'Arriva per email',
  piattaforma: 'Arriva dalla piattaforma',
}

const ETICHETTA_CANALE: Record<Canale, string> = {
  email: 'Per email',
  piattaforma: 'Dalla piattaforma',
}

/** Il tipo si deduce dal FILE, cioè dal gesto: un PDF è un modulo, tutto il
 *  resto è il foglio fotografato. Nessuna domanda all'utente (spec §4.2). */
function tipoDalFile(file: File): FonteTipo {
  return file.type === 'application/pdf' ? 'modulo' : 'foglio'
}

/** L'esito dichiarato dal server, se c'è. 🛑 SI LEGGE `esito` DENTRO `{errore,
 *  esito?}`: questa rotta NON parla il dialetto `{error}` della rotta immagini,
 *  e leggere la chiave sbagliata farebbe cadere ogni ramo specifico in quello
 *  generico — in silenzio, che è il modo peggiore. La lettura è protetta: un
 *  502 di un proxy non è JSON. */
async function esitoDichiarato(res: Response): Promise<string | null> {
  try {
    const corpo = (await res.json()) as { esito?: unknown } | null
    return typeof corpo?.esito === 'string' ? corpo.esito : null
  } catch {
    return null
  }
}

const FRASE_CONGELATA =
  'Questa prescrizione è già bloccata dalla Dichiarazione di Conformità. Per cambiarla, annulla prima la Dichiarazione.'

/** Il messaggio per un fallimento della rotta `/immagini` (dialetto `{error}`,
 *  quella rotta non parla `{errore,esito}` come `fonte/route.ts`).
 *  🛑 413 e 415 sono raggiungibili dal PICKER STESSO — `accept="image/*"`
 *  ammette formati che `ALLOWED_MIME` rifiuta (`route.ts:12-19`: solo JPEG,
 *  PNG, WEBP, GIF, HEIC, PDF — niente TIFF né HEIF), e la soglia di peso
 *  (`limite-caricamento.ts`) ~~non ha alcun controllo lato client~~ ora ce l'ha,
 *  ed è quello che si legge per primo. Con la frase generica
 *  «Riprova», l'utente ripete lo STESSO file e ottiene lo STESSO rifiuto:
 *  un ciclo chiuso. Queste due frasi dicono cosa cambiare, non solo che è
 *  fallito. */
function fraseErroreImmagine(status: number): string {
  if (status === 413) {
    // 🔴 Diceva «più grande di 20MB», e per nessun file era vero: la piattaforma
    //    taglia a ~4,2MB PRIMA dell'applicazione (misurato sul deployment vivo
    //    il 05/08/2026 — v. `limite-caricamento.ts`). Chi arrivava qui con una
    //    foto da 6MB leggeva un numero che il suo file non superava, e riprovava
    //    con lo stesso file. Ora il controllo scatta PRIMA di partire e questa
    //    frase è solo la rete: la si legge se il 413 arriva lo stesso.
    return `Questo file supera il massimo di ${MAX_UPLOAD_DIRETTO_ETICHETTA}: scegline uno più leggero.`
  }
  if (status === 415) {
    return 'Formato non supportato: usa JPG, PNG, WEBP, GIF, HEIC o PDF.'
  }
  return 'Non sono riuscita a salvare la prescrizione. Riprova.'
}

export function AllegaPrescrizioneSheet(props: {
  aperto: boolean
  onChiudi: () => void
  lavoroId: string
  /** Chiamata SOLO quando il server ha scritto la fonte. */
  onFonte: (fonte: FonteAllegata) => void
}) {
  const { aperto, onChiudi, lavoroId, onFonte } = props
  const { errore } = useAvvisi()

  const [passo, setPasso] = useState<'voci' | 'promessa'>('voci')
  const [canale, setCanale] = useState<Canale | null>(null)
  const [testo, setTesto] = useState('')
  const [inCorso, setInCorso] = useState(false)

  const fotocameraRef = useRef<HTMLInputElement>(null)
  const galleriaRef = useRef<HTMLInputElement>(null)

  /**
   * Scrive la fonte. Ritorna `true` solo se il server l'ha scritta davvero.
   * `seguitoAFoto` cambia SOLO la frase dell'errore: quando la foto è già in
   * archivio, dirlo è metà del rimedio — l'utente sa che non deve rifotografare
   * niente, solo collegare dalla scheda.
   */
  async function scriviFonte(
    corpo: Record<string, string>,
    atteso: { tipo: FonteTipo; immagineId: string | null; riferimento: string | null },
    seguitoAFoto: boolean
  ): Promise<boolean> {
    const fraseGenerica = seguitoAFoto
      ? 'Ho salvato la foto, ma non sono riuscita a segnarla come prescrizione. La colleghi dalla scheda.'
      : 'Non sono riuscita a segnare la prescrizione. Riprova.'
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/prescrizione/fonte`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      if (!res.ok) {
        const esito = await esitoDichiarato(res)
        errore(esito === 'fonte_congelata' ? FRASE_CONGELATA : fraseGenerica)
        return false
      }
      // Si ridisegna con la fonte NORMALIZZATA che la rotta restituisce
      // (`fonte/route.ts:215-224`), non con l'eco del corpo spedito. Se il corpo
      // della risposta fosse illeggibile si ricade su ciò che si è mandato: è
      // stato scritto comunque, e perdere la riga sarebbe peggio che ridisegnarla
      // da una fonte di seconda scelta.
      let scritta = atteso
      try {
        const dati = (await res.json()) as {
          fonte?: { fonte_tipo?: unknown; fonte_immagine_id?: unknown; fonte_riferimento?: unknown }
        } | null
        const f = dati?.fonte
        if (f && isFonteTipo(f.fonte_tipo)) {
          scritta = {
            tipo: f.fonte_tipo,
            immagineId: typeof f.fonte_immagine_id === 'string' ? f.fonte_immagine_id : null,
            riferimento: typeof f.fonte_riferimento === 'string' ? f.fonte_riferimento : null,
          }
        }
      } catch {
        /* si tiene `atteso` — v. sopra */
      }
      onFonte(scritta)
      return true
    } catch {
      errore(fraseGenerica)
      return false
    }
  }

  /** ① e ② finiscono qui: stesso viaggio, tipo diverso dedotto dal file. */
  async function caricaEAllega(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || inCorso) return
    // Prima di spendere un byte: oltre il limite la richiesta non arriva nemmeno
    // all'applicazione, e su rete mobile l'utente avrebbe aspettato decine di
    // secondi per un rifiuto già deciso in partenza.
    // 📌 Tetto del corridoio DIRETTO (50MB): da T4 i byte vanno dritti al
    //    magazzino. ⚖️ E questo file **non si comprime mai** (D237): è il
    //    documento su cui si appoggia la Dichiarazione di Conformità.
    const tropo = troppoGrande(file, { corridoio: 'diretto' })
    if (tropo) {
      errore(tropo)
      return
    }
    setInCorso(true)
    try {
      // D91/D97 — la prescrizione ha la sua categoria da quando è una colonna:
      // qui non è un ripiego, è letteralmente ciò che la foto ritrae.
      // 🛑 L'id NON si inventa: senza, la rotta fonte risponderebbe 422 su un
      //    uuid malformato e l'utente leggerebbe un errore che non spiega
      //    niente. Il modulo del caricamento solleva se la riga non torna.
      let immagineId: string
      try {
        const immagine = await caricaImmagineDiretta({
          lavoroId,
          file,
          categoria: 'prescrizione',
        })
        immagineId = immagine.id
      } catch (err) {
        errore(
          err instanceof ErroreCaricamento && err.stato
            ? fraseErroreImmagine(err.stato)
            : err instanceof ErroreCaricamento
              ? err.message
              : 'Non sono riuscita a salvare la prescrizione. Riprova.'
        )
        return
      }

      const tipo = tipoDalFile(file)
      const ok = await scriviFonte(
        { fonte_tipo: tipo, fonte_immagine_id: immagineId },
        { tipo, immagineId, riferimento: null },
        true
      )
      if (ok) onChiudi()
    } catch {
      errore('Non sono riuscita a salvare la prescrizione. Riprova.')
    } finally {
      setInCorso(false)
    }
  }

  /** ③ — la promessa: nessuna immagine, solo il canale e (se c'è) il dettaglio. */
  async function confermaPromessa() {
    if (!canale || inCorso) return
    setInCorso(true)
    try {
      const riferimento = testo.trim() === '' ? RIFERIMENTO_DI_RIPOSO[canale] : testo
      const ok = await scriviFonte(
        { fonte_tipo: canale, fonte_riferimento: riferimento },
        { tipo: canale, immagineId: null, riferimento },
        false
      )
      if (ok) onChiudi()
    } finally {
      setInCorso(false)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo="La prescrizione del dentista">
      <p style={stileSottotesto}>
        In qualunque forma sia arrivata: si allega l’originale, e la Dichiarazione si appoggia a
        quello. Senza, la consegna si ferma (te lo ricordo lì, non adesso).
      </p>

      {passo === 'voci' ? (
        <div>
          <Voce
            nome="Scatta una foto"
            sotto="il foglio scritto a mano, il modulo compilato"
            disabilitata={inCorso}
            onTap={() => fotocameraRef.current?.click()}
            icona={
              <>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </>
            }
          />
          <Voce
            nome="Dalla galleria o un PDF"
            sotto="una foto già fatta, l’email salvata, il PDF del modulo"
            disabilitata={inCorso}
            onTap={() => galleriaRef.current?.click()}
            icona={
              <>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </>
            }
          />
          <Voce
            nome="Non ce l’ho ancora qui"
            sotto="arriva per email o dalla piattaforma: segno da dove, la allego dopo"
            disabilitata={inCorso}
            ultima
            onTap={() => setPasso('promessa')}
            icona={
              <>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </>
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          {/* 🛑 La frase NON promette che sia fatta: dice che è segnata e che
              manca ancora il foglio (vincolo 0B-4). */}
          <p style={stileSottotesto}>
            La segno da dove arriva, così non si perde. Resta <strong>da allegare</strong>: il
            foglio serve prima della consegna.
          </p>
          <div style={{ display: 'flex', gap: spazio.s, flexWrap: 'wrap' }}>
            {(Object.keys(ETICHETTA_CANALE) as Canale[]).map((c) => (
              <ChipScelta key={c} selezionata={canale === c} onClick={() => setCanale(c)}>
                {ETICHETTA_CANALE[c]}
              </ChipScelta>
            ))}
          </div>
          <CampoTesto
            label="Da dove arriva?"
            valore={testo}
            onCambia={setTesto}
            // Gate L2 05/08 — misurato allo scatto a 390: il testo d'esempio
            // finiva tagliato dentro il nome («dal Dr. Ros»), senza ellissi né
            // sfumatura. Stesso difetto del placeholder del foglio motivo, e
            // stessa cura: più corto, così ci sta intero sullo schermo stretto.
            placeholder="es. email del 4 agosto"
            aiuto="Facoltativo: serve solo a te, per ritrovarla."
          />
          {/* Conferma = TastoSecondario, MAI un secondo rosso: l'unico rosso è
              quello del «Fatto!» che sta sotto (stessa regola di CambiaDataSheet). */}
          <TastoSecondario onClick={confermaPromessa} disabled={!canale || inCorso}>
            Conferma
          </TastoSecondario>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LinkQuieto onClick={() => setPasso('voci')}>Torna indietro</LinkQuieto>
          </div>
        </div>
      )}

      {/* Gli input veri. Pattern "visually-hidden" (identico a FrameFatto): mai
          `display:none`/`hidden`, che li toglierebbe dall'albero a11y — e
          l'etichetta è ciò con cui una tastiera, e una prova, li nominano. */}
      <input
        ref={fotocameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Scatta la foto della prescrizione"
        onChange={caricaEAllega}
        style={stileInputNascosto}
      />
      {/* 🔑 NIENTE `capture` qui, ed è il punto della seconda voce: con
          `capture` il telefono aprirebbe la fotocamera invece del selettore di
          file, e il PDF del modulo non sarebbe raggiungibile. Precedente in
          casa: `TabImmagini.tsx:389-391`. */}
      <input
        ref={galleriaRef}
        type="file"
        accept="image/*,application/pdf"
        aria-label="Scegli la prescrizione dalla galleria o un PDF"
        onChange={caricaEAllega}
        style={stileInputNascosto}
      />
    </Sheet>
  )
}

/** Una voce del foglio — anatomia §5.34, sottotitolo quieto (v. cappello). */
function Voce(props: {
  nome: string
  sotto: string
  icona: ReactNode
  ultima?: boolean
  disabilitata?: boolean
  onTap: () => void
}) {
  const { nome, sotto, icona, ultima = false, disabilitata = false, onTap } = props
  return (
    <button
      type="button"
      className="ds-tap-v3"
      disabled={disabilitata}
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spazio.m,
        width: '100%',
        minHeight: 56,
        padding: `${spazio.s}px 0`,
        // I separatori li possiede il contenitore, che conosce la posizione
        // (§5.34): qui è la voce a sapere se è l'ultima, e l'ultima non lo porta.
        borderStyle: 'none',
        borderBottomStyle: ultima ? 'none' : 'solid',
        borderBottomWidth: ultima ? 0 : 1.5,
        borderBottomColor: 'var(--line)',
        background: 'none',
        color: 'var(--ink)',
        fontFamily: tipografia.famiglia,
        textAlign: 'left',
        cursor: disabilitata ? 'default' : 'pointer',
        opacity: disabilitata ? 0.6 : 1,
      }}
    >
      <span aria-hidden="true" style={stileIcona}>
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icona}
        </svg>
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: tipografia.size.body, fontWeight: tipografia.weight.bold }}>{nome}</span>
        <span style={{ fontSize: 13, fontWeight: tipografia.weight.semibold, color: 'var(--muted)' }}>
          {sotto}
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{ color: 'var(--faint)', fontSize: 19, fontWeight: tipografia.weight.extrabold }}
      >
        {'›'}
      </span>
    </button>
  )
}

const stileIcona: CSSProperties = {
  flexShrink: 0,
  width: 38,
  height: 38,
  borderRadius: raggio.riga - 7,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-deep)',
  color: 'var(--muted)',
}

const stileSottotesto: CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--muted)',
  lineHeight: 1.4,
}

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
