'use client'

// A14 (Task 5, ondata mini-triage) — ConfermaCassettaSheet: la domanda «In
// che cassetta lo metti?» al tap su «Conferma» della pila blu (mockup
// `2026-07-20-mini-triage-conferma-cassetta.html`, variante A — chips delle
// cassette recenti + campo libero, ratificata da Francesco). L1: una domanda
// per schermata. Sempre opzionale (L6): «Conferma senza cassetta» è la via
// di fuga visibile, sempre presente, indipendentemente da `suggerite`.
//
// PATCH `/api/lavori/{id}` SOLO quando c'è una cassetta scelta/scritta —
// stesso pattern fetch (metodo/header/gestione errori) di
// `ModificaRigaSheet.tsx`. La conferma-arrivo NON cambia `stato` (fuori
// perimetro ratificato): a successo (o senza cassetta) delega sempre a
// `onConfermato(lavoro.id)`, che resta responsabilità del chiamante
// (`PilaAperta`/`PilaSplit` navigano alla scheda, invariato rispetto a oggi).

import { useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { ChipScelta } from '@/components/ds/ChipScelta'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { tipografia, spazio } from '@/design-system/v3/tokens'

const MESSAGGIO_ERRORE = 'Non sono riuscito a salvare la cassetta — riprova'

type LavoroConferma = { id: string; numero: string; tipoLavoro: string; dentista: string }

/**
 * ConfermaCassettaSheet — lo `Sheet` «In che cassetta lo metti?» (A14).
 *
 * Stato locale: `scelta` (chip attiva) e `nuova` (campo libero) sono
 * mutuamente esclusivi — digitare nel campo deseleziona la chip, scegliere
 * una chip svuota il campo. `target = nuova.trim() || scelta` è il valore
 * effettivo che va in `numero_cassetta`.
 *
 * Reset dello stato al cambio `lavoro.id` (pattern "adjusting state while
 * rendering" di React, stesso schema di `SchedaLavoroV3.tsx:152-156`): NON
 * un `useEffect` (violerebbe `react-hooks/set-state-in-effect` e
 * aggiungerebbe un render extra) — il confronto gira in render, prima che il
 * contenuto dello sheet precedente rimanga visibile con lo stato sbagliato.
 *
 * Chiave sull'id, NON sulla reference di `lavoro`: gli host (`PilaAperta`,
 * `PilaSplit`) costruiscono `lavoro` come oggetto letterale fresco a ogni
 * loro render, quindi un reference-check resetterebbe lo stato (chip scelta,
 * testo digitato) ad OGNI rirender dell'host mentre lo sheet è aperto — es.
 * la ricerca `cerca` in `PilaAperta` — anche se il lavoro sotto conferma è
 * sempre lo stesso. Con `lavoro?.id` come chiave, quei rirender sono innocui.
 */
export function ConfermaCassettaSheet(props: {
  aperto: boolean
  onChiudi: () => void
  lavoro: LavoroConferma | null
  suggerite: string[]
  onConfermato: (id: string) => void
}) {
  const { aperto, onChiudi, lavoro, suggerite, onConfermato } = props

  const [scelta, setScelta] = useState<string | null>(null)
  const [nuova, setNuova] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroreMsg, setErroreMsg] = useState<string | null>(null)

  const [idPrecedente, setIdPrecedente] = useState<string | null>(lavoro?.id ?? null)
  if ((lavoro?.id ?? null) !== idPrecedente) {
    setIdPrecedente(lavoro?.id ?? null)
    setScelta(null)
    setNuova('')
    setSalvando(false)
    setErroreMsg(null)
  }

  const target = nuova.trim() || scelta

  async function conferma() {
    if (!lavoro) return
    if (!target) return
    setSalvando(true)
    setErroreMsg(null)
    try {
      const res = await fetch(`/api/lavori/${lavoro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_cassetta: target }),
      })
      if (!res.ok) {
        setErroreMsg(MESSAGGIO_ERRORE)
        return
      }
      onConfermato(lavoro.id)
    } catch {
      setErroreMsg(MESSAGGIO_ERRORE)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sheet aperto={aperto && !!lavoro} onChiudi={onChiudi} titolo="In che cassetta lo metti?">
      {lavoro && (
        <p style={sottotitoloStile}>
          n.{lavoro.numero} · {lavoro.tipoLavoro} · {lavoro.dentista}
        </p>
      )}

      {suggerite.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
          {suggerite.slice(0, 6).map((c) => (
            <ChipScelta
              key={c}
              selezionata={scelta === c && !nuova.trim()}
              onClick={() => {
                // Review finale (20/07) — guard: durante il PATCH le chip non hanno
                // `disabled` (ChipScelta non lo espone), un tap qui non deve
                // cambiare la selezione sotto una richiesta già in volo.
                if (salvando) return
                setScelta(scelta === c ? null : c)
                setNuova('')
              }}
            >
              {c}
            </ChipScelta>
          ))}
        </div>
      )}

      <CampoTesto
        label="O scrivine una nuova"
        valore={nuova}
        onCambia={(v) => {
          setNuova(v)
          if (v.trim()) setScelta(null)
        }}
      />

      <TastoPrimario
        disabled={!target || salvando}
        motivoDisabilitato="Scegli una cassetta o scrivine una"
        onClick={conferma}
      >
        {target ? `Conferma in ${target}` : 'Conferma'}
      </TastoPrimario>

      {erroreMsg && (
        <p role="alert" style={erroreStile}>
          {erroreMsg}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
        {/* Review finale (20/07) — guard `salvando`: LinkQuieto non espone
            `disabled`, quindi durante il PATCH questa via di fuga resterebbe
            tappabile e potrebbe far partire un secondo `onConfermato` mentre
            il primo salvataggio è ancora in corso. */}
        <LinkQuieto
          onClick={() => {
            if (salvando) return
            if (lavoro) onConfermato(lavoro.id)
          }}
        >
          Conferma senza cassetta
        </LinkQuieto>
      </div>
    </Sheet>
  )
}

const sottotitoloStile = {
  fontSize: 15,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--muted)',
  margin: 0,
} as const

const erroreStile = {
  fontSize: 14,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--red)',
  margin: `${spazio.s}px 0 0`,
} as const
