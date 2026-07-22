'use client'

// Home v3 (§7.1 + rev. 3.1) — UNA composizione per tutti i ruoli, cambia solo il
// perimetro dati (deciso server-side). Eyebrow+saluto · StrisciaStato · 4 Pile ·
// TastoPiù. NIENT'ALTRO, per legge. No-scroll: il frame è 100dvh a <768 e la
// fascia pile assorbe lo slack; scala device-corti (≤700px) da §7.1 rev. 3.1.
//
// ── Le due stanze (Task 14, emendamento §3.3 regola 5 / §7.1 del 20/07) ──────
// L'unica eccezione ammessa al «niente altro nella home» non è un elemento in
// più: è un'ALTRA home affiancata (la Parete), raggiunta per swipe. Tre forme,
// decise server-side da `vistaHome` (preferenza «La tua home» + `?stanza=`):
//   pager  → StanzePager con dentro le due stanze;
//   pile   → esattamente il layout storico, invariato;
//   parete → la sola stanza Parete, che porta la propria testata compressa.
// In ogni forma il TastoPiù è UNO e sta nel piede, fuori dal pager.
//
// La StrisciaStato vive nella stanza Pile — anche nella forma «solo parete»,
// dove quindi su mobile non appare: è il mockup ratificato (colonna «stanza
// Parete»), non una dimenticanza. Su desktop HomeDesktop continua a mostrarla,
// e i dati delle pile si leggono comunque (servono a `scegliSegnale`).
import { useRouter } from 'next/navigation'
import { Pila as PilaCard } from '@/components/ds/Pila'
import { TastoPiu } from '@/components/ds/TastoPiu'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import { tipografia } from '@/design-system/v3/tokens'
import { StanzePager } from './StanzePager'
import { StanzaParete } from './StanzaParete'
import { vistaHome } from '@/lib/preferenze/home'
import { segnaPareteIntroVista } from '@/lib/preferenze/segna-parete-intro'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'
import type { Pila } from '@/lib/lavori/urgenza'
import type { CassettaParete } from '@/lib/cassette/parco-shared'
import type { HomePref } from '@/lib/preferenze/home'

const ORDINE: Array<{ pila: Pila; tipo: 'daConsegnare' | 'sulBanco' | 'daRifareInProva' | 'appenaArrivati' }> = [
  { pila: 'rossa', tipo: 'daConsegnare' },
  { pila: 'ambra', tipo: 'sulBanco' },
  { pila: 'viola', tipo: 'daRifareInProva' },
  { pila: 'blu', tipo: 'appenaArrivati' },
]

export function HomeV3(props: {
  nome: string
  eyebrow: string
  saluto: string
  pile: PileHome
  segnale: SegnaleStriscia
  parete: CassettaParete[]
  homePref: HomePref
  stanzaParam?: string
}) {
  const { nome, eyebrow, saluto, pile, segnale, parete, homePref, stanzaParam } = props
  const router = useRouter()
  const bancoLibero = ORDINE.every(({ pila }) => pile.liste[pila].length === 0)

  // La forma della home in QUESTA visita. La stessa funzione la calcola in
  // `dashboard/page.tsx` per decidere se leggere la parete: una regola sola, così la stanza
  // Parete non può mai essere resa con dati mai letti (v. `vistaHome`).
  const vista = vistaHome(homePref, stanzaParam)

  // La stanza Pile: esattamente la home di sempre (saluto · StrisciaStato · 4 pile). Vive in
  // una variabile perché il pager la riceve come figlio, ma il contenuto non cambia di una
  // virgola fra le tre forme.
  const stanzaPile = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: tipografia.size.label, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.label, textTransform: 'uppercase', color: 'var(--faint)' }}>{eyebrow}</div>
          <h1 style={{ fontSize: tipografia.size.largeTitle, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.titoli, lineHeight: 1.1, marginTop: 6, color: 'var(--ink)' }}>
            {saluto},<br />{nome}
          </h1>
        </div>
        <TastoTondo glifo="☰" etichettaAria="Tutto il resto" onClick={() => router.push('/tutto-il-resto')} />
      </div>

      <div className="striscia-slot" style={{ marginTop: 16 }}>
        <StrisciaStato attenzione={segnale.attenzione} forte={segnale.forte} tono={segnale.tono} azione={segnale.azione} onAzione={segnale.intro ? segnaPareteIntroVista : undefined}>
          {segnale.testo}
        </StrisciaStato>
      </div>

      {bancoLibero ? (
        <div className="pile" style={{ alignItems: 'center', textAlign: 'center', gap: 14 }}>
          {/* mockup stati-vuoti-errori.html riga ~218 — icona NEUTRA (mai tint di stato),
              vassoio/banco vuoto line-SVG, stroke 1.7 var(--faint), fill none. */}
          <span
            aria-hidden
            style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)' }}
          >
            <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="var(--faint)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13h4l1.5 2.5h7L17 13h4" />
              <path d="M3 13V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
              <path d="M3 13v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
            </svg>
          </span>
          <div style={{ fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)' }}>Il banco è libero</div>
          <div style={{ fontSize: 16, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', maxWidth: 300, lineHeight: 1.4 }}>Quando arriva un lavoro, lo vedi qui.</div>
        </div>
      ) : (
        <div className="pile">
          {ORDINE.map(({ pila, tipo }) => (
            <PilaCard key={pila} tipo={tipo} numero={pile.liste[pila].length} sub={pile.sub[pila]} onClick={() => router.push(`/lavori?pila=${pila}`)} />
          ))}
        </div>
      )}
    </>
  )

  // Il piano fisso: UN solo TastoPiù, identico in ogni forma della home e in entrambe le
  // stanze (§3.3 regola 5). Sta FUORI dal pager, così non scorre e non si sdoppia a metà snap.
  const piede = (
    <div className="foot">
      <TastoPiu onClick={() => router.push('/lavori/nuovo')} />
    </div>
  )

  return (
    // "ua-home-mobile" (Task 9): HomeDesktop la nasconde da 1024 in su via CSS
    // (`.ua-home-mobile { display: none }` dentro il suo `@media (min-width:1024px)`).
    // `<section>`, non `<main>` (fix review finale item 5): `(app)/layout.tsx`
    // porta già il proprio `<main id="main-content">` (SkipToContent, §a11y) —
    // due `<main>` annidati sono HTML non valido (un solo landmark main per
    // documento). L'aria resta intatta: nessun ruolo/aria-* qui dipendeva dal
    // tag `main`.
    <section className={`ua-home ua-home-mobile${vista.tipo === 'pager' ? ' is-stanze' : ''}`}>
      <style>{`
        .ua-home { position: relative; z-index: 1; width: 100%; max-width: 480px; margin: 0 auto;
                   padding: 24px; display: flex; flex-direction: column; min-height: 100dvh; }
        .ua-home .pile { flex: 1; display: flex; flex-direction: column; gap: 16px; justify-content: center; margin-top: 16px; }
        .ua-home .foot { margin-top: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px;
                         padding-bottom: env(safe-area-inset-bottom); }
        /* Collaudo R1 (P3): il no-scroll resta l'intento (§3.3), ma quando il contenuto
           sfora il viewport la home DEVE poter scorrere invece di tagliare le pile sotto il
           TastoPiù (collaudo device 22/07). min-height + overflow-y:auto = no-scroll quando ci
           sta, scroll naturale quando non ci sta. */
        @media (max-width: 767px) { .ua-home { min-height: 100dvh; height: auto; overflow-y: auto; } }
        /* §7.1 rev. 3.2 (Collaudo R3b, misure overlay device Francesco): soglia 700→780 e scala
           più profonda. I numeri, non le impressioni: PWA standalone su quel device = viewport
           755px STABILE (dvh=svh, insets 0 — la status bar era innocente); in Chrome 699px la
           vecchia compatta scattava, nella PWA a 755px restava la scala piena (intrinseca ~900px
           → scroll). La vecchia compatta misurava 774px intrinseci: sopra 755. Questi valori la
           portano a ~742px (misura Playwright con banner presente): entra a 755 con margine.
           NOTA SISTEMICA per l'ondata «Redesign parete/home»: la scala PIENA (~900px a 375w con
           banner) non entra quasi su nessun device reale — lì va ripensata, qui si cura il caso
           vero. Sotto ~742 resta il degrado scroll sanzionato (P3). */
        @media (max-height: 780px) {
          .ua-home { padding: 12px 24px; }
          .ua-home .striscia-slot { margin-top: 8px; }
          .ua-home .pile { gap: 8px; margin-top: 8px; }
          .ua-home .pile .ds-pila { padding: 12px 18px; }
          .ua-home .pile .ds-pila-num { font-size: 42px; }
          .ua-home .foot { margin-top: 8px; gap: 6px; }
        }
      `}</style>

      {vista.tipo === 'pager' ? (
        <StanzePager
          stanzaIniziale={vista.iniziale}
          pile={stanzaPile}
          parete={<StanzaParete parete={parete} />}
          footer={piede}
        />
      ) : vista.stanza === 'parete' ? (
        <>
          <StanzaParete parete={parete} />
          {piede}
        </>
      ) : (
        <>
          {stanzaPile}
          {piede}
        </>
      )}
    </section>
  )
}
