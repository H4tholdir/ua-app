// DS v3 §8 — le UNICHE animazioni ammesse. Tutto il resto è `instant` (nessuna transizione).
// Molle = traduzione diretta delle spring iOS (ricerca HIG 07/07/2026):
// snappy=.snappy, smooth=.smooth, bouncy=.bouncy, press=.interactiveSpring, wizard=nav push.

export { useReducedMotion } from '../motion'

export const molla = {
  snappy: { type: 'spring', visualDuration: 0.5, bounce: 0.15 },
  smooth: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  bouncy: { type: 'spring', visualDuration: 0.5, bounce: 0.3 },
  press:  { type: 'spring', stiffness: 1754, damping: 72, mass: 1 },
  wizard: { type: 'spring', visualDuration: 0.35, bounce: 0.1 },
} as const

// Costanti di gesto del trascinamento (Task 13, §3.3 ricerca `.superpowers/sdd/ricerca-drag-touch.md`).
// Non sono molle né easing: sono i due VALORI del sollevamento che nessun token esprimeva. Dichiarati
// qui, con nome, invece che sparsi come literal (constraint d'ondata). L'animazione che li porta è
// `molla.press` (scala al lift) e `cssEase.generico` (opacity della buca) — quelle restano token.
export const trascinamento = {
  /** Scala del ghost al sollevamento (riferimento Atlassian/Material): appena percettibile, «si
   *  stacca dal muro» senza gonfiarsi. Animata con `molla.press`. */
  scalaSollevamento: 1.06,
  /** Opacità dell'originale rimasto in flow durante il drag — la «buca» (pattern Atlassian): resta
   *  visibile e si riordina otticamente con le sorelle. Animata con `cssEase.generico` (solo opacity). */
  opacitaBuca: 0.4,
} as const

// Fallback CSS (spec §8.1) — per transition CSS pure (frequency gate) e device low-end
export const cssEase = {
  sheet: '500ms cubic-bezier(0.32, 0.72, 0, 1)',
  generico: '200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  snap: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Transizioni CSS del TastoPiu «punto rosso» (§5.2 rev 2, dal mockup
  // approvato): box-shadow al pressed di ghiera e cappello. Il transform del
  // cappello NON passa di qui: lo anima Motion con molla.press — mai due
  // motori sulla stessa proprietà.
  tastoPiuGhiera: 'box-shadow 220ms cubic-bezier(0.32, 0.72, 0, 1)',
  tastoPiuCappello: 'box-shadow 120ms cubic-bezier(0.32, 0.72, 0, 1)',
  // PillVoce «la pill di carta» (§5.15 rev 2, dal mockup approvato): box-shadow
  // al pressed di faccia e cerchioMic. Il translateY della faccia NON passa di
  // qui: lo anima Motion con `whileTap`/`molla.press` — mai due motori sulla
  // stessa proprietà (stesso principio del TastoPiu sopra).
  pillVoce: 'box-shadow 120ms cubic-bezier(0.32, 0.72, 0, 1)',
  // ProgressDots (§5.32, verbatim da wizard.html:88 `.dots .dot`): il dot
  // attivo passa da 11 a 30px in linea — l'unica proprietà animata è width,
  // mai via Motion (nessun layout-shift da spring qui, solo un CSS lineare).
  dots: 'width 120ms cubic-bezier(0.32, 0.72, 0, 1)',
} as const

// Le coreografie canoniche (§8.3) — SOLO queste. Variants Motion pronti all'uso.
export const coreografie = {
  /** 1. Pila → lista: la card si espande nell'header (usare con layoutId condiviso) */
  pilaEspansione: { transition: molla.smooth },
  /** 3. Passo wizard avanti: scivolata corta, il precedente resta dietro al 30% */
  wizardAvanti: {
    initial: { x: '100%', opacity: 0.6 },
    animate: { x: 0, opacity: 1, transition: molla.wizard },
    exit: { x: '-30%', opacity: 0.5, transition: molla.wizard },
  },
  wizardIndietro: {
    initial: { x: '-30%', opacity: 0.5 },
    animate: { x: 0, opacity: 1, transition: molla.wizard },
    exit: { x: '100%', opacity: 0.6, transition: molla.wizard },
  },
  /** 6. Sheet: sale dal basso, la vista sotto scala a .96 (scale gestita dal caller) */
  sheetSu: {
    initial: { y: '100%' },
    animate: { y: 0, transition: molla.smooth },
    exit: { y: '100%', transition: molla.smooth },
  },
  /** 5. Spunta FATTA: il cerchio si riempie e trabocca appena */
  spuntaFatta: {
    initial: { scale: 0.6, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: molla.bouncy },
  },
  /** 4a. Consegnato!: il check si disegna (450ms), sincronizzato al picco di ua.wav */
  consegnatoCheck: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 0.45, ease: [0, 0, 0.2, 1] as const },
  },
  /** 4b. Consegnato!: la lista "UÀ ha già fatto" entra a cascata */
  consegnatoCascata: {
    animate: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } },
  },
  /** Avviso (toast): entra con snappy, esce secco */
  avviso: {
    initial: { y: -16, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: molla.snappy },
    exit: { y: -8, opacity: 0, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] as const } },
  },
} as const
