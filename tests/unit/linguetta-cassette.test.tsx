// Task 13 (D7, spec redesign §3.2) — la linguetta «Le cassette»: invito silenzioso allo
// swipe che appare al mount della home, resta ~5s e si ritira (uscendo dall'albero, non solo
// dalla vista), pensato per chi non ha ancora scoperto la stanza Parete.
//
// Task H4a (F2 «impara e si assottiglia» + T2, ratifica Francesco al ri-collaudo #3, verbale
// `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` §H4, mockup
// `docs/design/mockups/2026-07-25-linguetta-e-piede-proposte.html`) — la semantica di
// «apprendimento» CAMBIA: prima dei 3 accessi si spegneva per sempre, ORA non sparisce più:
// dal 4° passaggio in poi si assottiglia a un filo rosso, sempre presente e sempre tappabile.
// Il conteggio (chiave `ua_linguetta_v4`, soglia 3, nessuna migration) resta INVARIATO — solo
// cosa succede quando `linguettaAppresa()` è vero cambia (filo, non più nulla).
//
// Timer reali → `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime(...))`: senza,
// il test dovrebbe attendere 5 secondi reali per verificare il ritiro.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { LinguettaCassette, registraAccessoParete } from '@/components/features/home/LinguettaCassette'
// Review finale whole-branch — le guardie CSS di questo file facevano `toMatch` sul testo
// grezzo del foglio di stile, con le dichiarazioni elencate in fila: pinnavano l'ORDINE e gli
// spazi singoli (una riformattazione di `ds-v3.css` le rompeva senza che nulla fosse
// peggiorato) e, nell'altro verso, provavano soltanto che quel testo esiste da qualche parte —
// il fallimento per cui esiste `home-style-parsabile.test.ts`. Ora si passa dagli stessi aiuti
// che le guardie ds-v3 vicine avevano già adottato: la regola va trovata COME REGOLA, dopo la
// rimozione dei commenti, e ogni dichiarazione si controlla per conto suo.
import { dichiarazioniDi, contenutoMedia } from '../helpers/css'

const srcCss = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')

/** Le dichiarazioni di una regola di `ds-v3.css`, con un errore parlante se la regola non c'è
 *  più (senza, un `null` finirebbe in un `toContain` con un messaggio incomprensibile). */
function regola(selettore: string, css: string = srcCss): string[] {
  const dichiarazioni = dichiarazioniDi(css, selettore)
  expect(dichiarazioni, `regola \`${selettore}\` assente dal foglio di stile (o inghiottita da un commento)`).not.toBeNull()
  return dichiarazioni as string[]
}

describe('LinguettaCassette — fase piena (F2, passaggi 1-3, taglia T2)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  // L'uscita anima con `molla.smooth` (spring), pilotata da Motion via requestAnimationFrame —
  // non dai timer di JS, che i fake timers non toccano (stesso pattern collaudato di
  // `tests/unit/ds-v3/componenti/avviso-caricamento-vuoto.test.tsx`): `advanceTimersByTime`
  // fa scattare il SETTIMEOUT dei 5s (che porta `modo` a 'nascosta'), poi si torna a timer
  // reali perché lo smontaggio vero avviene dopo che la spring finisce.
  //
  // INVARIATO rispetto a prima di H4a: il mockup F2 non tocca il ritiro a 5s della fase
  // piena (il brief lo segnala esplicitamente come comportamento da preservare) — solo la
  // fase «filo» (sotto) introduce «mai sparita».
  // Review finale whole-branch — perché il `waitFor` qui ha un timeout ESPLICITO e generoso.
  // Il default è 1s, che sotto contesa multi-worker è tutto il budget per un'uscita che gira su
  // requestAnimationFrame VERO: è la forma che, senza aver ancora fallito, somiglia di più al
  // prossimo test intermittente (v. `.superpowers/sdd/diagnosi-flake-vitest.md`).
  // Il rimedio pulito sarebbe il rAF deterministico che il repo già usa altrove
  // (`creaRafDeterministico`, use-drag-riordino.test.ts): PROVATO, non funziona qui. Motion
  // cattura `requestAnimationFrame` al proprio import — prima che `vi.stubGlobal` o i fake
  // timer siano installati — quindi né lo stub né `advanceTimersByTime` raggiungono la sua
  // coda di frame (misurato: zero frame in coda, uscita mai completata). Pilotarlo davvero
  // vorrebbe dire mockare rAF in `tests/setup.ts`, cioè per tutta la suite: fuori portata qui.
  // Restano quindi i timer veri per la sola uscita, con un tetto che non dipende dal carico
  // della macchina.
  it('appare al mount, si ritira dopo ~5s (aria-hidden e fuori dall’albero)', async () => {
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i })).toBeTruthy()
    act(() => vi.advanceTimersByTime(5000))
    vi.useRealTimers()
    await waitFor(
      () => expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull(),
      { timeout: 5000 },
    )
  })

  // Nome rettificato (review finale whole-branch): prometteva «hit-area ≥44px», ma jsdom non
  // misura niente — qui si verifica solo che il button porti la classe che quella hit-area la
  // dichiara. I 44px veri sono presidiati sul foglio di stile, più sotto («il button resta
  // largo 44px»); il pixel a schermo è materia del QA device.
  it('il button porta la classe `ds-linguetta`, quella che dichiara la hit-area da 44px (il disegno T2 è ~34px)', () => {
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i }).className).toContain('ds-linguetta')
  })

  // F2 — TDD RED atteso: prima di H4a non esisteva alcuna classe di stato; qui verifichiamo
  // che ai passaggi 0,1,2 (ancora sotto soglia `ACCESSI_APPRESA=3`) la linguetta sia SEMPRE in
  // fase piena — mai `is-filo` — con l'etichetta testuale visibile (contenuto T2 reale, non
  // solo aria-label).
  it.each([0, 1, 2])('con %i accessi già registrati (< soglia 3): fase piena, niente classe is-filo, etichetta visibile', (accessi) => {
    for (let i = 0; i < accessi; i++) registraAccessoParete()
    render(<LinguettaCassette onVai={() => {}} visibile />)
    const btn = screen.getByRole('button', { name: /le cassette/i })
    expect(btn.className).not.toContain('is-filo')
    expect(btn.textContent).toContain('Le cassette')
  })

  it('il tap chiama onVai e registra l’accesso', () => {
    const onVai = vi.fn()
    render(<LinguettaCassette onVai={onVai} visibile />)
    fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    expect(onVai).toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('ua_linguetta_v4') ?? '0')).toBe(1)
  })

  it('visibile=false (stanza parete attiva): mai renderizzata', () => {
    render(<LinguettaCassette onVai={() => {}} visibile={false} />)
    expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
  })

  // QA device (verbale 25/07, fix-list D4, parte meccanica) — CAUSA: il contatore
  // `ua_linguetta_v3` era saturo (≥3) sui device dei collaudi, quindi la linguetta non
  // compariva più a prescindere da quanto fosse davvero appresa la scoperta della parete su
  // QUESTO device. Bump della chiave a `ua_linguetta_v4`: un vecchio contatore rimasto sotto
  // la chiave morta non deve più avere alcun effetto — la linguetta torna a comparire, ED È
  // in fase piena (la chiave morta non fa scattare nemmeno il filo: solo `ua_linguetta_v4`
  // conta, ed è a 0 in questo scenario).
  it('D4 (bump chiave) — un vecchio contatore saturo sotto la chiave morta ua_linguetta_v3 NON impedisce più la comparsa (fase piena)', () => {
    localStorage.setItem('ua_linguetta_v3', '3')
    render(<LinguettaCassette onVai={() => {}} visibile />)
    const btn = screen.getByRole('button', { name: /le cassette/i })
    expect(btn).toBeTruthy()
    expect(btn.className).not.toContain('is-filo')
  })

  it('D4 — la persistenza vive sotto la chiave ua_linguetta_v4 (non più v3)', () => {
    registraAccessoParete()
    expect(localStorage.getItem('ua_linguetta_v4')).toBe('1')
    expect(localStorage.getItem('ua_linguetta_v3')).toBeNull()
  })
})

// Task H4a — F2 «impara e si assottiglia»: dal 4° passaggio (cioè appena il contatore ha
// raggiunto la soglia 3) la linguetta non sparisce più mai. Sostituisce l'ex test
// «dopo 3 accessi registrati non compare più» (comportamento ABROGATO dalla ratifica F2: la
// riga sotto era l'assert che codificava esattamente «sparita dopo 3» — riscritta per
// verificare l'opposto, il filo).
describe('LinguettaCassette — fase filo (F2, dal 4° passaggio, soglia raggiunta)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('dopo 3 accessi registrati NON sparisce: passa a filo (classe is-filo, sempre nel DOM)', () => {
    registraAccessoParete()
    registraAccessoParete()
    registraAccessoParete()
    render(<LinguettaCassette onVai={() => {}} visibile />)
    const btn = screen.getByRole('button', { name: /le cassette/i })
    expect(btn).toBeTruthy()
    expect(btn.className).toContain('is-filo')
  })

  it('migrazione: chi ha GIÀ superato i 3 accessi (es. 5) vede il filo subito, e il contatore non viene resettato', () => {
    localStorage.setItem('ua_linguetta_v4', '5')
    render(<LinguettaCassette onVai={() => {}} visibile />)
    const btn = screen.getByRole('button', { name: /le cassette/i })
    expect(btn.className).toContain('is-filo')
    expect(localStorage.getItem('ua_linguetta_v4')).toBe('5')
  })

  it('il filo resta nel DOM anche ben oltre i 5s del ritiro della fase piena (mai sparita)', async () => {
    registraAccessoParete()
    registraAccessoParete()
    registraAccessoParete()
    render(<LinguettaCassette onVai={() => {}} visibile />)
    act(() => vi.advanceTimersByTime(20000))
    expect(screen.getByRole('button', { name: /le cassette/i })).toBeTruthy()
  })

  // Stessa rettifica del gemello in fase piena: si controlla la classe, non i pixel.
  it('anche a filo il button resta sulla classe base `ds-linguetta` (quella che dichiara la hit-area da 44px)', () => {
    registraAccessoParete()
    registraAccessoParete()
    registraAccessoParete()
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i }).className).toContain('ds-linguetta')
  })

  it('il tap sul filo naviga comunque (onVai chiamato)', () => {
    registraAccessoParete()
    registraAccessoParete()
    registraAccessoParete()
    const onVai = vi.fn()
    render(<LinguettaCassette onVai={onVai} visibile />)
    fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    expect(onVai).toHaveBeenCalled()
  })

  it('visibile=false anche in fase filo: mai renderizzata (l’invito vive solo sulla stanza Pile)', () => {
    registraAccessoParete()
    registraAccessoParete()
    registraAccessoParete()
    render(<LinguettaCassette onVai={() => {}} visibile={false} />)
    expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
  })
})

// Review finale whole-branch, C1 — la linguetta è in PORTALE su `document.body`, quindi la
// regola che spegne tutta la home mobile a ≥1024px (`.ua-home-mobile { display: none }`, dentro
// il `@media (min-width:1024px)` di `HomeDesktop.tsx`) non la raggiunge: il suo sottoalbero non
// è più discendente di `.ua-home`. Su desktop compariva quindi una linguetta fissa sul bordo
// destro SOPRA `HomeDesktop`, e — peggio — un click su di essa spingeva l'indirizzo a
// `/cassette` mentre la superficie visibile restava la home desktop (desync dell'URL).
// Doppia difesa, provata qui: il componente non rende affatto il portale a ≥1024px (niente
// mount, niente timer, niente click possibile) E il CSS porta il proprio braccio desktop.
describe('LinguettaCassette — C1: mai su desktop (il portale sfugge a `.ua-home-mobile`)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  /** Solo `(min-width: 1024px)` risponde `true`: `prefers-reduced-motion` e le altre query
   *  restano `false` come nel default di `tests/setup.ts` — qui si simula la LARGHEZZA, non
   *  una preferenza di movimento. */
  function attivaViewportDesktop(): () => void {
    const originale = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: /min-width:\s*1024px/.test(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
    return () => {
      window.matchMedia = originale
    }
  }

  it('a ≥1024px la linguetta in fase piena non entra proprio nell’albero', () => {
    const ripristina = attivaViewportDesktop()
    try {
      render(<LinguettaCassette onVai={() => {}} visibile />)
      expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
    } finally {
      ripristina()
    }
  })

  it('a ≥1024px nemmeno il filo (soglia raggiunta) entra nell’albero — è quello che non se ne andrebbe MAI da solo', () => {
    registraAccessoParete()
    registraAccessoParete()
    registraAccessoParete()
    const ripristina = attivaViewportDesktop()
    try {
      render(<LinguettaCassette onVai={() => {}} visibile />)
      expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
    } finally {
      ripristina()
    }
  })

  it('sotto i 1024px nulla cambia: la linguetta resta quella di sempre', () => {
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i })).toBeTruthy()
  })

  // Braccio CSS (metà dichiarata del fix C1): difesa in profondità per il frame prima che il
  // JS abbia deciso, e per chi legge il foglio di stile invece del componente.
  it('il CSS porta il braccio desktop: `.ds-linguetta` spenta DENTRO un @media (min-width: 1024px)', () => {
    // «Dentro quel media» è metà del contratto: la stessa `display: none` scritta fuori
    // spegnerebbe la linguetta anche sul telefono, cioè l'esatto contrario del fix.
    const desktop = contenutoMedia(srcCss, /min-width:\s*1024px/)
    expect(regola('[data-ds="v3"] .ds-linguetta', desktop)).toContain('display: none')
    // …e fuori dal media la linguetta resta viva: la regola di base non la spegne.
    expect(regola('[data-ds="v3"] .ds-linguetta')).not.toContain('display: none')
  })
})

// QA device (verbale 2026-07-24 «Ri-collaudo device #2», fix-list G3-grafica) — il
// contenuto della linguetta non era centrato nel suo corpo (card 26px). Causa: `text-align`
// centra l'asse INLINE, che per `.eti` (writing-mode: vertical-rl) è verticale, non
// orizzontale — l'asse di blocco (lo spessore della colonna, quello che andava centrato)
// non aveva alcuna regola, e il testo restava appoggiato al lato di partenza del blocco
// invece che in mezzo. Guardia testuale (stesso pattern di home-fluida.test.tsx: jsdom non
// fa layout, qui si presidia che la CSS dichiari il meccanismo corretto, non il pixel
// finale — quello è compito del QA device).
describe('LinguettaCassette — G3-grafica: `.eti` centrato sull\'asse di blocco (writing-mode: vertical-rl)', () => {
  it('`.eti` è un contenitore flex con align-items/justify-content: center — non più solo text-align (che non centra l\'asse di blocco in vertical-rl)', () => {
    const eti = regola('[data-ds="v3"] .ds-linguetta .eti')
    expect(eti).toContain('writing-mode: vertical-rl')
    expect(eti).toContain('display: flex')
    expect(eti).toContain('align-items: center')
    expect(eti).toContain('justify-content: center')
    // `text-align: center` è stato RIMOSSO: con `display: flex` non ha più alcun effetto
    // (nessuna riga da giustificare). Se tornasse, tornerebbe la falsa sicurezza di prima.
    expect(eti).not.toContain('text-align: center')
  })

  // H4a (T2, valore verbatim dal mockup `.lng.big{width:34px}` / `.lng.big .txt{font-size:11.5px}`)
  // — width e font-size del testo bumpano da 26px/10px (T1) a 34px/11.5px (T2, ratificata).
  // Letter-spacing/color/text-transform INVARIATI: il mockup T2 non li tocca.
  it('H4a — taglia T2: width 34px, font-size 11.5px (letter-spacing/color/text-transform invariati)', () => {
    const eti = regola('[data-ds="v3"] .ds-linguetta .eti')
    expect(eti).toContain('width: 34px')
    expect(eti).toContain('font-size: 11.5px')
    expect(eti).toContain('font-weight: 700')
    expect(eti).toContain('letter-spacing: .13em')
    expect(eti).toContain('color: var(--muted)')
    expect(eti).toContain('text-transform: uppercase')
  })

  // H4a — `.fre` (freccia) e `.mini-rete` (decorazione puntini) restano allineati alla NUOVA
  // larghezza scheda 34px (T2): sono gli stessi trucchi di centratura già in uso per T1
  // (width pari alla card per `.fre`; margin orizzontale = (card - contenuto)/2 per
  // `.mini-rete`, 13px + 2×10.5px = 34px) — se non si aggiornano insieme alla card, la
  // freccia e i puntini restano decentrati verso sinistra nella scheda più larga.
  it('H4a — `.fre` segue la card a 34px (era 26px in T1); font-size/color invariati', () => {
    const fre = regola('[data-ds="v3"] .ds-linguetta .fre')
    expect(fre).toContain('width: 34px')
    expect(fre).toContain('text-align: center')
    expect(fre).toContain('font-size: 13px')
    expect(fre).toContain('font-weight: 800')
    expect(fre).toContain('color: var(--red)')
  })

  it('H4a — `.mini-rete` resta centrato nella card 34px (margin orizzontale 10.5px, non più 6.5px)', () => {
    const miniRete = regola('[data-ds="v3"] .ds-linguetta .mini-rete')
    // 13px di contenuto + 2 × 10.5px di margine = 34px, la larghezza della card.
    expect(miniRete).toContain('width: 13px')
    expect(miniRete).toContain('margin: 6px 10.5px')
    expect(miniRete).toContain('height: 18px')
    expect(miniRete).toContain('border-radius: 2px')
    expect(miniRete).toContain('opacity: .45')
  })
})

// Task H4a — filo rosso (F2, dal 4° passaggio): guardie CSS sui valori VERBATIM del mockup
// `.lng.slim` (2026-07-25-linguetta-e-piede-proposte.html) — width 10px, colore
// rgba(217,0,18,.85) (= var(--red) all'85% di opacità, coerente coi due temi via
// `color-mix`), barra bianca `::after` 3×34px raggio 2px rgba(255,255,255,.85).
describe('LinguettaCassette — H4a: filo rosso, valori verbatim dal mockup `.lng.slim`', () => {
  it('il button resta largo 44px (hit-area) anche quando il disegno si assottiglia a filo — invariante non toccato da `.is-filo`', () => {
    expect(regola('[data-ds="v3"] .ds-linguetta')).toContain('width: 44px')
  })

  it('`.is-filo::before` — larghezza 10px, sfondo var(--red) all\'85% (color-mix, coerente sui due temi)', () => {
    const filo = regola('[data-ds="v3"] .ds-linguetta.is-filo::before')
    expect(filo).toContain('width: 10px')
    expect(filo).toContain('background: color-mix(in srgb, var(--red) 85%, transparent)')
  })

  it('`.is-filo::after` — la barra bianca 3px×34px, raggio 2px, rgba(255,255,255,.85) (valori verbatim `.lng.slim::after`)', () => {
    const barra = regola('[data-ds="v3"] .ds-linguetta.is-filo::after')
    expect(barra).toContain('width: 3px')
    expect(barra).toContain('height: 34px')
    expect(barra).toContain('border-radius: 2px')
    expect(barra).toContain('background: rgba(255,255,255,.85)')
  })
})

// Difetto D1 del 26/07 (QA browser dell'ondata parete/home — report
// `.superpowers/sdd/fix-reduced-motion-report.md`): con «Riduci movimento» acceso la linguetta
// restava FUORI dallo schermo per sempre (misurata a `left: 393.99` su un telefono da 390, unica
// via di accesso alla parete delle cassette). Due cause in fila: l'hook della preferenza
// rispondeva «no» al primo render, quindi la linguetta nasceva a `x: 110%`; e il bersaglio
// dell'animazione, a preferenza accesa, non conteneva `x` — e Motion muove solo ciò che sta nel
// bersaglio, quindi lì restava.
//
// Questo test vede DAVVERO il difetto (verificato: ripristinando il vecchio codice diventa
// rosso) perché in jsdom `render()` è un mount pulito, non un'idratazione — esattamente la
// posizione della linguetta nella pagina vera, che vive in un portale e non esiste nell'HTML del
// server. Motion scrive `initial` come stile inline sincrono al commit, quindi lo stile
// dell'elemento è leggibile qui (stessa proprietà già sfruttata dai test della striscia).
// NOTA: quello che jsdom NON può riprodurre è il caso della striscia (difetto D2), che dipende
// dall'HTML del server — quello lo presidia l'invariante sulle chiavi in
// `tests/unit/ds-v3/componenti/pila-striscia.test.tsx` più la panchina Playwright del report.
describe('LinguettaCassette — D1: con «Riduci movimento» nasce DENTRO lo schermo', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  /** Solo `prefers-reduced-motion: reduce` risponde `true` (la larghezza resta mobile: se
   *  rispondesse `true` anche `min-width: 1024px` il portale non esisterebbe affatto). */
  function attivaRiduciMovimento(): () => void {
    const originale = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: /prefers-reduced-motion/.test(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
    return () => {
      window.matchMedia = originale
    }
  }

  it('nessuna traslazione residua sullo stile del bottone — mai un `translateX` fuori schermo', () => {
    const ripristina = attivaRiduciMovimento()
    try {
      render(<LinguettaCassette onVai={() => {}} visibile />)
      const bottone = screen.getByRole('button', { name: /le cassette/i })
      const trasformazione = bottone.style.transform ?? ''
      expect(trasformazione).not.toMatch(/translateX\(\s*1?\d*\.?\d*%\)/)
      expect(trasformazione).not.toContain('110%')
    } finally {
      ripristina()
    }
  })

  it('`x: 0` resta nel bersaglio anche a preferenza accesa — se nascesse dislocata, tornerebbe a casa', () => {
    const ripristina = attivaRiduciMovimento()
    try {
      render(<LinguettaCassette onVai={() => {}} visibile />)
      const bottone = screen.getByRole('button', { name: /le cassette/i })
      // Con `MotionGlobalConfig.skipAnimations` (tests/setup.ts) il bersaglio è applicato subito:
      // lo stile finale è la prova che `x` fa parte del bersaglio e vale 0.
      expect(bottone.style.transform === '' || /translateX\(0(px|%)?\)|none/.test(bottone.style.transform)).toBe(true)
    } finally {
      ripristina()
    }
  })
})
