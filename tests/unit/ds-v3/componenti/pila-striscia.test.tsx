// Budget 15s per il render dell'intera pagina catalogo: vedi il commento nell'helper.
import '../budget-catalogo'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import { molla, coreografie, istantaneo } from '@/design-system/v3/motion'
import { raggio } from '@/design-system/v3/tokens'

// Il catalogo (page.tsx) monta ora anche NavDesk (§5.37), che chiama
// useRouter() per «+ Nuovo lavoro»: senza mock, il render fuori da un vero
// App Router lancia "invariant expected app router to be mounted" e fa
// cadere l'intero albero. Stesso pattern di NavDesk.test.tsx.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { Pila, type TipoPila } from '@/components/ds/Pila'
import { StrisciaStato, carattereStriscia, ingressoStriscia, uscitaStriscia } from '@/components/ds/StrisciaStato'

beforeEach(() => {
  suonaMock.mockClear()
  vibraMock.mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('Pila — le quattro pile di legge (§5.7, rev. 3.1)', () => {
  it('daConsegnare → label «DA CONSEGNARE OGGI», famiglia red', () => {
    render(<Pila tipo="daConsegnare" numero={3} sub="n.147 Studio Bianchi — corona" onClick={() => {}} />)
    const label = screen.getByText('DA CONSEGNARE OGGI')
    expect(label).toBeInTheDocument()
    expect(label.style.color).toBe('var(--red)')
    expect(screen.getByText('3').style.color).toBe('var(--red)')
  })

  it('sulBanco → label «SUL BANCO», famiglia amber', () => {
    render(<Pila tipo="sulBanco" numero={5} sub="n.152 Rossi — ponte" onClick={() => {}} />)
    const label = screen.getByText('SUL BANCO')
    expect(label).toBeInTheDocument()
    expect(label.style.color).toBe('var(--amber)')
    expect(screen.getByText('5').style.color).toBe('var(--amber)')
  })

  it('appenaArrivati → label «APPENA ARRIVATI», famiglia blue', () => {
    render(<Pila tipo="appenaArrivati" numero={2} sub="n.158 Studio Verdi — impronta" onClick={() => {}} />)
    const label = screen.getByText('APPENA ARRIVATI')
    expect(label).toBeInTheDocument()
    expect(label.style.color).toBe('var(--blue)')
    expect(screen.getByText('2').style.color).toBe('var(--blue)')
  })

  it('le quattro label/famiglie sono un dizionario chiuso: TipoPila mappa esattamente a queste quattro etichette', () => {
    const mappa: Record<TipoPila, string> = {
      daConsegnare: 'DA CONSEGNARE OGGI',
      sulBanco: 'SUL BANCO',
      daRifareInProva: 'DA RIFARE / IN PROVA',
      appenaArrivati: 'APPENA ARRIVATI',
    }
    for (const [tipo, label] of Object.entries(mappa) as Array<[TipoPila, string]>) {
      const { unmount } = render(<Pila tipo={tipo} numero={1} sub="x" onClick={() => {}} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  it('numero 0 è renderizzato normalmente — la pila non si nasconde mai (L5)', () => {
    render(<Pila tipo="daConsegnare" numero={0} sub="Tutte consegnate ✓" onClick={() => {}} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Tutte consegnate ✓')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('il sub max 1 riga con ellissi (overflow gestito via stile)', () => {
    render(<Pila tipo="sulBanco" numero={5} sub="n.152 Rossi — ponte" onClick={() => {}} />)
    const sub = screen.getByText('n.152 Rossi — ponte')
    expect(sub.style.whiteSpace).toBe('nowrap')
    expect(sub.style.textOverflow).toBe('ellipsis')
    expect(sub.style.overflow).toBe('hidden')
  })

  it('numero display tabulare (§5.7)', () => {
    render(<Pila tipo="daConsegnare" numero={3} sub="n.147 Studio Bianchi — corona" onClick={() => {}} />)
    const numero = screen.getByText('3')
    expect(numero.style.fontVariantNumeric).toBe('tabular-nums')
  })

  it('è un elemento con ruolo button (tap su tutta la card)', () => {
    render(<Pila tipo="daConsegnare" numero={3} sub="n.147 Studio Bianchi — corona" onClick={() => {}} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('click card → chiama onClick + vibra("selection") — MAI suona (è selezione/navigazione, non un\'azione)', () => {
    const onClick = vi.fn()
    render(<Pila tipo="daConsegnare" numero={3} sub="n.147 Studio Bianchi — corona" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(
      <Pila tipo="daConsegnare" numero={3} sub="n.147 Studio Bianchi — corona" onClick={() => {}} />
    )
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('la card usa var(--card), mai var(--sfc) (carry-over review SP1)', () => {
    render(<Pila tipo="daConsegnare" numero={3} sub="n.147 Studio Bianchi — corona" onClick={() => {}} />)
    const bottone = screen.getByRole('button')
    expect(bottone.style.background).toBe('var(--card)')
  })

  it('label, sub e sub di sollievo passano trovaParoleVietate', () => {
    const { container } = render(
      <Pila tipo="daConsegnare" numero={0} sub="Tutte consegnate ✓" onClick={() => {}} />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('StrisciaStato — anatomia mockup (§5.24, forte + azione, aria-live)', () => {
  it('variante default mostra il check verde', () => {
    render(<StrisciaStato>Hai già consegnato 4 lavori oggi</StrisciaStato>)
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('Hai già consegnato 4 lavori oggi')).toBeInTheDocument()
  })

  it('variante attenzione NON mostra il check verde', () => {
    render(
      <StrisciaStato attenzione azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>
        Firma il DdC di n.144
      </StrisciaStato>
    )
    expect(screen.queryByText('✓')).toBeNull()
    expect(screen.getByText('Firma il DdC di n.144')).toBeInTheDocument()
  })

  it('è sempre una region viva educata (role="status", aria-live="polite"), mai un elemento interattivo di per sé', () => {
    render(<StrisciaStato>Hai già consegnato 4 lavori oggi</StrisciaStato>)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('con azione compare una CTA <Link>, separata dal blocco troncabile', () => {
    render(
      <StrisciaStato attenzione azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>
        Firma il DdC di n.144
      </StrisciaStato>
    )
    const cta = screen.getByRole('link', { name: 'Sistemala ›' })
    expect(cta).toHaveAttribute('href', '/fatture/f1')
  })

  it('senza azione non compare nessun link', () => {
    render(<StrisciaStato>Hai già consegnato 4 lavori oggi</StrisciaStato>)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('la CTA ha hit area ≥ 44px senza cambiare l\'altezza visiva (min-height 44 + margin -13px, constraint 10)', () => {
    render(
      <StrisciaStato attenzione azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>
        Firma il DdC di n.144
      </StrisciaStato>
    )
    const cta = screen.getByRole('link', { name: 'Sistemala ›' })
    expect(cta.style.minHeight).toBe('44px')
    expect(cta.style.margin).toBe('-13px 0px')
  })

  it('click sulla CTA → vibra("selection") — selezione silenziosa, MAI suona', () => {
    // href="#" (non un percorso reale): jsdom non implementa la navigazione
    // cross-document e un click su un <a href> con percorso vero solleverebbe
    // un "Not implemented: navigation" asincrono — innocuo in isolamento ma
    // capace di inquinare un test successivo nello stesso worker (flakiness
    // osservata in CI). L'href reale è già verificato altrove senza click.
    render(
      <StrisciaStato attenzione azione={{ etichetta: 'Sistemala ›', href: '#' }}>
        Firma il DdC di n.144
      </StrisciaStato>
    )
    fireEvent.click(screen.getByRole('link', { name: 'Sistemala ›' }))
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('`forte` apre il testo in grassetto --ink, distinto dal resto muted', () => {
    // Task 16b (D3 §3.4) — «Tutto a posto:» era s9, morto: qui il copy reale del trial (sTrial,
    // ramo g>3, v. striscia.ts) — un segnale quieto REALE che porta `forte`.
    render(<StrisciaStato forte="Prova:">mancano 9 giorni</StrisciaStato>)
    const forte = screen.getByText('Prova:')
    expect(forte.tagName).toBe('B')
    expect(forte.style.color).toBe('var(--ink)')
    expect(forte.style.fontWeight).toBe('700')
  })

  it('supporta grassetti dentro children (--ink) senza spezzare il rendering', () => {
    render(
      <StrisciaStato>
        Hai già consegnato <strong style={{ color: 'var(--ink)' }}>4 lavori</strong> oggi
      </StrisciaStato>
    )
    const forte = screen.getByText('4 lavori')
    expect(forte.tagName).toBe('STRONG')
    expect(forte.style.color).toBe('var(--ink)')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà della CTA', () => {
    const { container } = render(
      <StrisciaStato attenzione azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>
        Firma il DdC di n.144
      </StrisciaStato>
    )
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('i testi di entrambe le varianti passano trovaParoleVietate', () => {
    const { container: c1 } = render(<StrisciaStato>Hai già consegnato 4 lavori oggi</StrisciaStato>)
    expect(trovaParoleVietate(c1.textContent ?? '')).toEqual([])
    const { container: c2 } = render(
      <StrisciaStato attenzione forte="Fattura n.139" azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>
        scartata
      </StrisciaStato>
    )
    expect(trovaParoleVietate(c2.textContent ?? '')).toEqual([])
  })
})

// Task 16b, punto 3 — coreografia V1 «carattere per livello» (ratifica 24/07, decisione
// docs/design/decisions/2026-07-24-striscia-home.md §Ratifiche 2, valori VERBATIM dalla demo
// docs/design/mockups/2026-07-24-striscia-animazioni.html righe ~355-358). Le funzioni pure
// sono testate isolate qui SOPRA (i VALORI di ogni carattere, senza rumore di rendering); che
// siano davvero AGGANCIATE all'elemento (non solo funzioni pure orfane) lo verifica un test a
// parte più sotto («la molla è agganciata all'elemento») — review Minor 1 (task-16b-report.md
// addendum), che ha trovato che cancellare `initial={initial}`/`animate={animate}` dal JSX
// lasciava l'intera suite verde: Motion SCRIVE `initial` come stile inline sincrono al commit
// (jsdom lo espone regolarmente, verificato — v. quel test), la lacuna era non averlo mai
// controllato, non un limite dell'ambiente.
describe('StrisciaStato — coreografia V1 «carattere per livello» (punto 3)', () => {
  it('carattereStriscia: attenzione vince sempre → urgenza; poi tono ambra → trial; altrimenti → racconto', () => {
    expect(carattereStriscia(true)).toBe('urgenza')
    expect(carattereStriscia(true, 'ambra')).toBe('urgenza') // attenzione precede il tono (O1i)
    expect(carattereStriscia(false, 'ambra')).toBe('trial')
    expect(carattereStriscia(false)).toBe('racconto')
  })

  it('ingresso urgenza: y:12 scale:.96 opacity:0 → molla.bouncy (rimbalzo contenuto)', () => {
    const { initial, animate } = ingressoStriscia('urgenza', false)
    expect(initial).toEqual({ y: 12, scale: 0.96, opacity: 0 })
    expect(animate).toEqual({ y: 0, scale: 1, opacity: 1, transition: molla.bouncy })
  })

  it('ingresso trial: y:12 scale:.98 opacity:0 → molla.smooth (deciso, senza rimbalzo)', () => {
    const { initial, animate } = ingressoStriscia('trial', false)
    expect(initial).toEqual({ y: 12, scale: 0.98, opacity: 0 })
    expect(animate).toEqual({ y: 0, scale: 1, opacity: 1, transition: molla.smooth })
  })

  it('ingresso racconto: y:6 scale:1 opacity:0 → molla.smooth (in punta di piedi)', () => {
    const { initial, animate } = ingressoStriscia('racconto', false)
    expect(initial).toEqual({ y: 6, scale: 1, opacity: 0 })
    expect(animate).toEqual({ y: 0, scale: 1, opacity: 1, transition: molla.smooth })
  })

  // Difetto D1/D2 del 26/07 (QA browser dell'ondata parete/home, report
  // `.superpowers/sdd/fix-reduced-motion-report.md`) — questi due test dicevano il CONTRARIO:
  // pretendevano che sotto reduced-motion `y`/`scale` sparissero dal bersaglio. Erano verdi e
  // descrivevano fedelmente il codice, ma la regola che presidiavano era sbagliata, ed è la
  // causa del difetto: Motion muove SOLO le chiavi presenti in `animate`, quindi una chiave
  // tolta dal bersaglio non torna a casa — resta congelata dove l'ingresso l'aveva messa (la
  // striscia è stata misurata a `top: 144.55` invece di `131.63`, per sempre). Da qui la legge,
  // che questi test ora presidiano: sotto reduced-motion cambia la TRANSIZIONE, mai il
  // bersaglio. jsdom non può riprodurre il difetto originale (dipende dal momento in cui la
  // preferenza diventa nota rispetto al mount, e da un HTML di server che qui non esiste): il
  // presidio possibile a questo livello è l'invariante sulle chiavi, ed è quello che segue.
  it('prefers-reduced-motion: stesso bersaglio del moto pieno — nessuna chiave di spostamento sparisce', () => {
    for (const carattere of ['urgenza', 'trial', 'racconto'] as const) {
      const pieno = ingressoStriscia(carattere, false)
      const ridotto = ingressoStriscia(carattere, true)
      // `initial` IDENTICO: è ciò che rende la coreografia sicura in SSR (il server non conosce
      // la preferenza, quindi i due modi DEVONO partire dallo stesso markup).
      expect(ridotto.initial).toEqual(pieno.initial)
      // Bersaglio: stesse chiavi, stessi valori di riposo. Mai un sottoinsieme.
      const chiavi = (o: object) => Object.keys(o).filter((k) => k !== 'transition').sort()
      expect(chiavi(ridotto.animate)).toEqual(chiavi(pieno.animate))
      expect(ridotto.animate.y).toBe(0)
      expect(ridotto.animate.scale).toBe(1)
      expect(ridotto.animate.opacity).toBe(1)
    }
  })

  it('prefers-reduced-motion: y e scale arrivano `istantaneo`, l’opacità resta sulla molla del carattere', () => {
    for (const [carattere, spring] of [['urgenza', molla.bouncy], ['trial', molla.smooth], ['racconto', molla.smooth]] as const) {
      const { animate } = ingressoStriscia(carattere, true)
      // Forma per-chiave di Motion: `transition.y`/`transition.scale` vincono sulla molla, che
      // resta il default per tutto il resto (l'opacità → dissolvenza, invariata).
      expect(animate.transition).toEqual({ ...spring, y: istantaneo, scale: istantaneo })
      expect(istantaneo).toEqual({ duration: 0 }) // token, non una durata scritta a mano qui
    }
  })

  it('uscita (motion piena): coreografie.avviso.exit, byte-identica, UNICA per ogni carattere', () => {
    expect(uscitaStriscia(false)).toEqual(coreografie.avviso.exit)
  })

  it('uscita (prefers-reduced-motion): la y NON sparisce, resta ferma a 0 — si dissolve sul posto', () => {
    const uscita = uscitaStriscia(true)
    expect(uscita).toEqual({ y: 0, opacity: 0, transition: coreografie.avviso.exit.transition })
    expect(Object.keys(uscita).sort()).toEqual(Object.keys(coreografie.avviso.exit).sort())
  })
})

// Task 16b, punto 1 — forma F2 «card con voce» (ratifica 24/07/2026, valori VERBATIM dal
// mockup docs/design/mockups/2026-07-24-striscia-home.html righe 149-160): la riga F1 nuda di
// prima ora vive dentro una card tinta di stato.
describe('StrisciaStato — forma F2 «card con voce» (punto 1)', () => {
  it('la card: background tinta di stato, radius 18 (raggio.riga), padding 12/14, bordo --line', () => {
    render(
      <StrisciaStato attenzione azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>
        scartata
      </StrisciaStato>
    )
    const card = screen.getByRole('status')
    expect(card.style.background).toBe('var(--red-tint)')
    expect(card.style.borderRadius).toBe(`${raggio.riga}px`)
    expect(card.style.padding).toBe('12px 14px')
    expect(card.style.border).toBe('1px solid var(--line)')
  })

  it('la tinta segue lo stato: ambra per il trial, verde per il default quieto', () => {
    const { unmount } = render(
      <StrisciaStato tono="ambra" forte="Prova:" azione={{ etichetta: 'Attiva ›', href: '#' }}>
        mancano 9 giorni
      </StrisciaStato>
    )
    expect(screen.getByRole('status').style.background).toBe('var(--amber-tint)')
    unmount()
    render(<StrisciaStato>Hai già consegnato 4 lavori oggi</StrisciaStato>)
    expect(screen.getByRole('status').style.background).toBe('var(--green-tint)')
  })

  // Adeguamento post-consegna (controller, verificato sul mockup ratificato
  // docs/design/mockups/2026-07-24-striscia-home.html:132/219 — s3 «Racconto quieto» è
  // `.s-blue`, non verde). Discriminante: STESSO usato per il whole-card-tap (eventoId + azione,
  // né attenzione né tono ambra) — mai inferito da "non è un allarme e ha un'azione".
  it('il racconto (eventoId) rende blu con stella ✦ — non verde, non il ✓ del default quieto', () => {
    render(
      <StrisciaStato azione={{ etichetta: 'Guarda ›', href: '/dashboard?stanza=parete' }} eventoId="lib-c1-x">
        UÀ ha liberato C12
      </StrisciaStato>
    )
    expect(screen.getByRole('status').style.background).toBe('var(--blue-tint)')
    const icona = screen.getByText('✦')
    expect(icona.style.background).toBe('var(--elv)')
    expect(icona.style.color).toBe('var(--blue)')
    expect(screen.queryByText('✓')).toBeNull()
  })

  it('gli altri segnali quieti (senza eventoId) restano verdi col ✓ — sPareteIntro/s8 non ratificati blu', () => {
    // sPareteIntro-shaped: attenzione false, azione presente, NESSUN eventoId — resta verde
    // (Task 15, «nessun tono nuovo», v. il commento sul candidato in striscia.ts).
    render(
      <StrisciaStato azione={{ etichetta: 'colorale e mettile in ordine ›', href: '/cassette' }}>
        UÀ ha creato 2 cassette dai tuoi lavori —
      </StrisciaStato>
    )
    expect(screen.getByRole('status').style.background).toBe('var(--green-tint)')
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('il disco icona è la superficie elevata (--elv) — su F2 NON è più la tinta', () => {
    render(
      <StrisciaStato attenzione azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>
        scartata
      </StrisciaStato>
    )
    const icona = screen.getByText('!')
    expect(icona.style.background).toBe('var(--elv)')
    expect(icona.style.color).toBe('var(--red)')
  })

  it('dark resta flat: nessun box-shadow dichiarato sulla card (solo fill + hairline --line)', () => {
    render(
      <StrisciaStato attenzione azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>
        scartata
      </StrisciaStato>
    )
    expect(screen.getByRole('status').style.boxShadow).toBe('')
  })

  // Review Minor 1 (task-16b-report.md addendum) — le funzioni pure sopra garantiscono i VALORI
  // della coreografia, ma non che siano DAVVERO passate a `<motion.div initial={} animate={}>`:
  // cancellare quelle due prop dal JSX lasciava l'intera suite verde prima di questo test.
  // Motion scrive `initial` come stile inline SINCRONO al commit (nessuna AnimatePresence qui a
  // farlo scattare subito, nessun rAF reale ancora passato in jsdom) — leggibile subito dopo
  // `render()`, senza `waitFor`. Copre il carattere «racconto» (default quieto, molla.smooth,
  // y:6 scale:1 opacity:0 — v. `ingressoStriscia`).
  it('la molla è AGGANCIATA all\'elemento — lo stato `initial` (y:6, opacity:0) è nello stile reale, non solo in una funzione pura isolata', () => {
    render(<StrisciaStato>Hai già consegnato 4 lavori oggi</StrisciaStato>)
    const card = screen.getByRole('status')
    expect(card.style.opacity).toBe('0')
    expect(card.style.transform).toContain('translateY(6px)')
  })
})

// Task 16b, punto 2 — il conteggio «altri»: un nodo che non si restringe (v. dispatch — «l'UNICO
// elemento approvato a parole ma mai visto renderizzato»).
describe('StrisciaStato — punto 2: il conteggio «altri» (nodo che non si restringe)', () => {
  it("altri === 1 → «e un'altra», tipografia 14.5/500/--muted, flex:none, marginLeft 4", () => {
    render(
      <StrisciaStato attenzione forte="n.144" altri={1} azione={{ etichetta: 'Apri ›', href: '/lavori?pila=rossa' }}>
        doveva uscire ieri
      </StrisciaStato>
    )
    const nodo = screen.getByText("e un'altra")
    // jsdom normalizza lo shorthand `flex: none` nel suo longhand equivalente (flex-grow:0
    // flex-shrink:0 flex-basis:auto) — stesso valore, altra grafia; non è un jsdom quirk locale
    // a questo file, è come CSSOM espande QUALSIASI `flex: none` inline in questo ambiente.
    expect(nodo.style.flex).toBe('0 0 auto')
    expect(nodo.style.marginLeft).toBe('4px')
    expect(nodo.style.fontSize).toBe('14.5px')
    expect(nodo.style.fontWeight).toBe('500')
    expect(nodo.style.color).toBe('var(--muted)')
  })

  it('altri > 1 → «e altre N»', () => {
    render(
      <StrisciaStato attenzione forte="Prova:" altri={2} azione={{ etichetta: 'Attiva ›', href: '/impostazioni/abbonamento' }}>
        finisce dopodomani
      </StrisciaStato>
    )
    expect(screen.getByText('e altre 2')).toBeInTheDocument()
  })

  it('assente quando `altri` non è passato — nessun nodo fantasma', () => {
    render(
      <StrisciaStato attenzione forte="n.144" azione={{ etichetta: 'Apri ›', href: '/lavori?pila=rossa' }}>
        doveva uscire ieri
      </StrisciaStato>
    )
    expect(screen.queryByText(/^e (un'altra|altre)/)).toBeNull()
  })

  it('posizione nel DOM: dopo il testo troncabile, PRIMA della CTA (mai dentro `testo`, che tronca con ellissi)', () => {
    const { container } = render(
      <StrisciaStato attenzione forte="n.144" altri={1} azione={{ etichetta: 'Apri ›', href: '/lavori?pila=rossa' }}>
        doveva uscire ieri
      </StrisciaStato>
    )
    const testo = container.textContent ?? ''
    const iTesto = testo.indexOf('doveva uscire ieri')
    const iAltri = testo.indexOf("e un'altra")
    const iCta = testo.indexOf('Apri ›')
    expect(iTesto).toBeGreaterThanOrEqual(0)
    expect(iAltri).toBeGreaterThan(iTesto)
    expect(iCta).toBeGreaterThan(iAltri)
  })
})

// Task 16b, punto 4 — il racconto (segnale con `eventoId`, v. striscia.ts «presente SOLO sui
// segnali racconto») è tappabile su TUTTA la card, con un chevron come affordance. Allarmi e
// trial restano CTA-only (comportamento di oggi, invariato).
describe('StrisciaStato — punto 4: il racconto (eventoId) è tappabile su tutta la card', () => {
  const AZIONE = { etichetta: 'Guarda ›', href: '/dashboard?stanza=parete' }

  it('con eventoId + azione: un solo <a> avvolge icona+testo+chevron, href = azione.href', () => {
    render(
      <StrisciaStato azione={AZIONE} eventoId="lib-c1-2026-07-24T10:00:00.000Z">
        UÀ ha liberato C12
      </StrisciaStato>
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/dashboard?stanza=parete')
    expect(within(link).getByText('UÀ ha liberato C12')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1) // niente interattivi annidati
  })

  it("l'etichetta della CTA non compare come testo separato — l'affordance è il chevron (mockup .chev), tipografia verbatim 19/800/--st/marginLeft:2", () => {
    render(
      <StrisciaStato azione={AZIONE} eventoId="lib-c1-2026-07-24T10:00:00.000Z">
        UÀ ha liberato C12
      </StrisciaStato>
    )
    expect(screen.queryByText('Guarda ›')).toBeNull()
    const chevron = screen.getByText('›')
    expect(chevron).toBeInTheDocument()
    // Review Minor 1 — valori pinnati, non solo presenza (mockup .chev: font-size:19px;
    // font-weight:800; color:var(--st); margin-left:2px; line-height:1). `--st` per il
    // racconto è `--blue` (v. `eBlu` in StrisciaStato.tsx — stesso colore dell'icona ✦).
    expect(chevron.style.fontSize).toBe('19px')
    expect(chevron.style.fontWeight).toBe('800')
    expect(chevron.style.color).toBe('var(--blue)')
    expect(chevron.style.marginLeft).toBe('2px')
    expect(chevron.style.lineHeight).toBe('1')
  })

  it('click ovunque sul link → vibra("selection"), MAI suona', () => {
    // href="#" (non un percorso reale): stesso motivo del test CTA sopra — jsdom non implementa
    // la navigazione cross-document, un click su un <a href> con percorso vero solleverebbe un
    // "Not implemented: navigation" asincrono che può inquinare il test successivo (flakiness).
    render(
      <StrisciaStato azione={{ etichetta: 'Guarda ›', href: '#' }} eventoId="lib-c1-2026-07-24T10:00:00.000Z">
        UÀ ha liberato C12
      </StrisciaStato>
    )
    fireEvent.click(screen.getByRole('link'))
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('la region resta role="status" aria-live="polite" — il link vive DENTRO, non la sostituisce', () => {
    render(
      <StrisciaStato azione={AZIONE} eventoId="lib-c1-2026-07-24T10:00:00.000Z">
        UÀ ha liberato C12
      </StrisciaStato>
    )
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(within(region).getByRole('link')).toBeInTheDocument()
  })

  it('senza eventoId (allarme con azione): CTA-only come sempre — il link contiene SOLO l\'etichetta', () => {
    render(
      <StrisciaStato attenzione forte="Fattura n.139" azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>
        scartata
      </StrisciaStato>
    )
    const cta = screen.getByRole('link', { name: 'Sistemala ›' })
    expect(cta.textContent).toBe('Sistemala ›')
  })

  it('eventoId + attenzione: resta CTA-only (difesa — allarmi non diventano MAI whole-card)', () => {
    render(
      <StrisciaStato attenzione forte="Fattura n.139" azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }} eventoId="qualcosa">
        scartata
      </StrisciaStato>
    )
    const cta = screen.getByRole('link', { name: 'Sistemala ›' })
    expect(cta.textContent).toBe('Sistemala ›')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('eventoId + tono ambra (trial): resta CTA-only (difesa — il trial non diventa whole-card)', () => {
    render(
      <StrisciaStato tono="ambra" forte="Prova:" azione={{ etichetta: 'Attiva ›', href: '/impostazioni/abbonamento' }} eventoId="qualcosa">
        mancano 9 giorni
      </StrisciaStato>
    )
    const cta = screen.getByRole('link', { name: 'Attiva ›' })
    expect(cta.textContent).toBe('Attiva ›')
  })

  it('eventoId senza azione (nessuna destinazione): niente link — resta un status non interattivo', () => {
    render(<StrisciaStato eventoId="qualcosa">Solo testo, nessuna destinazione</StrisciaStato>)
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('catalogo DS v3 — sezione «Pila · StrisciaStato»', () => {
  it('mostra le quattro pile di legge con dati realistici, una pila vuota e StrisciaStato in entrambe le varianti', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getAllByText('DA CONSEGNARE OGGI').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SUL BANCO').length).toBeGreaterThan(0)
    expect(screen.getAllByText('DA RIFARE / IN PROVA').length).toBeGreaterThan(0)
    expect(screen.getAllByText('APPENA ARRIVATI').length).toBeGreaterThan(0)
    expect(screen.getByText('Tutte consegnate ✓')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('tutti i testi statici del catalogo (inclusa la nuova sezione) passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })
})
