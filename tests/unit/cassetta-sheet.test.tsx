// Task 12 — CassettaSheet (§5.3). Test in tests/unit/ (D-O1), NON in __tests__.
//
// Nessun mockup per questo sheet: l'anatomia è composta di soli componenti ds. I contratti API
// (verbatim dalle route) sono la parte graded: PATCH un campo per volta ({nome} XOR {colore}),
// liberazione con body `null` letterale, sposta-lavoro {cassetta_id}, DELETE, riordino via
// callback nel PareteClient. Dizionario: «Butta via», MAI «Elimina».
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { CassettaSheet } from '@/components/features/cassette/CassettaSheet'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

function fetchMock() {
  return fetch as unknown as ReturnType<typeof vi.fn>
}

const occupata: CassettaParete = {
  id: 'c-occ',
  nome: 'C12',
  colore: 'rossa',
  posizione: 1,
  lavoro: { id: 'lav-1', numero: '144', dentista: 'Bianchi', paziente: 'MAR-42', tipoDispositivo: 'protesi_fissa', descrizione: 'Corona' },
}
const libera: CassettaParete = { id: 'c-lib', nome: 'C4', colore: 'grigia', posizione: 3, lavoro: null }
const altraLibera: CassettaParete = { id: 'c-lib2', nome: 'C7', colore: 'blu', posizione: 4, lavoro: null }

function renderSheet(over: Partial<Parameters<typeof CassettaSheet>[0]> = {}) {
  const props = {
    cassetta: libera as CassettaParete | null,
    libere: [libera] as CassettaParete[],
    posto: 2,
    totale: 4,
    aperto: true,
    onChiudi: vi.fn(),
    onCambiata: vi.fn(),
    onSposta: vi.fn().mockResolvedValue(true),
    ...over,
  }
  render(<CassettaSheet {...props} />)
  return props
}

/** L'`<input type="color">` è `aria-hidden`/`tabIndex=-1` (è il ponte verso il picker di sistema,
 *  non un controllo a sé): nessuna query per ruolo lo trova. E il `Sheet` ds monta il pannello in
 *  un portale, quindi non sta nel `container` di RTL ma nel documento. */
function pickerColore(): HTMLInputElement {
  const input = document.querySelector('input[type="color"]')
  if (!input) throw new Error('input[type=color] non trovato nello sheet')
  return input as HTMLInputElement
}

describe('CassettaSheet — cassetta LIBERA (§5.3)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rinomina: PATCH con SOLO {nome} (mai accorpato al colore) → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    const { onCambiata } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Banco Ciro' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cassette/c-lib')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body as string)).toEqual({ nome: 'Banco Ciro' })
  })

  it('rinomina 409 → errore inline verbatim, NON onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 409, json: async () => ({ errore: 'nome_occupato' }) })
    const { onCambiata } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'C12' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Questo nome è già sulla parete')
    expect(onCambiata).not.toHaveBeenCalled()
  })

  it('colore: swatch tap → PATCH con SOLO {colore} → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok', colore: 'verde' }) })
    const { onCambiata } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Verde' }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cassette/c-lib')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body as string)).toEqual({ colore: 'verde' })
  })

  // Review Task 12, Important 1 — il picker nativo emette valori LIVE mentre il cursore si
  // trascina (React mappa `onChange` sull'evento DOM `input`). Appesa lì, la PATCH salvava un
  // colore intermedio a caso E chiudeva lo sheet in faccia all'utente al primo movimento.
  it('colore CUSTOM: i valori live del picker non salvano e non chiudono lo sheet', () => {
    const { onCambiata } = renderSheet()
    const picker = pickerColore()

    fireEvent.change(picker, { target: { value: '#aabbcc' } })
    fireEvent.change(picker, { target: { value: '#112233' } })

    expect(fetchMock()).not.toHaveBeenCalled()
    expect(onCambiata).not.toHaveBeenCalled()
    // La scelta però si VEDE: lo swatch custom è selezionato (aria-pressed + ✓), altrimenti chi
    // sceglie non saprebbe che il colore è stato preso.
    const custom = screen.getByRole('button', { name: 'Colore personalizzato' })
    expect(custom).toHaveAttribute('aria-pressed', 'true')
    expect(custom).toHaveTextContent('✓')
  })

  it('colore CUSTOM: «Salva il colore» committa UNA sola PATCH, con l\'ULTIMO valore scelto', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    const { onCambiata } = renderSheet()
    const picker = pickerColore()
    // Prima del picker il tasto non esiste: le 6 facce standard non ne hanno bisogno (un click è
    // già una scelta conclusa) e una riga in più sotto gli swatch sarebbe rumore.
    expect(screen.queryByRole('button', { name: /salva il colore/i })).toBeNull()

    fireEvent.change(picker, { target: { value: '#aabbcc' } })
    fireEvent.change(picker, { target: { value: '#112233' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il colore/i }))

    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    expect(fetchMock()).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cassette/c-lib')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body as string)).toEqual({ colore: '#112233' })
  })

  it('«Butta via» attiva: DialogConferma verbatim (MAI «Elimina») → DELETE → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    const { onCambiata } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Butta via' }))
    const dialog = await screen.findByRole('dialog', { name: /butto via la cassetta c4/i })
    expect(within(dialog).queryByText(/elimina/i)).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Butta via' }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cassette/c-lib')
    expect(options.method).toBe('DELETE')
  })

  it('rinomina 422 (nome > 20 caratteri) → messaggio dedicato, non un «riprova» cieco', async () => {
    fetchMock().mockResolvedValueOnce({ status: 422, json: async () => ({ errore: 'nome_non_valido' }) })
    const { onCambiata } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Un nome davvero troppo lungo' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Il nome è troppo lungo (massimo 20 caratteri)')
    expect(onCambiata).not.toHaveBeenCalled()
  })

  // Review finale whole-branch, Fix 1 — Sheet e DialogConferma ascoltano ENTRAMBI Esc su window:
  // senza guardia un solo Esc sul dialog «Butta via» chiudeva anche lo sheet sotto (flusso
  // distruttivo che collassa). Con dialog aperto Esc deve chiudere SOLO il dialog.
  it('Esc con DialogConferma «Butta via» aperto: chiude SOLO il dialog, il secondo Esc chiude lo sheet', async () => {
    const { onChiudi } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Butta via' }))
    await screen.findByRole('dialog', { name: /butto via la cassetta c4/i })

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /butto via/i })).toBeNull())
    expect(onChiudi).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('nessuna azione «Sposta il lavoro in…» su una cassetta libera (non c\'è lavoro da spostare)', () => {
    renderSheet()
    expect(screen.queryByText(/sposta il lavoro in/i)).toBeNull()
  })

  it('«Sposta» ▲: callback onSposta(\'su\') + aria-live «C4 spostata al posto 1»', async () => {
    const { onSposta, onCambiata } = renderSheet({ posto: 2, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: /sposta su/i }))
    expect(onSposta).toHaveBeenCalledWith('su')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('C4 spostata al posto 1'))
    // Il riordino è l'UNICA azione che NON chiude lo sheet: ci si sposta di un posto alla volta.
    expect(onCambiata).not.toHaveBeenCalled()
  })

  it('«Sposta» che NON va a buon fine non annuncia uno spostamento mai avvenuto', async () => {
    const onSposta = vi.fn().mockResolvedValue(false)
    renderSheet({ posto: 2, totale: 4, onSposta })
    fireEvent.click(screen.getByRole('button', { name: /sposta su/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('')
    expect(screen.getByRole('status')).not.toHaveTextContent('spostata al posto')
  })

  it('la prima cassetta non ha ▲, l\'ultima non ha ▼', () => {
    const { onSposta } = renderSheet({ posto: 1, totale: 4 })
    expect(screen.queryByRole('button', { name: /sposta su/i })).toBeNull()
    expect(screen.getByRole('button', { name: /sposta giù/i })).toBeInTheDocument()
    expect(onSposta).not.toHaveBeenCalled()
  })
})

describe('CassettaSheet — cassetta OCCUPATA (§5.3)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('mostra «Dentro c\'è il n.144»', () => {
    renderSheet({ cassetta: occupata, libere: [libera, altraLibera], posto: 1, totale: 4 })
    expect(screen.getByText(/Dentro c'è il n\.144/)).toBeInTheDocument()
  })

  it('«Sposta il lavoro in…»: chip di una libera → POST /api/lavori/[id]/cassetta {cassetta_id} → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok', nome: 'C4' }) })
    const { onCambiata } = renderSheet({ cassetta: occupata, libere: [libera, altraLibera], posto: 1, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: 'C4' }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/lavori/lav-1/cassetta')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body as string)).toEqual({ cassetta_id: 'c-lib' })
  })

  it('«Sposta il lavoro in…» 409 → riga bloccante, NON onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 409, json: async () => ({ errore: 'occupata', nome: 'C4' }) })
    const { onCambiata } = renderSheet({ cassetta: occupata, libere: [libera, altraLibera], posto: 1, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: 'C4' }))
    await waitFor(() => expect(screen.getByText(/occupata/i)).toBeInTheDocument())
    expect(onCambiata).not.toHaveBeenCalled()
  })

  it('«Segna come libera»: LinkQuieto + DialogConferma «Il n.144 esce dalla C12?» → POST body null → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok', nome: 'C12' }) })
    const { onCambiata } = renderSheet({ cassetta: occupata, libere: [libera], posto: 1, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: /segna come libera/i }))
    const dialog = await screen.findByRole('dialog', { name: /il n\.144 esce dalla c12/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /esce|libera/i }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/lavori/lav-1/cassetta')
    expect(options.method).toBe('POST')
    // Liberazione: body deve essere il letterale `null` (NON {cassetta_id:null}, che è 422).
    expect(options.body).toBe(JSON.stringify(null))
  })

  it('Esc con DialogConferma «Segna come libera» aperto: chiude SOLO il dialog, non lo sheet', async () => {
    const { onChiudi } = renderSheet({ cassetta: occupata, libere: [libera], posto: 1, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: /segna come libera/i }))
    await screen.findByRole('dialog', { name: /il n\.144 esce dalla c12/i })

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /esce dalla/i })).toBeNull())
    expect(onChiudi).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('«Butta via» DISABILITATA su occupata: riga bloccante «Dentro c\'è il n.144», nessun DELETE', () => {
    renderSheet({ cassetta: occupata, libere: [libera], posto: 1, totale: 4 })
    // Nessun DialogConferma di butta-via raggiungibile: la parola «Butta via» non è un bottone
    // che apre il dialog distruttivo (è resa disabilitata + riga bloccante).
    expect(screen.queryByRole('dialog', { name: /butto via/i })).toBeNull()
    // La riga bloccante c'è (testo verbatim del brief).
    expect(screen.getAllByText(/Dentro c'è il n\.144/).length).toBeGreaterThan(0)
  })
})
