'use client'

// «Persone» v3 (Task 13, ondata A mini-triage) — InvitoPersonaSheet: la UI di
// invito rifatta a `Sheet` v3, montata SOLO per `ruolo === 'titolare'`
// (parità con la vecchia pagina v2.3, brief Task 13 — nessun `admin_rete`
// qui, a differenza di `SchedaPersonaSheet` che governa `puoGestire` con
// entrambi). L'API `/api/tecnici/invite` NON si tocca: payload POST
// IDENTICO a `InvitaCollaboratoreSheet.tsx:90-93` (ora eliminato — era
// orfano, vedi corpo del commit) — `{ email, ruolo }`, stesso header
// `Content-Type`, stessa estrazione `json.error`/`json.message`. GET/DELETE
// ricalcano lo stesso legacy (righe 58 e 117): `GET /api/tecnici/invite` per
// la lista pendenti, `DELETE /api/tecnici/invite/{id}` per la revoca.
//
// Ruolo (ChipScelta, default `tecnico`): stessi tre valori accettati da
// `isRuoloInvitabileDaTitolare` (`@/lib/invito/ruoli`) — tecnico/front_desk/
// titolare. L'etichetta «Titolare (co-gestore)» del legacy è accorciata a
// «Titolare» (brief Task 13): il valore inviato al server resta identico,
// cambia solo il testo della chip.
//
// Successo → messaggio verde inline `role="status"` + ri-fetch della lista
// pendenti (il «refresh» del brief è QUESTO, non `router.refresh()`: un
// invito appena creato non cambia la lista tecnici già attivi, quindi non
// c'è nulla da rinfrescare fuori da questo sheet). Errore → `role="alert"`
// rosso — lezione Task 12: qui non c'è un `DialogConferma` montato sopra lo
// sheet, quindi l'`alert` inline non rischia di restare coperto da un
// portal successivo; nessun backstop necessario.
//
// Email vuota/non valida → stessa validazione client del legacy (riga
// 81-83): `trim()` + `includes('@')`, nessuna regex più severa (l'API è la
// fonte di verità sulla validazione reale).

import { useCallback, useEffect, useId, useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto } from '@/components/ds/Campo'
import { ChipScelta } from '@/components/ds/ChipScelta'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { tipografia, spazio } from '@/design-system/v3/tokens'

type RuoloInvito = 'tecnico' | 'front_desk' | 'titolare'

const RUOLI: Array<{ value: RuoloInvito; label: string }> = [
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'front_desk', label: 'Front desk' },
  { value: 'titolare', label: 'Titolare' },
]

const MESSAGGIO_ERRORE_RETE = 'Errore di rete — riprova'

interface InvitoPendenteView {
  id: string
  email: string
  ruolo: string
}

/**
 * InvitoPersonaSheet — invito v3 (Task 13).
 *
 * Il chiamante (`PersoneV3`) monta questo sheet sempre, governando la
 * visibilità con `aperto`/`onChiudi` — stesso schema di `SchedaPersonaSheet`.
 * Nessun reset chiavato su un id (non c'è un'entità selezionata da tracciare
 * qui, a differenza della scheda persona): lo stato locale (email/ruolo/
 * messaggi) resta semplicemente quello che l'utente ha lasciato se il
 * chiamante non smonta il componente — comportamento accettabile per un
 * form di invito, dove ripartire da zero ad ogni apertura non è un requisito
 * del brief.
 */
export function InvitoPersonaSheet(props: { aperto: boolean; onChiudi: () => void }) {
  const { aperto, onChiudi } = props
  const idGruppoRuolo = useId()

  const [email, setEmail] = useState('')
  const [ruolo, setRuolo] = useState<RuoloInvito>('tecnico')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [successo, setSuccesso] = useState<string | null>(null)

  const [inviti, setInviti] = useState<InvitoPendenteView[]>([])
  const [caricandoInviti, setCaricandoInviti] = useState(false)
  const [revocaId, setRevocaId] = useState<string | null>(null)

  const caricaInviti = useCallback(async () => {
    setCaricandoInviti(true)
    try {
      const res = await fetch('/api/tecnici/invite')
      if (res.ok) {
        const json = await res.json()
        setInviti(json.inviti ?? [])
      }
    } finally {
      setCaricandoInviti(false)
    }
  }, [])

  // Fetch di rete (side-effect reale, non stato derivato dal render): a
  // differenza del reset di `SchedaPersonaSheet` (adjust-state-while-
  // rendering, keyed sull'id), qui `useEffect` è la scelta corretta — stesso
  // pattern del legacy (`InvitaCollaboratoreSheet.tsx:68-71`).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (aperto) caricaInviti()
  }, [aperto, caricaInviti])

  async function invia() {
    if (invio) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrore('Inserisci un indirizzo email valido')
      setSuccesso(null)
      return
    }
    setInvio(true)
    setErrore(null)
    setSuccesso(null)
    try {
      const res = await fetch('/api/tecnici/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, ruolo }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrore(json.error ?? "Errore durante l'invio dell'invito")
        return
      }
      setSuccesso(json.message ?? `Invito inviato a ${trimmedEmail}`)
      setEmail('')
      caricaInviti()
    } catch {
      setErrore(MESSAGGIO_ERRORE_RETE)
    } finally {
      setInvio(false)
    }
  }

  async function revoca(id: string) {
    if (revocaId) return
    setRevocaId(id)
    try {
      const res = await fetch(`/api/tecnici/invite/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInviti((prev) => prev.filter((i) => i.id !== id))
      }
    } finally {
      setRevocaId(null)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo="Invita una persona">
      <CampoTesto label="Email" valore={email} onCambia={setEmail} placeholder="nome@esempio.it" autoFocus />

      <div>
        <span id={idGruppoRuolo} style={etichettaStile}>
          Ruolo
        </span>
        <div role="group" aria-labelledby={idGruppoRuolo} style={{ display: 'flex', gap: spazio.s, flexWrap: 'wrap' }}>
          {RUOLI.map((r) => (
            <ChipScelta key={r.value} selezionata={ruolo === r.value} onClick={() => setRuolo(r.value)}>
              {r.label}
            </ChipScelta>
          ))}
        </div>
      </div>

      {errore && (
        <p role="alert" style={erroreStile}>
          {errore}
        </p>
      )}
      {successo && (
        <p role="status" style={successoStile}>
          ✓ {successo}
        </p>
      )}

      <TastoPrimario disabled={invio} onClick={invia}>
        {invio ? 'Invio…' : 'Invita'}
      </TastoPrimario>

      {(caricandoInviti || inviti.length > 0) && (
        <div>
          <span style={etichettaStile}>Inviti in attesa</span>
          {caricandoInviti ? (
            <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: `${spazio.xs}px 0 0` }}>
              Caricamento…
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: `${spazio.xs}px 0 0`, padding: 0, display: 'flex', flexDirection: 'column', gap: spazio.s }}>
              {inviti.map((invito) => (
                <li
                  key={invito.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spazio.s,
                    padding: `${spazio.s}px 0`,
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <span
                    style={{
                      fontSize: tipografia.size.callout,
                      fontWeight: tipografia.weight.bold,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {invito.email}
                  </span>
                  <LinkQuieto onClick={() => revoca(invito.id)}>Revoca</LinkQuieto>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  )
}

const etichettaStile = {
  display: 'block',
  fontSize: tipografia.size.label,
  fontWeight: tipografia.weight.extrabold,
  textTransform: 'uppercase' as const,
  letterSpacing: tipografia.tracking.label,
  color: 'var(--faint)',
  marginBottom: spazio.xs,
}

const erroreStile = {
  fontSize: tipografia.size.callout,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--red)',
  margin: 0,
}

const successoStile = {
  fontSize: tipografia.size.callout,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--green)',
  margin: 0,
}
