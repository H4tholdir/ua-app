'use client'

// Task 12 — NuovaCassettaSheet (§5.2, spec 2026-07-21-parete-cassette-design.md). Lo sheet che
// crea una cassetta. Fonte visiva: mockup ratificato
// `docs/design/mockups/2026-07-20-parete-cassette-v2.html` righe 374-392.
//
// «Entrambe le cose» (mockup): il nome arriva PRECOMPILATO col prossimo numero (`prossimoNome`,
// calcolato nel PareteClient sulla serie C viva) — chi lavora coi numeri tocca solo «Crea»; chi
// ha nomi suoi lo cancella e scrive. Colori: le 6 facce standard portalavori + lo swatch custom
// (SwatchesColore, condiviso con lo sheet cassetta).
//
// Il titolo usa `Sheet titolo` (§5.16): il 27/800 del mockup è un artefatto pre-componente, il
// Sheet ratificato porta il titolo a 21/800 ED è l'unico modo di dare al dialog un nome
// accessibile (constraint 6) senza toccare un componente condiviso. Deciso per la regola del
// brief «le interfacce reali vincono sul mockup». Il resto del corpo resta fedele al mockup.
//
// Suono/haptic (constraint 4): l'UNICO suono nuovo dell'ondata è `suona('tap')` + `vibra('light')`
// alla CREAZIONE RIUSCITA. (Il TastoPrimario suona già per conto suo alla pressione: qui si
// aggiunge il feedback dell'esito, come da brief.)

import { useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'
import { SwatchesColore } from './SwatchesColore'

const ERRORE_NOME_OCCUPATO = 'Questo nome è già sulla parete'
const ERRORE_NOME_LUNGO = 'Il nome è troppo lungo (massimo 20 caratteri)'
const ERRORE_GENERICO = 'Non sono riuscito a creare la cassetta — riprova'

export function NuovaCassettaSheet(props: {
  aperto: boolean
  onChiudi: () => void
  prossimoNome: string
  onCreata: () => void
}) {
  const { aperto, onChiudi, prossimoNome, onCreata } = props

  const [nome, setNome] = useState(prossimoNome)
  const [colore, setColore] = useState<string>('bianca')
  const [salvando, setSalvando] = useState(false)
  const [erroreMsg, setErroreMsg] = useState<string | null>(null)

  // Reset in render-phase all'apertura (pattern "adjusting state while rendering" di React, come
  // in ConfermaCassettaSheet): quando lo sheet si apre riprende `prossimoNome` fresco (che dopo
  // ogni creazione il PareteClient ricalcola) e azzera colore/errore. NON un useEffect (render
  // extra + regola set-state-in-effect).
  const [eraAperto, setEraAperto] = useState(aperto)
  if (aperto !== eraAperto) {
    setEraAperto(aperto)
    if (aperto) {
      setNome(prossimoNome)
      setColore('bianca')
      setSalvando(false)
      setErroreMsg(null)
    }
  }

  const nomeTrim = nome.trim()

  async function crea() {
    if (!nomeTrim || salvando) return
    setSalvando(true)
    setErroreMsg(null)
    try {
      const res = await fetch('/api/cassette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeTrim, colore }),
      })
      // Ramo di successo ESPLICITO e unico (constraint 7): solo 201 crea. Ogni altro esito è un
      // errore, mai un successo implicito.
      if (res.status === 201) {
        suona('tap')
        vibra('light')
        onCreata()
        return
      }
      if (res.status === 409) {
        setErroreMsg(ERRORE_NOME_OCCUPATO)
        return
      }
      if (res.status === 422) {
        // Contratto route (POST /api/cassette): 422 {errore:'nome_non_valido'} = nome fuori
        // misura (1-20 char; il vuoto qui non parte, la CTA è disabilitata). Un «riprova»
        // cieco sarebbe un vicolo cieco: riprovare non accorcia il nome.
        const dati = (await res.json().catch(() => ({}))) as { errore?: string }
        setErroreMsg(dati.errore === 'nome_non_valido' ? ERRORE_NOME_LUNGO : ERRORE_GENERICO)
        return
      }
      setErroreMsg(ERRORE_GENERICO)
    } catch {
      setErroreMsg(ERRORE_GENERICO)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo="Nuova cassetta">
      <div>
        <CampoTesto label="Nome" valore={nome} onCambia={setNome} placeholder={prossimoNome} />
        {/* Hint del mockup (righe 385): CampoTesto non ha uno slot interno, quindi la riga
            «suggerito · scrivi quello che vuoi» vive sotto il campo — verbatim. */}
        <p className="ds-sheet-hint">suggerito · scrivi quello che vuoi</p>
      </div>

      <div>
        <p className="ds-sheet-sezione">Colore</p>
        <div style={{ marginTop: 10 }}>
          <SwatchesColore valore={colore} onScegli={setColore} disabilitato={salvando} />
        </div>
      </div>

      <TastoPrimario
        onClick={crea}
        disabled={!nomeTrim || salvando}
        motivoDisabilitato="Scrivi un nome per la cassetta"
      >
        {nomeTrim ? `Crea ${nomeTrim}` : 'Crea'}
      </TastoPrimario>

      {erroreMsg && (
        <p role="alert" className="ds-sheet-errore">
          {erroreMsg}
        </p>
      )}
    </Sheet>
  )
}
