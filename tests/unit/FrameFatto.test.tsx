import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { FrameFatto } from '@/components/features/wizard/FrameFatto'
import type { AccessorioFallito } from '@/lib/wizard/crea-lavoro'
// T11-bis: la prova che lega il client al server — si importa la funzione
// VERA della rotta (`route.ts:97-103` la usa per rifiutare con 422), non se
// ne ricopia l'elenco. Regge anche se le categorie cambiano — e infatti sono cambiate (D91: sette).
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
    // Ondata B ③ / T3 — i due grezzi del Passo 3 che la carta «La prescrizione»
    // racconta. Vuoti nel caso base: la carta mostra allora la sola riga della
    // fonte (0B-9: mai una riga vuota).
    elemento: '',
    colore: '',
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

// ════════════════════════════════════════════════════════════════════════════
// T3 (ondata B ③) — LE DUE CARTE (D224)
// ════════════════════════════════════════════════════════════════════════════

/** Le due carte si nominano dalla loro didascalia: sono `<section>` con
 *  `aria-labelledby`, quindi `role="region"` con un nome accessibile — così un
 *  test che cerca «Colore» dice ANCHE in quale delle due carte lo cerca. */
function carta(nome: 'Il lavoro' | 'La prescrizione') {
  return within(screen.getByRole('region', { name: nome }))
}

describe('T3 — carta «Il lavoro»: «Prescritto da» (vincolo 0B-9)', () => {
  it('richiedenteNome presente → la riga compare, ADIACENTE sotto «Dentista»', () => {
    renderFatto({ richiedenteNome: 'Dr. Colombo Francesco' })
    const c = carta('Il lavoro')
    expect(c.getByText('Prescritto da')).toBeInTheDocument()
    expect(c.getByText('Dr. Colombo Francesco')).toBeInTheDocument()
    // L'adiacenza è il vincolo, non la presenza: le chiavi in ordine.
    const chiavi = c.getAllByText(/^(Dentista|Prescritto da|Lavoro|Paziente|Colore)$/).map((e) => e.textContent)
    expect(chiavi).toEqual(['Dentista', 'Prescritto da', 'Lavoro', 'Paziente'])
  })

  it('richiedenteNome assente → NESSUNA riga «Prescritto da» (mai una riga vuota)', () => {
    renderFatto()
    expect(screen.queryByText('Prescritto da')).not.toBeInTheDocument()
    const chiavi = carta('Il lavoro')
      .getAllByText(/^(Dentista|Prescritto da|Lavoro|Paziente|Colore)$/)
      .map((e) => e.textContent)
    expect(chiavi).toEqual(['Dentista', 'Lavoro', 'Paziente'])
  })

  it('richiedenteNome di soli spazi → riga assente (una riga vuota è comunque vuota)', () => {
    renderFatto({ richiedenteNome: '   ' })
    expect(screen.queryByText('Prescritto da')).not.toBeInTheDocument()
  })
})

describe('T3 — dove atterra il colore (vincolo 0B-2 + D223)', () => {
  it('trascritto (coloreOrigine assente) → riga in «La prescrizione», con pastiglia', () => {
    renderFatto({ colore: 'A3' })
    const p = carta('La prescrizione')
    expect(p.getByText('Colore')).toBeInTheDocument()
    expect(p.getByText('A3')).toBeInTheDocument()
    expect(p.getAllByText('✓ dalla prescrizione').length).toBeGreaterThan(0)
    // E NON nella carta del lavoro.
    expect(carta('Il lavoro').queryByText('Colore')).not.toBeInTheDocument()
  })

  it("trascritto ma fuori catalogo (accessoriFalliti ['colore']) → la riga RESTA: la trascrizione è scritta lo stesso", () => {
    // Provato leggendo il server: `componiSnapshot` (componi-snapshot.ts:41)
    // scrive `contenuto.colore` dal grezzo, `risolviColoreCaso` decide solo il
    // colore di CASO. Le due strade sono indipendenti.
    renderFatto({ colore: 'A3,5', accessoriFalliti: ['colore'] })
    expect(carta('La prescrizione').getByText('A3,5')).toBeInTheDocument()
  })

  it('sganciato (coloreOrigine «lab») → riga in «Il lavoro» SENZA pastiglia', () => {
    renderFatto({ colore: 'A3', coloreOrigine: 'lab' })
    const l = carta('Il lavoro')
    expect(l.getByText('Colore')).toBeInTheDocument()
    expect(l.getByText('A3')).toBeInTheDocument()
    expect(l.queryByText('✓ dalla prescrizione')).not.toBeInTheDocument()
    expect(carta('La prescrizione').queryByText('Colore')).not.toBeInTheDocument()
  })

  it('sganciato E fuori catalogo → NESSUNA riga: non è stato salvato niente, e la carta non lo afferma', () => {
    renderFatto({ colore: 'A3,5', coloreOrigine: 'lab', accessoriFalliti: ['colore'] })
    expect(screen.queryByText('Colore')).not.toBeInTheDocument()
    expect(screen.queryByText('A3,5')).not.toBeInTheDocument()
  })

  it('colore vuoto → nessuna riga da nessuna delle due parti', () => {
    renderFatto({ colore: '' })
    expect(screen.queryByText('Colore')).not.toBeInTheDocument()
  })

  it('colore di soli spazi → nessuna riga (stesso gate di crea-lavoro.ts:343)', () => {
    renderFatto({ colore: '   ' })
    expect(screen.queryByText('Colore')).not.toBeInTheDocument()
  })
})

describe('T3 — carta «La prescrizione»: gli elementi (W20)', () => {
  it('un dente → «dente 26» con la pastiglia di provenienza', () => {
    renderFatto({ elemento: '2.6' })
    const p = carta('La prescrizione')
    expect(p.getByText('Elementi')).toBeInTheDocument()
    expect(p.getByText('dente 26')).toBeInTheDocument()
    expect(p.getAllByText('✓ dalla prescrizione').length).toBeGreaterThan(0)
  })

  it('più denti → plurale e ordine d\'ingresso', () => {
    renderFatto({ elemento: '2.6, 27 31' })
    expect(carta('La prescrizione').getByText('denti 26, 27, 31')).toBeInTheDocument()
  })

  it('casella vuota → nessuna riga «Elementi»', () => {
    renderFatto({ elemento: '' })
    expect(screen.queryByText('Elementi')).not.toBeInTheDocument()
  })

  it('solo roba non riconosciuta → nessuna riga: l’avviso dice già che si è persa', () => {
    renderFatto({ elemento: 'pippo', accessoriFalliti: ['elementi'] })
    expect(screen.queryByText('Elementi')).not.toBeInTheDocument()
    expect(screen.queryByText('pippo')).not.toBeInTheDocument()
  })

  it('metà buoni e metà no → si mostrano SOLO i denti davvero salvati', () => {
    renderFatto({ elemento: '2.6 pippo', accessoriFalliti: ['elementi'] })
    expect(carta('La prescrizione').getByText('dente 26')).toBeInTheDocument()
    expect(screen.queryByText(/pippo/)).not.toBeInTheDocument()
  })
})

describe('T3 — la riga «Foglio del dentista»', () => {
  it('senza fonte → stato AMBRA «Da allegare»', () => {
    renderFatto()
    const p = carta('La prescrizione')
    expect(p.getByText('Foglio del dentista')).toBeInTheDocument()
    expect(p.getByText('Da allegare')).toBeInTheDocument()
    expect(p.queryByText(/Allegata/)).not.toBeInTheDocument()
  })

  it('la riga fonte c’è SEMPRE, anche a carta altrimenti vuota (è la chiusura della carta)', () => {
    renderFatto({ elemento: '', colore: '' })
    expect(screen.getByRole('region', { name: 'La prescrizione' })).toBeInTheDocument()
    expect(screen.getByText('Foglio del dentista')).toBeInTheDocument()
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

describe('FrameFatto — la foto dell’impronta (l’input che era «impronta e prescrizione»)', () => {
  // D97 rivisto da T3 — il tasto prometteva DUE cose («Fotografa impronta e
  // prescrizione») e il dato ne registrava UNA ('prescrizione'). Dall'ondata B
  // ③ la prescrizione ha la sua strada (il foglio a2) e questo input torna a
  // essere quello che dice di essere: l'IMPRONTA. Testo del tasto, etichetta
  // dell'input e `categoria` cambiano INSIEME — erano tre copie della stessa
  // promessa, e due erano nascoste.
  it('selezionare un file → POST /api/lavori/[id]/immagini FormData{file, categoria:"impronta"} (valore che isCategoriaFoto accetta), MAI descrizione → avviso "Foto salvata ✓", resta sul Fatto', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ immagine: { id: 'img-1' } }) })

    renderFatto()
    const user = userEvent.setup()
    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText("Carica la foto dell'impronta") as HTMLInputElement
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
    expect(fd.get('categoria')).toBe('impronta')
    expect(fd.get('descrizione')).toBeNull()

    expect(await screen.findByText('Foto salvata ✓')).toBeInTheDocument()
    // Ripetibile: il frame resta il Fatto (titolo ancora presente).
    expect(screen.getByText('Fatto!')).toBeInTheDocument()
  })

  it('l’input della foto NON è più etichettato «impronta e prescrizione» (la copia nascosta è cambiata con le altre)', () => {
    renderFatto()
    expect(screen.queryByLabelText(/impronta e prescrizione/i)).not.toBeInTheDocument()
  })

  it('upload fallisce → useAvvisi().errore, resta sul Fatto', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })

    renderFatto()
    const user = userEvent.setup()
    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText("Carica la foto dell'impronta") as HTMLInputElement
    await user.upload(input, file)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Fatto!')).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// T3 — IL CTA CHE CAMBIA MESTIERE (+ i link quieti)
// ════════════════════════════════════════════════════════════════════════════

/** Il tasto rosso, chiunque sia in questo momento. */
function primario(): HTMLElement {
  const bottoni = screen.getAllByRole('button')
  const trovato = bottoni.find((b) => b.className.includes('ds-tasto-primario'))
  if (!trovato) throw new Error('nessun TastoPrimario nel frame')
  return trovato
}

describe('T3 — il CTA senza fonte allegata', () => {
  it('il rosso è «Allega la prescrizione»', () => {
    renderFatto()
    expect(primario()).toHaveTextContent('Allega la prescrizione')
    expect(screen.queryByRole('button', { name: 'Fotografa impronta e prescrizione' })).not.toBeInTheDocument()
  })

  it('«Fotografa l’impronta» resta, DECLASSATO a link quieto', () => {
    renderFatto()
    const foto = screen.getByRole('button', { name: "Fotografa l'impronta" })
    expect(foto.className).toContain('ds-link-quieto')
  })

  it('i due link quieti sono IMPILATI (vincolo 0B-3: mai affiancati stretti), azione prima e uscita dopo', () => {
    renderFatto()
    const foto = screen.getByRole('button', { name: "Fotografa l'impronta" })
    const home = screen.getByRole('button', { name: 'Torna alla home' })
    const contenitore = foto.parentElement as HTMLElement
    expect(contenitore).toBe(home.parentElement)
    expect(contenitore).toHaveStyle({ flexDirection: 'column' })
    // Il gap DEVE essere 44px (spazio.xxl), non un valore qualunque: LinkQuieto
    // ottiene l'hit-box di 44px con padding verticale 13px + margin -13px
    // uguale e contrario (si annullano nel layout), quindi fra due hit-box
    // consecutivi l'aria reale è gap - 26px. Con spazio.sm (12) risultava
    // -14px — i due bersagli da 44 si SOVRAPPONGONO e il secondo nel DOM
    // vince il tap; solo spazio.xxl (44) dà i 18px d'aria richiesti.
    expect(contenitore).toHaveStyle({ gap: '44px' })
    // Ordine: prima l'azione, poi l'uscita.
    expect(foto.compareDocumentPosition(home) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('il rosso apre il foglio a2 (dialog «La prescrizione del dentista»)', async () => {
    renderFatto()
    const user = userEvent.setup()
    expect(screen.queryByRole('dialog', { name: 'La prescrizione del dentista' })).not.toBeInTheDocument()
    await user.click(primario())
    expect(screen.getByRole('dialog', { name: 'La prescrizione del dentista' })).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// T3+T9 — IL GIRO INTERO: il foglio riporta la fonte, e la schermata cambia
// ════════════════════════════════════════════════════════════════════════════

/** Risposta finta della rotta immagini (contratto VERO: `{immagine}`, e in
 *  errore `{error}` — è l'ALTRA rotta che parla con `{errore}`). */
function rispostaImmagine(id: string) {
  return { ok: true, status: 201, json: async () => ({ immagine: { id } }) }
}
/** Risposta finta della rotta fonte (contratto VERO: `{fonte}` / `{errore, esito?}`). */
function rispostaFonte(fonte: Record<string, unknown>) {
  return { ok: true, status: 200, json: async () => ({ fonte }) }
}

async function allegaFotoDalFoglio(user: ReturnType<typeof userEvent.setup>) {
  await user.click(primario())
  const dialog = screen.getByRole('dialog', { name: 'La prescrizione del dentista' })
  const input = within(dialog).getByLabelText('Scatta la foto della prescrizione') as HTMLInputElement
  await user.upload(input, new File(['x'], 'presc.jpg', { type: 'image/jpeg' }))
}

describe('T3+T9 — fonte CON immagine: la riga inverdisce e il rosso cambia mestiere', () => {
  it('dopo l’allegato: riga verde «✓ Allegata · foglio a mano» + miniatura, rosso «Fotografa l’impronta»', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce(rispostaImmagine('11111111-2222-3333-4444-555555555555'))
    m.mockResolvedValueOnce(
      rispostaFonte({ fonte_tipo: 'foglio', fonte_immagine_id: '11111111-2222-3333-4444-555555555555', fonte_riferimento: null })
    )

    renderFatto()
    const user = userEvent.setup()
    await allegaFotoDalFoglio(user)

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'La prescrizione del dentista' })).not.toBeInTheDocument()
    )
    const p = carta('La prescrizione')
    expect(p.getByText('✓ Allegata · foglio a mano')).toBeInTheDocument()
    expect(p.queryByText('Da allegare')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'La prescrizione' }).querySelector('.ds-fonte-miniatura')).not.toBeNull()
    expect(primario()).toHaveTextContent("Fotografa l'impronta")
  })

  it('con la fonte allegata resta UN SOLO comando «Fotografa l’impronta» (il quieto sparisce)', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce(rispostaImmagine('11111111-2222-3333-4444-555555555555'))
    m.mockResolvedValueOnce(
      rispostaFonte({ fonte_tipo: 'foglio', fonte_immagine_id: '11111111-2222-3333-4444-555555555555', fonte_riferimento: null })
    )

    renderFatto()
    const user = userEvent.setup()
    await allegaFotoDalFoglio(user)

    await waitFor(() => expect(screen.getAllByRole('button', { name: "Fotografa l'impronta" })).toHaveLength(1))
    expect(screen.getByRole('button', { name: 'Torna alla home' })).toBeInTheDocument()
  })
})

describe('T3 — LA PROMESSA NON INVERDISCE (vincolo 0B-4, MDR)', () => {
  it('riferimento senza immagine → riga AMBRA e il rosso RESTA «Allega la prescrizione»', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce(
      rispostaFonte({ fonte_tipo: 'email', fonte_immagine_id: null, fonte_riferimento: 'email del 4 agosto dal Dr. Rossi' })
    )

    renderFatto()
    const user = userEvent.setup()
    await user.click(primario())
    const dialog = screen.getByRole('dialog', { name: 'La prescrizione del dentista' })
    await user.click(within(dialog).getByText('Non ce l’ho ancora qui'))
    await user.click(within(dialog).getByRole('button', { name: 'Per email' }))
    await user.type(within(dialog).getByLabelText('Da dove arriva?'), 'email del 4 agosto dal Dr. Rossi')
    await user.click(within(dialog).getByRole('button', { name: 'Conferma' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'La prescrizione del dentista' })).not.toBeInTheDocument()
    )
    const p = carta('La prescrizione')
    expect(p.getByText('Da allegare')).toBeInTheDocument()
    expect(p.queryByText(/Allegata/)).not.toBeInTheDocument()
    expect(p.getByText('email del 4 agosto dal Dr. Rossi')).toBeInTheDocument()
    // 🔑 Il vincolo vero: il CTA non si accontenta di una promessa.
    expect(primario()).toHaveTextContent('Allega la prescrizione')
    expect(screen.getByRole('button', { name: "Fotografa l'impronta" }).className).toContain('ds-link-quieto')
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

describe('T3 — il foglio a2 riparte fresco a ogni apertura (contratto della `key`)', () => {
  it('entrato nel passo «Non ce l’ho ancora qui», chiuso e riaperto → le tre voci sono di nuovo lì', async () => {
    renderFatto()
    const user = userEvent.setup()

    await user.click(primario())
    let dialog = screen.getByRole('dialog', { name: 'La prescrizione del dentista' })
    await user.click(within(dialog).getByText('Non ce l’ho ancora qui'))
    expect(within(dialog).queryByText('Scatta una foto')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Chiudi' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'La prescrizione del dentista' })).not.toBeInTheDocument()
    )

    await user.click(primario())
    dialog = screen.getByRole('dialog', { name: 'La prescrizione del dentista' })
    expect(within(dialog).getByText('Scatta una foto')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Per email' })).not.toBeInTheDocument()
  })
})

describe('T3 — le righe condizionali non lasciano buchi nella carta', () => {
  it('carta «Il lavoro» minima: 3 righe → 2 separatori (un ramo falso non conta come riga)', () => {
    renderFatto()
    const regione = screen.getByRole('region', { name: 'Il lavoro' })
    // Il separatore di CardInfo è un div alto 1.5 con fondo `--line`.
    const separatori = Array.from(regione.querySelectorAll('div')).filter(
      (d) => d.style.height === '1.5px' && d.style.background === 'var(--line)'
    )
    expect(separatori).toHaveLength(2)
  })

  it('carta «Il lavoro» piena (5 righe) → 4 separatori', () => {
    renderFatto({ richiedenteNome: 'Dr. Colombo Francesco', colore: 'A3', coloreOrigine: 'lab' })
    const regione = screen.getByRole('region', { name: 'Il lavoro' })
    const separatori = Array.from(regione.querySelectorAll('div')).filter(
      (d) => d.style.height === '1.5px' && d.style.background === 'var(--line)'
    )
    expect(separatori).toHaveLength(4)
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

// D231① (gate L2 del 05/08, rilievo M3-T39-7) — l'avviso non può CONTRADDIRE la
// carta che gli sta sotto. Quando il codice digitato non è in catalogo ma la
// trascrizione è stata scritta lo stesso (le due strade sono indipendenti sul
// server: `componiSnapshot` vs `risolviColoreCaso`), la carta «La prescrizione»
// mostra il colore con la pastiglia «✓ dalla prescrizione» — e la vecchia frase
// diceva «Non sono riuscita a salvare il colore». Delle due una è falsa, e a
// essere falsa era la frase: il colore del LAVORO non si è potuto applicare, la
// trascrizione del foglio c'è.
describe('FrameFatto — la frase del colore non contraddice la carta (D231①)', () => {
  it('trascrizione salva + colore fuori catalogo → dice che il colore è trascritto, non che è perduto', async () => {
    renderFatto({ colore: 'A3,5', accessoriFalliti: ['colore'] })
    const avviso = await screen.findByRole('alert')
    // La riga con la pastiglia c'è: è quello che la frase non deve smentire.
    expect(carta('La prescrizione').getByText('A3,5')).toBeInTheDocument()
    expect(avviso).toHaveTextContent(/trascritto dal foglio/)
    expect(avviso).not.toHaveTextContent(/Non sono riuscita a salvare il colore/)
  })

  it('sganciato + fuori catalogo → NIENTE è stato salvato: resta la frase storica', async () => {
    // Qui la carta non mostra nulla (test sopra), quindi nessuna contraddizione:
    // la perdita è vera e la frase deve continuare a dirla.
    renderFatto({ colore: 'A3,5', coloreOrigine: 'lab', accessoriFalliti: ['colore'] })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Non sono riuscita a salvare il colore. Lo aggiungi dalla scheda.'
    )
  })

  it('elementi persi + colore trascritto → due frasi distinte, nessuna delle due falsa', async () => {
    renderFatto({ colore: 'A3,5', elemento: 'pippo', accessoriFalliti: ['elementi', 'colore'] })
    const avviso = await screen.findByRole('alert')
    // Gli elementi sono persi davvero → frase storica, ma SENZA il colore dentro.
    expect(avviso).toHaveTextContent('Non sono riuscita a salvare gli elementi. Li aggiungi dalla scheda.')
    expect(avviso).toHaveTextContent(/trascritto dal foglio/)
  })
})
