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

const srcCss = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')

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
  it('appare al mount, si ritira dopo ~5s (aria-hidden e fuori dall’albero)', async () => {
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i })).toBeTruthy()
    act(() => vi.advanceTimersByTime(5000))
    vi.useRealTimers()
    await waitFor(() => expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull())
  })

  it('hit-area ≥44px anche se il disegno è ~34px T2 (riserva UX 3a): il button porta la classe con l’estensione', () => {
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

  it('hit-area del filo resta ≥44px (stessa classe base `ds-linguetta` dell’estensione hit-area)', () => {
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
  it('il CSS porta il braccio desktop: `.ds-linguetta` spenta dentro un @media (min-width: 1024px)', () => {
    expect(srcCss).toMatch(
      /@media \(min-width:\s*1024px\) \{\s*\[data-ds="v3"\] \.ds-linguetta \{ display: none; \}\s*\}/
    )
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
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta \.eti \{[^}]*writing-mode:\s*vertical-rl;\s*width:\s*34px;\s*display:\s*flex;\s*align-items:\s*center;\s*justify-content:\s*center;/
    )
  })

  // H4a (T2, valore verbatim dal mockup `.lng.big{width:34px}` / `.lng.big .txt{font-size:11.5px}`)
  // — width e font-size del testo bumpano da 26px/10px (T1) a 34px/11.5px (T2, ratificata).
  // Letter-spacing/color/text-transform INVARIATI: il mockup T2 non li tocca.
  it('H4a — taglia T2: width 34px, font-size 11.5px (letter-spacing/color/text-transform invariati)', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta \.eti \{[^}]*width:\s*34px;[^}]*font-size:\s*11\.5px;\s*font-weight:\s*700;\s*letter-spacing:\s*\.13em;\s*color:\s*var\(--muted\);\s*text-transform:\s*uppercase;/
    )
  })

  // H4a — `.fre` (freccia) e `.mini-rete` (decorazione puntini) restano allineati alla NUOVA
  // larghezza scheda 34px (T2): sono gli stessi trucchi di centratura già in uso per T1
  // (width pari alla card per `.fre`; margin orizzontale = (card - contenuto)/2 per
  // `.mini-rete`, 13px + 2×10.5px = 34px) — se non si aggiornano insieme alla card, la
  // freccia e i puntini restano decentrati verso sinistra nella scheda più larga.
  it('H4a — `.fre` segue la card a 34px (era 26px in T1); font-size/color invariati', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta \.fre \{ position: relative; font-size: 13px; font-weight: 800; color: var\(--red\); width: 34px; text-align: center; \}/
    )
  })

  it('H4a — `.mini-rete` resta centrato nella card 34px (margin orizzontale 10.5px, non più 6.5px)', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta \.mini-rete \{\s*position: relative; width: 13px; height: 18px; margin: 6px 10\.5px; border-radius: 2px; opacity: \.45;/
    )
  })
})

// Task H4a — filo rosso (F2, dal 4° passaggio): guardie CSS sui valori VERBATIM del mockup
// `.lng.slim` (2026-07-25-linguetta-e-piede-proposte.html) — width 10px, colore
// rgba(217,0,18,.85) (= var(--red) all'85% di opacità, coerente coi due temi via
// `color-mix`), barra bianca `::after` 3×34px raggio 2px rgba(255,255,255,.85).
describe('LinguettaCassette — H4a: filo rosso, valori verbatim dal mockup `.lng.slim`', () => {
  it('il button resta largo 44px (hit-area) anche quando il disegno si assottiglia a filo — invariante non toccato da `.is-filo`', () => {
    expect(srcCss).toMatch(/\[data-ds="v3"\] \.ds-linguetta \{[^}]*width:\s*44px;/)
  })

  it('`.is-filo::before` — larghezza 10px, sfondo var(--red) all\'85% (color-mix, coerente sui due temi)', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta\.is-filo::before \{[^}]*width:\s*10px;[^}]*background:\s*color-mix\(in srgb, var\(--red\) 85%, transparent\);/
    )
  })

  it('`.is-filo::after` — la barra bianca 3px×34px, raggio 2px, rgba(255,255,255,.85) (valori verbatim `.lng.slim::after`)', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta\.is-filo::after \{[^}]*width:\s*3px;\s*height:\s*34px;\s*border-radius:\s*2px;\s*background:\s*rgba\(255,255,255,\.85\);/
    )
  })
})
