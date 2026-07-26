'use client'

// DS v3 §5.24 — StrisciaStato (home): riga di stato con voce, sotto le pile.
// Task 16b (forma F2 «card con voce», ratifica 23-24/07/2026 —
// docs/design/decisions/2026-07-24-striscia-home.md §Ratifiche 1): non è più la riga F1 nuda di
// prima — vive dentro una card tinta di stato (rossa/ambra/blu/verde), valori VERBATIM dal
// mockup ratificato docs/design/mockups/2026-07-24-striscia-home.html (.f2/.ico/.txt/.cta,
// righe 149-160). Variante default = rassicurazione (check verde: "va tutto bene, guarda").
// Variante `attenzione` = chiede un'azione: icona famiglia rossa al posto del check.
// Il RACCONTO (segnale con `eventoId`, v. src/lib/dashboard/striscia.ts — presente SOLO su
// sRaccontoLiberazione) è l'UNICA variante blu (stella `✦`, verificato sul mockup dal
// controller: righe 132/219 — stato s3 «Racconto quieto», `.s-blue`) ed è tappabile su tutta la
// card, deep-link diretto con un chevron come affordance (Task 16b punto 4, mockup
// `.taprow`/`.chev`); ogni altro segnale quieto (sPareteIntro, s8) resta verde — NON ha mai un
// `eventoId`, quindi non prende né il blu né il whole-card-tap. Ogni altro stato resta come
// sempre: region viva e educata (`role="status"` `aria-live="polite"`), MAI un elemento
// interattivo di per sé, con la sola CTA `azione` — un `<Link>` separato dal blocco di testo
// troncabile. Al tap: `vibra('selection')`, MAI `suona()` (il suono è riservato ai tasti fisici
// che fanno qualcosa).
//
// Il dedup del racconto (Task 16b punto 6, `useRaccontoVisto`) vive nei CALLSITE (HomeV3,
// NavDesk), non qui: questo componente resta presentazionale (com'era già prima — "la logica la
// porta il chiamante, qui si invoca soltanto", v. `onAzione` sotto), e un eventuale `return null`
// qui dentro lascerebbe comunque montato il contenitore del chiamante (es. `.striscia-slot` con
// `marginTop` fisso in HomeV3) — un vuoto orfano, non l'assenza vera richiesta dal punto 5/6.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { spazio, tipografia, raggio } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'
import { molla, coreografie, istantaneo, useReducedMotion } from '@/design-system/v3/motion'

const DIAMETRO = 26
const PADDING_CARD = `${spazio.sm}px 14px` // mockup .f2: padding 12/14 (12 = spazio.sm, 14 letterale)

// Task 16b punto 3 — coreografia V1 «carattere per livello» (ratifica 24/07/2026, decisione
// docs/design/decisions/2026-07-24-striscia-home.md §Ratifiche 2, valori VERBATIM dalla demo
// docs/design/mockups/2026-07-24-striscia-animazioni.html righe ~355-358, funzione `recipeFor`):
// l'ingresso della striscia cambia carattere secondo lo stato che rappresenta.
export type CarattereStriscia = 'urgenza' | 'trial' | 'racconto'

/** attenzione vince sempre (O1i — anche se il segnale fosse di origine trial); poi il tono
 *  ambra è il trial fuori dall'ultima finestra; tutto il resto (narrazione quieta, mai un
 *  allarme) è «racconto» per la coreografia — indipendentemente dal fatto che porti o no un
 *  `eventoId` (quella è una domanda diversa, v. `StrisciaStato` più sotto). */
export function carattereStriscia(attenzione: boolean, tono?: 'ambra'): CarattereStriscia {
  if (attenzione) return 'urgenza'
  if (tono === 'ambra') return 'trial'
  return 'racconto'
}

/**
 * ingressoStriscia — `initial`/`animate` per Motion, secondo il carattere. `reduced`
 * (prefers-reduced-motion, legge d'accessibilità) → SOLO dissolvenza: la striscia compare al
 * suo posto, senza salita e senza scatto di scala.
 *
 * COME si ottiene la dissolvenza (difetto D2 del 26/07 — v. il report
 * `.superpowers/sdd/fix-reduced-motion-report.md` e il commento su `useReducedMotion`): NON
 * togliendo `y`/`scale` dal bersaglio, che è quello che questa funzione faceva prima e che
 * lasciava la striscia inchiodata 12px più in basso e al 96% per sempre. Motion muove SOLO le
 * chiavi che trova in `animate`: una chiave tolta non torna a casa, resta dov'è. Qui cambia
 * quindi solo la TRANSIZIONE — `y` e `scale` arrivano a destinazione `istantaneo` (token, non
 * una durata inventata), l'opacità continua a salire con la molla del carattere.
 *
 * `initial` è per costruzione IDENTICO nei due modi, e questo non è un dettaglio: Motion scrive
 * `initial` già nell'HTML del server, che non può sapere la preferenza dell'utente. Finché i due
 * modi partono dallo stesso `initial`, il valore che l'hook restituisce al primo render non può
 * più produrre né un hydration mismatch né una striscia congelata.
 */
export function ingressoStriscia(carattere: CarattereStriscia, reduced: boolean) {
  const ricetta = (() => {
    switch (carattere) {
      case 'urgenza':
        return { y: 12, scale: 0.96, spring: molla.bouncy }
      case 'trial':
        return { y: 12, scale: 0.98, spring: molla.smooth }
      case 'racconto':
        return { y: 6, scale: 1, spring: molla.smooth }
    }
  })()
  const { y, scale, spring } = ricetta
  return {
    initial: { y, scale, opacity: 0 },
    animate: {
      y: 0,
      scale: 1,
      opacity: 1,
      // Transizione per-chiave (forma nativa di Motion): `y` e `scale` istantanei, tutto il
      // resto — cioè l'opacità — con la molla del carattere. Sotto reduced-motion la striscia
      // si limita quindi a dissolvere, esattamente come prima, ma ARRIVANDO al suo posto invece
      // di restare dov'era nata.
      transition: reduced ? { ...spring, y: istantaneo, scale: istantaneo } : spring,
    },
  }
}

/**
 * uscitaStriscia — uscita UNICA per ogni carattere: `coreografie.avviso.exit`, già in motion.ts,
 * byte-identica alla demo. Sotto reduced-motion la `y` non SPARISCE dal bersaglio (stessa
 * lezione dell'ingresso qui sopra: una chiave tolta resta congelata dov'è, e su un'uscita
 * significherebbe portarsi dietro l'eventuale spostamento invece di dissolvere sul posto) — ci
 * resta, ferma a 0. Stessa transizione già dichiarata, nessuna durata nuova: la striscia svanisce
 * dov'è, senza traslare di quegli 8px.
 */
export function uscitaStriscia(reduced: boolean) {
  return reduced ? { y: 0, opacity: 0, transition: coreografie.avviso.exit.transition } : coreografie.avviso.exit
}

/**
 * StrisciaStato — riga di stato in home (§5.24, forma F2 «card con voce»).
 *
 * Contenitore `role="status" aria-live="polite"`, card tinta di stato (`background` tint,
 * `border-radius: raggio.riga`, `padding: 12px 14px`, `border: 1px solid var(--line)` — dark
 * resta FLAT, nessuna ombra). Dentro: icona Ø26 (check verde tint / triangolo `!` rosso tint in
 * `attenzione` / clessidra ambra nel trial / stella `✦` blu nel racconto con `eventoId` — il
 * disco è sempre la superficie `--elv`, mai più la tinta) + testo `flex: 1 1 auto; minWidth: 0`
 * 14.5/500 `--muted`, sempre su UNA riga.
 * `forte` (opzionale) apre il testo in grassetto `--ink` 700, poi `children`. Dalla decisione
 * del 26/07/2026 i due NON condividono più un'unica ellissi: `forte` ha un nodo suo che non
 * cede (v. il commento su `testo` qui sotto) e a troncarsi è solo `children`. Se il chiamante
 * passa `altri` compare un nodo `flex: none` subito dopo (Task 16b punto 2 — mai dentro il testo
 * troncabile). Se il chiamante passa `azione` compare una CTA `<Link>` `flex-none` 14.5/800
 * `--red`, MAI dentro il blocco troncabile — hit-area ≥44px via `minHeight: 44` +
 * `margin: '-13px 0'`. Se il segnale porta anche `eventoId` (SOLO il racconto liberazione oggi),
 * l'intera card diventa il link (Task 16b punto 4): niente CTA testuale, un chevron come
 * affordance.
 */
export function StrisciaStato(props: {
  children: ReactNode
  forte?: string | null
  attenzione?: boolean
  tono?: 'ambra'
  azione?: { etichetta: string; href: string } | null
  /** Task 16b punto 2 — quanti ALTRI allarmi di livello 1 sono accesi insieme a questo
   *  (v. SegnaleStriscia.altri): assente con un solo allarme, MAI 0. Nodo che non si restringe,
   *  copy verbatim: `altri === 1` → «e un'altra» · `altri > 1` → «e altre N». */
  altri?: number
  /** Task 16b punto 4 — presente SOLO sui segnali «racconto» (oggi: sRaccontoLiberazione, v.
   *  striscia.ts): con `azione` insieme, attiva il tap sull'intera card. Allarmi (`attenzione`)
   *  e trial (`tono === 'ambra'`) restano CTA-only anche se per errore portassero un eventoId —
   *  difesa esplicita, mai un allarme che diventa whole-card. */
  eventoId?: string
  /** Task 15 — effetto collaterale opzionale al tap dell'azione (CTA o whole-card), OLTRE alla
   *  navigazione del `<Link>` (es. il racconto backfill scrive `parete_intro_vista`
   *  fire-and-forget). La riga resta presentazionale: la logica la porta il chiamante, qui si
   *  invoca soltanto. */
  onAzione?: () => void
}) {
  const { children, forte, attenzione = false, tono, azione, altri, eventoId, onAzione } = props
  const reduced = useReducedMotion()

  function handleClickAzione() {
    vibra('selection')
    onAzione?.()
  }

  // Adeguamento post-consegna (verificato dal controller sul mockup ratificato,
  // docs/design/mockups/2026-07-24-striscia-home.html:132/219 — stato s3 «Racconto quieto»:
  // `cls:'s-blue'`, `glyph:'✦'`, `.s-blue{--st:var(--blue);--st-tint:var(--blue-tint)}`):
  // il RACCONTO tappabile (eventoId + azione, v. `tappabileIntera` sotto) rende blu con stella
  // `✦`, non verde. Il discriminante è lo STESSO usato per il whole-card-tap — mai un
  // "attenzione:false e ha un'azione" inferito: `sPareteIntro` (Task 15, «nessun tono nuovo» —
  // v. il suo commento in striscia.ts) e `s8` (DdC del giorno) restano verdi, non hanno mai un
  // `eventoId`. `attenzione` vince sempre il rosso `!` (allarme, anche se il segnale è di
  // origine trial negli ultimi 3 giorni); poi `tono` ambra è lo stato informativo del trial
  // (⏳); poi il racconto blu (✦); il verde `✓` resta il default sereno per tutto il resto.
  // `background` è la tinta della CARD F2 (era quella dell'icona in F1).
  const eBlu = !!eventoId && !!azione && !attenzione && tono !== 'ambra'
  const background = attenzione ? 'var(--red-tint)' : tono === 'ambra' ? 'var(--amber-tint)' : eBlu ? 'var(--blue-tint)' : 'var(--green-tint)'
  const colore = attenzione ? 'var(--red)' : tono === 'ambra' ? 'var(--amber)' : eBlu ? 'var(--blue)' : 'var(--green)'
  const glifo = attenzione ? '!' : tono === 'ambra' ? '⏳' : eBlu ? '✦' : '✓'

  const icona = (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: DIAMETRO,
        height: DIAMETRO,
        borderRadius: '50%',
        background: 'var(--elv)', // F2 — il disco è la superficie elevata, non più la tinta (era `background` in F1)
        color: colore,
        fontSize: 13,
        fontWeight: tipografia.weight.extrabold,
      }}
    >
      {glifo}
    </span>
  )

  // DECISIONE DI FRANCESCO, 26/07/2026 (gate estetico L2 §4.4, catture
  // `docs/design/screenshots/2026-07-26-redesign-parete-home/home/390-*-striscia-allarme-altri-reale.png`):
  // «Il numero del lavoro non si taglia mai.» Ordine di chi cede quando lo spazio finisce:
  //   1) il NUMERO (`forte`) — mai troncato;
  //   2) il CONTEGGIO («e altre N») — mai troncato (resta `flex: none`, v. sotto);
  //   3) la FRASE — è lei che si accorcia, con l'ellissi.
  // PRIMA di questa decisione numero e frase stavano nello STESSO blocco con una sola ellissi,
  // quindi a tagliarsi era il numero solo perché veniva prima: a 390, sul dato vero di questo
  // laboratorio, si leggeva `n.2026/000…` — che non distingue il lavoro 0001 dal 0009 — e la
  // frase spariva comunque per intero. Ora il numero ha un nodo suo e solo la frase tronca.
  // NB — è un cambio di SOLO LAYOUT: parole, pesi, colori e molle sono quelli di prima. Lo
  // spazio fra numero e frase era il `{' '}` che stava fra i due nodi: qui è uno spazio
  // unificatore in testa alla frase (stesso peso 500, stessa larghezza misurata — 2.47px a 14.5px
  // — e, a differenza di uno spazio normale, non viene mangiato dall'inizio riga del nuovo box).
  //
  // PERCHÉ IL NUMERO NON È `flex: none`, MA CEDE PER ULTIMO. `forte` non porta solo numeri di
  // lavoro: porta anche nomi liberi e SENZA limite di lunghezza (materiale in esaurimento s5,
  // studio con pagamento scaduto s7, «Account di …», v. striscia.ts). Con `flex: none` un nome
  // lungo spingerebbe la CTA fuori dalla card — oggi si tronca soltanto, quindi sarebbe una
  // regressione. La scala di priorità è scritta nei FATTORI DI RESTRINGIMENTO invece che in una
  // soglia: la frase cede 1000 volte più in fretta del numero, quindi finché la frase ha spazio
  // la quota che tocca al numero resta sotto il pixel (misurato: 0,09px nel caso reale a 390);
  // quando la frase arriva a zero il flexbox la congela e SOLO ALLORA gira tutto il resto al
  // numero. I numeri di lavoro a quel punto non ci arrivano mai; i nomi senza limite sì, ed è
  // giusto che tocchi a loro.
  //
  // ⚠️ IL FATTORE DEL NUMERO DEVE RESTARE ≥ 1 — non è un dettaglio di stile, è una trappola vera
  // del flexbox, misurata su questa stessa striscia. Prima qui c'era `flex: 0 0.001 auto`, che
  // sembra «un freno mille volte più forte» ed è la stessa proporzione di adesso: nei casi
  // normali dava px identici. Ma la regola di risoluzione delle lunghezze flessibili
  // (CSS Flexbox §9.7, passo 4b) dice che quando la somma dei fattori degli elementi ancora
  // liberi è MINORE DI 1, lo spazio che possono assorbire viene tagliato a
  // «spazio libero iniziale × quella somma». All'ultimo giro resta libero il solo numero: con
  // fattore 0,001 poteva cedere ~0,4px in tutto, cioè la valvola non si apriva MAI — e un nome
  // lungo usciva dal proprio blocco e andava a scriversi SOPRA il conteggio e la CTA (misurato:
  // 55px oltre il bordo interno della card, a 390). Con fattore 1 l'ultimo giro non viene
  // tagliato e il nome si tronca dentro il suo blocco, come deve. Guardia:
  // tests/unit/ds-v3/componenti/pila-striscia.test.tsx.
  const testo = (
    <span
      style={{
        display: 'flex',
        alignItems: 'baseline',
        flex: '1 1 auto',
        minWidth: 0,
        fontSize: 14.5,
        fontWeight: 500,
        color: 'var(--muted)',
        textAlign: 'left',
      }}
    >
      {forte && (
        <b
          style={{
            flex: '0 1 auto',
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'var(--ink)',
            fontWeight: 700,
          }}
        >
          {forte}
        </b>
      )}
      <span
        style={{
          // grow 1 come il vecchio blocco unico; shrink 1000 = la frase cede prima del numero
          // (v. il commento sopra: il rapporto conta, e il fattore del NUMERO deve restare ≥ 1)
          flex: '1 1000 auto',
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {forte ? '\u00A0' : null}
        {children}
      </span>
    </span>
  )

  // Task 16b punto 2 — «e un'altra» / «e altre N»: nodo che NON si restringe (flex: none), copy
  // verbatim (mai concatenato in `testo`, che tronca con ellissi CSS a 390px — sarebbe la prima
  // cosa a sparire, perdendo esattamente l'informazione che giustifica la sua esistenza).
  const altriNodo = altri !== undefined && (
    <span style={{ flex: 'none', marginLeft: 4, fontSize: 14.5, fontWeight: 500, color: 'var(--muted)' }}>
      {altri === 1 ? "e un'altra" : `e altre ${altri}`}
    </span>
  )

  // Task 16b punto 4 — SOLO il racconto (eventoId presente + una destinazione reale) è tappabile
  // su tutta la card: allarmi e trial restano com'erano, la CTA sola è l'unico interattivo.
  // STESSO discriminante `eBlu` del colore sopra (mai due condizioni scritte due volte che
  // potrebbero divergere — "tappabile" e "blu" sono la stessa domanda: è un racconto?).
  const tappabileIntera = eBlu

  const { initial, animate } = ingressoStriscia(carattereStriscia(attenzione, tono), reduced)
  const exit = uscitaStriscia(reduced)

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): la CTA (o, nel racconto, l'intera card)
          — unico elemento interattivo di questo componente — lo porta con sé. */}
      <style>{`
        .ds-striscia-stato-azione:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.div
        role="status"
        aria-live="polite"
        initial={initial}
        animate={animate}
        exit={exit}
        style={
          tappabileIntera
            ? { minWidth: 0, background, borderRadius: raggio.riga, border: '1px solid var(--line)' }
            : { display: 'flex', alignItems: 'center', gap: spazio.sm, minWidth: 0, background, borderRadius: raggio.riga, padding: PADDING_CARD, border: '1px solid var(--line)' }
        }
      >
        {tappabileIntera && azione ? (
          <Link
            href={azione.href}
            className="ds-striscia-stato-azione"
            onClick={handleClickAzione}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spazio.sm,
              minWidth: 0,
              width: '100%',
              boxSizing: 'border-box',
              minHeight: 44,
              padding: PADDING_CARD,
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {icona}
            {testo}
            {altriNodo}
            {/* Chevron — affordance del tap whole-card (mockup .chev), sostituisce il testo
                della CTA: `azione.etichetta` resta la destinazione (href), non compare più come
                testo separato. */}
            <span aria-hidden="true" style={{ flex: 'none', fontSize: 19, fontWeight: 800, color: colore, marginLeft: 2, lineHeight: 1 }}>
              ›
            </span>
          </Link>
        ) : (
          <>
            {icona}
            {testo}
            {altriNodo}
            {azione && (
              <Link
                href={azione.href}
                className="ds-striscia-stato-azione"
                onClick={handleClickAzione}
                style={{
                  flex: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: 44,
                  margin: '-13px 0',
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: 'var(--red)',
                  textDecoration: 'none',
                }}
              >
                {azione.etichetta}
              </Link>
            )}
          </>
        )}
      </motion.div>
    </>
  )
}
