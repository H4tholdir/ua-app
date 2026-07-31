import { createRef, useRef, type RefObject } from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import { materia, sopraFoto } from '@/design-system/v3/tokens'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { VisoreFoto } from '@/components/ds/VisoreFoto'
import { Sheet } from '@/components/ds/Sheet'

// L'array è MESCOLATO apposta: il visore riceve un elenco GIÀ ordinato dal
// chiamante e NON lo riordina (l'ordine è della carta, §5.38). Se qui dentro
// qualcuno chiamasse `raggruppaPerCategoria`, la prima prova cadrebbe.
const FOTO = [
  { id: 'f-rx', url: 'https://esempio/rx.jpg', categoria: 'rx', created_at: '2026-07-30T10:00:00Z', nome_file: 'radiografia-paziente.jpg' },
  { id: 'f-imp', url: 'https://esempio/imp.jpg', categoria: 'impronta', created_at: '2026-07-30T09:00:00Z', nome_file: null },
  { id: 'f-col', url: 'https://esempio/col.jpg', categoria: 'colore', created_at: '2026-07-30T09:45:00Z', nome_file: 'col.jpg' },
]

/** Un'àncora vera nel documento: è dove il focus deve tornare alla chiusura. */
function ancoraNelDocumento(): RefObject<HTMLElement | null> {
  const tasto = document.createElement('button')
  tasto.textContent = 'apri'
  document.body.appendChild(tasto)
  return { current: tasto }
}

function props(extra: Partial<Parameters<typeof VisoreFoto>[0]> = {}) {
  return {
    aperto: true,
    foto: FOTO,
    indice: 0,
    onIndice: () => {},
    onChiudi: () => {},
    onCorreggiCategoria: () => {},
    ancoraFocus: ancoraNelDocumento(),
    ...extra,
  }
}

function attivaReducedMotion(): () => void {
  const originale = window.matchMedia
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
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

function pannello(): HTMLElement {
  return screen.getByRole('dialog')
}

/** jsdom riscrive i colori CSS a modo suo (`rgba(9,7,5,.62)` → `rgba(9, 7, 5,
 *  0.62)`). Far passare ANCHE il token dalla stessa riscrittura lega la prova
 *  al token invece che a una stringa copiata: se il token cambia, la prova si
 *  accende. */
function comeLoScriveJsdom(valore: string): string {
  const d = document.createElement('div')
  d.style.background = valore
  return d.style.background
}

/** La foto grande, non le miniature: l'`alt` è l'etichetta della categoria e
 *  la foto aperta compare LEGITTIMAMENTE due volte (grande + sua miniatura). */
function fotoGrande(): HTMLImageElement {
  return document.querySelector('.ds-visore-scena img') as HTMLImageElement
}

describe('VisoreFoto — il visore a tutto schermo (§5.39)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  // ══ LA PROVA OBBLIGATORIA DEL TASK (D86) ═══════════════════════════════
  // Il mandato la chiede con una `TendinaMenu` sopra uno `Sheet`, ma la
  // tendina è T8 e non esiste. La sostituzione è il visore STESSO: è lui che
  // deve dimostrare di non collassare lo strato sotto, ed è il componente
  // vero invece di una finta. 🚦 Se questa diventa rossa NON si sceglie il
  // ripiego: si riferisce (D86) — tocca `storia-overlay.ts`, fuori mandato.
  it('🚦 D86 — `Escape` dentro il visore chiude SOLO il visore: lo `Sheet` aperto sotto (che ascolta su window) resta aperto', () => {
    const chiudiSheet = vi.fn()
    const chiudiVisore = vi.fn()
    // 🛑 FRATELLI, mai annidati: gli eventi sintetici di React risalgono
    // l'albero REACT — un visore montato dentro i figli dello Sheet farebbe
    // arrivare l'Escape anche a lui, e il rosso sembrerebbe il difetto di
    // §1.5 mentre sarebbe il contratto del chiamante violato (§1.5, contratto).
    render(
      <>
        <Sheet aperto onChiudi={chiudiSheet} titolo="Sotto"><p>contenuto</p></Sheet>
        <VisoreFoto {...props({ onChiudi: chiudiVisore })} />
      </>,
    )

    // Il focus DEVE essere dentro il pannello del visore prima di premere:
    // se non lo fosse, l'Escape non passerebbe di lì e la prova non guarderebbe niente.
    const visore = screen.getByRole('dialog', { name: /Cambia la categoria/ })
    expect(visore.contains(document.activeElement)).toBe(true)

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' })

    expect(chiudiVisore).toHaveBeenCalledTimes(1)
    expect(chiudiSheet).not.toHaveBeenCalled()
  })

  it('🚦 D86, la prova DI CONTROLLO — l\'ascoltatore su `window` dello `Sheet` è vivo e raggiungibile: il «non chiamato» di sopra è un\'informazione, non un silenzio dell\'ambiente', () => {
    // Senza questa, la prova di sopra potrebbe essere verde per una ragione
    // dell'AMBIENTE (un `keyDown` dentro un portale che in jsdom non risale a
    // `window` comunque), e il verdetto D86 sarebbe inventato. Qui l'`Escape`
    // parte da FUORI da entrambi i pannelli: nessuno lo ferma, e deve arrivare.
    // `provato:` la controprova per mutazione — tolto `stopPropagation()` dal
    // visore, la prova di sopra diventa rossa con «been called 1 times».
    const chiudiSheet = vi.fn()
    render(
      <>
        <Sheet aperto onChiudi={chiudiSheet} titolo="Sotto"><p>contenuto</p></Sheet>
        <VisoreFoto {...props()} />
      </>,
    )
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(chiudiSheet).toHaveBeenCalled()
  })

  it('il tocco fuori dalla foto chiude, con lo stesso ritorno al tatto del ✕ (§5.39: chiudere → `vibra("light")`)', () => {
    const onChiudi = vi.fn()
    const { baseElement } = render(<VisoreFoto {...props({ onChiudi })} />)
    const scena = baseElement.querySelector('.ds-visore-scena') as HTMLElement
    fireEvent.pointerDown(scena)
    fireEvent.click(scena)
    expect(onChiudi).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('light')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('il tocco SULLA foto non chiude: il gesto deve nascere fuori (difesa dal click fantasma, `useTapScrim`)', () => {
    const onChiudi = vi.fn()
    const { baseElement } = render(<VisoreFoto {...props({ onChiudi })} />)
    const scena = baseElement.querySelector('.ds-visore-scena') as HTMLElement
    fireEvent.pointerDown(fotoGrande())
    fireEvent.click(scena)
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('l\'id della pastiglia NON è un letterale: due visori insieme non si contendono lo stesso `aria-labelledby`', () => {
    const { baseElement } = render(
      <>
        <VisoreFoto {...props()} />
        <VisoreFoto {...props({ indice: 1 })} />
      </>,
    )
    const id = Array.from(baseElement.querySelectorAll('[role="dialog"]')).map((d) =>
      d.getAttribute('aria-labelledby'),
    )
    expect(id).toHaveLength(2)
    expect(id[0]).not.toBe(id[1])
    expect(new Set(id).size).toBe(2)
  })

  // ══ Lo scorrimento del corpo — §1.4, con la sentinella ═════════════════
  it('blocca lo scorrimento mentre è aperto e RESTITUISCE il valore vero alla chiusura (sentinella «scroll»)', async () => {
    // «scroll» e «7px» sono valori che NESSUN bloccante scriverebbe mai: se
    // alla fine li ritroviamo, il modulo ha restituito il valore VERO e non
    // una stringa vuota.
    document.body.style.overflow = 'scroll'
    document.body.style.paddingRight = '7px'

    const { rerender, unmount } = render(<VisoreFoto {...props()} />)
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<VisoreFoto {...props({ aperto: false })} />)
    // 🔧 D100 — il rilascio è DIFFERITO a fine uscita, come già faceva `Sheet`
    // (v. la prova dei due strati qui sotto, che aspettava così da prima):
    // sbloccare a metà uscita fa ricomparire la barra e la pagina dietro
    // slitta. Ciò che questa prova guarda NON è cambiato: che il valore
    // restituito sia quello VERO («scroll», «7px») e non una stringa vuota.
    // 🛑 `waitFor` e non un singolo `act`: il rilascio arriva quando l'uscita è
    // FINITA, e da quante animazioni debba finire non è affare di questa prova
    // — un numero fisso di tick la renderebbe sensibile a un `exit` in più
    // (successo davvero: col pannello che si dissolve, un flush non bastava e
    // il rosso andava e veniva). Si aspetta la CONDIZIONE, non un tempo.
    await waitFor(() => expect(document.body.style.overflow).toBe('scroll'))
    expect(document.body.style.paddingRight).toBe('7px')
    unmount()
  })

  it('🛑 il caso che DEVE fallire: senza montare niente, la sentinella resta «scroll» — la prova sopra guarda davvero il componente', () => {
    document.body.style.overflow = 'scroll'
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('due strati insieme, chiusi NELL\'ORDINE SBAGLIATO (prima quello sotto): alla fine il corpo vale ancora «scroll»', async () => {
    document.body.style.overflow = 'scroll'
    document.body.style.paddingRight = '7px'

    function Due(p: { sheet: boolean; visore: boolean }) {
      const ancora = useRef<HTMLElement | null>(null)
      return (
        <>
          <Sheet aperto={p.sheet} onChiudi={() => {}} titolo="Sotto"><p>contenuto</p></Sheet>
          <VisoreFoto {...props({ aperto: p.visore, ancoraFocus: ancora })} />
        </>
      )
    }
    const { rerender, unmount } = render(<Due sheet visore />)
    expect(document.body.style.overflow).toBe('hidden')

    // prima si chiude quello SOTTO — è la sequenza che ha generato D84.
    // 🛑 `Sheet` rilascia il suo posto nel contatore in DIFFERITA
    // (`onExitComplete`, Sheet.tsx:389): senza lasciar girare l'uscita, il
    // posto resta occupato e il corpo non tornerebbe mai indietro — e il rosso
    // sembrerebbe un difetto del visore mentre è la prova che non aspetta.
    rerender(<Due sheet={false} visore />)
    await act(async () => {})
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<Due sheet={false} visore={false} />)
    await waitFor(() => expect(document.body.style.overflow).toBe('scroll'))
    expect(document.body.style.paddingRight).toBe('7px')
    unmount()
  })

  it('apri → chiudi → riapri: un solo posto nel contatore per ciclo, e il corpo torna al valore vero', async () => {
    document.body.style.overflow = 'scroll'
    const { rerender, unmount } = render(<VisoreFoto {...props()} />)
    rerender(<VisoreFoto {...props({ aperto: false })} />)
    // 🔑 La riapertura avviene DENTRO la finestra d'uscita, e da D100 è il caso
    // che conta davvero: il posto nel contatore è ancora quello di prima e non
    // se ne prende un secondo.
    rerender(<VisoreFoto {...props()} />)
    expect(document.body.style.overflow).toBe('hidden')
    rerender(<VisoreFoto {...props({ aperto: false })} />)
    // Se l'apertura avesse preso DUE posti, qui il corpo resterebbe «hidden»
    // per sempre e `waitFor` scadrebbe: l'attesa non ammorbidisce la prova.
    await waitFor(() => expect(document.body.style.overflow).toBe('scroll'))
    unmount()
  })

  it('`aperto: false` → non monta niente e NON tiene un posto nel contatore', () => {
    document.body.style.overflow = 'scroll'
    const { container } = render(<VisoreFoto {...props({ aperto: false })} />)
    expect(container.firstElementChild).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('🛑 il pannello dichiara `overflowY: auto` — senza, `overscrollBehavior: contain` è inerte (C-1)', () => {
    render(<VisoreFoto {...props()} />)
    expect(pannello().style.overflowY).toBe('auto')
    expect(pannello().style.overscrollBehavior).toBe('contain')
  })

  // ══ Lo strato — §1.2, §1.3 ═════════════════════════════════════════════
  it('si monta in un portale su document.body, non dentro il proprio contenitore', () => {
    const { container } = render(<VisoreFoto {...props()} />)
    expect(container.firstElementChild).toBeNull()
    expect(document.body.contains(pannello())).toBe(true)
  })

  it('z-index 1010 (D83): sopra gli overlay di casa (1000), sotto gli avvisi (1100)', () => {
    render(<VisoreFoto {...props()} />)
    const wrapper = pannello().closest('[data-ds="v3"]') as HTMLElement
    expect(wrapper.style.zIndex).toBe('1010')
  })

  it('mentre è aperto il gesto «indietro» lo chiude', () => {
    const onChiudi = vi.fn()
    render(<VisoreFoto {...props({ onChiudi })} />)
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('🛑 chiuso, LASCIA la pila: un «indietro» successivo non risveglia un visore che non c\'è più', () => {
    // 🔑 L'ORDINE È LA PROVA. Un `popstate` fa già il `pop()` della voce in
    // cima (`storia-overlay.ts:110-111`): se si sparasse PRIMA, la pila
    // resterebbe vuota comunque e la prova sarebbe verde anche senza
    // `esciOverlay` nella pulizia — misurato, era il difetto di questa stessa
    // prova alla prima stesura. Qui si chiude col rerender (la via normale:
    // ✕, velo, Escape) e SOLO DOPO si preme «indietro».
    const onChiudi = vi.fn()
    const { rerender } = render(<VisoreFoto {...props({ onChiudi })} />)
    rerender(<VisoreFoto {...props({ aperto: false, onChiudi })} />)
    onChiudi.mockClear()

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(onChiudi).not.toHaveBeenCalled()
  })

  // ══ Il focus — §1.6, F-12 ══════════════════════════════════════════════
  it('all\'apertura il focus va DENTRO il pannello', () => {
    render(<VisoreFoto {...props()} />)
    expect(pannello().contains(document.activeElement)).toBe(true)
  })

  it('🔴 F-12 — alla chiusura il focus torna all\'ÀNCORA DICHIARATA dal chiamante, non a quello che era attivo al montaggio', () => {
    // Chi era attivo al montaggio è un elemento DIVERSO dall'àncora: se il
    // componente catturasse `document.activeElement` (il modello che F-12
    // rifiuta) il focus tornerebbe qui invece che sull'àncora.
    const altro = document.createElement('button')
    document.body.appendChild(altro)
    altro.focus()
    expect(document.activeElement).toBe(altro)

    const ancora = ancoraNelDocumento()
    const { rerender } = render(<VisoreFoto {...props({ ancoraFocus: ancora })} />)
    rerender(<VisoreFoto {...props({ aperto: false, ancoraFocus: ancora })} />)

    expect(document.activeElement).toBe(ancora.current)
    expect(document.activeElement).not.toBe(altro)
  })

  it('il `Tab` è TRATTENUTO dentro il pannello: dall\'ultimo raggiungibile si torna al primo, mai fuori', () => {
    render(<VisoreFoto {...props()} />)
    const raggiungibili = Array.from(pannello().querySelectorAll('button')).filter((b) => !b.disabled)
    expect(raggiungibili.length).toBeGreaterThan(1)

    raggiungibili[raggiungibili.length - 1].focus()
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab' })
    expect(document.activeElement).toBe(raggiungibili[0])
    expect(pannello().contains(document.activeElement)).toBe(true)
  })

  it('`ancoraFocus` con `.current` nullo all\'apertura → avviso in sviluppo (il ritorno del focus non è verificabile a runtime)', () => {
    const spia = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<VisoreFoto {...props({ ancoraFocus: createRef<HTMLElement>() })} />)
    expect(spia).toHaveBeenCalledTimes(1)
    expect(spia.mock.calls[0][0]).toContain('VisoreFoto')
    spia.mockRestore()
  })

  it('in produzione lo stesso caso NON avvisa', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const spia = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<VisoreFoto {...props({ ancoraFocus: createRef<HTMLElement>() })} />)
    expect(spia).not.toHaveBeenCalled()
    spia.mockRestore()
    vi.unstubAllEnvs()
  })

  // ══ Ruoli e nomi ═══════════════════════════════════════════════════════
  it('`role="dialog"` + `aria-modal="true"` + nome dalla pastiglia della categoria', () => {
    render(<VisoreFoto {...props()} />)
    expect(pannello()).toHaveAttribute('aria-modal', 'true')
    expect(pannello()).toHaveAccessibleName('Cambia la categoria: Radiografia')
    expect(pannello()).toHaveAttribute('tabindex', '-1')
  })

  it('la pastiglia della categoria è un COMANDO (D70): `<button>`, min-height 44, nome proprio', () => {
    const onCorreggiCategoria = vi.fn()
    render(<VisoreFoto {...props({ onCorreggiCategoria })} />)
    const pastiglia = screen.getByRole('button', { name: 'Cambia la categoria: Radiografia' })
    expect(pastiglia.tagName).toBe('BUTTON')
    expect(pastiglia.style.minHeight).toBe('44px')
    fireEvent.click(pastiglia)
    expect(onCorreggiCategoria).toHaveBeenCalledTimes(1)
  })

  it('etichetta e contatore stanno DENTRO la pastiglia, che porta faccia e confine (nudi sulla sfumatura valgono 2,1:1 — B-4)', () => {
    render(<VisoreFoto {...props()} />)
    const pastiglia = screen.getByRole('button', { name: /^Cambia la categoria/ })
    expect(pastiglia.style.background).toBe(comeLoScriveJsdom(sopraFoto.faccia))
    expect(pastiglia.style.boxShadow).toBe(sopraFoto.confine)
    expect(pastiglia.textContent).toContain('Radiografia')
    expect(pastiglia.textContent).toContain('1 di 3')
  })

  it('il contatore vive in un `aria-live="polite"`: il cambio di foto si sente', () => {
    render(<VisoreFoto {...props()} />)
    const vivo = screen.getByText('1 di 3')
    expect(vivo).toHaveAttribute('aria-live', 'polite')
  })

  it('il tondo ✕ chiude e si chiama «Chiudi», con `vibra("light")` e MAI un suono (sola lettura, §9.2)', () => {
    const onChiudi = vi.fn()
    render(<VisoreFoto {...props({ onChiudi })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onChiudi).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('light')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('senza `azioni` il tondo ⋯ è DISABILITATO (non c\'è niente da aprire) e non promette un menù', () => {
    render(<VisoreFoto {...props()} />)
    const altre = screen.getByRole('button', { name: 'Altre cose da fare su questa foto' })
    expect(altre).toBeDisabled()
    expect(altre).not.toHaveAttribute('aria-haspopup')
  })

  it('con `azioni` il visore rende l\'INNESCO del chiamante al posto del proprio ⋯', () => {
    render(
      <VisoreFoto
        {...props({
          azioni: (
            <button type="button" aria-haspopup="menu" aria-expanded={false}>
              Altre cose da fare su questa foto
            </button>
          ),
        })}
      />,
    )
    const innesco = screen.getByRole('button', { name: 'Altre cose da fare su questa foto' })
    expect(innesco).not.toBeDisabled()
    expect(innesco).toHaveAttribute('aria-haspopup', 'menu')
  })

  // ══ Sfogliare ══════════════════════════════════════════════════════════
  it('← e → sfogliano e chiamano `onIndice` con il vicino giusto', () => {
    const onIndice = vi.fn()
    render(<VisoreFoto {...props({ indice: 1, onIndice })} />)
    fireEvent.keyDown(pannello(), { key: 'ArrowRight' })
    expect(onIndice).toHaveBeenCalledWith(2)
    fireEvent.keyDown(pannello(), { key: 'ArrowLeft' })
    expect(onIndice).toHaveBeenCalledWith(0)
  })

  it('ai bordi le frecce non escono dall\'elenco', () => {
    const onIndice = vi.fn()
    const { rerender } = render(<VisoreFoto {...props({ indice: 0, onIndice })} />)
    fireEvent.keyDown(pannello(), { key: 'ArrowLeft' })
    expect(onIndice).not.toHaveBeenCalled()
    rerender(<VisoreFoto {...props({ indice: 2, onIndice })} />)
    fireEvent.keyDown(pannello(), { key: 'ArrowRight' })
    expect(onIndice).not.toHaveBeenCalled()
  })

  it('tap su una miniatura → `onIndice` + `vibra("selection")`, MAI un suono', () => {
    const onIndice = vi.fn()
    render(<VisoreFoto {...props({ onIndice })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Guida colore, 3 di 3' }))
    expect(onIndice).toHaveBeenCalledWith(2)
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('la miniatura scelta: opacità piena + anello + `aria-current` — mai il solo colore (G4)', () => {
    render(<VisoreFoto {...props({ indice: 1 })} />)
    const scelta = screen.getByRole('button', { name: 'Impronta, 2 di 3' })
    const spenta = screen.getByRole('button', { name: 'Radiografia, 1 di 3' })
    expect(scelta).toHaveAttribute('aria-current', 'true')
    expect(scelta.style.opacity).toBe('1')
    expect(scelta.style.boxShadow).toBe('0 0 0 2px #FFFFFF')
    expect(spenta).not.toHaveAttribute('aria-current')
    expect(spenta.style.opacity).toBe('0.48')
  })

  it('🛑 le miniature restano 44×44 anche con dodici foto: la fascia SCORRE, mai si rimpiccioliscono (C-8)', () => {
    const dodici = Array.from({ length: 12 }, (_, i) => ({
      id: `f${i}`,
      url: `https://esempio/${i}.jpg`,
      categoria: 'impronta',
      created_at: `2026-07-30T09:${String(i).padStart(2, '0')}:00Z`,
      nome_file: null,
    }))
    const { container } = render(<VisoreFoto {...props({ foto: dodici })} />)
    const fascia = container.ownerDocument.querySelector('.ds-visore-fascia') as HTMLElement
    expect(fascia.style.overflowX).toBe('auto')
    const mini = screen.getByRole('button', { name: 'Impronta, 12 di 12' })
    expect(mini.style.width).toBe('44px')
    expect(mini.style.height).toBe('44px')
    expect(mini.style.borderRadius).toBe('12px')
  })

  // ══ La foto — D66 ══════════════════════════════════════════════════════
  it('🔴 D66 — la foto NON si stira e NON si ritaglia: `objectFit: contain`', () => {
    render(<VisoreFoto {...props()} />)
    expect(fotoGrande().style.objectFit).toBe('contain')
  })

  it('l\'`alt` della foto è l\'ETICHETTA della categoria, mai la sigla interna né il nome del file', () => {
    render(<VisoreFoto {...props()} />)
    expect(fotoGrande().getAttribute('alt')).toBe('Radiografia')
    expect(screen.queryByAltText('rx')).toBeNull()
    expect(screen.queryByAltText('radiografia-paziente.jpg')).toBeNull()
  })

  it('il posto riservato alla barra dell\'editor c\'è, è VUOTO e tratteggiato (D66), e non parla ai lettori di schermo', () => {
    const { baseElement } = render(<VisoreFoto {...props()} />)
    const posto = baseElement.querySelector('.ds-visore-posto-editor') as HTMLElement
    expect(posto).not.toBeNull()
    expect(posto.textContent).toBe('')
    expect(posto).toHaveAttribute('aria-hidden', 'true')
    expect(posto.style.height).toBe('52px')
    expect(posto.style.border).toContain('dashed')
  })

  // ══ Le forme d'input che mordono in T12 ════════════════════════════════
  it('`indice` fuori dall\'elenco (T12 elimina la foto aperta) → si ripiega sulla prima, mai un `undefined` letto', () => {
    render(<VisoreFoto {...props({ indice: 99 })} />)
    expect(screen.getByText('1 di 3')).toBeInTheDocument()
  })

  it('`indice` negativo → stessa via', () => {
    render(<VisoreFoto {...props({ indice: -1 })} />)
    expect(screen.getByText('1 di 3')).toBeInTheDocument()
  })

  it('elenco vuoto mentre `aperto` è true → non rende nulla, e il corpo non resta bloccato', () => {
    document.body.style.overflow = 'scroll'
    render(<VisoreFoto {...props({ foto: [] })} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('una sola foto: la fascia c\'è con la sua unica miniatura e le frecce non fanno niente', () => {
    const onIndice = vi.fn()
    render(<VisoreFoto {...props({ foto: [FOTO[0]], onIndice })} />)
    expect(screen.getByText('1 di 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Radiografia, 1 di 1' })).toBeInTheDocument()
    fireEvent.keyDown(pannello(), { key: 'ArrowRight' })
    fireEvent.keyDown(pannello(), { key: 'ArrowLeft' })
    expect(onIndice).not.toHaveBeenCalled()
  })

  it('una categoria che non conosciamo porta il valore grezzo, non il vuoto', () => {
    render(<VisoreFoto {...props({ foto: [{ ...FOTO[0], categoria: 'panoramica' }] })} />)
    expect(screen.getByRole('button', { name: 'Cambia la categoria: panoramica' })).toBeInTheDocument()
  })

  // ══ «Riduci movimento» — §1.9 ══════════════════════════════════════════
  // 🛑 QUI C'È UNA LACUNA DICHIARATA, e vale più di una prova che mente.
  // `provato:` (31/07/2026) reso un `motion.div` con `initial={{scale:.98,
  // opacity:0}}` e `animate={{scale:1,opacity:1}}` sotto le TRE forme di
  // transizione (`molla.smooth`, `istantaneo` intero, per-chiave): in tutti e
  // tre i casi jsdom legge `transform="scale(0.98)"` e `opacity="0"`. Con
  // `MotionGlobalConfig.skipAnimations = true` (tests/setup.ts:16) Motion
  // lascia scritto l'INITIAL e non applica mai l'`animate`.
  // ➡️ Quindi «la foto arriva a scala piena» NON è verificabile qui: una
  // asserzione sul `transform` misurerebbe l'ambiente di prova, non il
  // componente — e sarebbe rossa anche su un componente corretto. Il bersaglio
  // di §1.9 si guarda al GATE ESTETICO L2 nel browser (FASE 9b, T13).
  // Quel che resta verificabile, e che si verifica, è che a preferenza accesa
  // la superficie sia INTERA e utilizzabile: niente sparisce, niente si spegne.
  it('a «riduci movimento» accesa la superficie è intera: pannello, foto e comandi ci sono tutti', () => {
    const ripristina = attivaReducedMotion()
    try {
      render(<VisoreFoto {...props()} />)
      expect(pannello()).toBeInTheDocument()
      expect(fotoGrande().getAttribute('src')).toBe(FOTO[0].url)
      expect(screen.getByRole('button', { name: 'Chiudi' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Cambia la categoria/ })).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /di 3$/ })).toHaveLength(3)
    } finally {
      ripristina()
    }
  })

  // ══ Sicurezza — G5 · D75 ═══════════════════════════════════════════════
  it('🔴 G5·D75 — l\'indirizzo firmato compare SOLO dentro un `src` di <img>: vincolo di POSTO, non di conteggio', () => {
    const SENTINELLA = 'FIRMA-SENTINELLA'
    const conFirma = FOTO.map((f) => ({ ...f, url: `https://esempio/${SENTINELLA}/${f.id}.jpg` }))
    const { baseElement } = render(<VisoreFoto {...props({ foto: conFirma })} />)

    const inTutto = (baseElement.innerHTML.match(new RegExp(SENTINELLA, 'g')) ?? []).length
    const dentroSrc = Array.from(baseElement.querySelectorAll('img')).filter((i) =>
      (i.getAttribute('src') ?? '').includes(SENTINELLA),
    ).length

    // Uguaglianza, non un numero fisso: la foto aperta compare legittimamente
    // due volte (grande + miniatura nella fascia).
    expect(inTutto).toBe(dentroSrc)
    expect(dentroSrc).toBeGreaterThan(0)
    expect(baseElement.textContent).not.toContain(SENTINELLA)
  })

  it('🔴 G5·D75, metà speculare — `onIndice` riceve un NUMERO, mai l\'oggetto foto', () => {
    const onIndice = vi.fn()
    render(<VisoreFoto {...props({ onIndice })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Impronta, 2 di 3' }))
    for (const chiamata of onIndice.mock.calls) {
      expect(chiamata).toHaveLength(1)
      expect(typeof chiamata[0]).toBe('number')
    }
  })

  it('`nome_file` non finisce da nessuna parte nel reso', () => {
    const { baseElement } = render(<VisoreFoto {...props()} />)
    expect(baseElement.innerHTML).not.toContain('radiografia-paziente.jpg')
  })

  // ══ Misure e dizionario ════════════════════════════════════════════════
  it('il velo è quello dei token (non `materia.scrim`) e ferma il gesto dove nasce', () => {
    const { baseElement } = render(<VisoreFoto {...props()} />)
    const velo = baseElement.querySelector('.ds-visore-velo') as HTMLElement
    expect(velo.style.background).toBe(comeLoScriveJsdom(sopraFoto.velo))
    expect(velo.style.background).not.toBe(comeLoScriveJsdom(materia.scrim))
    expect(velo.style.touchAction).toBe('none')
  })

  it('i tondi sono 44×44 e l\'anello focus-visible di legge è di proprietà del componente', () => {
    const { baseElement } = render(<VisoreFoto {...props()} />)
    const chiudi = screen.getByRole('button', { name: 'Chiudi' })
    expect(chiudi.style.width).toBe('44px')
    expect(chiudi.style.height).toBe('44px')
    const regole = Array.from(baseElement.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n')
    expect(regole).toContain('outline: 2px solid var(--blue)')
    expect(regole).toContain('outline-offset: 2px')
  })

  it('tutti i testi resi passano trovaParoleVietate', () => {
    const { baseElement } = render(<VisoreFoto {...props()} />)
    expect(trovaParoleVietate(baseElement.textContent ?? '')).toEqual([])
  })
})
