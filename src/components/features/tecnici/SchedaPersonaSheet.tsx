'use client'

// «Persone» v3 (Task 12, ondata A mini-triage) — SchedaPersonaSheet: la
// scheda persona (dettagli, modifica, disattiva) monta a `Sheet` v3, NESSUNA
// route nuova (decisione di brief). Sostituisce il `data-aperta` di
// scaffolding di `PersoneV3.tsx` (Task 11) con un consumatore visivo reale.
//
// PATCH `/api/tecnici/{id}`: payload/headers/gestione errori replicati
// ESATTAMENTE da `TecnicoEditInline.tsx` (stesso metodo, stesso header
// `Content-Type`, stessa estrazione `json.error`, stesso fallback di rete) —
// il server non si tocca. Unica narrowing intenzionale: questa scheda edita
// SOLO nome/cognome/sigla/qualifica (il brief non prevede l'editing di
// compenso in questo sheet); l'endpoint applica un allowlist per-campo
// (`hasOwnProperty`), quindi omettere `tipo_compenso`/`compenso_base` dal
// body li lascia semplicemente invariati — nessuna richiesta al server è
// stata toccata. Gli errori, a differenza dell'`alert()` legacy, sono un
// messaggio inline `role="alert"` — lo sheet resta aperto.
//
// POST `/api/tecnici/{id}/deactivate`: pattern `TecnicoDeactivateButton.tsx:25`
// (stesso metodo, stessa estrazione errore). Trigger `LinkQuieto` «Disattiva»
// (via di fuga verso una conferma, stesso schema di «Esci» in
// `TuttoIlResto.tsx` — LinkQuieto apre, DialogConferma decide) →
// `DialogConferma` → successo: chiude il dialog, `router.refresh()`, chiude
// lo sheet. Fallimento (fix review, finding IMPORTANTE): il dialog resta
// APERTO — mai chiuso su errore — e l'errore va nella sua prop `nota`
// (`DialogConferma.tsx:51,103-106`), perché il dialog è un portal montato
// dopo lo sheet e lo copre allo stesso zIndex: un `role="alert"` nello sheet
// da solo resterebbe invisibile finché il dialog è aperto. Il paragrafo
// `role="alert"` nello sheet resta come backstop, ma SOLO a dialog chiuso
// (`!dialogAperto`) — altrimenti duplicherebbe lo stesso messaggio dietro la
// card.
//
// Reset dello stato chiavato su `persona.id` (pattern "adjusting state while
// rendering", NON `useEffect` — stesso schema di `ConfermaCassettaSheet.tsx`,
// finding di review di quest'ondata: chiave sull'id, MAI sulla reference,
// perché l'host ricostruisce `persona` come oggetto letterale fresco a ogni
// render mentre lo sheet resta aperto). Chiudere lo sheet (scrim/Esc/Chiudi)
// azzera `personaAperta` nell'host → l'id passa a `null` → il prossimo giro
// (stesso tecnico o un altro) riparte sempre da `modalita: 'vista'`, niente
// bozze di modifica sopravvissute alla chiusura.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ds/Sheet'
import { CardInfo, RigaDato } from '@/components/ds/CardInfo'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { tipografia, spazio } from '@/design-system/v3/tokens'
import type { TecnicoRow } from './PersoneV3'

const MESSAGGIO_ERRORE_RETE = 'Errore di rete — riprova'

const ETICHETTA_TIPO_COMPENSO: Record<string, string> = {
  fisso: 'Fisso',
  percentuale: 'Percentuale',
  per_lavorazione: 'Per lavorazione',
}

function formattaCompenso(v: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(v)
}

/**
 * SchedaPersonaSheet — dettagli, modifica, disattiva (Task 12).
 *
 * `ruolo` governa la sola visibilità delle azioni e della riga Compenso —
 * SOLO `titolare`/`admin_rete` le vedono; `tecnico`/`front_desk` hanno una
 * scheda di sola lettura (Qualifica, Sigla se presente, PRRC).
 */
export function SchedaPersonaSheet(props: {
  aperto: boolean
  persona: TecnicoRow | null
  ruolo: string
  onChiudi: () => void
}) {
  const { aperto, persona, ruolo, onChiudi } = props
  const router = useRouter()
  const puoGestire = ruolo === 'titolare' || ruolo === 'admin_rete'

  const [modalita, setModalita] = useState<'vista' | 'modifica'>('vista')
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [sigla, setSigla] = useState('')
  const [qualifica, setQualifica] = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [erroreEdit, setErroreEdit] = useState<string | null>(null)
  const [dialogAperto, setDialogAperto] = useState(false)
  const [disattivando, setDisattivando] = useState(false)
  const [erroreDisattiva, setErroreDisattiva] = useState<string | null>(null)

  // Reset chiavato sull'id di `persona` (NON sulla reference — vedi commento
  // di testa) — stesso schema di `ConfermaCassettaSheet.tsx`.
  const [idPrecedente, setIdPrecedente] = useState<string | null>(persona?.id ?? null)
  if ((persona?.id ?? null) !== idPrecedente) {
    setIdPrecedente(persona?.id ?? null)
    setModalita('vista')
    setNome('')
    setCognome('')
    setSigla('')
    setQualifica('')
    setSalvandoEdit(false)
    setErroreEdit(null)
    setDialogAperto(false)
    setDisattivando(false)
    setErroreDisattiva(null)
  }

  function apriModifica() {
    if (!persona) return
    setNome(persona.nome)
    setCognome(persona.cognome)
    setSigla(persona.sigla ?? '')
    setQualifica(persona.qualifica ?? '')
    setErroreEdit(null)
    setModalita('modifica')
  }

  async function salvaModifica() {
    if (!persona) return
    if (!nome.trim() || !cognome.trim()) {
      setErroreEdit('Nome e cognome sono obbligatori')
      return
    }
    setSalvandoEdit(true)
    setErroreEdit(null)
    try {
      const res = await fetch(`/api/tecnici/${persona.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cognome: cognome.trim(),
          sigla: sigla.trim() || null,
          qualifica: qualifica.trim() || null,
        }),
      })
      if (res.ok) {
        setModalita('vista')
        router.refresh()
      } else {
        const json = await res.json().catch(() => ({}))
        setErroreEdit(json.error ?? 'Errore durante il salvataggio')
      }
    } catch {
      setErroreEdit(MESSAGGIO_ERRORE_RETE)
    } finally {
      setSalvandoEdit(false)
    }
  }

  async function disattiva() {
    if (!persona || disattivando) return
    setDisattivando(true)
    setErroreDisattiva(null)
    try {
      const res = await fetch(`/api/tecnici/${persona.id}/deactivate`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setErroreDisattiva(json.error ?? 'Errore durante la disattivazione')
        return
      }
      setDialogAperto(false)
      router.refresh()
      onChiudi()
    } catch {
      setErroreDisattiva(MESSAGGIO_ERRORE_RETE)
    } finally {
      setDisattivando(false)
    }
  }

  const nomeCompleto = persona ? `${persona.nome} ${persona.cognome}` : undefined

  return (
    <>
      <Sheet aperto={aperto && !!persona} onChiudi={onChiudi} titolo={nomeCompleto}>
        {persona && modalita === 'vista' && (
          <>
            <CardInfo>
              <RigaDato chiave="Qualifica" valore={persona.qualifica || 'Tecnico'} />
              {persona.sigla && <RigaDato chiave="Sigla" valore={persona.sigla} />}
              <RigaDato
                chiave="PRRC"
                valore={persona.prrc ? <span style={{ color: 'var(--green)' }}>Sì ✓</span> : 'No'}
              />
              {puoGestire && persona.compenso_base != null && (
                <RigaDato
                  chiave="Compenso"
                  valore={formattaCompenso(persona.compenso_base)}
                  sub={persona.tipo_compenso ? ETICHETTA_TIPO_COMPENSO[persona.tipo_compenso] ?? persona.tipo_compenso : undefined}
                />
              )}
            </CardInfo>

            {puoGestire && (
              <>
                <TastoSecondario onClick={apriModifica}>Modifica</TastoSecondario>
                <TastoSecondario onClick={() => router.push(`/tecnici/${persona.id}/produttivita`)}>
                  Produttività
                </TastoSecondario>
              </>
            )}

            {/* Backstop SOLO a dialog chiuso: mentre `dialogAperto` è true
                l'errore vive dentro `DialogConferma` (prop `nota`, vedi
                sotto) — la card del dialog è un portal successivo che copre
                questo `role="alert"` allo stesso zIndex, quindi qui
                resterebbe invisibile finché il dialog resta aperto. */}
            {erroreDisattiva && !dialogAperto && (
              <p role="alert" style={erroreStile}>
                {erroreDisattiva}
              </p>
            )}

            {puoGestire && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <LinkQuieto
                  onClick={() => {
                    // Azzera l'errore di un tentativo precedente PRIMA di
                    // riaprire (fix review): senza questo, riaprire il
                    // dialog dopo un Annulla post-fallimento mostrerebbe
                    // subito la `nota` stantia, prima ancora che l'utente
                    // riclicchi «Disattiva» dentro al dialog.
                    setErroreDisattiva(null)
                    setDialogAperto(true)
                  }}
                >
                  Disattiva
                </LinkQuieto>
              </div>
            )}
          </>
        )}

        {persona && modalita === 'modifica' && (
          <>
            <CampoTesto label="Nome" valore={nome} onCambia={setNome} />
            <CampoTesto label="Cognome" valore={cognome} onCambia={setCognome} />
            <CampoTesto label="Sigla" valore={sigla} onCambia={setSigla} />
            <CampoTesto label="Qualifica" valore={qualifica} onCambia={setQualifica} />

            {erroreEdit && (
              <p role="alert" style={erroreStile}>
                {erroreEdit}
              </p>
            )}

            <TastoPrimario disabled={salvandoEdit} onClick={salvaModifica}>
              {salvandoEdit ? 'Salvataggio…' : 'Salva'}
            </TastoPrimario>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <LinkQuieto onClick={() => setModalita('vista')}>Annulla</LinkQuieto>
            </div>
          </>
        )}
      </Sheet>

      {persona && (
        <DialogConferma
          aperto={dialogAperto}
          titolo={`Disattivi ${nomeCompleto}?`}
          testo="Non riceverà più lavori. Potrai riattivarlo dal database."
          etichettaDistruttiva="Disattiva"
          etichettaSicura="Annulla"
          onConferma={disattiva}
          onAnnulla={() => setDialogAperto(false)}
          nota={erroreDisattiva ?? undefined}
        />
      )}
    </>
  )
}

const erroreStile = {
  fontSize: 14,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--red)',
  margin: `${spazio.s}px 0 0`,
} as const
