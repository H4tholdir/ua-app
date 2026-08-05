'use client'

// DS v3 §5.16/§5.27 (Ondata 2, Task 9) — NuovoDentistaSheet: lo sheet «＋ Nuovo
// dentista» del Passo 1 del wizard (decisione A7, spec §2.1, gate 12/07/2026
// notte). SOLO 5 campi: Nome, Cognome (obbligatori — l'UNICO dato richiesto
// dalla DdC All. XIII MDR, «il nome della persona che ha prescritto»),
// Telefono dello studio, Cellulare WhatsApp e Studio (tutti e tre opzionali).
// NIENTE campi fiscali qui: il fiscale diventa bloccante solo alla prima
// FatturaPA (BACKLOG-TECNICO §O4), non alla creazione anagrafica — aggiungerli
// in questo sheet contraddirebbe la decisione ratificata.
//
// P31/D184 (03/08/2026, mockup approvato D186): il vecchio campo unico
// «Cellulare/WhatsApp» scriveva in `telefono` — ambiguo fra fisso e cellulare.
// Si è sdoppiato in DUE campi con LO STESSO PESO: «Telefono dello studio»
// (→ colonna `telefono`, può essere un fisso) e «Cellulare WhatsApp»
// (→ colonna `cellulare_whatsapp`, dove UÀ manda i messaggi di consegna).
// Entrambi restano facoltativi: il vincolo di creazione resta solo su nome e
// cognome.
//
// label del dentista creato = `studio_nome` se compilato, altrimenti
// `Dr. ${cognome}` — STESSA regola di `aggregaDatiWizard` (Task 7,
// `src/lib/wizard/dati-wizard.ts`): calcolata qui dalla risposta del server
// (non dai valori locali del form) così la label riflette esattamente ciò
// che `POST /api/clienti` ha persistito.
//
// Validazione (§2.3 dizionario — «Form / campo obbligatorio» come concetto
// sparisce, ma qui i due campi UNICI restano un vincolo di legge MDR, non
// negoziabile): submit con nome/cognome vuoti NON chiama la rete, mostra
// solo il vincolo inline. L'errore di rete/500 invece passa da `useAvvisi`
// (Avviso, §5.18) con la copy fissa del brief — lo sheet resta aperto, il
// form NON si svuota (l'odontotecnico non deve riscrivere tutto).

import { useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { useAvvisi } from '@/components/ds/Avviso'
import { tipografia } from '@/design-system/v3/tokens'

type ClienteCreato = { id: string; nome: string; cognome: string; studio_nome: string | null }

export function NuovoDentistaSheet(props: {
  aperto: boolean
  onChiudi: () => void
  // `studioNome` (Task 10, P37): il PASSTHROUGH grezzo di `studio_nome` così
  // com'è tornato dal server — MAI ridotto a booleano né ricavato dal
  // `label` qui sotto (label collassa già su studio_nome quando presente,
  // ma quella coincidenza non è la fonte di verità: v. commento in
  // ChiHaPrescrittoSheet.tsx). Permette a `WizardNuovoLavoro.sceltaDentista`
  // di applicare lo STESSO gate "è un'entità?" a un dentista appena creato
  // qui e a un dentista scelto dalla griglia del Passo 1 (dati-wizard.ts).
  onCreato: (d: { id: string; label: string; studioNome: string | null }) => void
}) {
  const { aperto, onChiudi, onCreato } = props
  const { errore } = useAvvisi()

  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [telefonoStudio, setTelefonoStudio] = useState('')
  const [cellulare, setCellulare] = useState('')
  const [studio, setStudio] = useState('')
  const [vincolo, setVincolo] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  function resetForm() {
    setNome('')
    setCognome('')
    setTelefonoStudio('')
    setCellulare('')
    setStudio('')
    setVincolo(null)
    setInvio(false)
  }

  function chiudi() {
    resetForm()
    onChiudi()
  }

  async function handleSubmit() {
    const nomeOk = nome.trim()
    const cognomeOk = cognome.trim()
    if (!nomeOk || !cognomeOk) {
      setVincolo('Nome e cognome sono obbligatori')
      return
    }
    setVincolo(null)
    setInvio(true)

    const body: Record<string, string> = { nome: nomeOk, cognome: cognomeOk }
    if (telefonoStudio.trim()) body.telefono = telefonoStudio.trim()
    if (cellulare.trim()) body.cellulare_whatsapp = cellulare.trim()
    if (studio.trim()) body.studio_nome = studio.trim()

    try {
      const res = await fetch('/api/clienti', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        errore('Non sono riuscita a creare il dentista. Riprova.')
        setInvio(false)
        return
      }

      const dati = (await res.json()) as { cliente: ClienteCreato }
      const label = dati.cliente.studio_nome ?? `Dr. ${dati.cliente.cognome}`
      resetForm()
      onCreato({ id: dati.cliente.id, label, studioNome: dati.cliente.studio_nome })
    } catch {
      errore('Non sono riuscita a creare il dentista. Riprova.')
      setInvio(false)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={chiudi} titolo="Nuovo dentista">
      <CampoTesto label="Nome" valore={nome} onCambia={setNome} placeholder="Mario" autoFocus />
      <CampoTesto label="Cognome" valore={cognome} onCambia={setCognome} placeholder="Rossi" />
      <CampoTesto
        label="Telefono dello studio"
        valore={telefonoStudio}
        onCambia={setTelefonoStudio}
        placeholder="02 1234567"
        inputMode="tel"
      />
      <CampoTesto
        label="Cellulare WhatsApp"
        valore={cellulare}
        onCambia={setCellulare}
        placeholder="333 1234567"
        inputMode="tel"
        aiuto="È il numero a cui UÀ manda i messaggi di consegna su WhatsApp — ci vuole un cellulare, non il fisso dello studio."
      />
      <CampoTesto label="Studio" valore={studio} onCambia={setStudio} placeholder="Studio Rossi" />

      {vincolo && (
        <p role="alert" style={stileVincolo}>
          {vincolo}
        </p>
      )}

      {/* disabled durante la chiamata (no doppio POST). `motivoDisabilitato`
          obbligatorio con disabled (§5.1: TastoPrimario warna senza): qui non
          "manca" nulla, è in-flight — la riga dice «Un attimo…» (dizionario
          §2.3: mai "Loading…"). */}
      <TastoPrimario onClick={handleSubmit} disabled={invio} motivoDisabilitato="Un attimo…">
        Crea dentista
      </TastoPrimario>
    </Sheet>
  )
}

const stileVincolo = {
  fontSize: tipografia.size.callout,
  fontWeight: tipografia.weight.bold,
  color: 'var(--red)',
  margin: 0,
} as const
