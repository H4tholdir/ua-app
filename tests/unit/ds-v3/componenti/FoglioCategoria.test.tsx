import { type RefObject } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import { coreografie } from '@/design-system/v3/motion'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import { CATEGORIE_FOTO } from '@/lib/domain/categorie-foto'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { FoglioCategoria, variantePannello } from '@/components/ds/FoglioCategoria'
import { Sheet } from '@/components/ds/Sheet'

/** Un'àncora vera nel documento: è dove il focus deve tornare alla chiusura.
 *  🛑 Dichiarata dal chiamante (C-12), mai catturata: chi apre questo foglio può
 *  essere una voce di menù che sta smontando. */
function ancoraNelDocumento(): RefObject<HTMLElement | null> {
  const tasto = document.createElement('button')
  tasto.textContent = 'apri'
  document.body.appendChild(tasto)
  return { current: tasto }
}

function props(extra: Partial<Parameters<typeof FoglioCategoria>[0]> = {}) {
  return {
    aperto: true,
    quante: 1,
    anteprime: ['https://esempio/scatto.jpg'],
    ancoraFocus: ancoraNelDocumento(),
    onScegli: () => {},
    onChiudi: () => {},
    ...extra,
  }
}

function pannello(): HTMLElement {
  return screen.getByRole('dialog')
}

function pastiglie(): HTMLElement[] {
  return Array.from(pannello().querySelectorAll<HTMLElement>('.ds-foglio-pastiglia'))
}

function velo(): HTMLElement {
  return document.querySelector('.ds-foglio-velo') as HTMLElement
}

/** jsdom riscrive i colori a modo suo: far passare anche il token dalla stessa
 *  riscrittura lega la prova al token invece che a una stringa ricopiata. */
function comeLoScriveJsdom(valore: string): string {
  const d = document.createElement('div')
  d.style.background = valore
  return d.style.background
}

describe('FoglioCategoria — il foglio che chiede che foto è (§5.41)', () => {
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

  // ══ D74 — LA FOTO DEVE NASCERE CON UNA CATEGORIA ═══════════════════════
  // È la prova che morde di questo componente: ogni uscita che NON è una
  // scelta deve comunque produrne una («altro»), e nell'ordine giusto.
  describe('🔑 ogni uscita porta una categoria: `onScegli(\'altro\')` POI `onChiudi()` (D74)', () => {
    function tracciante() {
      const tracce: string[] = []
      return {
        tracce,
        onScegli: (c: string) => tracce.push(`scegli:${c}`),
        onChiudi: () => tracce.push('chiudi'),
      }
    }

    it('tap sul velo', () => {
      const t = tracciante()
      render(<FoglioCategoria {...props({ onScegli: t.onScegli, onChiudi: t.onChiudi })} />)
      fireEvent.pointerDown(velo())
      fireEvent.click(velo())
      expect(t.tracce).toEqual(['scegli:altro', 'chiudi'])
    })

    it('`Escape`', () => {
      const t = tracciante()
      render(<FoglioCategoria {...props({ onScegli: t.onScegli, onChiudi: t.onChiudi })} />)
      fireEvent.keyDown(pannello(), { key: 'Escape' })
      expect(t.tracce).toEqual(['scegli:altro', 'chiudi'])
    })

    it('«indietro»', () => {
      const t = tracciante()
      render(<FoglioCategoria {...props({ onScegli: t.onScegli, onChiudi: t.onChiudi })} />)
      fireEvent.popState(window)
      expect(t.tracce).toEqual(['scegli:altro', 'chiudi'])
    })

    it('uscire senza scegliere NON è un errore: niente suono e niente vibrazione (D74)', () => {
      render(<FoglioCategoria {...props()} />)
      fireEvent.keyDown(pannello(), { key: 'Escape' })
      expect(suonaMock).not.toHaveBeenCalled()
      expect(vibraMock).not.toHaveBeenCalled()
    })

    it('il ghost click di Chrome Android (click senza pointerdown) non fa uscire nessuno', () => {
      const t = tracciante()
      render(<FoglioCategoria {...props({ onScegli: t.onScegli, onChiudi: t.onChiudi })} />)
      fireEvent.click(velo())
      expect(t.tracce).toEqual([])
    })
  })

  // ══ SCEGLIERE ══════════════════════════════════════════════════════════
  describe('scegliere una categoria', () => {
    it('tap su una pastiglia: sceglie QUELLA, chiude, e vibra — MAI un suono', () => {
      const t: string[] = []
      render(
        <FoglioCategoria
          {...props({ onScegli: (c: string) => t.push(`scegli:${c}`), onChiudi: () => t.push('chiudi') })}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Guida colore' }))
      expect(t).toEqual(['scegli:colore', 'chiudi'])
      expect(vibraMock).toHaveBeenCalledWith('selection')
      expect(suonaMock).not.toHaveBeenCalled()
    })
  })

  // ══ LE SEI PASTIGLIE ═══════════════════════════════════════════════════
  describe('le sei pastiglie', () => {
    it('sono SEI, una per categoria, nell\'ordine di D71 — e l\'elenco non è una copia locale', () => {
      render(<FoglioCategoria {...props()} />)
      const nomi = pastiglie().map((p) => p.textContent?.replace(/[^\p{L}\s-]/gu, '').trim())
      expect(nomi).toEqual(CATEGORIE_FOTO.map((c) => c.etichetta))
    })

    it('misure di §5.41: min-height 60 (ben oltre i 44 di legge), `raggio.riga`, faccia `var(--bg-deep)`, testo 15/700', () => {
      render(<FoglioCategoria {...props()} />)
      const prima = pastiglie()[0]
      expect(prima.style.minHeight).toBe('60px')
      expect(prima.style.borderRadius).toBe(`${raggio.riga}px`)
      expect(prima.style.background).toBe('var(--bg-deep)')
      expect(prima.style.fontSize).toBe('15px')
      expect(prima.style.fontWeight).toBe(String(tipografia.weight.bold))
      expect(prima.style.paddingLeft).toBe(`${spazio.sm}px`)
    })

    it('🔴 MAI `whiteSpace: nowrap`: a text-zoom 200% taglierebbe «Guida colore», e il 200% è un requisito di rilascio (§13.3)', () => {
      render(<FoglioCategoria {...props()} />)
      pastiglie().forEach((p) => expect(p.style.whiteSpace).not.toBe('nowrap'))
    })

    it('la griglia è a DUE colonne con `gap spazio.s`', () => {
      render(<FoglioCategoria {...props()} />)
      const griglia = pannello().querySelector('.ds-foglio-griglia') as HTMLElement
      expect(griglia.style.gridTemplateColumns).toBe('1fr 1fr')
      expect(griglia.style.gap).toBe(`${spazio.s}px`)
    })

    it('🚧 l\'emoji è un segnaposto e NON è lo stato di niente (§4.4): è `aria-hidden`, il nome lo porta il testo', () => {
      render(<FoglioCategoria {...props()} />)
      const prima = pastiglie()[0]
      const emoji = prima.querySelector('[aria-hidden="true"]') as HTMLElement
      expect(emoji).not.toBeNull()
      expect(emoji.style.fontSize).toBe('18px')
      // Il nome accessibile è l'etichetta pulita, senza l'emoji.
      expect(screen.getByRole('button', { name: 'Impronta' })).toBe(prima)
    })
  })

  // ══ I DUE MOMENTI (D65 lo scatto · D70 la correzione) ══════════════════
  describe('i due momenti', () => {
    it('🛑 ALLO SCATTO nessuna pastiglia è scelta: il mockup ne mostra una accesa, ma quello è il SECONDO momento (C-7)', () => {
      render(<FoglioCategoria {...props()} />)
      expect(pastiglie().filter((p) => p.getAttribute('aria-pressed') === 'true')).toHaveLength(0)
    })

    it('nella CORREZIONE la categoria che c\'è già è accesa: una sola, con faccia invertita e `aria-pressed`', () => {
      render(<FoglioCategoria {...props({ scelta: 'colore' })} />)
      const accese = pastiglie().filter((p) => p.getAttribute('aria-pressed') === 'true')
      expect(accese).toHaveLength(1)
      expect(accese[0].textContent).toContain('Guida colore')
      // Non è una differenza di solo colore: è luminanza piena, e la semantica
      // la porta l'attributo (§5.41, G4).
      expect(accese[0].style.background).toBe('var(--ink)')
      expect(accese[0].style.color).toBe('var(--bg)')
    })
  })

  // ══ I TESTI — e il plurale non si deduce dalle anteprime ═══════════════
  describe('i testi', () => {
    it('una foto sola: «Che foto è?» e la dida che nomina «Altro»', () => {
      render(<FoglioCategoria {...props()} />)
      expect(screen.getByRole('heading').textContent).toBe('Che foto è?')
      expect(screen.getByText(/Serve per ritrovarla dopo/)).toBeTruthy()
    })

    it('scatto multiplo: il plurale e il numero vengono da `quante`, MAI dal numero di anteprime', () => {
      // Cinque foto, tre anteprime: le due cose sono indipendenti (§5.41: «fino
      // a tre, con {n} foto»). Dedurre il testo dalle anteprime direbbe «3».
      render(<FoglioCategoria {...props({ quante: 5, anteprime: ['a.jpg', 'b.jpg', 'c.jpg'] })} />)
      expect(screen.getByRole('heading').textContent).toBe('Che foto sono?')
      expect(screen.getByText(/La scelta vale per tutte e 5/)).toBeTruthy()
      expect(screen.getByText('5 foto')).toBeTruthy()
      expect(pannello().querySelectorAll('img')).toHaveLength(3)
    })

    it('i testi passano il dizionario (§2.3)', () => {
      render(<FoglioCategoria {...props({ quante: 3, anteprime: ['a.jpg'] })} />)
      expect(trovaParoleVietate(pannello().textContent ?? '')).toEqual([])
    })
  })

  // ══ ANATOMIA E STRATO ══════════════════════════════════════════════════
  describe('il pannello', () => {
    it('è un dialogo vero: `aria-modal`, nome dal titolo, descrizione dalla dida', () => {
      render(<FoglioCategoria {...props()} />)
      const p = pannello()
      expect(p.getAttribute('aria-modal')).toBe('true')
      const titolo = screen.getByRole('heading')
      expect(p.getAttribute('aria-labelledby')).toBe(titolo.id)
      const dida = screen.getByText(/Serve per ritrovarla dopo/)
      expect(p.getAttribute('aria-describedby')).toBe(dida.id)
    })

    it('geometria DICHIARATA, la stessa di `Sheet`: 100% con tetto a 480, raggio solo in alto, e scorre davvero', () => {
      render(<FoglioCategoria {...props()} />)
      const p = pannello()
      expect(p.style.width).toBe('100%')
      expect(p.style.maxWidth).toBe('480px')
      expect(p.style.borderTopLeftRadius).toBe(`${raggio.sheet}px`)
      expect(p.style.borderBottomLeftRadius).toBe('0px')
      // 🛑 `overscrollBehavior` è INERTE se il pannello non scorre (C-1): i due
      // vanno insieme, o la riga è decorativa.
      expect(p.style.overflowY).toBe('auto')
      expect(p.style.overscrollBehavior).toBe('contain')
    })

    it('faccia `var(--elv)`: un valore solo per tutti e due i temi (ds-v3.css:13 → `--elv: var(--card)`)', () => {
      render(<FoglioCategoria {...props()} />)
      expect(pannello().style.background).toBe('var(--elv)')
    })

    it('è il TERZO strato: z-index 1030, portale su `document.body`', () => {
      const { container } = render(<FoglioCategoria {...props()} />)
      expect(container.querySelector('[role="dialog"]')).toBeNull()
      const radice = document.querySelector('.ds-foglio-radice') as HTMLElement
      expect(radice.style.zIndex).toBe('1030')
      expect(radice.parentElement).toBe(document.body)
    })

    it('il velo è quello di casa e ferma il gesto dove nasce', () => {
      render(<FoglioCategoria {...props()} />)
      expect(velo().style.background).toBe(comeLoScriveJsdom('rgba(29,25,19,.35)'))
      expect(velo().style.touchAction).toBe('none')
    })

    it('il manico: 36×4 `var(--line)`, e non è un comando — è l\'innesco dello swipe (modello `Sheet`)', () => {
      render(<FoglioCategoria {...props()} />)
      const manico = pannello().querySelector('.ds-foglio-manico') as HTMLElement
      expect(manico.style.width).toBe('36px')
      expect(manico.style.height).toBe('4px')
      expect(manico.style.background).toBe('var(--line)')
      expect(manico.getAttribute('aria-hidden')).toBe('true')
      expect(manico.tagName).not.toBe('BUTTON')
    })

    it('l\'anteprima è 56×56, e l\'indirizzo firmato entra SOLO come `src` (G5 · D75)', () => {
      render(<FoglioCategoria {...props()} />)
      const img = pannello().querySelector('img') as HTMLImageElement
      expect(img.style.width).toBe('56px')
      expect(img.style.height).toBe('56px')
      expect(img.style.borderRadius).toBe(`${raggio.riga - 6}px`)
      // L'URL non compare da nessun'altra parte: né titolo, né aria-label, né testo.
      expect(pannello().innerHTML).not.toContain('title="https://esempio/scatto.jpg"')
      expect(pannello().getAttribute('aria-label')).toBeNull()
    })
  })

  // ══ LA STORIA E LO SCORRIMENTO ═════════════════════════════════════════
  describe('lo strato', () => {
    it('si registra con la marca `uaSheet`', () => {
      // Sentinella: senza, `window.history.state` conserverebbe l'entry di un
      // altro test e la prova sarebbe verde anche su un componente inerte.
      window.history.replaceState({ sentinella: true }, '')
      render(<FoglioCategoria {...props()} />)
      expect((window.history.state as Record<string, unknown>)?.uaSheet).toBe(true)
    })

    it('blocca lo scorrimento in ENTRAMBI i suoi momenti, e restituisce il valore VERO alla chiusura', () => {
      document.body.style.overflow = 'scroll'
      document.body.style.paddingRight = '7px'

      const { rerender } = render(<FoglioCategoria {...props()} />)
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<FoglioCategoria {...props({ aperto: false })} />)
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('7px')

      // Il secondo momento (la correzione) non è un caso diverso per il corpo.
      rerender(<FoglioCategoria {...props({ scelta: 'impronta' })} />)
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<FoglioCategoria {...props({ scelta: 'impronta', aperto: false })} />)
      expect(document.body.style.overflow).toBe('scroll')
    })

    it('due strati chiusi NELL\'ORDINE SBAGLIATO (prima quello sotto): il corpo torna comunque suo', () => {
      document.body.style.overflow = 'scroll'
      document.body.style.paddingRight = '7px'
      const { rerender } = render(
        <>
          <Sheet aperto onChiudi={() => {}} titolo="Sotto"><p>contenuto</p></Sheet>
          <FoglioCategoria {...props()} />
        </>,
      )
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<><FoglioCategoria {...props()} /></>)
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<></>)
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('7px')
    })

    it('`Escape` non collassa lo strato di sotto (§1.5)', () => {
      const chiudiSheet = vi.fn()
      render(
        <>
          <Sheet aperto onChiudi={chiudiSheet} titolo="Sotto"><p>contenuto</p></Sheet>
          <FoglioCategoria {...props()} />
        </>,
      )
      fireEvent.keyDown(screen.getByRole('dialog', { name: /Che foto/ }), { key: 'Escape' })
      expect(chiudiSheet).not.toHaveBeenCalled()
    })
  })

  // ══ IL FOCUS — trattenuto, al contrario della tendina ══════════════════
  describe('il focus', () => {
    it('🛑 all\'apertura il focus va al PANNELLO, non alla prima pastiglia: suggerirebbe una scelta non fatta', () => {
      render(<FoglioCategoria {...props()} />)
      expect(document.activeElement).toBe(pannello())
    })

    it('`Tab` TRATTENUTO: premuto tante volte quanti gli elementi raggiungibili più uno, torna al primo e non esce mai', async () => {
      const utente = userEvent.setup()
      // Il gemello di `SkipToContent.tsx:12`: raggiungibile, globale, fuori dal
      // pannello. È dove il focus atterrava prima della trappola.
      const fuori = document.createElement('a')
      fuori.href = '#main-content'
      fuori.textContent = 'Vai al contenuto'
      document.body.appendChild(fuori)

      render(<FoglioCategoria {...props()} />)
      const p = pannello()
      const raggiungibili = pastiglie()
      expect(raggiungibili).toHaveLength(6)

      for (let i = 0; i < raggiungibili.length + 1; i += 1) {
        await utente.tab()
        expect(p.contains(document.activeElement)).toBe(true)
        expect(document.activeElement).not.toBe(fuori)
      }
      expect(document.activeElement).toBe(raggiungibili[0])
    })

    it('alla chiusura il focus torna all\'àncora DICHIARATA dal chiamante', () => {
      const ancoraFocus = ancoraNelDocumento()
      const { rerender } = render(<FoglioCategoria {...props({ ancoraFocus })} />)
      rerender(<FoglioCategoria {...props({ ancoraFocus, aperto: false })} />)
      expect(document.activeElement).toBe(ancoraFocus.current)
    })

    it('àncora vuota: avvisa in sviluppo — un focus che non torna non si vede in nessuno screenshot', () => {
      const avviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(<FoglioCategoria {...props({ ancoraFocus: { current: null } })} />)
      expect(avviso).toHaveBeenCalledTimes(1)
      expect(avviso.mock.calls[0][0]).toContain('FoglioCategoria')
      avviso.mockRestore()
    })
  })

  // ══ «RIDUCI MOVIMENTO» — §1.9 B-6, e nominare `sheetSu` NON basta ══════
  // La variante è esportata per la stessa ragione per cui `Sheet` esporta
  // `deveChiudere` (`Sheet.tsx:40`): è un dato puro, e provarlo sull'oggetto
  // vero è l'unico modo onesto in un ambiente dove Motion non applica mai
  // l'`animate` (`skipAnimations`, `tests/setup.ts:16`).
  describe('«riduci movimento»', () => {
    it('a preferenza SPENTA la coreografia è quella di casa, non una copia', () => {
      expect(variantePannello(false)).toBe(coreografie.sheetSu)
    })

    it('🛑 a preferenza ACCESA: `y` finale = 0 (il pannello ARRIVA) e nessun tween su `y`', () => {
      const ridotta = variantePannello(true)
      // Il bersaglio NON si tocca: togliere `y` lo lascerebbe congelato fuori
      // schermo — è il difetto D1/D2 del 26/07, e `SheetRidotto` ci casca
      // ancora (`Sheet.tsx:448-458`: il suo pannello non ha `y` affatto).
      expect(ridotta.animate.y).toBe(0)
      expect(ridotta.exit.y).toBe('100%')
      // La transizione si sostituisce DENTRO la variante, su entrambe le chiavi:
      // una `transition` passata come prop non arriverebbe mai (motion.ts:85-86).
      expect(ridotta.animate.transition.y).toEqual({ duration: 0 })
      expect(ridotta.exit.transition.y).toEqual({ duration: 0 })
    })
  })

  // ══ LE FORME CHE NON RENDONO NIENTE ════════════════════════════════════
  describe('le forme di ingresso che non rendono niente', () => {
    it('chiuso: niente a schermo e il corpo non si tocca', () => {
      document.body.style.overflow = 'scroll'
      render(<FoglioCategoria {...props({ aperto: false })} />)
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.body.style.overflow).toBe('scroll')
    })

    it('nessuna anteprima: il foglio si apre lo stesso — le sei pastiglie sono il suo lavoro', () => {
      render(<FoglioCategoria {...props({ anteprime: [] })} />)
      expect(pastiglie()).toHaveLength(6)
      expect(pannello().querySelectorAll('img')).toHaveLength(0)
    })
  })
})
