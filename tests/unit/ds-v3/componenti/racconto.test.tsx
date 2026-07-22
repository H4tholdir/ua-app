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

import { BarraMateriale } from '@/components/ds/BarraMateriale'
import { EroeTuttoAPosto } from '@/components/ds/EroeTuttoAPosto'
import { CardUAHaFatto } from '@/components/ds/CardUAHaFatto'
import { NotaDentista } from '@/components/ds/NotaDentista'
import { GiornoAgenda, RigaAgenda } from '@/components/ds/RigaAgenda'

beforeEach(() => {
  suonaMock.mockClear()
  vibraMock.mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

function trovaBarraFill(container: HTMLElement): HTMLElement {
  const traccia = Array.from(container.querySelectorAll('div')).find(
    (el) => el.style.height === '10px'
  )
  if (!traccia) throw new Error('traccia barra non trovata')
  return traccia.firstElementChild as HTMLElement
}

describe('BarraMateriale — livello scorta materiale (§5.20)', () => {
  it('soglia esatta: 40.1% → verde', () => {
    const { container } = render(
      <BarraMateriale nome="Zirconia A2" quantita="40.1%" percento={40.1} />
    )
    expect(trovaBarraFill(container).style.background).toBe('var(--green)')
    expect(screen.getByText('40.1%').style.color).toBe('var(--green)')
  })

  it('soglia esatta: 40% → ambra (confine incluso in ambra, non in verde)', () => {
    const { container } = render(<BarraMateriale nome="Resina B1" quantita="40%" percento={40} />)
    expect(trovaBarraFill(container).style.background).toBe('var(--amber)')
    expect(screen.getByText('40%').style.color).toBe('var(--amber)')
  })

  it('soglia esatta: 15% → ambra (confine incluso in ambra, non in rosso)', () => {
    const { container } = render(<BarraMateriale nome="Resina B1" quantita="15%" percento={15} />)
    expect(trovaBarraFill(container).style.background).toBe('var(--amber)')
  })

  it('soglia esatta: 14.9% → rosso', () => {
    const { container } = render(
      <BarraMateriale nome="Disco ceramico" quantita="14.9%" percento={14.9} />
    )
    expect(trovaBarraFill(container).style.background).toBe('var(--red)')
    expect(screen.getByText('14.9%').style.color).toBe('var(--red)')
  })

  it('la barra è H 10 pill su traccia --bg-deep', () => {
    const { container } = render(<BarraMateriale nome="Zirconia A2" quantita="68%" percento={68} />)
    const traccia = Array.from(container.querySelectorAll('div')).find(
      (el) => el.style.height === '10px'
    ) as HTMLElement
    expect(traccia.style.background).toBe('var(--bg-deep)')
  })

  it('il riempimento è largo percento%', () => {
    const { container } = render(<BarraMateriale nome="Zirconia A2" quantita="68%" percento={68} />)
    expect(trovaBarraFill(container).style.width).toBe('68%')
  })

  it('RIORDINA compare SOLO se rosso E onRiordina è passato', () => {
    render(<BarraMateriale nome="Disco ceramico" quantita="8%" percento={8} onRiordina={() => {}} />)
    expect(screen.getByRole('button', { name: /RIORDINA/ })).toBeInTheDocument()
  })

  it('RIORDINA NON compare se rosso ma senza onRiordina', () => {
    render(<BarraMateriale nome="Disco ceramico" quantita="8%" percento={8} />)
    expect(screen.queryByRole('button', { name: /RIORDINA/ })).toBeNull()
  })

  it('RIORDINA NON compare se ambra/verde anche con onRiordina passato', () => {
    const { rerender } = render(
      <BarraMateriale nome="Resina B1" quantita="28%" percento={28} onRiordina={() => {}} />
    )
    expect(screen.queryByRole('button', { name: /RIORDINA/ })).toBeNull()
    rerender(<BarraMateriale nome="Zirconia A2" quantita="68%" percento={68} onRiordina={() => {}} />)
    expect(screen.queryByRole('button', { name: /RIORDINA/ })).toBeNull()
  })

  it('click RIORDINA → suona("tap") + vibra("medium") + onRiordina chiamato — è un\'azione, non una selezione', () => {
    const onRiordina = vi.fn()
    render(<BarraMateriale nome="Disco ceramico" quantita="8%" percento={8} onRiordina={onRiordina} />)
    fireEvent.click(screen.getByRole('button', { name: /RIORDINA/ }))
    expect(onRiordina).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('nota è rossa quando il livello è rosso', () => {
    render(
      <BarraMateriale
        nome="Disco ceramico"
        quantita="8%"
        percento={8}
        nota="Rimangono 2 dischi"
        onRiordina={() => {}}
      />
    )
    expect(screen.getByText('Rimangono 2 dischi').style.color).toBe('var(--red)')
  })

  it('nota resta --muted quando il livello non è rosso', () => {
    render(
      <BarraMateriale nome="Zirconia A2" quantita="68%" percento={68} nota="Scorta abbondante" />
    )
    expect(screen.getByText('Scorta abbondante').style.color).toBe('var(--muted)')
  })

  it('senza nota e senza RIORDINA non renderizza la terza riga', () => {
    const { container } = render(<BarraMateriale nome="Zirconia A2" quantita="68%" percento={68} />)
    // solo 2 righe: intestazione (nome/quantità) e barra — nessuna riga extra
    expect(container.querySelector('button')).toBeNull()
  })

  it('nome e quantità passano trovaParoleVietate', () => {
    const { container } = render(
      <BarraMateriale
        nome="Zirconia A2"
        quantita="68%"
        percento={68}
        nota="Scorta abbondante"
      />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('EroeTuttoAPosto — card centrata "tutto a posto" (§5.21)', () => {
  it('renderizza il titolo passato dal chiamante', () => {
    render(<EroeTuttoAPosto titolo="Fatture: tutto a posto" righe={['12 fatture inviate']} />)
    expect(screen.getByText('Fatture: tutto a posto')).toBeInTheDocument()
  })

  it('renderizza una riga sola quando righe ha un solo elemento', () => {
    render(<EroeTuttoAPosto titolo="Documenti: tutto a posto" righe={['Nessun DdC in sospeso']} />)
    expect(screen.getByText('Nessun DdC in sospeso')).toBeInTheDocument()
  })

  it('renderizza due righe quando righe ne ha due', () => {
    render(
      <EroeTuttoAPosto
        titolo="Fatture: tutto a posto"
        righe={['12 fatture inviate questo mese', '€3.240 incassati']}
      />
    )
    expect(screen.getByText('12 fatture inviate questo mese')).toBeInTheDocument()
    expect(screen.getByText('€3.240 incassati')).toBeInTheDocument()
  })

  it('il check verde Ø 54 è nel DOM (decorativo, il titolo porta già il significato)', () => {
    const { container } = render(
      <EroeTuttoAPosto titolo="Fatture: tutto a posto" righe={['12 fatture inviate']} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    const cerchio = svg?.parentElement as HTMLElement
    expect(cerchio.style.width).toBe('54px')
    expect(cerchio.style.height).toBe('54px')
    expect(cerchio.style.background).toBe('var(--green-tint)')
  })

  it('titolo e righe passano trovaParoleVietate', () => {
    const { container } = render(
      <EroeTuttoAPosto
        titolo="Fatture: tutto a posto"
        righe={['12 fatture inviate questo mese', '€3.240 incassati']}
      />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('CardUAHaFatto — resoconto automazioni (§5.22)', () => {
  it('rende il titolo caption di legge esatto', () => {
    render(<CardUAHaFatto voci={[{ nome: 'DdC firmato e archiviato' }]} />)
    expect(screen.getByText('UÀ HA GIÀ FATTO PER TE')).toBeInTheDocument()
  })

  it('renderizza ogni voce con nome', () => {
    render(
      <CardUAHaFatto
        voci={[
          { nome: 'DdC firmato e archiviato' },
          { nome: 'Fattura inviata ✓' },
          { nome: 'WhatsApp inviato al paziente' },
        ]}
      />
    )
    expect(screen.getByText('DdC firmato e archiviato')).toBeInTheDocument()
    expect(screen.getByText('Fattura inviata ✓')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp inviato al paziente')).toBeInTheDocument()
  })

  it('renderizza sub opzionale sotto il nome', () => {
    render(<CardUAHaFatto voci={[{ nome: 'DdC firmato', sub: 'n.147 · Studio Bianchi' }]} />)
    expect(screen.getByText('n.147 · Studio Bianchi')).toBeInTheDocument()
  })

  it('ogni voce mostra un check verde (Ø 30, sempre fatto)', () => {
    const { container } = render(
      <CardUAHaFatto voci={[{ nome: 'A' }, { nome: 'B' }]} />
    )
    expect(container.querySelectorAll('svg').length).toBe(2)
    expect(screen.getAllByLabelText('Fatta').length).toBe(2)
  })

  it('titolo e voci passano trovaParoleVietate', () => {
    const { container } = render(
      <CardUAHaFatto voci={[{ nome: 'DdC firmato e archiviato', sub: 'n.147' }]} />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('NotaDentista — citazione del dentista (§5.23)', () => {
  it('renderizza la citazione tra virgolette e il dottore', () => {
    render(<NotaDentista citazione="Il colore deve essere più chiaro" dottore="Dr. Ferraro" />)
    expect(screen.getByText('"Il colore deve essere più chiaro" — Dr. Ferraro')).toBeInTheDocument()
  })

  it('senza onEspandi è di sola lettura, nessun ruolo button', () => {
    render(<NotaDentista citazione="Nota" dottore="Dr. Ferraro" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('con onEspandi diventa tappabile', () => {
    render(<NotaDentista citazione="Nota" dottore="Dr. Ferraro" onEspandi={() => {}} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('tap → onEspandi chiamato + vibra("selection"), MAI suona (selezione silenziosa)', () => {
    const onEspandi = vi.fn()
    render(<NotaDentista citazione="Nota" dottore="Dr. Ferraro" onEspandi={onEspandi} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onEspandi).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('quando tappabile ha hit area ≥ 44px (constraint 10)', () => {
    render(<NotaDentista citazione="Nota" dottore="Dr. Ferraro" onEspandi={() => {}} />)
    expect(screen.getByRole('button').style.minHeight).toBe('44px')
  })

  it('il testo è limitato a 2 righe (line-clamp CSS)', () => {
    render(<NotaDentista citazione="Nota lunga" dottore="Dr. Ferraro" />)
    const testo = screen.getByText('"Nota lunga" — Dr. Ferraro')
    expect(testo.style.webkitLineClamp).toBe('2')
    expect(testo.style.overflow).toBe('hidden')
  })

  it('la barra verticale 3.5px --blue è nel DOM', () => {
    const { container } = render(<NotaDentista citazione="Nota" dottore="Dr. Ferraro" />)
    const barra = Array.from(container.querySelectorAll('span')).find(
      (el) => el.style.width === '3.5px'
    )
    expect(barra?.style.background).toBe('var(--blue)')
  })

  it('citazione e dottore passano trovaParoleVietate', () => {
    const { container } = render(
      <NotaDentista citazione="Il colore deve essere più chiaro" dottore="Dr. Ferraro" />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('GiornoAgenda — card giorno (§5.19)', () => {
  it('renderizza etichetta e children', () => {
    render(
      <GiornoAgenda etichetta="OGGI">
        <span>contenuto</span>
      </GiornoAgenda>
    )
    expect(screen.getByText('OGGI')).toBeInTheDocument()
    expect(screen.getByText('contenuto')).toBeInTheDocument()
  })

  it('oggi → intestazione rossa', () => {
    render(
      <GiornoAgenda etichetta="OGGI" oggi>
        <span>x</span>
      </GiornoAgenda>
    )
    expect(screen.getByText('OGGI').style.color).toBe('var(--red)')
  })

  it('senza oggi → intestazione --ink', () => {
    render(
      <GiornoAgenda etichetta="LUNEDÌ">
        <span>x</span>
      </GiornoAgenda>
    )
    expect(screen.getByText('LUNEDÌ').style.color).toBe('var(--ink)')
  })

  it('oggi → ring inset 2.5 --red single-value sulla card, ombra ambiente sul wrapper (mai none in lista)', () => {
    const { container } = render(
      <GiornoAgenda etichetta="OGGI" oggi>
        <span>x</span>
      </GiornoAgenda>
    )
    // Pattern TastoPrimario/LePile: in dark `--sh-card` risolve a `none`, e
    // `none` dentro una lista box-shadow invalida TUTTA la dichiarazione.
    // Quindi: ambiente da solo sul wrapper, ring da solo sulla card.
    const wrapper = container.firstElementChild as HTMLElement
    const card = wrapper.firstElementChild as HTMLElement
    expect(wrapper.style.boxShadow).toBe('var(--sh-card)')
    expect(card.style.boxShadow).toBe('inset 0 0 0 2.5px var(--red)')
    expect(card.style.boxShadow).not.toContain(',')
  })

  it('senza oggi la card non ha bordo inset rosso (solo ambiente sul wrapper)', () => {
    const { container } = render(
      <GiornoAgenda etichetta="LUNEDÌ">
        <span>x</span>
      </GiornoAgenda>
    )
    const wrapper = container.firstElementChild as HTMLElement
    const card = wrapper.firstElementChild as HTMLElement
    expect(wrapper.style.boxShadow).toBe('var(--sh-card)')
    expect(card.style.boxShadow).not.toContain('inset')
  })

  it('etichetta passa trovaParoleVietate', () => {
    render(
      <GiornoAgenda etichetta="OGGI">
        <span>x</span>
      </GiornoAgenda>
    )
    expect(trovaParoleVietate('OGGI')).toEqual([])
  })
})

describe('RigaAgenda — una voce dell\'agenda (§5.19)', () => {
  it('renderizza orario, cosa e sub', () => {
    render(<RigaAgenda orario="09:00" cosa="Consegna corona" sub="Studio Bianchi" tipo="CONSEGNA" />)
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('Consegna corona')).toBeInTheDocument()
    expect(screen.getByText('Studio Bianchi')).toBeInTheDocument()
  })

  it('senza sub non renderizza una sotto-riga vuota', () => {
    render(<RigaAgenda orario="09:00" cosa="Consegna corona" tipo="CONSEGNA" />)
    expect(screen.queryByText('undefined')).toBeNull()
  })

  it('orario è tabulare con min-width 56', () => {
    render(<RigaAgenda orario="09:00" cosa="Consegna corona" tipo="CONSEGNA" />)
    const orario = screen.getByText('09:00')
    expect(orario.style.fontVariantNumeric).toBe('tabular-nums')
    expect(orario.style.minWidth).toBe('56px')
  })

  it('CONSEGNA → PillTipo famiglia red', () => {
    render(<RigaAgenda orario="09:00" cosa="Consegna corona" tipo="CONSEGNA" />)
    const pill = screen.getByText('CONSEGNA')
    expect(pill.style.color).toBe('var(--red)')
    expect(pill.style.background).toBe('var(--red-tint)')
  })

  it('RITIRO → PillTipo famiglia blue', () => {
    render(<RigaAgenda orario="14:30" cosa="Ritiro impronte" tipo="RITIRO" />)
    const pill = screen.getByText('RITIRO')
    expect(pill.style.color).toBe('var(--blue)')
    expect(pill.style.background).toBe('var(--blue-tint)')
  })

  it('senza onClick è di sola lettura, non è un button', () => {
    render(<RigaAgenda orario="09:00" cosa="Consegna corona" tipo="CONSEGNA" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('con onClick diventa tappabile con hit area ≥ 44px', () => {
    render(<RigaAgenda orario="09:00" cosa="Consegna corona" tipo="CONSEGNA" onClick={() => {}} />)
    const bottone = screen.getByRole('button')
    expect(bottone).toBeInTheDocument()
    expect(bottone.style.minHeight).toBe('44px')
  })

  it('click → onClick chiamato + vibra("selection"), MAI suona', () => {
    const onClick = vi.fn()
    render(<RigaAgenda orario="09:00" cosa="Consegna corona" tipo="CONSEGNA" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('cosa e sub passano trovaParoleVietate', () => {
    const { container } = render(
      <RigaAgenda orario="09:00" cosa="Consegna corona" sub="Studio Bianchi" tipo="CONSEGNA" />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })

  it('la PillTipo non copre mai il testo (QA visivo T15 round 2, 390px): colonna con pavimento min-content, riga a capo consentito, pill mai compressa e a destra — in entrambe le varianti', () => {
    // Bug trovato in QA visiva: a 390px la colonna testo (flex 1 + minWidth 0)
    // veniva schiacciata sotto il min-content delle sue parole (misurato: 15px
    // su una riga di 220px), il testo traboccava dal proprio box e finiva
    // SOTTO la pill («Studio» coperto da CONSEGNA). Stessa classe di difetto
    // della CardLavoro (contenuti incomprimibili in un contesto stretto).
    for (const onClick of [undefined, () => {}]) {
      const { unmount } = render(
        <RigaAgenda
          orario="09:00"
          cosa="Consegna corona ceramica"
          sub="Studio Bianchi · n.147"
          tipo="CONSEGNA"
          onClick={onClick}
        />
      )
      // Pill mai compressa, ancorata a destra anche quando scende a capo.
      const pill = screen.getByText('CONSEGNA')
      expect(pill.style.flexShrink).toBe('0')
      expect(pill.style.marginLeft).toBe('auto')
      // La colonna testo non scende mai sotto il min-content delle sue parole:
      // il testo resta dentro il proprio box, quindi niente overlap possibile.
      const colonna = screen.getByText('Consegna corona ceramica').parentElement as HTMLElement
      expect(colonna.style.minWidth).toBe('min-content')
      // La riga può andare a capo quando orario + testo + pill non ci stanno.
      const riga = pill.parentElement as HTMLElement
      expect(riga.style.flexWrap).toBe('wrap')
      // Anatomia §5.19 intatta: orario tabulare min-width 56, mai compresso.
      const orario = screen.getByText('09:00')
      expect(orario.style.minWidth).toBe('56px')
      expect(orario.style.flexShrink).toBe('0')
      unmount()
    }
  })
})

describe('catalogo DS v3 — sezione «Il racconto»', () => {
  it('mostra la sezione con titolo dedicato', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('heading', { name: 'Il racconto' })).toBeInTheDocument()
  })

  it('mostra le 3 BarreMateriale (una per livello) con RIORDINA sulla rossa', () => {
    return import('../../../../src/app/ds-v3-catalogo/page').then(({ default: CatalogoPage }) => {
      render(<CatalogoPage />)
      expect(screen.getByRole('button', { name: /RIORDINA/ })).toBeInTheDocument()
    })
  })

  it('mostra EroeTuttoAPosto con "Fatture: tutto a posto"', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByText('Fatture: tutto a posto')).toBeInTheDocument()
  })

  it('mostra CardUAHaFatto con 3 voci', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByText('UÀ HA GIÀ FATTO PER TE')).toBeInTheDocument()
  })

  it('mostra NotaDentista', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getAllByText(/Dr\./).length).toBeGreaterThan(0)
  })

  it('mostra GiornoAgenda OGGI con 2 RigheAgenda (CONSEGNA e RITIRO)', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getAllByText('OGGI').length).toBeGreaterThan(0)
    // "CONSEGNA" compare anche come testo di TastoConsegnaInline (§5.8, sezione
    // CardLavoro): qui verifichiamo specificamente la PillTipo (uno <span>,
    // non un <button>) di RigaAgenda.
    const pillConsegna = screen
      .getAllByText('CONSEGNA')
      .find((el) => el.tagName === 'SPAN')
    expect(pillConsegna).toBeInTheDocument()
    expect(screen.getByText('RITIRO')).toBeInTheDocument()
  })

  it('tutti i testi statici del catalogo (inclusa la sezione «Il racconto») passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })
})
