'use client'

// DS v3 §7.3 (Ondata 2, Task 8) — WizardNuovoLavoro: la shell di `/lavori/nuovo`.
// Qui muore il form multi-tab v2.3 (page.tsx pre-Task 8): nasce il wizard «una
// domanda alla volta» — dentista → tipo lavoro → paziente (§7.3). Questo file
// possiede SOLO la testata (back + ProgressDots), la coreografia fra passi e
// lo stato condiviso; ogni Passo (PassoDentista qui, PassoTipo/PassoPaziente
// Task 9/10/12) possiede la propria domanda/hint/corpo.
//
// Colonna: root `data-ds="v3"` + `background: var(--bg)` + `.ds-grana` +
// colonna max-width 480 centrata, padding `8px 24px 0` (wizard.html:72
// `.wz-frame`) — full-screen a TUTTI i viewport (§12.2, mai un regime
// "single" ridotto come nel mockup: qui non c'è una versione demo, è
// l'unica UI reale).
//
// Coreografia (§8.3.3): entrata shell «sale come sheet» (`y:'6%'→0` + opacity,
// `molla.smooth`) — reduced-motion → crossfade via mounted-guard (stesso
// pattern di `SheetRidotto` in Sheet.tsx: branch a un albero non-Motion,
// opacity guidata da CSS dopo un frame di mount). Passo→passo: `AnimatePresence
// mode="popLayout"`, riuso diretto delle coreografie di legge già in
// `v3/motion.ts` (`wizardAvanti`/`wizardIndietro`, già tarate su `molla.wizard`)
// — reduced-motion sostituisce lo scivolamento con un semplice dissolvenza.

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { molla, coreografie, cssEase, useReducedMotion } from '@/design-system/v3/motion'
import { tipografia } from '@/design-system/v3/tokens'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { ProgressDots } from '@/components/ds/ProgressDots'
import { PassoDentista } from './PassoDentista'
import type { DatiWizard } from '@/lib/wizard/dati-wizard'

export type TipoScelto = { kind: 'catalogo'; tipoId: string } | { kind: 'libero'; testo: string }

export type StatoWizard = {
  passo: 1 | 2 | 3
  cliente: { id: string; label: string } | null
  tipo: TipoScelto | null
  pz: string
  alias: string
  elemento: string
  colore: string
  foto: File | null
}

const STATO_INIZIALE: StatoWizard = {
  passo: 1,
  cliente: null,
  tipo: null,
  pz: '',
  alias: '',
  elemento: '',
  colore: '',
  foto: null,
}

/**
 * WizardNuovoLavoro — shell del wizard «Nuovo lavoro» (§7.3), montata dalla
 * RSC `page.tsx` con i dati server (`getDatiWizard`, Task 7).
 *
 * `contesto` (userId/labId) non è ancora consumato qui: è nel contratto ORA
 * perché il Task 13 (persistenza) ne avrà bisogno e non deve riaprire questo
 * file per aggiungerlo — vedi task-8-brief.md.
 */
export function WizardNuovoLavoro(props: { dati: DatiWizard; contesto: { userId: string; labId: string } }) {
  const { dati, contesto } = props
  void contesto // riservato al Task 13 (persistenza) — vedi JSDoc sopra
  const router = useRouter()
  const reduced = useReducedMotion()
  const [stato, setStato] = useState<StatoWizard>(STATO_INIZIALE)
  const [direzione, setDirezione] = useState<'avanti' | 'indietro'>('avanti')

  const vaIndietro = useCallback(() => {
    if (stato.passo === 1) {
      router.push('/dashboard')
      return
    }
    setDirezione('indietro')
    setStato((s) => ({ ...s, passo: (s.passo - 1) as StatoWizard['passo'] }))
  }, [stato.passo, router])

  const sceltaDentista = useCallback((cliente: { id: string; label: string }) => {
    setDirezione('avanti')
    setStato((s) => ({ ...s, cliente, passo: 2 }))
  }, [])

  const corpo = (
    <div style={colonnaStile}>
      <div style={testataStile}>
        <TastoTondo glifo="‹" etichettaAria="Indietro" onClick={vaIndietro} />
        <ProgressDots passo={stato.passo} />
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {reduced ? (
          <div key={stato.passo}>
            <RenderPasso stato={stato} dati={dati} onScegli={sceltaDentista} />
          </div>
        ) : (
          <motion.div
            key={stato.passo}
            {...(direzione === 'avanti' ? coreografie.wizardAvanti : coreografie.wizardIndietro)}
          >
            <RenderPasso stato={stato} dati={dati} onScegli={sceltaDentista} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      {reduced ? <EntrataRidotta>{corpo}</EntrataRidotta> : (
        <motion.div initial={{ y: '6%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={molla.smooth}>
          {corpo}
        </motion.div>
      )}
    </div>
  )
}

/** Il corpo del passo corrente. Passo 2/3 sono un segnaposto minimo — Task 9/10/12 li sostituiscono. */
function RenderPasso(props: {
  stato: StatoWizard
  dati: DatiWizard
  onScegli: (d: { id: string; label: string }) => void
}) {
  const { stato, dati, onScegli } = props

  if (stato.passo === 1) {
    return (
      <PassoDentista
        dentisti={dati.dentisti}
        onScegli={onScegli}
        onNuovoDentista={() => {}}
      />
    )
  }

  if (stato.passo === 2) {
    // Segnaposto minimo (Task 8, brief): il Task 10 costruisce PassoTipo per
    // intero (griglia tipi, ricerca, PillVoce). Qui SOLO la domanda, per non
    // lasciare la coreografia passo→passo senza un secondo passo da mostrare.
    return <h1 style={stileDomanda}>Che lavoro è?</h1>
  }

  return null
}

/**
 * EntrataRidotta — variante reduced-motion dell'entrata shell (§8.4), stesso
 * pattern mounted-guard di `SheetRidotto` (Sheet.tsx): monta a opacity 0,
 * un frame dopo (`requestAnimationFrame`) sale a 1 con una transizione CSS
 * pura (`cssEase.generico`) al posto della molla — mai una y che scivola
 * sotto reduced-motion.
 */
function EntrataRidotta(props: { children: ReactNode }) {
  const [entrata, setEntrata] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntrata(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div style={{ opacity: entrata ? 1 : 0, transition: `opacity ${cssEase.generico}` }}>
      {props.children}
    </div>
  )
}

const colonnaStile: CSSProperties = {
  width: '100%',
  maxWidth: 480,
  margin: '0 auto',
  padding: '8px 24px 0',
}

// wizard.html:81 .wz-top — gap 16, margin-bottom 22.
const testataStile: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginBottom: 22,
}

// Duplicato minimo dello stile domanda di PassoDentista.tsx SOLO per il
// segnaposto del Passo 2 (temporaneo, il Task 10 lo rimuove insieme a
// PassoTipo — non vale la pena estrarre un modulo condiviso per due file
// che smetteranno di avere questo duplicato entro l'ondata).
const stileDomanda: CSSProperties = {
  fontSize: tipografia.size.question,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: tipografia.tracking.titoli,
  lineHeight: 1.08,
  color: 'var(--ink)',
}
