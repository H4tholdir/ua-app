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
//   parete → la sola stanza Parete — Task 12 (D2, spec redesign §3.1): non più un'anteprima con
//            testata propria, ma la `PareteClient` VERA di `/cassette` (`contesto="stanza"`,
//            niente chrome di pagina — quello ce l'ha già la home).
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
import { PareteClient } from '@/components/features/cassette/PareteClient'
import { tipografia } from '@/design-system/v3/tokens'
import { StanzePager } from './StanzePager'
import { LinguettaCassette } from './LinguettaCassette'
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
                   padding: clamp(12px, 2.6cqh, 24px) 24px; display: flex; flex-direction: column; min-height: 100dvh; }
        /* Task 14 (D8, §3.3) — wrapper fluido: la flex gli dà altezza definita → cqh risolve.
           ATTENZIONE (riserva FE R5): niente position:fixed DISCENDENTE — la linguetta è in
           portale su body apposta (v. LinguettaCassette.tsx), altrimenti questo container-type
           ne diventerebbe il containing block e la clipperebbe dentro il frame della home
           invece che nel viewport reale. */
        .ua-home .corpo { flex: 1; min-height: 0; display: flex; flex-direction: column; container-type: size; }
        /* pile centrate (D8): il blocco assorbe lo slack e si centra nello spazio residuo */
        .ua-home .pile { flex: 1; display: flex; flex-direction: column; justify-content: center;
                         gap: clamp(8px, 2.2cqh, 16px); margin-top: clamp(8px, 1.8cqh, 16px); }
        .ua-home .pile .ds-pila { padding: clamp(11px, 1.9cqh, 16px) 18px; }
        .ua-home .pile .ds-pila-num { font-size: clamp(38px, 6.5cqh, 52px); }
        .ua-home .striscia-slot { margin-top: clamp(8px, 1.8cqh, 16px); }
        .ua-home .foot { margin-top: clamp(8px, 1.8cqh, 16px); display: flex; flex-direction: column; align-items: center; gap: 8px;
                         padding-bottom: env(safe-area-inset-bottom); }
        /* Collaudo R1 (P3): il no-scroll resta l'intento (§3.3), ma quando il contenuto
           sfora il viewport la home DEVE poter scorrere invece di tagliare le pile sotto il
           TastoPiù (collaudo device 22/07). Task 14 (D8) SPOSTA dove vive l'overflow-y:auto,
           da .ua-home a .corpo — non lo stesso posto di prima, un aggiustamento necessario
           scoperto in verifica browser (jsdom non fa layout, non l'avrebbe mai mostrato):
           container-type: size rende .corpo size-contained, cioè la SUA size è calcolata
           come se non avesse contenuto — quindi se .ua-home restasse height: auto (come
           prima del Task 14) il suo auto-height non «vedrebbe» più quanto cresce .pile dentro
           .corpo, e il contenuto in eccesso finirebbe SOVRAPPOSTO al .foot invece che
           spingerlo più in basso (verificato con una pagina di prova in browser: card in più
           renderizzate esattamente sopra la barra del piede, nessuno scroll utile a vederle).
           Soluzione: .ua-home resta un box a size definita (il suo min-height: 100dvh di
           base, invariato, senza più un override height: auto qui); è .corpo — che ha già
           una size definita dal flex (necessaria perché il container-type funzioni bene) — a
           scorrere INTERNAMENTE quando il contenuto anche al floor del clamp non ci sta. Il
           .foot resta sempre visibile in fondo, mai spinto fuori schermo. Riverificato in
           browser dopo la correzione: nessuna sovrapposizione, testo del piede sempre leggibile
           (v. task-14-report.md per screenshot/misure). La scala fluida RIDUCE i casi in cui
           questo degrado scatta, non lo abroga — resta la rete di sicurezza sotto la scala
           continua (guardia in tests/unit/home-fluida.test.tsx). */
        @media (max-width: 767px) { .ua-home .corpo { overflow-y: auto; } }
      `}</style>

      {vista.tipo === 'pager' ? (
        <>
          {/* Task 14 (D8) — `.corpo` avvolge il pager (le due stanze + dots + linguetta): il
              `piede` NON si passa più come `footer` a `StanzePager` (che lo renderebbe dentro
              il proprio ritorno, quindi dentro `.corpo`) — resta un fratello fuori, fisso in
              fondo, così il TastoPiù non rimpicciolisce mai (v. commento sul blocco style). */}
          <div className="corpo">
            <StanzePager stanzaIniziale={vista.iniziale} pile={stanzaPile} parete={parete} />
          </div>
          {piede}
        </>
      ) : vista.stanza === 'parete' ? (
        <>
          {/* Task 12 (D2) — forma «solo parete»: niente pager, quindi niente mount differito da
              fare (la stanza è l'unica cosa in pagina, si legge già server-side) — monta
              `PareteClient` DIRETTAMENTE, sempre attiva. Stesso contenitore scrollabile
              (`.ua-stanza-parete-scroll`, ds-v3.css) della stanza omonima dentro il pager: la
              legge «no-scroll» (§3.3) decade qui per dichiarazione esplicita di spec §3.1. */}
          <div className="corpo">
            <div className="ua-stanza-parete-scroll">
              <PareteClient parete={parete} contesto="stanza" attivo />
            </div>
          </div>
          {piede}
        </>
      ) : (
        <>
          <div className="corpo">{stanzaPile}</div>
          {piede}
          {/* Task 13 (D7) — forma «solo pile»: nessun pager, quindi nessuna via di ritorno
              dedicata alla parete (§7, preferenza 'pile'). La linguetta è l'unico invito
              rimasto e porta DIRETTAMENTE a `/cassette` — non a una stanza Parete che qui
              non esiste. Registra il proprio accesso da sé: qui non c'è alcun setter di
              stanza attiva che lo faccia al posto suo (a differenza del pager). */}
          <LinguettaCassette visibile onVai={() => router.push('/cassette')} />
        </>
      )}
    </section>
  )
}
