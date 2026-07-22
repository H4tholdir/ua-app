'use client'

// A14 (Task 5, ondata mini-triage) — ConfermaCassettaSheet: la domanda «In
// che cassetta lo metti?» al tap su «Conferma» della pila blu (mockup
// `2026-07-20-mini-triage-conferma-cassetta.html`, variante A — chips delle
// cassette recenti + campo libero, ratificata da Francesco). L1: una domanda
// per schermata. Sempre opzionale (L6): «Conferma senza cassetta» è la via
// di fuga visibile, sempre presente, indipendentemente da `suggerite`.
//
// POST `/api/lavori/{id}/cassetta` (Task 5/16) SOLO quando c'è una cassetta
// scelta/scritta — assegnazione atomica race-safe via RPC. Il ramo si sceglie
// per PRESENZA di chiave: chip scelta → `{cassetta_id}`, campo libero →
// `{nome}` (get-or-create). NON più il PATCH diretto di `numero_cassetta`
// (uscito da `PATCHABLE_FIELDS`: era un no-op silenzioso — 200 senza scrittura).
// La conferma-arrivo NON cambia `stato` (fuori perimetro ratificato): a
// successo (o senza cassetta) delega sempre a `onConfermato(lavoro.id)`, che
// resta responsabilità del chiamante (`PilaAperta`/`PilaSplit` navigano alla
// scheda, invariato rispetto a oggi).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ds/Sheet'
import { ChipScelta } from '@/components/ds/ChipScelta'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { tipografia, spazio } from '@/design-system/v3/tokens'

const MESSAGGIO_ERRORE = 'Non sono riuscito a salvare la cassetta — riprova'

type LavoroConferma = { id: string; numero: string; tipoLavoro: string; dentista: string }
type CassettaSuggerita = { id: string; nome: string }

/**
 * ConfermaCassettaSheet — lo `Sheet` «In che cassetta lo metti?» (A14).
 *
 * Stato locale: `sceltaId` (id della chip attiva) e `nuova` (campo libero)
 * sono mutuamente esclusivi — digitare nel campo deseleziona la chip,
 * scegliere una chip svuota il campo. Il campo libero, se presente, vince: il
 * corpo del POST è `{nome}` (get-or-create); altrimenti, con una chip scelta,
 * è `{cassetta_id: sceltaId}` (aggancio a una cassetta esistente).
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
  suggerite: CassettaSuggerita[]
  onConfermato: (id: string) => void
}) {
  const { aperto, onChiudi, lavoro, suggerite, onConfermato } = props
  const router = useRouter()

  const [sceltaId, setSceltaId] = useState<string | null>(null)
  const [nuova, setNuova] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroreMsg, setErroreMsg] = useState<string | null>(null)

  const [idPrecedente, setIdPrecedente] = useState<string | null>(lavoro?.id ?? null)
  if ((lavoro?.id ?? null) !== idPrecedente) {
    setIdPrecedente(lavoro?.id ?? null)
    setSceltaId(null)
    setNuova('')
    setSalvando(false)
    setErroreMsg(null)
  }

  const nuovaTrim = nuova.trim()
  const nomeScelto = suggerite.find((c) => c.id === sceltaId)?.nome ?? null
  // Etichetta della CTA: il campo libero vince sul nome della chip scelta.
  const targetNome = nuovaTrim || nomeScelto
  const puoConfermare = !!(nuovaTrim || sceltaId)

  async function conferma() {
    if (!lavoro) return
    // Ramo per PRESENZA (come la route §10): campo libero → {nome},
    // altrimenti chip → {cassetta_id}. Mai entrambe, mai nessuna qui.
    const corpo: { nome: string } | { cassetta_id: string } | null = nuovaTrim
      ? { nome: nuovaTrim }
      : sceltaId
        ? { cassetta_id: sceltaId }
        : null
    if (!corpo) return
    setSalvando(true)
    setErroreMsg(null)
    try {
      const res = await fetch(`/api/lavori/${lavoro.id}/cassetta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      // 409 «occupata»: riga bloccante col nome autorevole dalla risposta +
      // refetch delle chip (router.refresh() ri-esegue il server component
      // /lavori, che riserve `suggerite` senza la cassetta ormai occupata).
      // La chip scelta è ora invalida → si svuota la selezione, così il tap
      // successivo non ri-spara lo stesso 409 su una cassetta sparita.
      if (res.status === 409) {
        const json = (await res.json().catch(() => ({}))) as { nome?: string | null }
        const nomeOccupata = json?.nome ?? targetNome
        setErroreMsg(`La ${nomeOccupata} è appena stata occupata`)
        setSceltaId(null)
        router.refresh()
        return
      }
      // Ogni altro esito non-2xx (404/422/500) è un errore esplicito: mai una
      // conferma implicita (vincolo #3 d'ondata). `onConfermato` è raggiungibile
      // SOLO sul 200, che questa route restituisce unicamente per esito:'ok'.
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
              key={c.id}
              selezionata={sceltaId === c.id && !nuovaTrim}
              onClick={() => {
                // Review finale (20/07) — guard: durante il POST le chip non hanno
                // `disabled` (ChipScelta non lo espone), un tap qui non deve
                // cambiare la selezione sotto una richiesta già in volo.
                if (salvando) return
                setSceltaId(sceltaId === c.id ? null : c.id)
                setNuova('')
              }}
            >
              {c.nome}
            </ChipScelta>
          ))}
        </div>
      )}

      <CampoTesto
        label="O scrivine una nuova"
        valore={nuova}
        onCambia={(v) => {
          setNuova(v)
          if (v.trim()) setSceltaId(null)
        }}
      />

      <TastoPrimario
        disabled={!puoConfermare || salvando}
        motivoDisabilitato="Scegli una cassetta o scrivine una"
        onClick={conferma}
      >
        {targetNome ? `Conferma in ${targetNome}` : 'Conferma'}
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
