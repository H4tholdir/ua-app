'use client'

// DS v3 §9 (Ondata 2, Task 13) — RipresaSheet: lo sheet «Riprendo da dove
// eri?», mostrato al mount di WizardNuovoLavoro quando `leggiStato` trova uno
// stato salvato valido (< 24h, stesso userId/labId — `persistenza.ts`). Sola
// presentazione: WizardNuovoLavoro decide COSA fare con Riprendi/Ricomincia
// (ripristino vs azzeramento), qui solo il testo adattato al passo salvato +
// i due tasti.
//
// Frase (spec §9, brief Task 13): passo 1 salvato → "avevi appena iniziato"
// (nessun dato ancora scelto); passo 2 → cliente scelto, manca il tipo;
// passo 3 → cliente E tipo scelti, manca il paziente — `<b>{tipo|Corona}</b>`
// col fallback letterale "Corona" per il caso difensivo (non dovrebbe mai
// accadere: si arriva al Passo 3 solo con un tipo scelto) in cui `tipo`
// risultasse comunque null.
//
// Chiusura NON distruttiva (fix round 1, decisione controller): la chiusura
// accidentale — tap-scrim, Esc, swipe giù, e il `LinkQuieto` "Chiudi" che
// `Sheet` aggiunge sempre in fondo (§5.16, via di fuga L6) — NON azzera lo
// stato salvato: chiude solo l'overlay, lasciando localStorage intatto (lo
// stato riapparirà al prossimo mount). SOLO il `LinkQuieto` esplicito
// «Ricomincia da capo» (`onRicomincia`) cancella il salvataggio e riparte da
// zero. Cancellare il progresso su un tap fuori bersaglio sarebbe una perdita
// di dati su un misclick facile — qui la scelta distruttiva è sempre esplicita.

import type { ReactNode } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { descrizioneTipo } from '@/lib/wizard/crea-lavoro'
import type { StatoSalvato } from '@/lib/wizard/persistenza'
import { tipografia } from '@/design-system/v3/tokens'

export function RipresaSheet(props: {
  aperto: boolean
  stato: StatoSalvato | null
  onChiudi: () => void
  onRiprendi: () => void
  onRicomincia: () => void
}) {
  const { aperto, stato, onChiudi, onRiprendi, onRicomincia } = props

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo="Riprendo da dove eri?">
      {stato && <Frase stato={stato} />}
      <TastoPrimario onClick={onRiprendi}>Riprendi</TastoPrimario>
      <div style={rigaLinkStile}>
        <LinkQuieto onClick={onRicomincia}>Ricomincia da capo</LinkQuieto>
      </div>
    </Sheet>
  )
}

function Frase(props: { stato: StatoSalvato }): ReactNode {
  const { stato } = props
  const clienteLabel = stato.cliente?.label ?? ''
  const tipoLabel = stato.tipo ? descrizioneTipo(stato.tipo) : 'Corona'

  if (stato.passo === 1) {
    return <p style={testoStile}>Avevi appena iniziato.</p>
  }

  if (stato.passo === 2) {
    return (
      <p style={testoStile}>
        Per <b>{clienteLabel}</b>, ti mancava il tipo di lavoro.
      </p>
    )
  }

  return (
    <p style={testoStile}>
      <b>{tipoLabel}</b> per il <b>{clienteLabel}</b>, ti mancava il paziente.
    </p>
  )
}

const testoStile = {
  fontSize: tipografia.size.body,
  color: 'var(--ink)',
  margin: 0,
} as const

const rigaLinkStile = {
  display: 'flex',
  justifyContent: 'center',
} as const
