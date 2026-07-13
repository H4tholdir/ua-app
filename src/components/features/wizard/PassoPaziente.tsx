'use client'

// DS v3 §7.3/§5.27/§5.5/§5.3/§5.15 (Ondata 2, Task 11) — PassoPaziente: il
// Passo 3 del wizard «Nuovo lavoro». Copy VERBATIM da wizard.html:356-388
// (frame «Passo 3 · paziente»): domanda, hint, CampoTesto «Codice paziente»
// precompilato + nota GDPR, blocco «Se vuoi, aggiungi» (Elemento/Colore/Nome
// o alias, ciascuno "Salta"-abile), riga foto impronta dashed, «Continua».
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
// PillVoce (§5.15) compila il "campo attivo": di default il Codice paziente,
// ma se l'odontotecnico ha appena aperto/messo a fuoco Elemento/Colore/Nome o
// alias, la dettatura va lì — tracciato con `onFocus` sul contenitore di ogni
// campo (l'evento React è basato su `focusin`, quindi risale dal figlio reale
// senza bisogno che CampoTesto esponga una prop `onFocus` propria).

import { useId, useState, type ChangeEvent, type CSSProperties } from 'react'
import { tipografia, raggio, spazio, gradiente } from '@/design-system/v3/tokens'
import { CampoTesto } from '@/components/ds/Campo'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { PillVoce } from '@/components/ds/PillVoce'
import type { StatoWizard } from './WizardNuovoLavoro'

type CampoOpzionale = 'elemento' | 'colore' | 'alias'
type CampoAttivo = 'pz' | CampoOpzionale

export function PassoPaziente(props: {
  pz: string
  alias: string
  elemento: string
  colore: string
  foto: File | null
  onCambia: (patch: Partial<StatoWizard>) => void
  onContinua: () => void
  inCreazione: boolean
}) {
  const { pz, alias, elemento, colore, foto, onCambia, onContinua, inCreazione } = props
  const [campoAttivo, setCampoAttivo] = useState<CampoAttivo>('pz')

  // Instrada il trascritto di PillVoce verso l'ultimo campo su cui è caduto
  // il focus (default 'pz' — vedi commento in testa).
  function pillOnTesto(testo: string) {
    switch (campoAttivo) {
      case 'pz':
        onCambia({ pz: testo })
        break
      case 'elemento':
        onCambia({ elemento: testo })
        break
      case 'colore':
        onCambia({ colore: testo })
        break
      case 'alias':
        onCambia({ alias: testo })
        break
    }
  }

  return (
    <div>
      <h1 style={stileDomanda}>Chi è il paziente?</h1>
      <p style={stileHint}>Il codice è già pronto. Cambialo solo se serve.</p>

      <div style={stileCampoWrap} onFocus={() => setCampoAttivo('pz')}>
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
          onAttiva={() => setCampoAttivo('elemento')}
          onCambia={(v) => onCambia({ elemento: v })}
        />
        <RigaOpzionale
          nome="Colore"
          esempio="es. A2"
          valore={colore}
          ultima={false}
          onAttiva={() => setCampoAttivo('colore')}
          onCambia={(v) => onCambia({ colore: v })}
        />
        <RigaOpzionale
          nome="Nome o alias"
          valore={alias}
          ultima
          onAttiva={() => setCampoAttivo('alias')}
          onCambia={(v) => onCambia({ alias: v })}
        />

        <RigaFoto foto={foto} onCambia={(f) => onCambia({ foto: f })} />
      </div>

      <div style={{ marginTop: 22 }}>
        <TastoSecondario onClick={onContinua} disabled={inCreazione}>
          Continua
        </TastoSecondario>
      </div>

      {/* wizard.html:390 .pv-wrap margin-top:22px — sempre in fondo al passo (§5.15). */}
      <div style={{ marginTop: 22 }}>
        <PillVoce onTesto={pillOnTesto} />
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
  onAttiva: () => void
  onCambia: (v: string) => void
}) {
  const { nome, esempio, valore, ultima, onAttiva, onCambia } = props
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
      <div style={stileRiga} onFocus={onAttiva}>
        <div style={{ flex: 1 }}>
          <CampoTesto label={nome} valore={valore} onCambia={onCambia} autoFocus />
        </div>
        <LinkQuieto onClick={salta}>Salta</LinkQuieto>
      </div>
    )
  }

  function apri() {
    setAperto(true)
    onAttiva()
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
