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
import { AvvisiProvider, useAvvisi } from '@/components/ds/Avviso'
import { PassoDentista } from './PassoDentista'
import { PassoTipo } from './PassoTipo'
import { PassoPaziente } from './PassoPaziente'
import { NuovoDentistaSheet } from './NuovoDentistaSheet'
import { FrameFatto } from './FrameFatto'
import { creaLavoroDaWizard, stimaGiorni, descrizioneTipo } from '@/lib/wizard/crea-lavoro'
import { dataSuggerita } from '@/lib/lavori/tempi-medi'
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
  // colore/foto).
  const cambiaPaziente = useCallback((patch: Partial<StatoWizard>) => {
    setStato((s) => ({ ...s, ...patch }))
  }, [])

  // Task 12: il corpo vero e proprio (testata+passi, poi FrameFatto) vive in
  // `CorpoWizard`, un componente FIGLIO di AvvisiProvider — mai in questa
  // funzione, che è quella che MONTA il provider: un componente non può
  // consumare un context che sta fornendo nel proprio stesso return
  // (`useAvvisi()` qui sopra lancerebbe "va chiamato dentro <AvvisiProvider>").
  // `continuaPaziente`/`inCreazione`/`fatto` vivono quindi dentro CorpoWizard,
  // non qui: sono l'unico punto che ha bisogno di `useAvvisi()` per
  // segnalare un fallimento bloccante o gli accessori falliti.
  const corpo = (
    <CorpoWizard
      dati={dati}
      stato={stato}
      direzione={direzione}
      reduced={reduced}
      vaIndietro={vaIndietro}
      sceltaDentista={sceltaDentista}
      apriSheetDentista={apriSheetDentista}
      sceltaTipo={sceltaTipo}
      cambiaPaziente={cambiaPaziente}
      onTornaHome={() => router.push('/dashboard')}
    />
  )

  // AvvisiProvider avvolge tutto il wizard (non solo lo sheet): NuovoDentistaSheet
  // e CorpoWizard (Task 12: creazione lavoro + Frame Fatto) chiamano
  // useAvvisi() per errori di rete (§5.18), tutti dallo stesso provider.
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

/** L'esito «Fatto!» — tutto ciò che serve a FrameFatto, calcolato una sola volta alla creazione. */
type StatoFatto = {
  lavoro: { id: string; numero_lavoro: string }
  accessoriFalliti: Array<'dettagli' | 'foto'>
  dentista: string
  lavoroLabel: string
  pz: string
  giorni: number
  daStoria: boolean
  dataConsegna: Date
}

/**
 * CorpoWizard — testata + AnimatePresence dei 3 passi, oppure FrameFatto
 * (Task 12). Componente FIGLIO di AvvisiProvider (vedi commento sopra): è
 * l'unico posto del wizard che chiama `useAvvisi()` per il ramo di
 * creazione. Possiede `inCreazione`/`fatto` come stato locale, non
 * condiviso con `WizardNuovoLavoro` — quello stato non serve a nessun altro
 * (testata/ProgressDots spariscono insieme al passo-tree quando `fatto` è
 * valorizzato, quindi non serve nemmeno "risalire" per nasconderli).
 */
function CorpoWizard(props: {
  dati: DatiWizard
  stato: StatoWizard
  direzione: 'avanti' | 'indietro'
  reduced: boolean
  vaIndietro: () => void
  sceltaDentista: (d: { id: string; label: string }) => void
  apriSheetDentista: () => void
  sceltaTipo: (t: TipoScelto) => void
  cambiaPaziente: (patch: Partial<StatoWizard>) => void
  onTornaHome: () => void
}) {
  const { dati, stato, direzione, reduced, vaIndietro, sceltaDentista, apriSheetDentista, sceltaTipo, cambiaPaziente, onTornaHome } = props
  const { errore } = useAvvisi()
  const [inCreazione, setInCreazione] = useState(false)
  const [fatto, setFatto] = useState<StatoFatto | null>(null)

  // Task 12: il «Continua» del Passo 3 — sequenza fail-soft spec §7. Il
  // Passo 3 si attraversa SEMPRE (precompilato dal Task 11): questo è
  // l'unico punto che chiama `creaLavoroDaWizard`, nessuna scorciatoia lo
  // bypassa.
  const continuaPaziente = useCallback(async () => {
    const { cliente, tipo } = stato
    if (!cliente || !tipo) return // difensivo: il wizard non arriva al Passo 3 senza i due
    setInCreazione(true)
    const { giorni, daStoria } = stimaGiorni(tipo, dati.giorniPerTipo)
    const dataConsegna = dataSuggerita(giorni)
    const esito = await creaLavoroDaWizard({
      cliente,
      tipo,
      pz: stato.pz,
      alias: stato.alias,
      elemento: stato.elemento,
      colore: stato.colore,
      foto: stato.foto,
      dataConsegna,
    })
    setInCreazione(false)
    if (!esito.lavoro) {
      errore('Non sono riuscita a creare il lavoro. Riprova.')
      return
    }
    setFatto({
      lavoro: esito.lavoro,
      accessoriFalliti: esito.accessoriFalliti,
      dentista: cliente.label,
      lavoroLabel: descrizioneTipo(tipo),
      pz: stato.pz,
      giorni,
      daStoria,
      dataConsegna,
    })
  }, [stato, dati.giorniPerTipo, errore])

  if (fatto) {
    return (
      <FrameFatto
        lavoro={fatto.lavoro}
        accessoriFalliti={fatto.accessoriFalliti}
        dentista={fatto.dentista}
        lavoroLabel={fatto.lavoroLabel}
        pz={fatto.pz}
        giorni={fatto.giorni}
        daStoria={fatto.daStoria}
        dataConsegna={fatto.dataConsegna}
        onTornaHome={onTornaHome}
      />
    )
  }

  return (
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
              inCreazione={inCreazione}
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
              inCreazione={inCreazione}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  inCreazione: boolean
}) {
  const { stato, dati, onScegli, onNuovoDentista, onScegliTipo, onCambiaPaziente, onContinuaPaziente, inCreazione } = props

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
  // Task 12: `onContinua`/`inCreazione` sono ora la persistenza reale
  // (`continuaPaziente` in CorpoWizard sopra), non più uno stub.
  return (
    <PassoPaziente
      pz={stato.pz}
      alias={stato.alias}
      elemento={stato.elemento}
      colore={stato.colore}
      foto={stato.foto}
      onCambia={onCambiaPaziente}
      onContinua={onContinuaPaziente}
      inCreazione={inCreazione}
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
