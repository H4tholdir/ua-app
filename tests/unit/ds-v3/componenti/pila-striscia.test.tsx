import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

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
import { StrisciaStato } from '@/components/ds/StrisciaStato'

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
    render(<StrisciaStato forte="Tutto a posto:">2 consegne oggi</StrisciaStato>)
    const forte = screen.getByText('Tutto a posto:')
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
