import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type RefObject } from 'react'
import { render, screen, fireEvent, createEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { raggio, sopraFoto, spazio, tipografia } from '@/design-system/v3/tokens'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { TendinaMenu, type VoceTendina } from '@/components/ds/TendinaMenu'
import { Sheet } from '@/components/ds/Sheet'

/** I `<path>` grezzi, come li vuole l'anatomia di §5.34: il tag `<svg>` con
 *  stroke e linecap vive UNA volta dentro il componente. */
const ICONA = <path d="M4 7h16" />

/** Il rettangolo del ⋯ nel capo del visore: jsdom non fa layout e
 *  `getBoundingClientRect()` torna tutti zeri — senza questa finta, OGNI
 *  asserzione sulla posizione sarebbe vera per caso e non guarderebbe niente. */
const RECT_ANCORA = { top: 8, left: 300, right: 344, bottom: 52, width: 44, height: 44, x: 300, y: 8 }

function ancoraNelDocumento(rect: Partial<DOMRect> = {}): RefObject<HTMLElement | null> {
  const tondo = document.createElement('button')
  tondo.textContent = '⋯'
  document.body.appendChild(tondo)
  const pieno = { ...RECT_ANCORA, ...rect }
  tondo.getBoundingClientRect = () => ({ ...pieno, toJSON: () => pieno }) as DOMRect
  return { current: tondo }
}

function voce(extra: Partial<VoceTendina> = {}): VoceTendina {
  return { id: 'v', icona: ICONA, testo: 'Una voce', onScegli: () => {}, ...extra }
}

const VOCI: VoceTendina[] = [
  voce({ id: 'categoria', testo: 'Cambia categoria' }),
  voce({ id: 'salva', testo: 'Salva sul telefono' }),
  voce({ id: 'elimina', testo: 'Elimina foto', distruttiva: true }),
]

function props(extra: Partial<Parameters<typeof TendinaMenu>[0]> = {}) {
  return {
    aperta: true,
    voci: VOCI,
    onChiudi: () => {},
    etichettaAria: 'Altre cose da fare su questa foto',
    ancora: ancoraNelDocumento(),
    ...extra,
  }
}

function pannello(): HTMLElement {
  return screen.getByRole('menu')
}

function voci(): HTMLElement[] {
  return screen.getAllByRole('menuitem')
}

function velo(): HTMLElement {
  return document.querySelector('.ds-tendina-velo') as HTMLElement
}

describe('TendinaMenu — la tendina ancorata al ⋯ (§5.40)', () => {
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

  // ══ LA PROVA CHE MORDE (D78) ═══════════════════════════════════════════
  // La mitigazione della scelta M2 è la POSIZIONE della voce distruttiva: il
  // punto più lontano dal dito che ha appena toccato il ⋯. Se dipendesse
  // dall'ordine dell'array, dipenderebbe da chi chiama — cioè non sarebbe una
  // mitigazione, sarebbe una speranza.
  describe('la voce distruttiva la mette in fondo il componente, non il chiamante (D78)', () => {
    it('passata PER PRIMA, esce ULTIMA', () => {
      render(
        <TendinaMenu
          {...props({
            voci: [
              voce({ id: 'elimina', testo: 'Elimina foto', distruttiva: true }),
              voce({ id: 'categoria', testo: 'Cambia categoria' }),
              voce({ id: 'salva', testo: 'Salva sul telefono' }),
            ],
          })}
        />,
      )
      const testi = voci().map((v) => v.textContent)
      expect(testi[testi.length - 1]).toContain('Elimina foto')
      expect(testi[0]).toContain('Cambia categoria')
    })

    it('l\'ordine delle voci NON distruttive resta quello del chiamante', () => {
      render(<TendinaMenu {...props()} />)
      const testi = voci().map((v) => v.textContent)
      expect(testi[0]).toContain('Cambia categoria')
      expect(testi[1]).toContain('Salva sul telefono')
    })

    it('due distruttive: vanno in fondo tutte e due, nel loro ordine', () => {
      render(
        <TendinaMenu
          {...props({
            voci: [
              voce({ id: 'elimina', testo: 'Elimina foto', distruttiva: true }),
              voce({ id: 'categoria', testo: 'Cambia categoria' }),
              voce({ id: 'butta', testo: 'Butta tutto', distruttiva: true }),
            ],
          })}
        />,
      )
      const testi = voci().map((v) => v.textContent)
      expect(testi[0]).toContain('Cambia categoria')
      expect(testi[1]).toContain('Elimina foto')
      expect(testi[2]).toContain('Butta tutto')
    })

    it('nessuna distruttiva: nessuna voce si porta dietro la linea di sopra né il margine extra', () => {
      render(
        <TendinaMenu
          {...props({
            voci: [voce({ id: 'a', testo: 'Cambia categoria' }), voce({ id: 'b', testo: 'Salva sul telefono' })],
          })}
        />,
      )
      voci().forEach((v) => {
        expect(v.style.borderTopWidth).toBe('')
        expect(v.style.marginTop).toBe('')
      })
    })

    it('tutte distruttive: nessuna riordinata (non c\'è un fondo dove metterle)', () => {
      render(
        <TendinaMenu
          {...props({
            voci: [
              voce({ id: 'a', testo: 'Elimina foto', distruttiva: true }),
              voce({ id: 'b', testo: 'Butta tutto', distruttiva: true }),
            ],
          })}
        />,
      )
      const testi = voci().map((v) => v.textContent)
      expect(testi[0]).toContain('Elimina foto')
      expect(testi[1]).toContain('Butta tutto')
    })
  })

  // ══ ANATOMIA DEL PANNELLO (§5.40 Misure) ═══════════════════════════════
  describe('il pannello', () => {
    it('è un `role="menu"` col nome che gli dà il chiamante — mai un dialogo', () => {
      render(<TendinaMenu {...props()} />)
      const p = screen.getByRole('menu', { name: 'Altre cose da fare su questa foto' })
      // 🛑 Niente `aria-modal`: il modello è quello del MENÙ (un solo elemento
      // nella sequenza del Tab), non quello del dialogo. È la ragione per cui
      // la trappola del focus qui non ci va (§1.6).
      expect(p.getAttribute('aria-modal')).toBeNull()
    })

    it('misure di §5.40: 260 di larghezza, raggio del tasto, padding s/m', () => {
      render(<TendinaMenu {...props()} />)
      const p = pannello()
      expect(p.style.width).toBe('260px')
      expect(p.style.borderRadius).toBe(`${raggio.tasto}px`)
      expect(p.style.padding).toBe(`${spazio.s}px ${spazio.m}px`)
    })

    it('faccia `var(--elv)`: un solo valore che vale in chiaro E in scuro (ds-v3.css:13 → `--elv: var(--card)`)', () => {
      render(<TendinaMenu {...props()} />)
      expect(pannello().style.background).toBe('var(--elv)')
    })

    it('🌑 porta l\'ombra `sopraFoto.ombraPannello` — la deroga dichiarata a §3 (D88)', () => {
      render(<TendinaMenu {...props()} />)
      expect(pannello().style.boxShadow).toBe(sopraFoto.ombraPannello)
    })

    it('strato: z-index 1020, portale su `document.body`, `transformOrigin` al ⋯', () => {
      const { container } = render(<TendinaMenu {...props()} />)
      // Il portale: niente resta nel contenitore del chiamante.
      expect(container.querySelector('[role="menu"]')).toBeNull()
      const radice = document.querySelector('.ds-tendina-radice') as HTMLElement
      expect(radice.style.zIndex).toBe('1020')
      expect(radice.parentElement).toBe(document.body)
      // L'ingresso cresce DA DOVE È USCITA: l'angolo alto a destra, cioè il ⋯.
      expect(pannello().style.transformOrigin).toBe('100% 0')
    })

    it('è ancorato SOTTO il ⋯ e allineato al suo bordo destro', () => {
      render(<TendinaMenu {...props()} />)
      const p = pannello()
      expect(p.style.position).toBe('fixed')
      expect(p.style.top).toBe(`${RECT_ANCORA.bottom + spazio.m}px`)
      expect(p.style.right).toBe(`${window.innerWidth - RECT_ANCORA.right}px`)
    })

    it('àncora vuota: avvisa in sviluppo invece di piazzarsi in un angolo a caso', () => {
      const avviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(<TendinaMenu {...props({ ancora: { current: null } })} />)
      expect(avviso).toHaveBeenCalledTimes(1)
      expect(avviso.mock.calls[0][0]).toContain('TendinaMenu')
      avviso.mockRestore()
    })
  })

  // ══ LE VOCI — anatomia di §5.34 COPIATA, non riusata (F-6) ═════════════
  describe('le voci', () => {
    it('ognuna è un `role="menuitem"` — è la cosa che `MenuVoce` non sa dire (F-6)', () => {
      render(<TendinaMenu {...props()} />)
      expect(voci()).toHaveLength(3)
      voci().forEach((v) => expect(v.tagName).toBe('BUTTON'))
    })

    it('anatomia §5.34 verbatim: min-height 56, testo body/700, icona Ø38 raggio 11', () => {
      render(<TendinaMenu {...props()} />)
      const prima = voci()[0]
      expect(prima.style.minHeight).toBe('56px')
      expect(prima.style.fontSize).toBe(`${tipografia.size.body}px`)
      expect(prima.style.fontWeight).toBe(String(tipografia.weight.bold))
      const icona = prima.querySelector('span[aria-hidden="true"]') as HTMLElement
      expect(icona.style.width).toBe('38px')
      expect(icona.style.height).toBe('38px')
      expect(icona.style.borderRadius).toBe(`${raggio.riga - 7}px`)
    })

    it('il separatore lo mette IL CONTENITORE, che conosce la posizione: 1.5 `var(--line)` su tutte tranne l\'ultima', () => {
      render(<TendinaMenu {...props()} />)
      const [prima, seconda, ultima] = voci()
      expect(prima.style.borderBottomWidth).toBe('1.5px')
      expect(prima.style.borderBottomColor).toBe('var(--line)')
      // Anche quella PRIMA della distruttiva tiene la sua linea: la distruttiva
      // ci mette sopra la propria, staccata di `spazio.xs`. È ciò che fa il
      // contenitore vero di casa (`MenuSchedaSheet.tsx:162-164`) e la legge
      // visiva di §5.34 (`.menu-voce:not(:last-child)` + `.butta`).
      expect(seconda.style.borderBottomWidth).toBe('1.5px')
      // L'ultima non ha niente sotto: sotto non c'è più nessuno.
      expect(ultima.style.borderBottomWidth).toBe('')
    })

    it('la distruttiva: rossa, staccata da una linea SOPRA, con margine extra', () => {
      render(<TendinaMenu {...props()} />)
      const ultima = voci()[2]
      expect(ultima.style.color).toBe('var(--red)')
      expect(ultima.style.borderTopWidth).toBe('1.5px')
      expect(ultima.style.borderTopColor).toBe('var(--line)')
      expect(ultima.style.marginTop).toBe('4px')
      expect(ultima.style.paddingTop).toBe('16px')
      const icona = ultima.querySelector('span[aria-hidden="true"]') as HTMLElement
      expect(icona.style.background).toBe('var(--red-tint)')
      expect(icona.style.color).toBe('var(--red)')
    })

    it('il chevron sta sulle voci che portano altrove, MAI sulla distruttiva (mockup §5.34 `.menu-voce.butta`, M1 e M2 concordi)', () => {
      render(<TendinaMenu {...props()} />)
      const [prima, , ultima] = voci()
      expect(prima.textContent).toContain('›')
      expect(ultima.textContent).not.toContain('›')
    })

    it('disabled: al 60%, senza chevron, e il tap non arriva a nessuno', () => {
      const scelta = vi.fn()
      render(
        <TendinaMenu
          {...props({ voci: [voce({ id: 'x', testo: 'Non si può', disabled: true, onScegli: scelta })] })}
        />,
      )
      const v = voci()[0]
      expect(v.style.opacity).toBe('0.6')
      expect(v.textContent).not.toContain('›')
      expect(v).toBeDisabled()
      fireEvent.click(v)
      expect(scelta).not.toHaveBeenCalled()
    })

    it('nessun testo proprio: a schermo c\'è ESATTAMENTE quel che ha passato il chiamante', () => {
      render(<TendinaMenu {...props()} />)
      const testi = voci().map((v) => v.textContent?.replace('›', '').trim())
      expect(testi).toEqual(['Cambia categoria', 'Salva sul telefono', 'Elimina foto'])
    })
  })

  // ══ SCEGLIERE UNA VOCE ═════════════════════════════════════════════════
  describe('scegliere', () => {
    it('tap su una voce: la sceglie, chiude, e vibra — MAI un suono (§9.2: il ⋯ ha già il suo)', () => {
      const scelta = vi.fn()
      const chiudi = vi.fn()
      render(
        <TendinaMenu
          {...props({
            onChiudi: chiudi,
            voci: [voce({ id: 'categoria', testo: 'Cambia categoria', onScegli: scelta })],
          })}
        />,
      )
      fireEvent.click(voci()[0])
      expect(scelta).toHaveBeenCalledTimes(1)
      expect(chiudi).toHaveBeenCalledTimes(1)
      expect(vibraMock).toHaveBeenCalledWith('light')
      expect(suonaMock).not.toHaveBeenCalled()
    })
  })

  // ══ TASTIERA — il modello del MENÙ, non quello del dialogo ═════════════
  describe('la tastiera', () => {
    it('all\'apertura il focus si posa sulla PRIMA voce — e l\'apertura non si richiude da sé', () => {
      const chiudi = vi.fn()
      render(<TendinaMenu {...props({ onChiudi: chiudi })} />)
      expect(document.activeElement).toBe(voci()[0])
      // 🔑 Inchioda l'ORDINE degli effect: il `focus()` può far scorrere un
      // antenato, e l'ascolto dello scorrimento chiude. Registrarlo PRIMA del
      // focus farebbe chiudere la tendina nell'istante in cui si apre.
      expect(chiudi).not.toHaveBeenCalled()
    })

    it('↓ e ↑ scorrono le voci, e NON avvolgono ai capi', () => {
      render(<TendinaMenu {...props()} />)
      const [prima, seconda, terza] = voci()

      fireEvent.keyDown(prima, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(seconda)
      fireEvent.keyDown(seconda, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(terza)
      // in fondo si resta in fondo
      fireEvent.keyDown(terza, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(terza)

      fireEvent.keyDown(terza, { key: 'ArrowUp' })
      expect(document.activeElement).toBe(seconda)
      fireEvent.keyDown(seconda, { key: 'ArrowUp' })
      expect(document.activeElement).toBe(prima)
      // in cima si resta in cima
      fireEvent.keyDown(prima, { key: 'ArrowUp' })
      expect(document.activeElement).toBe(prima)
    })

    it('`Home` e `End` vanno ai capi', () => {
      render(<TendinaMenu {...props()} />)
      const [prima, , terza] = voci()
      fireEvent.keyDown(prima, { key: 'End' })
      expect(document.activeElement).toBe(terza)
      fireEvent.keyDown(terza, { key: 'Home' })
      expect(document.activeElement).toBe(prima)
    })

    // 🔑 L'OPPOSTO della prova di T5-ter, e va scritta come tale: sui tre
    // dialoghi il Tab è TRATTENUTO, qui CHIUDE. Due modelli diversi, ognuno
    // col suo (§1.6).
    it('🛑 `Tab` CHIUDE la tendina e riporta il focus al ⋯ — nessuna trappola', () => {
      const chiudi = vi.fn()
      const ancora = ancoraNelDocumento()
      render(<TendinaMenu {...props({ onChiudi: chiudi, ancora })} />)

      const evento = createEvent.keyDown(voci()[0], { key: 'Tab' })
      fireEvent(voci()[0], evento)

      expect(chiudi).toHaveBeenCalledTimes(1)
      expect(document.activeElement).toBe(ancora.current)
      // Senza questa riga la prova non dice niente sul browser vero: è il
      // `preventDefault` che impedisce al Tab di spostare il focus per conto suo.
      expect(evento.defaultPrevented).toBe(true)
    })

    it('`Escape` chiude, e NON collassa lo strato di sotto (§1.5)', () => {
      const chiudiTendina = vi.fn()
      const chiudiSheet = vi.fn()
      // 🛑 FRATELLI, mai annidati: gli eventi sintetici di React risalgono
      // l'albero REACT. Una tendina montata dentro i figli (o dentro `azioni`)
      // farebbe arrivare l'Escape anche a chi sta sotto.
      render(
        <>
          <Sheet aperto onChiudi={chiudiSheet} titolo="Sotto"><p>contenuto</p></Sheet>
          <TendinaMenu {...props({ onChiudi: chiudiTendina })} />
        </>,
      )
      fireEvent.keyDown(voci()[0], { key: 'Escape' })
      expect(chiudiTendina).toHaveBeenCalledTimes(1)
      expect(chiudiSheet).not.toHaveBeenCalled()
    })

    it('alla chiusura il focus torna al ⋯', () => {
      const ancora = ancoraNelDocumento()
      const { rerender } = render(<TendinaMenu {...props({ ancora })} />)
      expect(document.activeElement).toBe(voci()[0])
      rerender(<TendinaMenu {...props({ ancora, aperta: false })} />)
      expect(document.activeElement).toBe(ancora.current)
    })
  })

  // ══ LO STRATO: storia e «indietro» ═════════════════════════════════════
  describe('la storia', () => {
    it('si registra con la marca `uaSheet`, o «indietro» chiuderebbe il visore invece del menù', () => {
      // 🔴 SENZA questa riga la prova è VERDE anche su un componente che non fa
      // NIENTE: `window.history.state` conserva l'entry spinta da un altro test
      // del file, e l'asserzione la scambia per la propria. Misurato
      // sull'abbozzo inerte — è il difetto che il conteggio R-P4 serve a trovare.
      window.history.replaceState({ sentinella: true }, '')
      render(<TendinaMenu {...props()} />)
      expect((window.history.state as Record<string, unknown>)?.uaSheet).toBe(true)
    })

    it('«indietro» chiude SOLO la tendina: lo strato di sotto resta aperto', () => {
      const chiudiTendina = vi.fn()
      const chiudiSheet = vi.fn()
      render(
        <>
          <Sheet aperto onChiudi={chiudiSheet} titolo="Sotto"><p>contenuto</p></Sheet>
          <TendinaMenu {...props({ onChiudi: chiudiTendina })} />
        </>,
      )
      fireEvent.popState(window)
      expect(chiudiTendina).toHaveBeenCalledTimes(1)
      expect(chiudiSheet).not.toHaveBeenCalled()
    })
  })

  // ══ LO SCORRIMENTO — la ricetta di §1.4, con la sentinella ═════════════
  describe('lo scorrimento del corpo (D84)', () => {
    it('blocca mentre è aperta e RESTITUISCE il valore vero alla chiusura', () => {
      // Sentinella: nessun bloccante scriverebbe mai «scroll». Con «hidden»
      // la prova sarebbe verde anche per un componente che non blocca affatto.
      document.body.style.overflow = 'scroll'
      document.body.style.paddingRight = '7px'

      const { rerender } = render(<TendinaMenu {...props()} />)
      expect(document.body.style.overflow).toBe('hidden')

      rerender(<TendinaMenu {...props({ aperta: false })} />)
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('7px')
    })

    // 🛑 QUI NON C'È UNA «controprova» PERMANENTE, ed è deliberato. §1.4 la
    // vuole come ESPERIMENTO — la stessa asserzione senza lo strato montato
    // deve diventare ROSSA — e quell'esperimento è stato eseguito sull'abbozzo
    // inerte e registrato nel referto (`docs/roadmap/2026-08-01-t8-referto.md`
    // §2). Scritta come test permanente diventava
    // `expect('scroll').not.toBe('hidden')`: una riga che non può diventare
    // rossa, cioè esattamente ciò che §1.4 condanna, col nome di ciò che chiede.

    it('due strati chiusi NELL\'ORDINE SBAGLIATO (prima quello sotto): il corpo torna comunque suo', () => {
      document.body.style.overflow = 'scroll'
      document.body.style.paddingRight = '7px'

      const { rerender } = render(
        <>
          <Sheet aperto onChiudi={() => {}} titolo="Sotto"><p>contenuto</p></Sheet>
          <TendinaMenu {...props()} />
        </>,
      )
      expect(document.body.style.overflow).toBe('hidden')

      // Prima quello SOTTO — la sequenza che ha generato D84.
      rerender(
        <>
          <TendinaMenu {...props()} />
        </>,
      )
      expect(document.body.style.overflow).toBe('hidden')

      rerender(<></>)
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('7px')
    })
  })

  // ══ LE ALTRE USCITE ════════════════════════════════════════════════════
  describe('le uscite', () => {
    it('tap fuori: chiude', () => {
      const chiudi = vi.fn()
      render(<TendinaMenu {...props({ onChiudi: chiudi })} />)
      fireEvent.pointerDown(velo())
      fireEvent.click(velo())
      expect(chiudi).toHaveBeenCalledTimes(1)
    })

    it('il ghost click di Chrome Android (click senza pointerdown) NON chiude', () => {
      const chiudi = vi.fn()
      render(<TendinaMenu {...props({ onChiudi: chiudi })} />)
      fireEvent.click(velo())
      expect(chiudi).not.toHaveBeenCalled()
    })

    it('se un antenato che scorre si muove, chiude: una tendina ancorata non insegue il suo àncora', () => {
      const chiudi = vi.fn()
      const antenato = document.createElement('div')
      document.body.appendChild(antenato)
      render(<TendinaMenu {...props({ onChiudi: chiudi })} />)
      // `scroll` NON risale l'albero: l'ascolto deve stare in cattura, o questo
      // gesto non arriva mai.
      fireEvent.scroll(antenato)
      expect(chiudi).toHaveBeenCalledTimes(1)
    })
  })

  // ══ QUANDO NON C'È NIENTE DA MOSTRARE ══════════════════════════════════
  describe('le forme di ingresso che non rendono niente', () => {
    it('chiusa: niente a schermo e il corpo non si tocca', () => {
      document.body.style.overflow = 'scroll'
      render(<TendinaMenu {...props({ aperta: false })} />)
      expect(screen.queryByRole('menu')).toBeNull()
      expect(document.body.style.overflow).toBe('scroll')
    })

    it('aperta ma senza voci: un menù vuoto non è un menù', () => {
      render(<TendinaMenu {...props({ voci: [] })} />)
      expect(screen.queryByRole('menu')).toBeNull()
    })
  })

  // ══ «RIDUCI MOVIMENTO» — si legge il sorgente, e il perché è dichiarato ══
  // 🛑 Il comportamento NON è misurabile in questo ambiente: con
  // `MotionGlobalConfig.skipAnimations` (`tests/setup.ts:16`) Motion lascia
  // scritto l'`initial` e non applica MAI l'`animate`, quindi ogni asserzione
  // sui valori finali misurerebbe l'ambiente. Resta la FORMA della transizione,
  // che è ciò che la spec prescrive e ciò che un lettore futuro «correggerebbe»
  // per errore verso la forma del vicino.
  it('«riduci movimento»: istantaneo SOLO lo `scale`, la dissolvenza resta una molla (§5.40)', () => {
    const sorgente = readFileSync(join(process.cwd(), 'src/components/ds/TendinaMenu.tsx'), 'utf8')
    expect(sorgente).toContain('reduced ? { ...molla.smooth, scale: istantaneo } : molla.smooth')
    // Il caso che deve fallire: la forma INTERA di `VisoreFoto` (§5.39, dove
    // tutte le chiavi sono istantanee) qui spegnerebbe anche la dissolvenza,
    // che §5.40 chiede espressamente di tenere.
    expect(sorgente).not.toContain('reduced ? istantaneo :')
  })

  // ══ L'ANELLO DEL FOCUS ═════════════════════════════════════════════════
  it('l\'anello di `focus-visible` è dichiarato: 2px `var(--blue)`, offset 2', () => {
    render(<TendinaMenu {...props()} />)
    const stile = document.querySelector('.ds-tendina-radice style') as HTMLStyleElement
    expect(stile.textContent).toContain('outline: 2px solid var(--blue)')
    expect(stile.textContent).toContain('outline-offset: 2px')
  })
})
