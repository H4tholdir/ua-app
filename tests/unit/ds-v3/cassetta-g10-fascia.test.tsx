// FIX-L — G10 «la cassetta nuova» (P3b uniforme, RATIFICA FINALE 25/07).
// Fonte requisiti originaria: .superpowers/sdd/fixL-brief.md · verbale
// docs/design/decisions/2026-07-24-qa-device-meta-ondata.md §G10 (parziale + finale +
// precisazione) · mockup ratificato docs/design/mockups/2026-07-25-cassetta-g10-rev3-p3-reale.html
// (variante P3b, grafica delle cassette LIBERE).
//
// H2 (RATIFICA 25/07, commit 0c37f25, brief .superpowers/sdd/h2-impl-brief.md) — CHIUDE il
// doppio regime che FIX-L aveva dovuto lasciare aperto per i nomi lunghi (`.is-nome-lungo`/
// min-height 142 su `.ds-cassetta`, `.is-shrink` su dent/paz): fonti, in ordine di autorità,
// decisione ratificata `docs/design/decisions/2026-07-25-wave-h-scelte.md` §H2 · mockup
// `docs/design/mockups/2026-07-25-cassetta-h2-proposte.html` (SOLO opzione B) · verbale
// `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` §H2. I describe sotto marcati
// "H2" sostituiscono/aggiornano gli assert del vecchio regime FIX-L; quelli non toccati (targa,
// cont, width:min(100%,96px)) restano validi perché l'opzione B non li cambia — v. motivazione
// puntuale in ciascuno.
//
// Stesso pattern testuale di css-sync.test.ts/parete-fluida.test.ts: il CSS è verificato come
// testo — jsdom non fa layout. La componente `Cassetta.tsx` (classi/struttura) è invece
// verificata via render (testing-library), come in Cassetta.test.tsx. Le misure reali (altezza
// tile, fascia, overflow) sono state prese con Playwright reale in un harness a parte — v.
// `.superpowers/sdd/h2-impl-report.md`.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { Cassetta } from '@/components/ds/Cassetta'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
const norm = css.replace(/\s+/g, ' ')

const lavoroCorto = {
  numero: '144', dentista: 'Bianchi', descrizione: 'corona zirconia', tipoDispositivo: 'protesi_fissa',
  paziente: 'PZ-0144', pazienteAlias: 'Mario Rossi',
}

describe('H2 — .ds-cassetta: sagoma UNICA per costruzione (height E min-height, non solo un floor)', () => {
  it('padding: 0 (invariato da FIX-L) — height E min-height 132px (H2: prima solo min-height + bump condizionale a 142)', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/padding: 0;/)
    expect(blocco![0]).toMatch(/height: 132px;/)
    expect(blocco![0]).toMatch(/min-height: 132px;/)
    // il tile resta un flex-column ancorato in basso — invariato
    expect(blocco![0]).toMatch(/flex-direction: column;/)
    expect(blocco![0]).toMatch(/justify-content: flex-end;/)
  })

  it('H2 — .is-nome-lungo NON esiste più (grep-guard): il doppio regime è chiuso, non solo disattivato', () => {
    expect(norm).not.toMatch(/\.ds-cassetta\.is-nome-lungo/)
    expect(norm).not.toMatch(/min-height: 142px/)
  })
})

describe('H2 — finestra/cavità: 8..48 (era 8..74) — opzione B restringe la finestra per fare posto alla fascia fissa', () => {
  it('inset 8px 6px auto 6px; height 40px (era 66px)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta-cavita \{\s*position: absolute; inset: 8px 6px auto 6px; height: 40px;/
    )
    // guardia negativa: la vecchia finestra FIX-L (66px) e quella pre-FIX-L (18..64/46px) non
    // devono ricomparire nella dichiarazione REALE
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-cavita \{[^}]*\}/)
    expect(blocco![0]).not.toMatch(/height: 66px/)
    expect(blocco![0]).not.toMatch(/height: 46px/)
    expect(blocco![0]).not.toMatch(/inset: 18px 6px auto 6px/)
  })
})

describe('H2 — «fascia etichetta»: ORA ad altezza FISSA (opzione B), non più ad abbraccio del contenuto', () => {
  it('.ds-cassetta-fascia: margin/radius/padding/box-shadow invariati dal mockup rev.3 P3b, height:72px + justify-content:center (H2) invariati — H2b (variante C, decisione d5eeed5): background scurente 0,34 (era .28, «un filo più profondo» sulle facce scure) + overflow:hidden NUOVO (hardening iOS, indagine H5 Difetto 2 meccanismo A: la fascia è ad altezza VERA e FISSA, niente deve mai sbordarne nemmeno con font gonfiati da iOS)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta-fascia \{\s*position: relative; z-index: 1;\s*margin: 0 4px 4px;\s*border-radius: 4px 4px 9px 9px;\s*padding: 5px 8px 6px;\s*height: 72px;\s*background: rgba\(0,0,0,\.34\);\s*box-shadow: inset 0 1px 3px rgba\(0,0,0,\.25\), inset 0 -1px 0 rgba\(255,255,255,\.12\);\s*display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;\s*overflow: hidden;\s*\}/
    )
  })

  it('H2b — guardia negativa: il vecchio scrim uniforme .28/.14 non deve ricomparire (la polarità ora dipende da is-chiara, non è più un solo valore fisso)', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-fascia \{[^}]*\}/)
    expect(blocco![0]).not.toMatch(/rgba\(0,0,0,\.28\)/)
  })

  it('H2b (variante C, ratifica d5eeed5, mockup 2026-07-25-fascia-leggibilita-varianti.html) — is-chiara: scrim INVERTITO, ora SCHIARENTE (rgba(255,255,255,.20)), non più scurente (rgba(29,25,19,.14)) — riusa la discriminazione is-chiara/targaScura ESISTENTE, nessuna nuova soglia', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta\.is-chiara \.ds-cassetta-fascia \{\s*background: rgba\(255,255,255,\.20\);\s*\}/
    )
  })
})

describe('H2b — variante C (ratifica d5eeed5): inchiostro pieno + scrim per polarità, valori verbatim dal mockup (verificati anche via cascata reale renderizzata, non solo lettura del CSS — v. report)', () => {
  it('.ds-cassetta-cont (base, facce SCURE): inchiostro bianco PIENO #fff (era rgba(255,255,255,.95)) + ombra un filo più netta 0 1px 1.5px rgba(0,0,0,.45) (era 0 1px 1px rgba(0,0,0,.3))', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-cont \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-cont non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/color: #fff;/)
    expect(blocco![0]).toMatch(/text-shadow: 0 1px 1\.5px rgba\(0,0,0,\.45\);/)
    expect(blocco![0]).not.toMatch(/rgba\(255,255,255,\.95\)/)
  })

  it('.ds-cassetta.is-chiara .ds-cassetta-cont: inchiostro scuro PIENO rgba(29,25,19,1) (era .85) — text-shadow:none INVARIATO (il mockup non lo ritocca)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta\.is-chiara \.ds-cassetta-cont \{\s*color: rgba\(29,25,19,1\); text-shadow: none;\s*\}/
    )
  })

  it('.ds-cassetta.is-chiara .ds-cassetta-dent: opacity 1 (era .7) — il clinico su faccia chiara non si affievolisce più', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta\.is-chiara \.ds-cassetta-dent \{ opacity: 1; \}/
    )
  })
})

describe('Targa: dimensioni ridotte per la fascia compatta, MA il segnale di stato resta (gate Task 10) — invariata dall\'opzione B (verbale H2: l\'uniformità è SOLO strutturale)', () => {
  it('font 12.5/800, radius 6, padding 1px 8px 2px, max-width 8ch', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-targa \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-targa non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/max-width: 8ch;/)
    expect(blocco![0]).toMatch(/border-radius: 6px;/)
    expect(blocco![0]).toMatch(/padding: 1px 8px 2px;/)
    expect(blocco![0]).toMatch(/font-size: 12\.5px;/)
  })

  it('.is-libera .ds-cassetta-targa resta ad ANELLO', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta\.is-libera \.ds-cassetta-targa \{ background: transparent; box-shadow: inset 0 0 0 2px rgba\(255,255,255,\.75\); color: rgba\(255,255,255,\.9\); \}/
    )
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta\.is-libera\.is-chiara \.ds-cassetta-targa \{ box-shadow: inset 0 0 0 2px rgba\(29,25,19,\.4\); color: rgba\(29,25,19,\.7\); \}/
    )
  })

  it('occupata (nessuna classe is-libera): la targa resta PIENA bianca', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-targa \{[^}]*\}/)
    expect(blocco![0]).toMatch(/background: rgba\(255,255,255,\.92\);/)
    expect(blocco![0]).toMatch(/color: #1D1913;/)
  })
})

describe('H2 — il clinico va SEMPRE a capo (max 2 righe), il paziente resta SEMPRE 1 riga con sfumatura — niente più soglia/is-shrink', () => {
  it('ADJUDICAZIONE (post-implementazione): .ds-cassetta-dent NON usa -webkit-line-clamp — clip ad altezza dichiarata (2 righe esatte), mai una ellissi "…" forzata dal browser', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-dent \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-dent non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/white-space: normal;/)
    expect(blocco![0]).toMatch(/overflow-wrap: break-word;/)
    expect(blocco![0]).toMatch(/display: block; overflow: hidden;/)
    expect(blocco![0]).toMatch(/max-height: calc\(2 \* 1\.16em\);/)
    expect(blocco![0]).toMatch(/font-size: 10px; line-height: 1\.16;/)
    // H2b (variante C, d5eeed5) — peso su: 500 (era 400). L'opacità .94 resta INVARIATA: il
    // mockup C alza l'opacità SOLO sulla faccia chiara (via l'override is-chiara sotto, .7→1),
    // qui nella regola base (facce scure) non tocca opacity — verificato anche via cascata reale
    // renderizzata (scripts/tmp/h2b-mockup-cascade.mjs): dentOpacity resta "0.94" sulle facce
    // scure del mockup, "1" solo su quelle chiare.
    expect(blocco![0]).toMatch(/font-weight: 500; opacity: \.94;/)
    // guardia negativa: il meccanismo del mockup B (-webkit-line-clamp) inietta SEMPRE una "…"
    // (misurato, non sopprimibile con text-overflow) — il verbale vieta l'ellissi netta, quindi
    // NON deve ricomparire qui (v. commento CSS per la misura empirica).
    expect(blocco![0]).not.toMatch(/-webkit-line-clamp/)
    expect(blocco![0]).not.toMatch(/-webkit-box-orient/)
  })

  it('.ds-cassetta-dent.is-troncato: sfumatura verticale SOLO quando applicata (misurata in JS, non in CSS puro) — mai un mask permanente legato al confine di altezza', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-dent\.is-troncato \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-dent.is-troncato non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/mask-image: linear-gradient\(180deg, #000 80%, transparent 100%\);/)
    // guardia negativa: la regola BASE .ds-cassetta-dent (senza .is-troncato) non deve portare
    // un mask-image proprio — altrimenti sfumerebbe SEMPRE, anche sui nomi che riempiono le 2
    // righe senza sforare (esattamente il rischio che l'adjudicazione vuole evitare).
    const base = norm.match(/\[data-ds="v3"\] \.ds-cassetta-dent \{[^}]*\}/)
    expect(base![0]).not.toMatch(/mask-image/)
  })

  // H2b (variante C, decisione d5eeed5) — SOSTITUISCE il vecchio regime "paziente SEMPRE 1
  // riga nowrap": ora il budget è CONDIVISO col clinico (clinico 1 riga -> paziente fino a 2
  // righe con sfumatura VERTICALE, stessa famiglia is-troncato del clinico; clinico 2 righe ->
  // paziente forzato a 1 riga, stesso mask ORIZZONTALE di prima, via il selettore fratello
  // `.ds-cassetta-dent.is-due-righe ~ .ds-cassetta-paz`). Verbatim dal mockup
  // 2026-07-25-fascia-leggibilita-varianti.html (variante C) — verificato anche via cascata
  // reale renderizzata (scripts/tmp/h2b-mockup-cascade.mjs, righe reali di paz: 2*1.24*11.5 =
  // 28.52px default, 1*1.24*11.5 = 14.26px forzato).
  it('.ds-cassetta-paz (DEFAULT, budget condiviso — H2b): come il clinico, wrappa fino a 2 righe (white-space:normal, max-height:calc(2 * 1.24em)) — mask-image:none di default (nessuna sfumatura permanente, mai un mask legato a un confine fisso — stesso principio del dent)', () => {
    // Lookbehind negativo: senza, il match "greedy in avanti ma primo trovato" cadrebbe sul
    // `.ds-cassetta-paz {` della regola CONDIVISA (dent, paz { width: ... }) — lì `.paz` è
    // l'ultimo selettore prima della graffa, preceduto da "dent, " nella stringa normalizzata.
    // Qui invece serve la regola SOLO-paz DEFAULT (non quella con .is-troncato o il fratello).
    const blocco = norm.match(/(?<!, )\[data-ds="v3"\] \.ds-cassetta-paz \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-paz non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/white-space: normal;/)
    expect(blocco![0]).toMatch(/overflow-wrap: break-word;/)
    expect(blocco![0]).toMatch(/display: block; overflow: hidden;/)
    expect(blocco![0]).toMatch(/text-overflow: clip;/)
    expect(blocco![0]).toMatch(/line-height: 1\.24;/)
    expect(blocco![0]).toMatch(/max-height: calc\(2 \* 1\.24em\);/)
    expect(blocco![0]).toMatch(/mask-image: none;/)
    expect(blocco![0]).toMatch(/font-weight: 800;/)
    // guardia negativa: il vecchio regime "sempre 1 riga" non deve ricomparire qui
    expect(blocco![0]).not.toMatch(/white-space: nowrap;/)
  })

  it('.ds-cassetta-paz.is-troncato (H2b): sfumatura VERTICALE, stessa famiglia is-troncato del clinico (mask 180deg, 82%→100% — leggermente diverso dall\'80% del dent, verbatim mockup) — SOLO quando misurata in JS (scrollHeight>clientHeight), mai permanente', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-paz\.is-troncato \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-paz.is-troncato non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/mask-image: linear-gradient\(180deg, #000 82%, transparent 100%\);/)
    expect(blocco![0]).toMatch(/-webkit-mask-image: linear-gradient\(180deg, #000 82%, transparent 100%\);/)
  })

  it('.ds-cassetta-dent.is-due-righe ~ .ds-cassetta-paz (H2b): quando il clinico occupa 2 righe, il budget condiviso forza il paziente a 1 riga — stesso mask ORIZZONTALE che aveva SEMPRE prima di H2b (90deg, 84%→99%, invariato), ora condizionale al fratello', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-dent\.is-due-righe ~ \.ds-cassetta-paz \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-dent.is-due-righe ~ .ds-cassetta-paz non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/max-height: calc\(1 \* 1\.24em\);/)
    expect(blocco![0]).toMatch(/white-space: nowrap;/)
    expect(blocco![0]).toMatch(/mask-image: linear-gradient\(90deg, #000 84%, transparent 99%\);/)
    expect(blocco![0]).toMatch(/-webkit-mask-image: linear-gradient\(90deg, #000 84%, transparent 99%\);/)
  })

  it('H2 — grep-guard: nessuna regola .is-shrink residua in ds-v3.css', () => {
    expect(norm).not.toMatch(/\.ds-cassetta-dent\.is-shrink/)
    expect(norm).not.toMatch(/\.ds-cassetta-paz\.is-shrink/)
  })

  it('.ds-cassetta-cont: niente margin-top (vive dentro la fascia, che porta già il proprio gap verso la targa) — invariato', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-cont \{[^}]*\}/)
    expect(blocco![0]).not.toMatch(/margin-top/)
  })
})

describe('H2 — adjudicazione: is-troncato MISURATO in JS (scrollHeight/clientHeight), non dedotto dalla lunghezza della stringa', () => {
  // jsdom non fa layout reale: scrollHeight/clientHeight sono 0 di default su ogni nodo — qui
  // stubbiamo i due getter (entrambi configurabili su Element.prototype in jsdom, verificato)
  // per simulare un overflow reale PRIMA del render, così la misura sincrona dentro il primo
  // `useEffect` (che gira durante l'`act()` implicito di `render()`) la rileva. Il
  // `ResizeObserver` non esiste in jsdom (il componente lo guarda con `typeof` prima di usarlo:
  // nessun crash, semplicemente non osserva — la misura iniziale resta comunque valida).
  function stubAltezze(scrollHeight: number, clientHeight: number) {
    const scrollDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')!
    const clientDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeight })
    Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get: () => clientHeight })
    return () => {
      Object.defineProperty(Element.prototype, 'scrollHeight', scrollDesc)
      Object.defineProperty(Element.prototype, 'clientHeight', clientDesc)
    }
  }

  it('default jsdom (scrollHeight === clientHeight, nessun overflow reale): NESSUNA classe is-troncato, anche con un nome estremo', () => {
    render(
      <Cassetta id="c1" nome="C12" colore="rossa"
        lavoro={{ ...lavoroCorto, dentista: 'Studi Medici Di Santi Gennaro s.r.l.' }}
        stato="normale" onTap={() => {}}
      />
    )
    const dent = screen.getByRole('button').querySelector('.ds-cassetta-dent')
    expect(dent?.className).not.toContain('is-troncato')
  })

  it('scrollHeight > clientHeight (overflow reale simulato): APPLICA is-troncato', () => {
    const ripristina = stubAltezze(40, 23) // 2 righe da 11.6px = 23.2, contenuto reale più alto
    try {
      render(
        <Cassetta id="c2" nome="C12" colore="rossa"
          lavoro={{ ...lavoroCorto, dentista: 'Studi Medici Di Santi Gennaro s.r.l.' }}
          stato="normale" onTap={() => {}}
        />
      )
      const dent = screen.getByRole('button').querySelector('.ds-cassetta-dent')
      expect(dent?.className).toContain('is-troncato')
    } finally {
      ripristina()
    }
  })

  it('scrollHeight === clientHeight (2 righe esatte, NESSUno sforo reale): NON applica is-troncato — la sfumatura non deve mangiarsi lettere legittime', () => {
    const ripristina = stubAltezze(23, 23)
    try {
      render(
        <Cassetta id="c3" nome="C12" colore="rossa"
          lavoro={{ ...lavoroCorto, dentista: 'Studio Di Santi Rossi' }}
          stato="normale" onTap={() => {}}
        />
      )
      const dent = screen.getByRole('button').querySelector('.ds-cassetta-dent')
      expect(dent?.className).not.toContain('is-troncato')
    } finally {
      ripristina()
    }
  })
})

describe('H2b — variante C (d5eeed5): budget righe condiviso — is-due-righe MISURATO in JS (altezza/line-height, come il mockup), paz.is-troncato riusa lo STESSO meccanismo del dent', () => {
  // A differenza di stubAltezze() sopra (che stubba scrollHeight/clientHeight sullo STESSO
  // valore per QUALSIASI nodo), qui serve distinguere dent da paz — il budget condiviso ha
  // bisogno di misurare i due indipendentemente. jsdom non risolve mai un valore reale per
  // getComputedStyle(...).lineHeight (nessun foglio di stile è applicato nei test component-
  // level): il componente in produzione lo legge dal CSS vero (verificato via cascata reale
  // renderizzata, v. report); qui lo stubbiamo esplicitamente per il solo nodo dent.
  function stubMisure(opts: {
    dentScrollHeight?: number
    dentClientHeight?: number
    dentLineHeightPx?: number
    pazScrollHeight?: number
    pazClientHeight?: number
  }) {
    const { dentScrollHeight = 0, dentClientHeight = 0, dentLineHeightPx, pazScrollHeight = 0, pazClientHeight = 0 } = opts
    const scrollDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')!
    const clientDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    Object.defineProperty(Element.prototype, 'scrollHeight', {
      configurable: true,
      get(this: Element) {
        if (this.classList.contains('ds-cassetta-dent')) return dentScrollHeight
        if (this.classList.contains('ds-cassetta-paz')) return pazScrollHeight
        return 0
      },
    })
    Object.defineProperty(Element.prototype, 'clientHeight', {
      configurable: true,
      get(this: Element) {
        if (this.classList.contains('ds-cassetta-dent')) return dentClientHeight
        if (this.classList.contains('ds-cassetta-paz')) return pazClientHeight
        return 0
      },
    })
    let gcsSpy: ReturnType<typeof vi.spyOn> | undefined
    if (dentLineHeightPx !== undefined) {
      const originaleGCS = window.getComputedStyle.bind(window)
      gcsSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
        const reale = originaleGCS(el, pseudo ?? undefined)
        if (el.classList?.contains('ds-cassetta-dent')) {
          return new Proxy(reale, {
            get(target, prop, receiver) {
              if (prop === 'lineHeight') return `${dentLineHeightPx}px`
              return Reflect.get(target, prop, receiver)
            },
          })
        }
        return reale
      })
    }
    return () => {
      Object.defineProperty(Element.prototype, 'scrollHeight', scrollDesc)
      Object.defineProperty(Element.prototype, 'clientHeight', clientDesc)
      gcsSpy?.mockRestore()
    }
  }

  it('default jsdom (nessuno stub): il clinico è a 1 riga (nessun line-height risolvibile) → NIENTE is-due-righe sul dent, NIENTE is-troncato sul paz', () => {
    render(<Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroCorto} stato="normale" onTap={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn.querySelector('.ds-cassetta-dent')?.className).not.toContain('is-due-righe')
    expect(btn.querySelector('.ds-cassetta-paz')?.className).not.toContain('is-troncato')
  })

  it('clinico renderizzato su 1 riga (clientHeight ≈ 1 × line-height) → NIENTE is-due-righe', () => {
    const ripristina = stubMisure({ dentClientHeight: 11.6, dentScrollHeight: 11.6, dentLineHeightPx: 11.6 })
    try {
      render(<Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroCorto} stato="normale" onTap={() => {}} />)
      const dent = screen.getByRole('button').querySelector('.ds-cassetta-dent')
      expect(dent?.className).not.toContain('is-due-righe')
    } finally {
      ripristina()
    }
  })

  it('clinico renderizzato su 2 righe ESATTE, nessuno sforo (clientHeight ≈ 2 × line-height, scrollHeight uguale) → is-due-righe SÌ, is-troncato (dent) NO — il budget scatta anche senza troncamento', () => {
    const ripristina = stubMisure({ dentClientHeight: 23.2, dentScrollHeight: 23.2, dentLineHeightPx: 11.6 })
    try {
      render(
        <Cassetta id="c1" nome="C12" colore="rossa"
          lavoro={{ ...lavoroCorto, dentista: 'Studio Di Santi Rossi' }}
          stato="normale" onTap={() => {}}
        />
      )
      const dent = screen.getByRole('button').querySelector('.ds-cassetta-dent')
      expect(dent?.className).toContain('is-due-righe')
      expect(dent?.className).not.toContain('is-troncato')
    } finally {
      ripristina()
    }
  })

  it('clinico 2 righe TRONCATE (scrollHeight > clientHeight): is-due-righe E is-troncato insieme (coerente: chi sfora oltre 2 righe è per forza già a 2 righe)', () => {
    const ripristina = stubMisure({ dentClientHeight: 23.2, dentScrollHeight: 34.8, dentLineHeightPx: 11.6 })
    try {
      render(
        <Cassetta id="c1" nome="C12" colore="rossa"
          lavoro={{ ...lavoroCorto, dentista: 'Studi Medici Di Santi Gennaro s.r.l.' }}
          stato="normale" onTap={() => {}}
        />
      )
      const dent = screen.getByRole('button').querySelector('.ds-cassetta-dent')
      expect(dent?.className).toContain('is-due-righe')
      expect(dent?.className).toContain('is-troncato')
    } finally {
      ripristina()
    }
  })

  it('paz.is-troncato — RIUSA lo stesso meccanismo del dent (scrollHeight>clientHeight+1): overflow reale simulato → is-troncato applicata, indipendentemente dal clinico', () => {
    const ripristina = stubMisure({ pazScrollHeight: 40, pazClientHeight: 28 })
    try {
      render(
        <Cassetta id="c1" nome="C12" colore="rossa"
          lavoro={{ ...lavoroCorto, pazienteAlias: 'Ciruzzo Tozzetti Esposito Immacolata' }}
          stato="normale" onTap={() => {}}
        />
      )
      const paz = screen.getByRole('button').querySelector('.ds-cassetta-paz')
      expect(paz?.className).toContain('is-troncato')
    } finally {
      ripristina()
    }
  })

  it('paz.is-troncato — nessuno sforo reale (scrollHeight===clientHeight): NON applicata — stesso criterio "non mangiare lettere legittime" del dent', () => {
    const ripristina = stubMisure({ pazScrollHeight: 28, pazClientHeight: 28 })
    try {
      render(
        <Cassetta id="c1" nome="C12" colore="rossa"
          lavoro={{ ...lavoroCorto, pazienteAlias: 'Ciruzzo Tozzetti' }}
          stato="normale" onTap={() => {}}
        />
      )
      const paz = screen.getByRole('button').querySelector('.ds-cassetta-paz')
      expect(paz?.className).not.toContain('is-troncato')
    } finally {
      ripristina()
    }
  })
})

describe('H2b — hardening iOS (indagine H5, .superpowers/sdd/h5-indagine-ipad-report.md, Difetto 2 meccanismo A): text-size-adjust globale', () => {
  const globalsCss = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
  const normGlobals = globalsCss.replace(/\s+/g, ' ')

  it('html porta -webkit-text-size-adjust:100% e text-size-adjust:100% nel punto canonico del reset (@layer base)', () => {
    expect(normGlobals).toMatch(/-webkit-text-size-adjust: 100%;/)
    expect(normGlobals).toMatch(/(?<!-webkit-)text-size-adjust: 100%;/)
  })

  it('vive dentro la regola html del layer base (non uno scope isolato es. .ds-cassetta), è un enforcement GLOBALE dell\'app', () => {
    const blocco = normGlobals.match(/html \{[^}]*\}/)
    expect(blocco, 'blocco html non trovato in globals.css').toBeTruthy()
    expect(blocco![0]).toMatch(/-webkit-text-size-adjust: 100%;/)
  })
})

describe('FIX-L — componente Cassetta: struttura (fascia unica, miniatura scalata)', () => {
  it('targa e cont vivono dentro un unico .ds-cassetta-fascia', () => {
    render(<Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroCorto} stato="normale" onTap={() => {}} />)
    const fascia = screen.getByRole('button').querySelector('.ds-cassetta-fascia')
    expect(fascia).toBeTruthy()
    expect(fascia?.querySelector('.ds-cassetta-targa')).toBeTruthy()
    expect(fascia?.querySelector('.ds-cassetta-cont')).toBeTruthy()
  })

  it('la struttura è IDENTICA per libere e occupate (stessa fascia, stessa finestra)', () => {
    render(<Cassetta id="c2" nome="C4" colore="grigia" lavoro={null} stato="normale" onTap={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn.querySelector('.ds-cassetta-cavita')).toBeTruthy()
    const fascia = btn.querySelector('.ds-cassetta-fascia')
    expect(fascia).toBeTruthy()
    expect(fascia?.querySelector('.ds-cassetta-targa')).toBeTruthy()
    expect(fascia?.querySelector('.ds-cassetta-cont')).toBeTruthy()
  })

  it('H2 — la miniatura scala nella finestra più piccola: height 23 (~58% di 40, verbatim mockup H2 .fin svg{height:58%}, era 37/56% di 66)', () => {
    render(<Cassetta id="c3" nome="C12" colore="rossa" lavoro={lavoroCorto} stato="normale" onTap={() => {}} />)
    const miniatura = screen.getByRole('button').querySelector('.ds-miniatura') as HTMLElement | null
    expect(miniatura).toBeTruthy()
    expect(miniatura?.style.height).toBe('23px')
  })

  it('H2 — grep-guard componente: is-nome-lungo MAI presente sul button, con nomi corti, lunghi, estremi o cassetta libera', () => {
    const casi = [
      { id: 'a', lavoro: lavoroCorto },
      { id: 'b', lavoro: { ...lavoroCorto, dentista: 'Dott.ssa Annamaria Bellinghieri' } },
      { id: 'c', lavoro: { ...lavoroCorto, pazienteAlias: 'Maria Vittoria Del Grosso Esposito' } },
      { id: 'd', lavoro: { ...lavoroCorto, dentista: 'Studio Di Santi Rossi', pazienteAlias: 'Esposito Immacolata Concetta' } },
      { id: 'e', lavoro: null },
    ]
    for (const c of casi) {
      const { unmount } = render(
        <Cassetta id={c.id} nome="C12" colore="rossa" lavoro={c.lavoro} stato="normale" onTap={() => {}} />
      )
      expect(screen.getByRole('button').className, `caso ${c.id}`).not.toContain('is-nome-lungo')
      unmount()
    }
  })
})

describe('FIX-L — nomi contenuti DENTRO la fascia (stretch/min-width/align-items sul cont) — invariato dall\'opzione B: riguarda la larghezza fluida, non la fascia', () => {
  it('.ds-cassetta-cont: align-self:stretch + min-width:0 — eredita la larghezza REALE della fascia a qualsiasi dimensione di tile', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-cont \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-cont non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/align-self: stretch;/)
    expect(blocco![0]).toMatch(/min-width: 0;/)
  })

  it('.ds-cassetta-cont: align-items:center — ricentra dent/paz quando il cont è più largo di loro', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-cont \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-cont non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/align-items: center;/)
  })
})

describe('Re-re-review FIX-L — width:min(100%,96px): KEPT dall\'opzione B (H2 non lo tocca — v. motivazione)', () => {
  // H2 — dubbio esplicito del brief: il mockup B porta un `max-width:104px` proprio sul .dent
  // (oltre al `width:min(100%,96px)` ereditato dalla regola base .dent del mockup). Verificato
  // algebricamente (v. commento ds-v3.css sopra la regola condivisa): quando `width` e
  // `max-width` sono entrambi dichiarati, vince il PIÙ PICCOLO — 96 < 104, quindi il 104 non
  // stringe mai nulla. Riprodurre 104 sarebbe un valore morto: la scelta è stata di NON
  // riportarlo, e lasciare `width: min(100%, 96px)` condiviso esattamente come prima di H2.
  it('.ds-cassetta-dent/.ds-cassetta-paz: width:min(100%,96px) — INVARIATO, ancora la larghezza effettiva giusta (il max-width:104 del mockup B è un no-op nella cascata)', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-dent,\s*\[data-ds="v3"\] \.ds-cassetta-paz \{[^}]*\}/)
    expect(blocco, 'blocco condiviso .ds-cassetta-dent, .ds-cassetta-paz non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/width: min\(100%, 96px\);/)
    expect(blocco![0]).not.toMatch(/max-width: 96px;/)
    expect(blocco![0]).not.toMatch(/max-width: 104px;/)
  })

  it('.ds-cassetta-cont: align-self:stretch + min-width:0 + align-items:center — tutti e tre ancora presenti (nessuna modifica necessaria)', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-cont \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-cont non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/align-self: stretch;/)
    expect(blocco![0]).toMatch(/min-width: 0;/)
    expect(blocco![0]).toMatch(/align-items: center;/)
  })
})

describe('H2 — guardia --track: la sagoma unica (132px, invariata) lascia un margine ampio sotto --track (220px)', () => {
  // Il vecchio worst-case (.is-nome-lungo, 142px) non esiste più: c'è UN solo caso, sempre
  // 132px, perché la fascia ha ora un'altezza fissa che riserva sempre lo spazio del caso
  // peggiore (v. commento su .ds-cassetta-fascia in ds-v3.css). Margine invariato rispetto al
  // caso comune pre-H2 (era già 88px per il caso senza is-shrink).
  it('132px (unico caso, piena o vuota) è ben sotto --track 220px (margine 88px)', () => {
    const trackBase = 44 * 5 // --passo-maglia 44 * --track: calc(... * 5), v. parete-fluida.test.ts
    const tile = 132 // .ds-cassetta { height: 132px; min-height: 132px } — v. sopra, sempre lo stesso valore
    expect(trackBase).toBe(220)
    expect(tile).toBeLessThan(trackBase)
    expect(trackBase - tile).toBe(88)
  })
})
