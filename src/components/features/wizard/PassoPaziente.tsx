'use client'

// DS v3 §7.3/§5.27/§5.5/§5.3 (Ondata 2, Task 11; framing D223 Task 2) —
// PassoPaziente: il Passo 3 del wizard «Nuovo lavoro». Copy VERBATIM da
// wizard.html:356-388 (frame «Passo 3 · paziente»): domanda, hint, CampoTesto
// «Codice paziente» precompilato + nota GDPR, blocco «Se vuoi, aggiungi»
// (Elemento/Colore/Nome o alias, ciascuno "Salta"-abile), riga foto impronta
// dashed, «Continua».
//
// GDPR (A8, ratificato §2.1): il default paziente resta SOLO il codice
// PZ-#### proposto da UÀ — nessun nome è mai richiesto. L'alias (riga «Nome o
// alias») è opt-in: chi lo compila lo fa scegliendo di farlo, non perché il
// campo lo chieda con urgenza (stessa anatomia "Salta" delle altre due righe
// opzionali, nessuna enfasi visiva diversa).
//
// «Continua» = TastoSecondario, MAI TastoPrimario/rosso (piano Task 11): non
// è il percorso minimo del laboratorio (fotografare l'impronta lo è, Task 13),
// è solo l'uscita di chi non aggiunge nulla d'altro qui. Il Task 12 cablerà
// `onContinua`/`inCreazione` reali (creazione del lavoro) — qui restano
// contratto puro, consumato da WizardNuovoLavoro con uno stub.
//
// PillVoce RIMOSSA (Task 2 — §5.15 della spec DS v3 è ABROGATA, D13): con lei
// sparisce anche il tracciamento del "campo attivo" (`campoAttivo`/`onFocus`
// per instradare la dettatura) — era codice vivo SOLO per alimentarla, non
// serve a nient'altro nel file.
//
// La riga «Colore» (Task 2, D223 — variante B «nome asciutto»): nome
// asciutto in stato chiuso, framing pieno di D210 in stato aperto (etichetta
// + aiuto + sgancio/ritorno su `coloreOrigine`). Vive in `RigaColore` qui
// sotto, distinta dalla `RigaOpzionale` generica che regge Elemento/Alias —
// le due righe sorelle non hanno stati di provenienza da raccontare.

import { useId, useState, type ChangeEvent, type CSSProperties } from 'react'
import { tipografia, raggio, spazio, gradiente } from '@/design-system/v3/tokens'
import { CampoTesto } from '@/components/ds/Campo'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import type { StatoWizard, ColoreOrigine } from './WizardNuovoLavoro'

export function PassoPaziente(props: {
  pz: string
  alias: string
  elemento: string
  colore: string
  /** OPZIONALE apposta, come `StatoWizard.coloreOrigine` — v. Task 1: assente
   *  E `'prescrizione'` sono lo stesso significato (D223, "scrivere è
   *  trascrivere"). */
  coloreOrigine?: ColoreOrigine
  foto: File | null
  onCambia: (patch: Partial<StatoWizard>) => void
  onContinua: () => void
  inCreazione: boolean
}) {
  const { pz, alias, elemento, colore, coloreOrigine, foto, onCambia, onContinua, inCreazione } = props

  return (
    <div>
      <h1 style={stileDomanda}>Chi è il paziente?</h1>
      <p style={stileHint}>Il codice è già pronto. Cambialo solo se serve.</p>

      <div style={stileCampoWrap}>
        <CampoTesto label="Codice paziente" valore={pz} onCambia={(v) => onCambia({ pz: v })} />
        <p style={stileNota}>UÀ propone il prossimo numero. Nessun nome, solo il codice (GDPR).</p>
      </div>

      <div style={stileOpz}>
        <p style={stileOpzCap}>Se vuoi, aggiungi</p>

        <RigaOpzionale
          nome="Elemento"
          esempio="es. 2.6"
          valore={elemento}
          ultima={false}
          onCambia={(v) => onCambia({ elemento: v })}
        />
        <RigaColore
          valore={colore}
          origine={coloreOrigine}
          onCambia={(v) => onCambia({ colore: v })}
          onCambiaOrigine={(o) => onCambia({ coloreOrigine: o })}
        />
        <RigaOpzionale
          nome="Nome o alias"
          valore={alias}
          ultima
          onCambia={(v) => onCambia({ alias: v })}
        />

        <RigaFoto foto={foto} onCambia={(f) => onCambia({ foto: f })} />
      </div>

      <div style={{ marginTop: 22 }}>
        <TastoSecondario onClick={onContinua} disabled={inCreazione}>
          Continua
        </TastoSecondario>
      </div>
    </div>
  )
}

/**
 * RigaOpzionale — una riga del blocco «Se vuoi, aggiungi» (Elemento/Colore/
 * Nome o alias), mockup `.opz-riga` (wizard.html:154-161).
 *
 * Chiusa: nome + esempio (tap → apre) + LinkQuieto «Salta» (L6, no-op se già
 * vuota). Aperta: CampoTesto inline al posto della riga (autoFocus, cambia
 * subito il valore reale — niente stato-bozza separato) + lo stesso «Salta»,
 * che qui richiude la riga E svuota il valore (`onCambia('')`) — l'unico
 * punto in cui «Salta» ha un effetto reale.
 *
 * `aperto` parte da `valore !== ''`: se il wizard torna al Passo 3 con un
 * valore già presente (indietro poi di nuovo avanti), la riga non nasconde
 * ciò che l'odontotecnico ha già scritto dentro una riga chiusa.
 */
function RigaOpzionale(props: {
  nome: string
  esempio?: string
  valore: string
  ultima: boolean
  onCambia: (v: string) => void
}) {
  const { nome, esempio, valore, ultima, onCambia } = props
  const [aperto, setAperto] = useState(valore !== '')

  function salta() {
    setAperto(false)
    onCambia('')
  }

  const stileRiga: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spazio.sm,
    padding: '14px 0',
    borderBottom: ultima ? 'none' : '1.5px solid var(--line)',
  }

  if (aperto) {
    return (
      <div style={stileRiga}>
        <div style={{ flex: 1 }}>
          <CampoTesto label={nome} valore={valore} onCambia={onCambia} autoFocus />
        </div>
        <LinkQuieto onClick={salta}>Salta</LinkQuieto>
      </div>
    )
  }

  function apri() {
    setAperto(true)
  }

  return (
    <div style={stileRiga}>
      <style>{`
        .ds-riga-opzionale-bottone:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <button type="button" className="ds-riga-opzionale-bottone" onClick={apri} style={stileRigaBottone}>
        <span style={stileOpzNome}>{nome}</span>
        {esempio && <span style={stileOpzEsempio}>{esempio}</span>}
      </button>
      <LinkQuieto onClick={salta}>Salta</LinkQuieto>
    </div>
  )
}

/**
 * RigaColore — la riga «Colore» del blocco «Se vuoi, aggiungi» (D223,
 * variante B «nome asciutto»): chiusa mostra nome + un sottotitolo che
 * ANTICIPA il framing (chi trascrive vs chi sceglie), aperta ripete il
 * framing PIENO di D210 (etichetta + aiuto + sgancio/ritorno). Testi
 * VERBATIM dal mockup `docs/design/mockups/2026-08-04-ondata-b3-schermate-
 * vere.html` (scene p3-riga-b / p3-aperta / p3-sganciata) — D223 li fissa
 * alla lettera, non si parafrasano, con UNA sostituzione dichiarata: il
 * mockup e la riga D223 del verbale scrivono l'esempio come "es. A3"
 * (valore dimostrativo della scena); qui è "es. A2", per la risoluzione del
 * controllore registrata in `docs/design/decisions/2026-08-04-ondata-b3-
 * schermate-vere.md` §4 ("Valori dimostrativi ≠ testi vincolanti"). Un
 * futuro confronto codice↔mockup che trova questa differenza non ha trovato
 * un difetto.
 *
 * Il sottotitolo chiuso per `coloreOrigine==='lab'` ("lo scegliamo noi") non
 * è nel mockup (nessuna scena mostra "chiusa + sganciata"): deriva dalla
 * coda dell'etichetta aperta della scena p3-sganciata, stesso pattern della
 * chiusa in trascrizione (nome + coda del framing) — derivazione dichiarata,
 * disegno coerente col mockup p3-sganciata, risoluzione del controllore
 * registrata in `docs/design/decisions/2026-08-04-ondata-b3-schermate-vere.md`
 * §4, non testo del brief.
 *
 * 🔑 Vincolo D223 a verbale (riserva del panel, decisione 0B §3.1): la
 * variante B regge SOLO finché lo stato APERTO ripete per intero il framing
 * di D210. Se il campo diventasse compilabile IN-PLACE, da chiuso, senza mai
 * passare per lo stato aperto — questa scelta va RIPENSATA, non solo
 * aggiustata: il sottotitolo chiuso da solo non è un consenso informato.
 */
function RigaColore(props: {
  valore: string
  origine: ColoreOrigine | undefined
  onCambia: (v: string) => void
  onCambiaOrigine: (origine: ColoreOrigine) => void
}) {
  const { valore, origine, onCambia, onCambiaOrigine } = props
  const [aperto, setAperto] = useState(valore !== '')
  const sganciato = origine === 'lab'

  function salta() {
    setAperto(false)
    onCambia('')
  }

  function apri() {
    setAperto(true)
  }

  if (aperto) {
    return (
      <div style={stileRigaColoreAperta}>
        <style>{`
          .ds-riga-colore-aiuto b {
            color: var(--ink);
            font-weight: 700;
          }
        `}</style>
        <div style={stileRigaColoreApertaTop}>
          <div style={{ flex: 1 }}>
            <CampoTesto
              label={sganciato ? 'Colore — lo scegliamo noi' : 'Colore — come scritto sulla prescrizione'}
              valore={valore}
              onCambia={onCambia}
              autoFocus
            />
          </div>
          <LinkQuieto onClick={salta}>Salta</LinkQuieto>
        </div>
        <p className="ds-riga-colore-aiuto" style={stileAiutoColore}>
          {sganciato ? (
            <>
              Scelta del laboratorio: resta <b>fuori</b> dalla Dichiarazione, perché non è sulla prescrizione.
            </>
          ) : (
            <>
              Quello che scrivi qui vale come <b>trascrizione</b> del foglio del dentista, e finisce così sulla
              Dichiarazione.
            </>
          )}
        </p>
        <div style={{ marginTop: 10 }}>
          <LinkQuieto onClick={() => onCambiaOrigine(sganciato ? 'prescrizione' : 'lab')}>
            {sganciato
              ? 'In realtà è sulla prescrizione: torno a trascrivere'
              : 'Non è sulla prescrizione: lo scegliamo noi'}
          </LinkQuieto>
        </div>
      </div>
    )
  }

  return (
    <div style={stileRigaColoreChiusa}>
      <style>{`
        .ds-riga-opzionale-bottone:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <button type="button" className="ds-riga-opzionale-bottone" onClick={apri} style={stileRigaBottone}>
        <span style={stileOpzNome}>Colore</span>
        <span style={stileOpzEsempio}>
          {sganciato ? 'lo scegliamo noi' : 'come scritto sulla prescrizione · es. A2'}
        </span>
      </button>
      <LinkQuieto onClick={salta}>Salta</LinkQuieto>
    </div>
  )
}

/**
 * RigaFoto — riga dashed «Aggiungi la foto dell'impronta» (mockup `.foto-add`,
 * wizard.html:162-170), stesso dashed di TileNuovo (§5.12, `gradiente.dashedGuida`).
 *
 * `<input type="file">` reale (accept image/*, capture environment — apre
 * fotocamera su mobile) NON nidificato dentro la `<label>`: sono fratelli
 * nello stesso contenitore, associati esplicitamente via `htmlFor`/`id`
 * (un solo meccanismo di associazione a11y, non doppio). `:focus-within` è
 * sul contenitore (ascendente comune) e mostra l'anello di focus sulla
 * label quando l'input (visually-hidden) riceve il focus da tastiera.
 * Dopo la selezione, il testo della riga diventa il nome del file scelto
 * (niente anteprima immagine: il piano chiede "nome/thumb", il nome basta
 * a confermare che qualcosa è stato scelto).
 */
function RigaFoto(props: { foto: File | null; onCambia: (f: File) => void }) {
  const { foto, onCambia } = props
  const id = useId()

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onCambia(file)
    // Reset del value: senza questo, riselezionare lo STESSO file non
    // genera un nuovo evento `change` (il browser confronta il value),
    // quindi l'odontotecnico resterebbe bloccato se rifà la stessa foto.
    // Pattern identico a TabImmagini.tsx (input camera/galleria).
    e.target.value = ''
  }

  return (
    <div className="ds-foto-add-wrap">
      <style>{`
        .ds-foto-add-wrap:focus-within .ds-foto-add {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        style={stileInputNascosto}
      />
      <label htmlFor={id} className="ds-foto-add" style={stileFotoAdd}>
        {/* Icona fotocamera §4.4: line-SVG (niente emoji) — path VERBATIM
            wizard.html:384. */}
        <svg
          aria-hidden="true"
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 7.5h2.9l1.6-2.3h6L16.6 7.5h2.9A1.6 1.6 0 0 1 21 9.1v8.8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.9V9.1a1.6 1.6 0 0 1 1.5-1.6z" />
          <circle cx="12" cy="13.2" r="3.5" />
        </svg>
        <span>{foto ? foto.name : "Aggiungi la foto dell'impronta"}</span>
      </label>
    </div>
  )
}

// Domanda (§4.1, token `question`) + hint — VERBATIM wizard.html:356-357.
const stileDomanda: CSSProperties = {
  fontSize: tipografia.size.question,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: tipografia.tracking.titoli,
  lineHeight: 1.08,
  color: 'var(--ink)',
}

const stileHint: CSSProperties = {
  fontSize: tipografia.size.callout,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--muted)',
  marginTop: 10,
}

// wizard.html:139 .campo margin-top:22px — il componente CampoTesto non lo
// porta con sé (stesso schema di PassoTipo/PassoDentista).
const stileCampoWrap: CSSProperties = { marginTop: 22 }

// wizard.html:149 .campo-nota — 14.5/600 muted, margin-top 8.
const stileNota: CSSProperties = {
  fontSize: 14.5,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--muted)',
  marginTop: spazio.s,
}

// wizard.html:152 .opz margin-top:22.
const stileOpz: CSSProperties = { marginTop: 22 }

// wizard.html:153 .opz-cap — caption 12.5/800 maiuscola faint, margin-bottom 12.
const stileOpzCap: CSSProperties = {
  fontSize: tipografia.size.caption,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: tipografia.tracking.caption,
  textTransform: 'uppercase',
  color: 'var(--faint)',
  marginBottom: spazio.sm,
}

const stileRigaBottone: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 1,
  minHeight: 44, // touch target di legge (constraint 10)
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  textAlign: 'left',
}

// wizard.html:159 .opz-nome — 17/700 ink.
const stileOpzNome: CSSProperties = {
  fontSize: 17,
  fontWeight: tipografia.weight.bold,
  color: 'var(--ink)',
}

// wizard.html:160 .opz-eg — 14.5/600 faint, margin-top 1.
const stileOpzEsempio: CSSProperties = {
  fontSize: 14.5,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--faint)',
  marginTop: 1,
}

// mockup .opz-riga (wizard.html:154-161) — riga chiusa di RigaColore, MAI
// "ultima" (Colore sta sempre fra Elemento e Nome o alias): border-bottom
// sempre presente, a differenza di `stileRiga` (locale a RigaOpzionale).
const stileRigaColoreChiusa: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spazio.sm,
  padding: '14px 0',
  borderBottom: '1.5px solid var(--line)',
}

// mockup .riga-aperta (2026-08-04-ondata-b3-schermate-vere.html:103) — la
// riga aperta di RigaColore, a blocco (non flex): campo+Salta in cima, poi
// aiuto, poi sgancio/ritorno, ciascuno sulla propria riga.
const stileRigaColoreAperta: CSSProperties = {
  padding: '14px 0',
  borderBottom: '1.5px solid var(--line)',
}

// mockup .riga-aperta-top (stesso file:104) — campo + «Salta» affiancati.
const stileRigaColoreApertaTop: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spazio.sm,
}

// mockup .aiuto (stesso file:92) — 13/regolare muted, margin-top 6; la
// parola marcata (`<b>`) diventa `--ink`/700 via la regola scoped nel
// `<style>` di RigaColore (stesso pattern di FoglioConferma.tsx).
const stileAiutoColore: CSSProperties = {
  margin: '6px 0 0',
  fontSize: 13,
  lineHeight: 1.35,
  color: 'var(--muted)',
}

// wizard.html:163-169 .foto-add — H64, dashed 2.5 `gradiente.dashedGuida`
// (stesso di TileNuovo, §5.12), radius `raggio.riga` (18), margin-top 16.
const stileFotoAdd: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spazio.sm,
  width: '100%',
  height: 64,
  marginTop: 16,
  padding: '0 20px',
  borderStyle: 'dashed',
  borderWidth: 2.5,
  borderColor: gradiente.dashedGuida,
  borderRadius: raggio.riga,
  background: 'transparent',
  color: 'var(--muted)',
  fontFamily: tipografia.famiglia,
  fontSize: 16.5,
  fontWeight: tipografia.weight.bold,
  cursor: 'pointer',
}

// Pattern "visually-hidden" standard (non un `display:none`, che toglierebbe
// l'elemento dall'albero a11y e dal focus da tastiera).
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
