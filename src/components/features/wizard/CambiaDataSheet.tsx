'use client'

// DS v3 §5.16/§5.31/§7.3 (Ondata 2, Task 12) — CambiaDataSheet: lo sheet
// «Cambia data» del Frame «Fatto!». Consuma `ChipScelta` DIRETTAMENTE (§5.31,
// commento in ChipScelta.tsx: "CampoData e lo sheet «Cambia data» del Frame
// «Fatto!» la consumano invece di ridisegnarla") — NON il componente
// `CampoData` per intero: quello porta con sé le proprie 3 pill fisse
// (Oggi/Domani/prossimo Lun n, `Campo.tsx`), ma qui la terza scelta rapida
// deve essere la consegna SUGGERITA (giorni stimati per questo tipo di
// lavoro), un giorno arbitrario che `CampoData` non può esprimere.
// Anatomia risultante: 3 ChipScelta (Oggi · Domani · suggerita) + una 4ª
// «Scegli…» che rivela lo stesso `<input type="date">` nativo di CampoData
// (stesso pattern, duplicato qui perché `parseInputData`/`formattaInputData`
// sono privati di Campo.tsx — nota O1b, W7).
//
// Conferma = TastoSecondario «Conferma», MAI TastoPrimario: il piano vieta
// un secondo rosso nel Frame «Fatto!» (l'unico è «Fotografa impronta e
// prescrizione», FrameFatto.tsx) — le pill NON confermano da sole al tap,
// serve un'azione esplicita separata (stesso schema 2-tempi di
// NuovoDentistaSheet: compila, poi un tasto dedicato chiama la rete).
//
// PATCH /api/lavori/[id] {data_consegna_prevista} — la route la accetta
// (PATCHABLE_FIELDS, verificato dal controller PRIMA di questo task).
// Successo → `onConfermata(data)` + chiude; errore → `useAvvisi().errore`,
// resta aperto (stesso schema di NuovoDentistaSheet: l'odontotecnico non
// deve ricompilare tutto, qui non c'è nulla da ricompilare ma il principio
// è lo stesso — mai perdere la scelta già fatta per un errore di rete).
//
// CONTRATTO col chiamante (FrameFatto): questo componente NON resetta la
// propria selezione interna (`scelta`) ad ogni riapertura tramite un effect
// (violerebbe la regola ESLint react-hooks/set-state-in-effect — "adjust
// state on prop change" non sincronizza con un sistema esterno, è puro
// derive-from-props). Il chiamante DEVE montare `<CambiaDataSheet key={...}>`
// con una key che cambia ad ogni apertura, così un remount fresco riparte da
// `useState(dataAttuale)` senza bisogno di alcun effect.

import { useState, type ChangeEvent, type CSSProperties } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { ChipScelta } from '@/components/ds/ChipScelta'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { useAvvisi } from '@/components/ds/Avviso'
import { inizioGiorno, aggiungiGiorni, stessoGiorno, formattaGiornoBreve } from '@/components/ds/Campo'
import { isoDataLocale } from '@/lib/wizard/crea-lavoro'
import { spazio, tipografia, raggio } from '@/design-system/v3/tokens'

/** "2026-08-20" (input type="date") → Date locale. Duplicato da Campo.tsx (privato, O1b). */
function parseInputData(v: string): Date | null {
  const parti = v.split('-').map(Number)
  const [anno, mese, giorno] = parti
  if (!anno || !mese || !giorno) return null
  return new Date(anno, mese - 1, giorno)
}

/** Date locale → "2026-08-20" per popolare l'input nativo. Duplicato da Campo.tsx. */
function formattaInputData(d: Date): string {
  const anno = String(d.getFullYear()).padStart(4, '0')
  const mese = String(d.getMonth() + 1).padStart(2, '0')
  const giorno = String(d.getDate()).padStart(2, '0')
  return `${anno}-${mese}-${giorno}`
}

export function CambiaDataSheet(props: {
  aperto: boolean
  onChiudi: () => void
  lavoroId: string
  suggerita: Date
  dataAttuale: Date
  onConfermata: (d: Date) => void
  oggi?: Date
}) {
  const { aperto, onChiudi, lavoroId, suggerita, dataAttuale, onConfermata, oggi = new Date() } = props
  const { errore } = useAvvisi()

  // NIENTE reset via useEffect ad ogni apertura (violerebbe la regola ESLint
  // react-hooks/set-state-in-effect — "adjust state on prop change" non è un
  // caso valido di sincronizzazione con un sistema esterno). Il reset è
  // responsabilità del CHIAMANTE: FrameFatto monta questo componente con una
  // `key` che cambia ad ogni apertura (contratto del componente, vedi JSDoc
  // sopra), così `useState(dataAttuale)` riparte sempre da un'inizializzazione
  // fresca — nessun effect necessario.
  const [scelta, setScelta] = useState<Date>(dataAttuale)
  const [scegliAperto, setScegliAperto] = useState(false)
  const [invio, setInvio] = useState(false)

  const oggiInizio = inizioGiorno(oggi)
  const domaniData = aggiungiGiorni(oggiInizio, 1)
  const suggeritaInizio = inizioGiorno(suggerita)
  const sceltaInizio = inizioGiorno(scelta)

  // Mai due pill per lo stesso giorno (stesso principio di CampoData, Lun
  // coincide con Domani): se la suggerita coincide con oggi o domani, la
  // pill dedicata sparisce — è già coperta dalle prime due.
  const suggeritaCoincide = stessoGiorno(suggeritaInizio, oggiInizio) || stessoGiorno(suggeritaInizio, domaniData)

  const oggiSelezionata = stessoGiorno(sceltaInizio, oggiInizio)
  const domaniSelezionata = !oggiSelezionata && stessoGiorno(sceltaInizio, domaniData)
  const suggeritaSelezionata =
    !suggeritaCoincide && !oggiSelezionata && !domaniSelezionata && stessoGiorno(sceltaInizio, suggeritaInizio)
  const sceltaCustomSelezionata = !oggiSelezionata && !domaniSelezionata && !suggeritaSelezionata

  function handleInputData(e: ChangeEvent<HTMLInputElement>) {
    const data = parseInputData(e.target.value)
    if (!data) return
    setScelta(data)
  }

  async function confermaScelta() {
    setInvio(true)
    try {
      const res = await fetch(`/api/lavori/${lavoroId}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_consegna_prevista: isoDataLocale(sceltaInizio) }),
      })
      if (!res.ok) {
        errore('Non sono riuscita a cambiare la data. Riprova.')
        setInvio(false)
        return
      }
      onConfermata(sceltaInizio)
      setInvio(false)
      onChiudi()
    } catch {
      errore('Non sono riuscita a cambiare la data. Riprova.')
      setInvio(false)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo="Cambia data">
      <div style={{ display: 'flex', gap: spazio.s, flexWrap: 'wrap' }}>
        <ChipScelta selezionata={oggiSelezionata} onClick={() => setScelta(oggiInizio)}>
          Oggi
        </ChipScelta>
        <ChipScelta selezionata={domaniSelezionata} onClick={() => setScelta(domaniData)}>
          Domani
        </ChipScelta>
        {!suggeritaCoincide && (
          <ChipScelta selezionata={suggeritaSelezionata} onClick={() => setScelta(suggeritaInizio)}>
            {formattaGiornoBreve(suggeritaInizio)}
          </ChipScelta>
        )}
        <ChipScelta
          selezionata={sceltaCustomSelezionata}
          ariaExpanded={scegliAperto}
          onClick={() => setScegliAperto(true)}
        >
          Scegli…
        </ChipScelta>
      </div>

      {scegliAperto && (
        <input
          type="date"
          aria-label="Scegli la data"
          defaultValue={sceltaCustomSelezionata ? formattaInputData(sceltaInizio) : undefined}
          onChange={handleInputData}
          style={stileInputData}
        />
      )}

      <TastoSecondario onClick={confermaScelta} disabled={invio}>
        Conferma
      </TastoSecondario>
    </Sheet>
  )
}

const stileInputData: CSSProperties = {
  display: 'block',
  boxSizing: 'border-box',
  width: '100%',
  height: 64,
  borderRadius: raggio.riga,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--ink)',
  fontFamily: tipografia.famiglia,
  fontSize: 19,
  fontWeight: 700,
  padding: '0 20px',
}
