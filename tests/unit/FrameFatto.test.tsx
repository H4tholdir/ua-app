import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { FrameFatto } from '@/components/features/wizard/FrameFatto'
import type { AccessorioFallito } from '@/lib/wizard/crea-lavoro'
// T11-bis: la prova che lega il client al server — si importa la funzione
// VERA della rotta (`route.ts:97-103` la usa per rifiutare con 422), non se
// ne ricopia l'elenco. Regge anche se domani le sei categorie cambiano.
import { isCategoriaFoto } from '@/lib/domain/categorie-foto'

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
    // Task 11: il ramo `'dettagli'` non esiste più — denti e colore nascono
    // dentro la transazione del lavoro e non possono più fallire da soli.
    // Al suo posto `'elementi'`: ciò che la casella «Elemento» conteneva e non
    // era un dente. M2: e `'colore'`, quando il codice digitato non è in
    // catalogo — il lavoro nasce lo stesso, ma adesso lo si dice.
    accessoriFalliti: [] as AccessorioFallito[],
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

  // T11-bis: la rotta pretende `categoria` (`route.ts:97-103`, validata con
  // `isCategoriaFoto`) e rifiuta chi manda ancora `descrizione`. Il tasto
  // fotografa «impronta E prescrizione»: una prescrizione cartacea non è
  // nessuna delle sei categorie cliniche (impronta/pre_lavoro/colore/
  // post_prova/rx), quindi il valore giusto è il ripiego dell'elenco stesso,
  // 'altro' — lo stesso già previsto per il foglio-categoria di TabImmagini
  // quando l'utente esce senza scegliere (D74, `route.ts:88`).
  it('selezionare un file → POST /api/lavori/[id]/immagini FormData{file, categoria:"altro"} (valore che isCategoriaFoto accetta), MAI descrizione → avviso "Foto salvata ✓", resta sul Fatto', async () => {
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
    // La prova che vale: il valore mandato PASSEREBBE isCategoriaFoto sulla
    // rotta vera, non solo che la chiave 'categoria' esista.
    expect(isCategoriaFoto(fd.get('categoria'))).toBe(true)
    expect(fd.get('categoria')).toBe('altro')
    expect(fd.get('descrizione')).toBeNull()

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
    renderFatto({ accessoriFalliti: ['elementi'] })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Non sono riuscita a salvare/)).toBeInTheDocument()
    expect(screen.getByText(/Li aggiungi dalla scheda\./)).toBeInTheDocument()
  })
})

// M2 (revisione pre-merge ondata a) — la frase che l'odontotecnico legge quando
// il colore digitato non è in catalogo. Deve dire due cose: che il colore NON è
// stato registrato, e da dove si rimedia. La forma è quella di casa
// («Non sono riuscita a salvare X. …aggiungi dalla scheda.»), non una terza voce.
//
// Il pronome finale concorda: un elenco di più cose (o «gli elementi», che è già
// plurale) vuole «Li», «il colore» vuole «Lo», «la foto» vuole «La». Senza
// concordanza la frase nuova sarebbe stata «Non sono riuscita a salvare il
// colore. Li aggiungi dalla scheda.» — italiano sbagliato in una schermata che
// l'utente legge di fretta.
describe('FrameFatto — la frase del colore scartato (M2)', () => {
  it('["colore"] → dice cosa manca E cosa fare, al singolare maschile', async () => {
    renderFatto({ accessoriFalliti: ['colore'] })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText('Non sono riuscita a salvare il colore. Lo aggiungi dalla scheda.')
    ).toBeInTheDocument()
  })

  it('["foto"] → femminile singolare: «La aggiungi»', async () => {
    renderFatto({ accessoriFalliti: ['foto'] })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText('Non sono riuscita a salvare la foto. La aggiungi dalla scheda.')
    ).toBeInTheDocument()
  })

  it('["elementi"] → plurale: la frase storica resta identica', async () => {
    renderFatto({ accessoriFalliti: ['elementi'] })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText('Non sono riuscita a salvare gli elementi. Li aggiungi dalla scheda.')
    ).toBeInTheDocument()
  })

  it('["elementi","colore"] → due cose: «e» in mezzo, «Li» alla fine', async () => {
    renderFatto({ accessoriFalliti: ['elementi', 'colore'] })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText('Non sono riuscita a salvare gli elementi e il colore. Li aggiungi dalla scheda.')
    ).toBeInTheDocument()
  })

  it('tutti e tre → virgole e una sola «e», mai «X e Y e Z»', async () => {
    renderFatto({ accessoriFalliti: ['elementi', 'colore', 'foto'] })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Non sono riuscita a salvare gli elementi, il colore e la foto. Li aggiungi dalla scheda.'
      )
    ).toBeInTheDocument()
  })

  it('nessun accessorio fallito → NESSUN avviso (il caso normale)', () => {
    renderFatto({ accessoriFalliti: [] })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
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
