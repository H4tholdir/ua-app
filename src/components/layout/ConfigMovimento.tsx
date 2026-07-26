'use client'

// La legge §8.4 del DS detta a Motion, non solo ai componenti — difetto D2 del 26/07
// (`.superpowers/sdd/fix-reduced-motion-report.md`).
//
// COSA FA: dice a Motion che sotto «Riduci movimento» gli spostamenti (transform e animazioni di
// layout) non si animano — ci si arriva subito. Le dissolvenze restano: `reducedMotion="user"` è
// la modalità della libreria che spegne SOLO le proprietà di movimento, mai l'opacità. È
// esattamente la regola che il sistema dichiara da sempre («le coreografie degradano a
// dissolvenza») detta una volta sola, nel punto in cui vale per tutti.
//
// PERCHÉ SERVE, oltre alle coreografie già corrette a mano: c'è una finestra in cui nessun
// componente React può sapere la preferenza — l'IDRATAZIONE. La prima resa del client deve
// coincidere con l'HTML del server, e il server non conosce la preferenza dell'utente (v. il
// commento esteso su `useReducedMotion` in `src/design-system/motion.ts`): l'ingresso della
// striscia della home parte quindi con la molla piena, e quando la preferenza si fa viva
// l'animazione è già in volo — Motion non la fa ripartire, perché il punto d'arrivo non è
// cambiato. Misurato: la striscia scendeva comunque i suoi 12px in mezzo secondo, a preferenza
// accesa. Motion invece la preferenza la legge da sé, con `matchMedia`, nell'istante in cui
// l'animazione PARTE — un istante che nessuno stato di React può anticipare. Da qui questo
// involucro.
//
// PERCHÉ ALLA RADICE e non su una pagina: la preferenza è dell'utente, non della schermata. Vale
// per ogni superficie che anima, v3 e v2.3 insieme, e nessuna nuova pagina dovrà ricordarsi di
// accenderla.
//
// COSA NON CAMBIA: senza la preferenza accesa (il caso normale) `reducedMotion="user"` non fa
// assolutamente nulla — verificato sulla panchina rm2, che a preferenza spenta misura la stessa
// molla di prima, frame per frame. Non tocca l'HTML del server (è solo un contesto, non
// renderizza niente) e quindi non può introdurre disallineamenti d'idratazione.
import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

export function ConfigMovimento({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
