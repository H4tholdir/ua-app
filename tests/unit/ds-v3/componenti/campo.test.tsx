// Budget 15s per il render dell'intera pagina catalogo: vedi il commento nell'helper.
import '../budget-catalogo'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

// Il catalogo (page.tsx) monta ora anche NavDesk (§5.37), che chiama
// useRouter() per «+ Nuovo lavoro»: senza mock, il render fuori da un vero
// App Router lancia "invariant expected app router to be mounted" e fa
// cadere l'intero albero. Stesso pattern di NavDesk.test.tsx.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const vibraMock = vi.fn()
const suonaMock = vi.fn()
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))

import { CampoTesto, CampoNumero, CampoData, CampoTestoLungo, prossimoLunedi } from '@/components/ds/Campo'

describe('CampoTesto — input testo libero (§5.27)', () => {
  beforeEach(() => {
    vibraMock.mockClear()
    suonaMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza la label MAIUSCOLA (text-transform uppercase)', () => {
    render(<CampoTesto label="Nome paziente" valore="" onCambia={() => {}} />)
    const label = screen.getByText('Nome paziente')
    expect(label.style.textTransform).toBe('uppercase')
  })

  it('renderizza il valore corrente nell\'input', () => {
    render(<CampoTesto label="Nome paziente" valore="Mario" onCambia={() => {}} />)
    expect(screen.getByDisplayValue('Mario')).toBeInTheDocument()
  })

  it('onCambia viene chiamato con il nuovo valore alla digitazione', () => {
    const onCambia = vi.fn()
    render(<CampoTesto label="Nome paziente" valore="" onCambia={onCambia} />)
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'Luigi' } })
    expect(onCambia).toHaveBeenCalledWith('Luigi')
  })

  it('supporta placeholder e autoFocus', () => {
    render(<CampoTesto label="Nome paziente" valore="" onCambia={() => {}} placeholder="Es. Mario Rossi" autoFocus />)
    const input = screen.getByPlaceholderText('Es. Mario Rossi')
    expect(input).toHaveFocus()
  })

  it('anello di focus 2px --blue su :focus (non solo :focus-visible)', () => {
    const { container } = render(<CampoTesto label="Nome paziente" valore="" onCambia={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toMatch(/:focus\s*\{/)
    expect(regola).not.toContain(':focus-visible')
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('il testo (label) passa trovaParoleVietate', () => {
    expect(trovaParoleVietate('Nome paziente')).toEqual([])
  })
})

describe('CampoNumero — input numerico con tastierino nativo (§5.27)', () => {
  beforeEach(() => {
    vibraMock.mockClear()
    suonaMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza la label MAIUSCOLA', () => {
    render(<CampoNumero label="Importo" valore="" onCambia={() => {}} />)
    const label = screen.getByText('Importo')
    expect(label.style.textTransform).toBe('uppercase')
  })

  it('ha inputMode="decimal" — tastierino nativo', () => {
    render(<CampoNumero label="Importo" valore="" onCambia={() => {}} />)
    const input = screen.getByDisplayValue('')
    expect(input).toHaveAttribute('inputmode', 'decimal')
  })

  it('onCambia viene chiamato con il nuovo valore alla digitazione', () => {
    const onCambia = vi.fn()
    render(<CampoNumero label="Importo" valore="" onCambia={onCambia} />)
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: '120' } })
    expect(onCambia).toHaveBeenCalledWith('120')
  })

  it('renderizza il suffisso dentro il campo, a destra, quando passato', () => {
    render(<CampoNumero label="Importo" valore="120" onCambia={() => {}} suffisso="€" />)
    expect(screen.getByText('€')).toBeInTheDocument()
  })

  it('senza suffisso non renderizza nulla in più', () => {
    const { container } = render(<CampoNumero label="Importo" valore="120" onCambia={() => {}} />)
    expect(container.querySelector('[data-ds-suffisso]')).toBeNull()
  })

  it('anello di focus 2px --blue su :focus', () => {
    const { container } = render(<CampoNumero label="Importo" valore="" onCambia={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toMatch(/:focus\s*\{/)
    expect(regola).not.toContain(':focus-visible')
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('il testo (label) passa trovaParoleVietate', () => {
    expect(trovaParoleVietate('Importo')).toEqual([])
  })
})

describe('CampoData — scelte rapide, mai calendario a griglia (§5.27)', () => {
  beforeEach(() => {
    vibraMock.mockClear()
    suonaMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const OGGI_MARTEDI = new Date(2026, 6, 7) // 7 luglio 2026 è martedì

  it('renderizza la label MAIUSCOLA', () => {
    render(<CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />)
    const label = screen.getByText('Consegna')
    expect(label.style.textTransform).toBe('uppercase')
  })

  it('mostra le pill Oggi, Domani, Lun <n> e Scegli…', () => {
    render(<CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />)
    expect(screen.getByRole('button', { name: /^Oggi$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Domani$/ })).toBeInTheDocument()
    // martedì 7 luglio 2026 → prossimo lunedì = 13 luglio 2026
    expect(screen.getByRole('button', { name: /Lun 13/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Scegli…/ })).toBeInTheDocument()
  })

  it('il gruppo di pill è associato alla label via role="group" + aria-labelledby (a11y)', () => {
    render(<CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />)
    expect(screen.getByRole('group', { name: 'Consegna' })).toBeInTheDocument()
  })

  it('nessuna griglia calendario nel default: nessun input[type=date] montato', () => {
    const { container } = render(
      <CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />
    )
    expect(container.querySelector('input[type="date"]')).toBeNull()
    expect(container.querySelector('table')).toBeNull()
  })

  it('«Oggi» chiama onCambia con la data di oggi (iniettata) + vibra("selection"), no suono', () => {
    const onCambia = vi.fn()
    render(<CampoData label="Consegna" valore={null} onCambia={onCambia} oggi={OGGI_MARTEDI} />)
    fireEvent.click(screen.getByRole('button', { name: /^Oggi$/ }))
    expect(onCambia).toHaveBeenCalledTimes(1)
    const passata: Date = onCambia.mock.calls[0][0]
    expect(passata.getFullYear()).toBe(2026)
    expect(passata.getMonth()).toBe(6)
    expect(passata.getDate()).toBe(7)
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('«Domani» chiama onCambia con oggi + 1 giorno', () => {
    const onCambia = vi.fn()
    render(<CampoData label="Consegna" valore={null} onCambia={onCambia} oggi={OGGI_MARTEDI} />)
    fireEvent.click(screen.getByRole('button', { name: /^Domani$/ }))
    const passata: Date = onCambia.mock.calls[0][0]
    expect(passata.getFullYear()).toBe(2026)
    expect(passata.getMonth()).toBe(6)
    expect(passata.getDate()).toBe(8)
  })

  it('«Domani» attraversa il confine di fine anno: 31 dicembre → 1 gennaio', () => {
    const onCambia = vi.fn()
    const oggiFineAnno = new Date(2026, 11, 31)
    render(<CampoData label="Consegna" valore={null} onCambia={onCambia} oggi={oggiFineAnno} />)
    fireEvent.click(screen.getByRole('button', { name: /^Domani$/ }))
    const passata: Date = onCambia.mock.calls[0][0]
    expect(passata.getFullYear()).toBe(2027)
    expect(passata.getMonth()).toBe(0)
    expect(passata.getDate()).toBe(1)
  })

  it('terza pill = lunedì successivo, formattato in italiano breve («Lun 13»)', () => {
    render(<CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />)
    expect(screen.getByRole('button', { name: 'Lun 13' })).toBeInTheDocument()
  })

  it('«Lun» chiama onCambia con il lunedì successivo corretto', () => {
    const onCambia = vi.fn()
    render(<CampoData label="Consegna" valore={null} onCambia={onCambia} oggi={OGGI_MARTEDI} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lun 13' }))
    const passata: Date = onCambia.mock.calls[0][0]
    expect(passata.getFullYear()).toBe(2026)
    expect(passata.getMonth()).toBe(6)
    expect(passata.getDate()).toBe(13)
  })

  it('prossimoLunedi (funzione pura): quando oggi è domenica, il prossimo lunedì è domani (+1 giorno)', () => {
    const domenica = new Date(2026, 6, 5) // 5 luglio 2026 è domenica
    const risultato = prossimoLunedi(domenica)
    expect(risultato.getFullYear()).toBe(2026)
    expect(risultato.getMonth()).toBe(6)
    expect(risultato.getDate()).toBe(6)
  })

  it('quando oggi è domenica, «Domani» e il lunedì successivo coincidono → la pill del giorno feriale NON viene renderizzata (mai due pill per lo stesso giorno)', () => {
    const onCambia = vi.fn()
    const domenica = new Date(2026, 6, 5) // 5 luglio 2026 è domenica
    render(<CampoData label="Consegna" valore={null} onCambia={onCambia} oggi={domenica} />)
    // Niente pill «Lun n»: coinciderebbe esattamente con «Domani» (stesso giorno, 6 luglio)
    expect(screen.queryByRole('button', { name: /^Lun\s/ })).toBeNull()
    // Restano solo Oggi · Domani · Scegli…
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: /^Oggi$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Domani$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Scegli…/ })).toBeInTheDocument()
    // «Domani» resta cliccabile e porta comunque al 6 luglio
    fireEvent.click(screen.getByRole('button', { name: /^Domani$/ }))
    const passata: Date = onCambia.mock.calls[0][0]
    expect(passata.getDate()).toBe(6)
  })

  it('quando oggi è già lunedì, la pill mostra il lunedì successivo (+7 giorni), mai oggi stesso', () => {
    const lunedi = new Date(2026, 6, 6) // 6 luglio 2026 è lunedì
    render(<CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={lunedi} />)
    // +7 giorni da lunedì 6 luglio → lunedì 13 luglio
    expect(screen.getByRole('button', { name: 'Lun 13' })).toBeInTheDocument()
  })

  it('attraversa il confine di mese/anno per il calcolo del lunedì successivo', () => {
    const oggiFineAnno = new Date(2026, 11, 30) // 30 dicembre 2026 è mercoledì
    render(<CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={oggiFineAnno} />)
    // prossimo lunedì dopo mercoledì 30/12/2026 → lunedì 4 gennaio 2027
    expect(screen.getByRole('button', { name: 'Lun 4' })).toBeInTheDocument()
  })

  it('la pill selezionata ha tint verde E un indicatore non-solo-colore (check SVG e/o aria-pressed) — anatomia ChipScelta §5.31', () => {
    const oggiInizio = new Date(2026, 6, 7)
    render(<CampoData label="Consegna" valore={oggiInizio} onCambia={() => {}} oggi={OGGI_MARTEDI} />)
    const pillOggi = screen.getByRole('button', { name: /Oggi/ })
    expect(pillOggi).toHaveAttribute('aria-pressed', 'true')
    // L3: colore + segno + posizione — ChipScelta porta il check come SVG (stroke 3,
    // aria-hidden), non più un glifo ✓ testuale: aggiornato il selettore, non il
    // comportamento (il segnale non-solo-colore resta, decisione W2).
    expect(pillOggi.querySelector('svg')).not.toBeNull()
  })

  it('le pill non selezionate hanno aria-pressed="false"', () => {
    const oggiInizio = new Date(2026, 6, 7)
    render(<CampoData label="Consegna" valore={oggiInizio} onCambia={() => {}} oggi={OGGI_MARTEDI} />)
    const pillDomani = screen.getByRole('button', { name: /^Domani$/ })
    expect(pillDomani).toHaveAttribute('aria-pressed', 'false')
  })

  it('«Scegli…» apre un input[type=date] nativo', () => {
    const { container } = render(
      <CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />
    )
    fireEvent.click(screen.getByRole('button', { name: /Scegli…/ }))
    expect(container.querySelector('input[type="date"]')).not.toBeNull()
  })

  it('tap su «Scegli…» vibra("selection") UNA sola volta — anatomia ChipScelta §5.31 (deviazione W2 intenzionale: prima del refactor questa pill non vibrava)', () => {
    render(<CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />)
    fireEvent.click(screen.getByRole('button', { name: /Scegli…/ }))
    // Decisione W2 (round 1 review): un solo posto per l'anatomia della chip,
    // vibra('selection') inclusa — «Scegli…» ora vibra come ogni altra
    // ChipScelta. toHaveBeenCalledTimes(1) blinda anche il non-doppio-vibra:
    // CampoData non deve aggiungere una propria vibrazione sopra quella della chip.
    expect(vibraMock).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('anche le scelte rapide (es. «Oggi») vibrano UNA sola volta — mai doppio vibra chip+campo', () => {
    render(<CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />)
    fireEvent.click(screen.getByRole('button', { name: /^Oggi$/ }))
    expect(vibraMock).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('selection')
  })

  it('la scelta dal date-picker nativo chiama onCambia con la data scelta + vibra("selection")', () => {
    const onCambia = vi.fn()
    const { container } = render(
      <CampoData label="Consegna" valore={null} onCambia={onCambia} oggi={OGGI_MARTEDI} />
    )
    fireEvent.click(screen.getByRole('button', { name: /Scegli…/ }))
    const inputData = container.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(inputData, { target: { value: '2026-08-20' } })
    expect(onCambia).toHaveBeenCalledTimes(1)
    const passata: Date = onCambia.mock.calls[0][0]
    expect(passata.getFullYear()).toBe(2026)
    expect(passata.getMonth()).toBe(7)
    expect(passata.getDate()).toBe(20)
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('anello di focus 2px --blue sull\'input[type=date] nativo (:focus, non solo :focus-visible)', () => {
    const { container } = render(
      <CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />
    )
    fireEvent.click(screen.getByRole('button', { name: /Scegli…/ }))
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toMatch(/\.ds-campo-data-input:focus\s*\{/)
    expect(regola).toContain('outline: 2px solid var(--blue)')
  })

  it('le pill (bottoni) usano :focus-visible, non :focus semplice — sono pulsanti, non campi di testo', () => {
    const { container } = render(
      <CampoData label="Consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />
    )
    // Le pill sono ora ChipScelta (§5.31, decisione W2): l'anello focus-visible
    // vive nel <style> scoped del componente, non più in quello di CampoData —
    // selettore aggiornato, comportamento invariato (ancora :focus-visible, non :focus).
    const regole = Array.from(container.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n')
    expect(regole).toMatch(/\.ds-chip-scelta:focus-visible\s*\{/)
  })

  it('il testo (label + pill statiche) passa trovaParoleVietate', () => {
    const { container } = render(
      <CampoData label="Data di consegna" valore={null} onCambia={() => {}} oggi={OGGI_MARTEDI} />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

/**
 * CampoTestoLungo — il PRIMO campo multilinea dell'app (§5.27, variante
 * multilinea, emendamento del 09/08/2026).
 *
 * 🔑 Le prove stanno QUI, accanto a quelle dei fratelli, e non nel foglio che lo
 *    usa per primo: se domani un secondo foglio ne avesse bisogno, è questo file
 *    che dice che cosa può dare per buono.
 */
describe('CampoTestoLungo — il testo che si legge, non la riga (§5.27)', () => {
  it('è una `<textarea>`, non un input a riga singola: un messaggio va a capo', () => {
    render(<CampoTestoLungo label="Il messaggio" valore="una riga" onCambia={() => {}} />)
    const campo = screen.getByLabelText('Il messaggio')
    expect(campo.tagName).toBe('TEXTAREA')
  })

  it('la label è la STESSA dei fratelli: MAIUSCOLA, e legata al campo con htmlFor/id', () => {
    render(<CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} />)
    const label = screen.getByText('Il messaggio')
    expect(label.style.textTransform).toBe('uppercase')
    expect(label.tagName).toBe('LABEL')
    expect(label.getAttribute('for')).toBe(screen.getByLabelText('Il messaggio').id)
  })

  it('onCambia porta il nuovo valore, righe vuote comprese', () => {
    const onCambia = vi.fn()
    render(<CampoTestoLungo label="Il messaggio" valore="" onCambia={onCambia} />)
    fireEvent.change(screen.getByLabelText('Il messaggio'), { target: { value: 'prima\n\nseconda' } })
    expect(onCambia).toHaveBeenCalledWith('prima\n\nseconda')
  })

  it('anello di focus 2px --blue su :focus (come i fratelli, non solo :focus-visible)', () => {
    const { container } = render(<CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('.ds-campo-testo-lungo:focus')
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('🛑 fondo e filo sono quelli delle SUPERFICI DENTRO UN FOGLIO (⚖️ D326 · D329 · D330)', () => {
    render(<CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} />)
    const campo = screen.getByLabelText('Il messaggio')
    expect(campo.style.background).toBe('var(--fondo-superficie)')
    expect(campo.style.border).toBe('1px solid var(--filo-superficie)')
    expect(campo.style.borderRadius).toBe('18px')
  })

  it('🛑 il testo di lettura non scende sotto 17px (§4.1), e respira a 1.45', () => {
    render(<CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} />)
    const campo = screen.getByLabelText('Il messaggio')
    expect(parseFloat(campo.style.fontSize)).toBeGreaterThanOrEqual(17)
    expect(campo.style.lineHeight).toBe('1.45')
  })

  it('l’altezza minima è una MISURA, e chi chiama può portarne una sua', () => {
    const { rerender } = render(<CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} />)
    expect(parseFloat(screen.getByLabelText('Il messaggio').style.minHeight)).toBeGreaterThan(0)
    rerender(<CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} altezzaMinima={120} />)
    expect(screen.getByLabelText('Il messaggio').style.minHeight).toBe('120px')
  })

  it('si allarga solo in verticale: mai oltre il pannello del foglio', () => {
    render(<CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} />)
    expect(screen.getByLabelText('Il messaggio').style.resize).toBe('vertical')
  })

  it('🛑 il tetto lo decide CHI CHIAMA (è il tetto della sua rotta), e senza non c’è tetto', () => {
    const { rerender } = render(<CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} />)
    expect(screen.getByLabelText('Il messaggio')).not.toHaveAttribute('maxlength')
    rerender(<CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} massimo={1000} />)
    expect(screen.getByLabelText('Il messaggio')).toHaveAttribute('maxlength', '1000')
  })

  it('l’aiuto è legato al campo con aria-describedby, come nei fratelli (P31 · D184)', () => {
    render(
      <CampoTestoLungo label="Il messaggio" valore="" onCambia={() => {}} aiuto="Puoi cambiarlo" />
    )
    const campo = screen.getByLabelText('Il messaggio')
    const aiuto = screen.getByText('Puoi cambiarlo')
    expect(campo.getAttribute('aria-describedby')).toBe(aiuto.id)
  })

  it('🛑 di sola lettura: si legge e non si tocca — serve a un testo GIÀ USCITO', () => {
    const onCambia = vi.fn()
    render(<CampoTestoLungo label="Il messaggio" valore="partito" onCambia={onCambia} soloLettura />)
    const campo = screen.getByLabelText('Il messaggio') as HTMLTextAreaElement
    expect(campo.readOnly).toBe(true)
  })

  it('nessuna parola del software nella label né nell’aiuto (L2, §2.3)', () => {
    const { container } = render(
      <CampoTestoLungo
        label="Il messaggio che manderai"
        valore=""
        onCambia={() => {}}
        aiuto="Puoi cambiarlo prima di mandarlo"
      />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('dizionario sui testi del catalogo — sezione Campo', () => {
  it('i testi dimostrativi passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('il catalogo mostra la sezione con i tre Campo dentro uno sheet demo', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByText('Campo', { selector: 'h2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri la scheda nuovo lavoro' })).toBeInTheDocument()
  })
})
