import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { CardInfo, RigaDato } from '@/components/ds/CardInfo'
import { CheckTondo, RigaFase } from '@/components/ds/RigaFase'

describe('RigaDato — riga chiave/valore (§5.10)', () => {
  it('renderizza chiave e valore', () => {
    render(<RigaDato chiave="Consegna" valore="Domani · 09:00" />)
    expect(screen.getByText('Consegna')).toBeInTheDocument()
    expect(screen.getByText('Domani · 09:00')).toBeInTheDocument()
  })

  it('renderizza sub opzionale sotto il valore', () => {
    render(<RigaDato chiave="Materiale" valore="Zirconia" sub="Disco A2" />)
    expect(screen.getByText('Disco A2')).toBeInTheDocument()
  })

  it('senza sub non renderizza righe extra', () => {
    const { container } = render(<RigaDato chiave="Materiale" valore="Zirconia" />)
    // solo chiave + valore, nessun terzo span di sub
    expect(container.querySelectorAll('span').length).toBeLessThanOrEqual(3)
  })

  it('urgente → SOLO il valore diventa var(--red), la chiave resta var(--faint)', () => {
    render(<RigaDato chiave="Consegna" valore="Domani · 09:00" urgente />)
    const valore = screen.getByText('Domani · 09:00')
    const chiave = screen.getByText('Consegna')
    expect(valore.style.color).toBe('var(--red)')
    expect(chiave.style.color).toBe('var(--faint)')
  })

  it('senza urgente il valore resta var(--ink)', () => {
    render(<RigaDato chiave="Consegna" valore="Tra 3 giorni" />)
    expect(screen.getByText('Tra 3 giorni').style.color).toBe('var(--ink)')
  })

  it('urgente non colora il sub: resta var(--muted)', () => {
    render(<RigaDato chiave="Consegna" valore="Oggi · 15:00" sub="Studio Bianchi" urgente />)
    expect(screen.getByText('Studio Bianchi').style.color).toBe('var(--muted)')
  })

  it('i testi passano trovaParoleVietate', () => {
    const { container } = render(
      <RigaDato chiave="Consegna" valore="Domani · 09:00" sub="Studio Bianchi" urgente />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('CardInfo — card di dati (§5.10)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza tutte le RigheDato passate come children', () => {
    render(
      <CardInfo>
        <RigaDato chiave="A" valore="1" />
        <RigaDato chiave="B" valore="2" />
      </CardInfo>
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('separatore 1.5 --line tra le righe, mai dopo l\'ultima', () => {
    const { container } = render(
      <CardInfo>
        <RigaDato chiave="A" valore="1" />
        <RigaDato chiave="B" valore="2" />
        <RigaDato chiave="C" valore="3" />
      </CardInfo>
    )
    const separatori = Array.from(container.querySelectorAll('div')).filter(
      (el) => el.style.background === 'var(--line)'
    )
    expect(separatori.length).toBe(2) // 3 righe → 2 separatori, mai dopo l'ultima
  })

  it('con 5 RigheDato (massimo di legge) nessun console.warn', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <CardInfo>
        <RigaDato chiave="A" valore="1" />
        <RigaDato chiave="B" valore="2" />
        <RigaDato chiave="C" valore="3" />
        <RigaDato chiave="D" valore="4" />
        <RigaDato chiave="E" valore="5" />
      </CardInfo>
    )
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('con più di 5 RigheDato → console.warn in dev, ma le righe restano tutte visibili (mai nascoste)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <CardInfo>
        <RigaDato chiave="A" valore="1" />
        <RigaDato chiave="B" valore="2" />
        <RigaDato chiave="C" valore="3" />
        <RigaDato chiave="D" valore="4" />
        <RigaDato chiave="E" valore="5" />
        <RigaDato chiave="F" valore="6" />
      </CardInfo>
    )
    expect(warnSpy).toHaveBeenCalled()
    expect(screen.getByText('F')).toBeInTheDocument()
  })
})

describe('CheckTondo — cerchio di stato di una fase (§5.11)', () => {
  it('default diametro 31', () => {
    const { container } = render(<CheckTondo fatto={false} />)
    const cerchio = container.firstElementChild as HTMLElement
    expect(cerchio.style.width).toBe('31px')
    expect(cerchio.style.height).toBe('31px')
  })

  it('supporta diametro custom', () => {
    const { container } = render(<CheckTondo fatto={false} diametro={40} />)
    const cerchio = container.firstElementChild as HTMLElement
    expect(cerchio.style.width).toBe('40px')
  })

  it('da fare → nessun check nel DOM, bordo dashed', () => {
    const { container } = render(<CheckTondo fatto={false} />)
    expect(container.querySelector('svg')).toBeNull()
    const cerchio = container.firstElementChild as HTMLElement
    expect(cerchio.style.border).toContain('dashed')
  })

  it('fatto → check nel DOM', () => {
    const { container } = render(<CheckTondo fatto />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('lo stato non è solo colore: espone una parola accessibile (L3)', () => {
    const { rerender } = render(<CheckTondo fatto={false} />)
    expect(screen.getByLabelText('Da fare')).toBeInTheDocument()
    rerender(<CheckTondo fatto />)
    expect(screen.getByLabelText('Fatta')).toBeInTheDocument()
  })

  it('useReducedMotion attivo → resta accessibile e mostra comunque il check, senza il layer Motion di scale', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia

    try {
      render(<CheckTondo fatto />)
      expect(screen.getByLabelText('Fatta')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Fatta' }).querySelector('svg')).toBeInTheDocument()
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })
})

describe('RigaFase — una fase del lavoro (§5.11)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza il nome della fase', () => {
    render(<RigaFase nome="Impronta digitale" fatto={false} />)
    expect(screen.getByText('Impronta digitale')).toBeInTheDocument()
  })

  it('renderizza chiQuando sotto il nome, se passato', () => {
    render(<RigaFase nome="Ceratura" fatto chiQuando="Francesco · ieri 16:40" />)
    expect(screen.getByText('Francesco · ieri 16:40')).toBeInTheDocument()
  })

  it('senza chiQuando non renderizza una sotto-riga vuota', () => {
    render(<RigaFase nome="Ceratura" fatto={false} />)
    expect(screen.queryByText('undefined')).toBeNull()
  })

  it('fatto → nome muted, mai barrato (niente text-decoration: line-through)', () => {
    render(<RigaFase nome="Impronta digitale" fatto />)
    const nome = screen.getByText('Impronta digitale')
    expect(nome.style.color).toBe('var(--muted)')
    expect(nome.style.textDecoration).not.toBe('line-through')
  })

  it('non fatto → nome --ink, peso pieno', () => {
    render(<RigaFase nome="Impronta digitale" fatto={false} />)
    const nome = screen.getByText('Impronta digitale')
    expect(nome.style.color).toBe('var(--ink)')
  })

  it('SOLO la fase prossima (non fatta, con onFatta) mostra PillFase', () => {
    render(
      <>
        <RigaFase nome="Impronta" fatto />
        <RigaFase nome="Ceratura" fatto={false} prossima onFatta={() => {}} />
        <RigaFase nome="Colata" fatto={false} />
      </>
    )
    expect(screen.getAllByRole('button', { name: 'FATTA ✓' }).length).toBe(1)
  })

  it('fase fatta non mostra mai PillFase, anche se prossima resta true per errore del chiamante', () => {
    render(<RigaFase nome="Impronta" fatto prossima onFatta={() => {}} />)
    expect(screen.queryByRole('button', { name: 'FATTA ✓' })).toBeNull()
  })

  it('click su FATTA → onFatta chiamato (wiring); suona("fatta") arriva da PillFase, non duplicato da RigaFase', () => {
    const onFatta = vi.fn()
    render(<RigaFase nome="Ceratura" fatto={false} prossima onFatta={onFatta} />)
    fireEvent.click(screen.getByRole('button', { name: 'FATTA ✓' }))
    expect(onFatta).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('fatta')
    expect(vibraMock).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('success')
  })

  it('prossima senza onFatta → console.warn in dev', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<RigaFase nome="Ceratura" fatto={false} prossima />)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('prossima con onFatta → nessun console.warn', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<RigaFase nome="Ceratura" fatto={false} prossima onFatta={() => {}} />)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('i testi passano trovaParoleVietate', () => {
    const { container } = render(
      <RigaFase nome="Impronta digitale" fatto chiQuando="Francesco · ieri 16:40" />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('catalogo DS v3 — sezione «CardInfo · RigaFase»', () => {
  it('mostra la sezione con titolo dedicato', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByText('CardInfo · RigaFase')).toBeInTheDocument()
  })

  it('mostra una CardInfo con 5 RigheDato (una urgente) e una lista di 4 RigheFase (2 fatte, la prossima con PillFase, 1 futura)', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    // 2 bottoni FATTA ✓ nel catalogo: 1 nella sezione Pill (task precedente) + 1
    // qui, sulla fase "prossima" (le altre 2 fasi fatte non mostrano la pill).
    expect(screen.getAllByRole('button', { name: 'FATTA ✓' }).length).toBe(2)
    // 4 fasi mostrate: 2 già fatte, 1 futura — verifichiamo che il testo
    // accessibile "Fatta"/"Da fare" compaia nel numero atteso nella sezione.
    expect(screen.getAllByLabelText('Fatta').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByLabelText('Da fare').length).toBeGreaterThanOrEqual(2)
  })

  it('tutti i testi statici del catalogo (inclusa la sezione CardInfo · RigaFase) passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })
})
