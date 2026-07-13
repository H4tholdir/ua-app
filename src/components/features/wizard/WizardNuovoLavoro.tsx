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
import { TastoTondo } from '@/components/ds/TastoTondo'
import { ProgressDots } from '@/components/ds/ProgressDots'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { PassoDentista } from './PassoDentista'
import { PassoTipo } from './PassoTipo'
import { PassoPaziente } from './PassoPaziente'
import { NuovoDentistaSheet } from './NuovoDentistaSheet'
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
  // CONTRATTO (Task 10-13): chi avanza DEVE settare `direzione` 'avanti' PRIMA
  // di cambiare `stato.passo` (come fa `sceltaDentista` qui sotto); chi arretra
  // DEVE settare 'indietro' (come `vaIndietro`). È `direzione` a scegliere la
  // coreografia (`wizardAvanti`/`wizardIndietro`): cambiare passo senza
  // aggiornarla fa scivolare il passo dal lato sbagliato — nessun errore, solo
  // un bug visivo silenzioso.
  const [direzione, setDirezione] = useState<'avanti' | 'indietro'>('avanti')
  // Task 9 (A7): stato dello sheet «Nuovo dentista», montato una sola volta
  // qui sotto (non dentro RenderPasso) perché deve sopravvivere al cambio di
  // `stato.passo` — vedi `dentistaCreato` sotto: la creazione riuscita
  // avanza subito al Passo 2, e lo sheet deve chiudersi nello stesso istante
  // senza un frame intermedio in cui esiste ma è "orfano" del Passo 1.
  const [sheetDentistaAperto, setSheetDentistaAperto] = useState(false)

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

  // CONTRATTO Task 9: `NuovoDentistaSheet.onCreato` chiama questa — riusa
  // `sceltaDentista` (stesso percorso di selezione di un tile esistente),
  // così direzione/coreografia restano un'unica fonte di verità.
  const dentistaCreato = useCallback(
    (cliente: { id: string; label: string }) => {
      setSheetDentistaAperto(false)
      sceltaDentista(cliente)
    },
    [sceltaDentista]
  )

  const apriSheetDentista = useCallback(() => setSheetDentistaAperto(true), [])

  // Task 10: la scelta del tipo (tile, catalogo o «Descrivilo») salva `tipo` e
  // avanza al Passo 3 — `direzione` 'avanti' PRIMA del cambio passo (contratto
  // sopra), stesso schema di `sceltaDentista`. Task 11 (brief): al mount del
  // Passo 3 il wizard precompila `pz` con `dati.prossimoPz` SE ancora vuoto —
  // `s.pz || dati.prossimoPz` non sovrascrive mai un codice già scritto
  // dall'odontotecnico in un giro precedente (indietro poi di nuovo avanti).
  const sceltaTipo = useCallback(
    (tipo: TipoScelto) => {
      setDirezione('avanti')
      setStato((s) => ({ ...s, tipo, passo: 3, pz: s.pz || dati.prossimoPz }))
    },
    [dati.prossimoPz]
  )

  // Task 11: PassoPaziente è un componente controllato — questo è l'unico
  // punto che scrive nello stato condiviso i suoi campi (pz/alias/elemento/
  // colore/foto). Task 12 sostituirà `continuaPaziente`/`inCreazione` con la
  // persistenza reale; qui restano uno stub perché il contratto delle props
  // (consumato dal Task 12) va rispettato ORA, non riaperto dopo.
  const cambiaPaziente = useCallback((patch: Partial<StatoWizard>) => {
    setStato((s) => ({ ...s, ...patch }))
  }, [])
  const continuaPaziente = useCallback(() => {
    // Segnaposto (Task 12, brief): qui nascerà la creazione vera del lavoro.
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
            <RenderPasso
              stato={stato}
              dati={dati}
              onScegli={sceltaDentista}
              onNuovoDentista={apriSheetDentista}
              onScegliTipo={sceltaTipo}
              onCambiaPaziente={cambiaPaziente}
              onContinuaPaziente={continuaPaziente}
            />
          </div>
        ) : (
          <motion.div
            key={stato.passo}
            {...(direzione === 'avanti' ? coreografie.wizardAvanti : coreografie.wizardIndietro)}
          >
            <RenderPasso
              stato={stato}
              dati={dati}
              onScegli={sceltaDentista}
              onNuovoDentista={apriSheetDentista}
              onScegliTipo={sceltaTipo}
              onCambiaPaziente={cambiaPaziente}
              onContinuaPaziente={continuaPaziente}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // AvvisiProvider avvolge tutto il wizard (non solo lo sheet): NuovoDentistaSheet
  // chiama useAvvisi() per l'errore di rete (§5.18), e i passi futuri (Task
  // 10-13) potranno avvisare dallo stesso provider senza rimontarlo.
  return (
    <AvvisiProvider>
      <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
        <div className="ds-grana" aria-hidden />
        {reduced ? <EntrataRidotta>{corpo}</EntrataRidotta> : (
          <motion.div initial={{ y: '6%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={molla.smooth}>
            {corpo}
          </motion.div>
        )}
        <NuovoDentistaSheet
          aperto={sheetDentistaAperto}
          onChiudi={() => setSheetDentistaAperto(false)}
          onCreato={dentistaCreato}
        />
      </div>
    </AvvisiProvider>
  )
}

/** Il corpo del passo corrente. */
function RenderPasso(props: {
  stato: StatoWizard
  dati: DatiWizard
  onScegli: (d: { id: string; label: string }) => void
  onNuovoDentista: () => void
  onScegliTipo: (t: TipoScelto) => void
  onCambiaPaziente: (patch: Partial<StatoWizard>) => void
  onContinuaPaziente: () => void
}) {
  const { stato, dati, onScegli, onNuovoDentista, onScegliTipo, onCambiaPaziente, onContinuaPaziente } = props

  if (stato.passo === 1) {
    return (
      <PassoDentista
        dentisti={dati.dentisti}
        onScegli={onScegli}
        onNuovoDentista={onNuovoDentista}
      />
    )
  }

  if (stato.passo === 2) {
    return (
      <PassoTipo
        topTipi={dati.topTipi}
        frequenze={dati.frequenzeTipi}
        onScegli={onScegliTipo}
      />
    )
  }

  // Task 11: PassoPaziente per intero (codice PZ, dettagli opzionali, foto).
  // `onContinua`/`inCreazione` restano uno stub del wizard (Task 12 li
  // sostituirà con la persistenza reale — vedi `continuaPaziente` sopra).
  return (
    <PassoPaziente
      pz={stato.pz}
      alias={stato.alias}
      elemento={stato.elemento}
      colore={stato.colore}
      foto={stato.foto}
      onCambia={onCambiaPaziente}
      onContinua={onContinuaPaziente}
      inCreazione={false}
    />
  )
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
