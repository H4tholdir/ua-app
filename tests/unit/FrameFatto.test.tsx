import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { FrameFatto } from '@/components/features/wizard/FrameFatto'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

// 10 luglio 2026 è venerdì — «oggi» iniettato per determinismo (stesso schema
// di CampoData.test.tsx, `oggi` prop). Domani = 11 luglio. La consegna
// suggerita (16 luglio, giovedì) resta un giorno distinto da oggi/domani,
// quindi la chip «suggerita» compare (nessuna deduplicazione, a differenza
// del caso Lun-coincide-con-Domani di CampoData).
const OGGI = new Date(2026, 6, 10)
const DATA_CONSEGNA = new Date(2026, 6, 16) // giovedì 16 luglio 2026 — VERBATIM mockup wizard.html:434

const LAVORO = { id: 'lav-1', numero_lavoro: '2026/0001' }

function props(overrides: Partial<Parameters<typeof FrameFatto>[0]> = {}) {
  return {
    lavoro: LAVORO,
    accessoriFalliti: [] as Array<'dettagli' | 'foto'>,
    dentista: 'Dr. Esposito',
    lavoroLabel: 'Corona zirconia',
    pz: 'PZ-0436',
    giorni: 6,
    daStoria: true,
    dataConsegna: DATA_CONSEGNA,
    oggi: OGGI,
    onTornaHome: vi.fn(),
    ...overrides,
  }
}

function renderFatto(overrides: Partial<Parameters<typeof FrameFatto>[0]> = {}) {
  return render(
    <AvvisiProvider>
      <FrameFatto {...props(overrides)} />
    </AvvisiProvider>
  )
}

beforeEach(() => {
  suonaMock.mockClear()
  vibraMock.mockClear()
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('FrameFatto — check + titolo + sub (§7.3)', () => {
  it('check Ø92 tint verde (aria-hidden)', () => {
    const { container } = renderFatto()
    const check = container.querySelector('.ds-fatto-check')
    expect(check).not.toBeNull()
    expect(check).toHaveStyle({ width: '92px', height: '92px', background: 'var(--green-tint)' })
    expect(check).toHaveAttribute('aria-hidden', 'true')
  })

  it('titolo "Fatto!" + sub VERBATIM', () => {
    renderFatto()
    expect(screen.getByText('Fatto!')).toBeInTheDocument()
    expect(
      screen.getByText('Il lavoro è nato. Lo trovi fra gli «Appena arrivati», da confermare.')
    ).toBeInTheDocument()
  })

  it('al mount: suona("fatta") + vibra("success") UNA sola volta', () => {
    renderFatto()
    expect(suonaMock).toHaveBeenCalledWith('fatta')
    expect(suonaMock).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('success')
    expect(vibraMock).toHaveBeenCalledTimes(1)
  })
})

describe('FrameFatto — card "IL LAVORO"', () => {
  it('RigaDato Dentista/Lavoro/Paziente coi valori dallo stato', () => {
    renderFatto()
    expect(screen.getByText('Dentista')).toBeInTheDocument()
    expect(screen.getByText('Dr. Esposito')).toBeInTheDocument()
    expect(screen.getByText('Lavoro')).toBeInTheDocument()
    expect(screen.getByText('Corona zirconia')).toBeInTheDocument()
    expect(screen.getByText('Paziente')).toBeInTheDocument()
    expect(screen.getByText('PZ-0436')).toBeInTheDocument()
  })
})

describe('FrameFatto — card "CONSEGNA SUGGERITA"', () => {
  it('daStoria:true → "Pronta per <giorno esteso> — di solito ci mettete N giorni." (VERBATIM mockup)', () => {
    renderFatto({ giorni: 6, daStoria: true })
    expect(
      screen.getByText((_, el) => el?.textContent === 'Pronta per giovedì 16 luglio — di solito ci mettete 6 giorni.')
    ).toBeInTheDocument()
  })

  it('daStoria:false → fallback "… — tempo tipico per questo lavoro: N giorni."', () => {
    renderFatto({ giorni: 5, daStoria: false })
    expect(
      screen.getByText((_, el) => el?.textContent === 'Pronta per giovedì 16 luglio — tempo tipico per questo lavoro: 5 giorni.')
    ).toBeInTheDocument()
  })

  it('"Cambia data" apre il CambiaDataSheet (dialog "Cambia data")', async () => {
    renderFatto()
    const user = userEvent.setup()
    expect(screen.queryByRole('dialog', { name: 'Cambia data' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cambia data' }))
    expect(screen.getByRole('dialog', { name: 'Cambia data' })).toBeInTheDocument()
  })

  it('conferma "Domani" nel sheet → PATCH /api/lavori/[id] {data_consegna_prevista} → la frase si aggiorna', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ lavoro: { id: 'lav-1' } }) })

    renderFatto()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Cambia data' }))
    const dialog = screen.getByRole('dialog', { name: 'Cambia data' })
    await user.click(within(dialog).getByRole('button', { name: 'Domani' }))
    await user.click(within(dialog).getByRole('button', { name: 'Conferma' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cambia data' })).not.toBeInTheDocument())

    expect(m).toHaveBeenCalledWith(
      '/api/lavori/lav-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ data_consegna_prevista: '2026-07-11' }),
      })
    )
    expect(
      screen.getByText((_, el) => el?.textContent === 'Pronta per sabato 11 luglio — di solito ci mettete 6 giorni.')
    ).toBeInTheDocument()
  })

  it('PATCH fallisce → useAvvisi().errore, la frase resta quella suggerita', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })

    renderFatto()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Cambia data' }))
    const dialog = screen.getByRole('dialog', { name: 'Cambia data' })
    await user.click(within(dialog).getByRole('button', { name: 'Domani' }))
    await user.click(within(dialog).getByRole('button', { name: 'Conferma' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText((_, el) => el?.textContent === 'Pronta per giovedì 16 luglio — di solito ci mettete 6 giorni.')
    ).toBeInTheDocument()
  })
})

describe('FrameFatto — CTA foto (TastoPrimario, unico rosso del frame)', () => {
  it('"Fotografa impronta e prescrizione" presente come TastoPrimario', () => {
    renderFatto()
    expect(screen.getByRole('button', { name: 'Fotografa impronta e prescrizione' })).toBeInTheDocument()
  })

  it('selezionare un file → POST /api/lavori/[id]/immagini FormData{file, descrizione:"prescrizione"} → avviso "Foto salvata ✓", resta sul Fatto', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ immagine: { id: 'img-1' } }) })

    renderFatto()
    const user = userEvent.setup()
    const file = new File(['x'], 'presc.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/Carica la foto/i) as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => expect(m).toHaveBeenCalledTimes(1))
    const [url, opt] = m.mock.calls[0]
    expect(url).toBe('/api/lavori/lav-1/immagini')
    expect(opt.method).toBe('POST')
    const fd = opt.body as FormData
    expect(fd.get('file')).toBe(file)
    expect(fd.get('descrizione')).toBe('prescrizione')

    expect(await screen.findByText('Foto salvata ✓')).toBeInTheDocument()
    // Ripetibile: il frame resta il Fatto (titolo ancora presente).
    expect(screen.getByText('Fatto!')).toBeInTheDocument()
  })

  it('upload fallisce → useAvvisi().errore, resta sul Fatto', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })

    renderFatto()
    const user = userEvent.setup()
    const file = new File(['x'], 'presc.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/Carica la foto/i) as HTMLInputElement
    await user.upload(input, file)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Fatto!')).toBeInTheDocument()
  })
})

describe('FrameFatto — accessoriFalliti (fail-soft)', () => {
  it('vuoto → nessun avviso errore al mount', () => {
    renderFatto({ accessoriFalliti: [] })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('non vuoto → useAvvisi().errore al mount con copy dedicata', async () => {
    renderFatto({ accessoriFalliti: ['dettagli'] })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Non sono riuscita a salvare/)).toBeInTheDocument()
    expect(screen.getByText(/Li aggiungi dalla scheda\./)).toBeInTheDocument()
  })
})

describe('FrameFatto — "Torna alla home"', () => {
  it('LinkQuieto "Torna alla home" chiama onTornaHome', async () => {
    const onTornaHome = vi.fn()
    renderFatto({ onTornaHome })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Torna alla home' }))
    expect(onTornaHome).toHaveBeenCalledTimes(1)
  })
})
