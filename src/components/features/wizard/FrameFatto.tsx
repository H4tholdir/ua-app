'use client'

// DS v3 §7.3 (Ondata 2, Task 12) — FrameFatto: il frame «Fatto!» del wizard,
// il cuore dell'intera Ondata 2. Copy/anatomia VERBATIM da
// wizard.html:399-440 (FRAME 4): check Ø92 tint verde, titolo 35/800, sub,
// card «IL LAVORO» (RigaDato Dentista/Lavoro/Paziente), card «CONSEGNA
// SUGGERITA» (frase RISOLTA — mai una scelta qui, la scelta vive nello sheet
// «Cambia data», vedi DEVIAZIONE nel mockup su L1 "una cosa alla volta"),
// UN SOLO TastoPrimario («Fotografa impronta e prescrizione» — l'unico rosso
// del frame) + LinkQuieto «Torna alla home».
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
// CTA foto: input file nascosto (accept image/*, capture environment — apre
// la fotocamera su mobile) pilotato dal click del TastoPrimario via ref
// (niente <label> attorno al tasto fisico: TastoPrimario è un bottone di
// libreria, non componibile come contenitore di un <input> nascosto).
// Ripetibile: dopo un upload riuscito il Frame resta il Fatto (nessuna
// navigazione), coerente con "puoi fotografare più pagine".

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { CardInfo, RigaDato } from '@/components/ds/CardInfo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { useAvvisi } from '@/components/ds/Avviso'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'
import { CambiaDataSheet } from './CambiaDataSheet'

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

const ETICHETTE_ACCESSORIO: Record<'dettagli' | 'foto', string> = {
  dettagli: 'i dettagli',
  foto: 'la foto',
}

/** Copy VERBATIM dal brief (Task 12): "Li aggiungi dalla scheda." resta invariato. */
function messaggioAccessoriFalliti(accessoriFalliti: Array<'dettagli' | 'foto'>): string {
  const elenco = accessoriFalliti.map((a) => ETICHETTE_ACCESSORIO[a]).join(' e ')
  return `Non sono riuscita a salvare ${elenco}. Li aggiungi dalla scheda.`
}

export function FrameFatto(props: {
  lavoro: { id: string; numero_lavoro: string }
  accessoriFalliti: Array<'dettagli' | 'foto'>
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
  const { lavoro, accessoriFalliti, dentista, lavoroLabel, pz, giorni, daStoria, dataConsegna, onTornaHome, oggi } = props
  const { avvisa, errore } = useAvvisi()

  const [dataAttuale, setDataAttuale] = useState(dataConsegna)
  const [sheetAperto, setSheetAperto] = useState(false)
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
      errore(messaggioAccessoriFalliti(accessoriFalliti))
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
    setCaricandoFoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('descrizione', 'prescrizione')
      const res = await fetch(`/api/lavori/${lavoro.id}/immagini`, {
        method: 'POST',
        credentials: 'same-origin',
        body: fd,
      })
      if (!res.ok) {
        errore('Non sono riuscita a salvare la foto. Riprova.')
      } else {
        avvisa('Foto salvata ✓')
      }
    } catch {
      errore('Non sono riuscita a salvare la foto. Riprova.')
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

      <div style={{ marginTop: 24 }}>
        <p style={stileCardTitolo}>Il lavoro</p>
        <CardInfo>
          <RigaDato chiave="Dentista" valore={dentista} />
          <RigaDato chiave="Lavoro" valore={lavoroLabel} />
          <RigaDato chiave="Paziente" valore={pz} />
        </CardInfo>
      </div>

      <div style={{ marginTop: 16 }}>
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

      <div style={{ marginTop: 26 }}>
        <TastoPrimario onClick={apriFileInput} disabled={caricandoFoto} motivoDisabilitato="Un attimo…">
          Fotografa impronta e prescrizione
        </TastoPrimario>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Carica la foto di impronta e prescrizione"
        onChange={handleFileChange}
        style={stileInputNascosto}
      />

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
        <LinkQuieto onClick={onTornaHome}>Torna alla home</LinkQuieto>
      </div>

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

const stileHead: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 14,
  marginTop: 10,
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
