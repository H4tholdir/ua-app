// Task 12 — NuovaCassettaSheet (§5.2). Test in tests/unit/ (D-O1), NON in __tests__.
//
// Il campo nome arriva PRECOMPILATO con `prossimoNome`; la CTA «Crea {nome}» segue il testo;
// 6 swatches standard + custom; submit → POST /api/cassette {nome, colore}; 409 → errore inline
// verbatim; 201 → onCreata + suono/haptic (constraint 4: unico suono nuovo dell'ondata).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NuovaCassettaSheet } from '@/components/features/cassette/NuovaCassettaSheet'
import * as sound from '@/design-system/v3/sound'
import * as haptic from '@/design-system/v3/haptic'

function fetchMock() {
  return fetch as unknown as ReturnType<typeof vi.fn>
}

describe('NuovaCassettaSheet — creazione (§5.2)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('precompila il nome e la CTA con prossimoNome', () => {
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={() => {}} />)
    expect(screen.getByLabelText('Nome')).toHaveValue('C22')
    expect(screen.getByRole('button', { name: 'Crea C22' })).toBeInTheDocument()
  })

  it('la CTA segue il testo digitato', () => {
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={() => {}} />)
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Banco Ciro' } })
    expect(screen.getByRole('button', { name: 'Crea Banco Ciro' })).toBeInTheDocument()
  })

  it('mostra 6 swatches standard + custom con nome accessibile (colore mai solo faccia)', () => {
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={() => {}} />)
    for (const nome of ['Bianca', 'Azzurra', 'Rossa', 'Blu', 'Verde', 'Grigia']) {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Colore personalizzato' })).toBeInTheDocument()
    // Bianca è la selezione di default (mockup: prima swatch `.sel`), portata da aria-pressed.
    expect(screen.getByRole('button', { name: 'Bianca' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('lo swatch scelto porta un ✓ VISIBILE, non solo l\'anello blu (L3, constraint 6)', () => {
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={() => {}} />)
    const bianca = screen.getByRole('button', { name: 'Bianca' })
    const rossa = screen.getByRole('button', { name: 'Rossa' })
    // Il segno sta DENTRO lo swatch selezionato, e solo lì.
    expect(bianca).toHaveTextContent('✓')
    expect(rossa).not.toHaveTextContent('✓')
    // Su faccia chiara il ✓ passa a inchiostro scuro (targaScura), altrimenti sparirebbe.
    expect(bianca.className).toContain('is-chiara')

    fireEvent.click(rossa)
    expect(rossa).toHaveTextContent('✓')
    expect(bianca).not.toHaveTextContent('✓')
    expect(rossa.className).not.toContain('is-chiara')
  })

  it('submit → POST /api/cassette con {nome, colore} del colore scelto', async () => {
    fetchMock().mockResolvedValueOnce({ status: 201, json: async () => ({ cassetta: {} }) })
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Rossa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crea C22' }))
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cassette')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body as string)).toEqual({ nome: 'C22', colore: 'rossa' })
  })

  // Review Task 12, Important 1 — qui il difetto del picker live NON si manifesta (l'unico
  // effetto di `onScegli` è `setColore`, e il salvataggio è la CTA), ma la copertura serve
  // comunque: la correzione vive nella composizione dentro `CassettaSheet`, e questo test è la
  // guardia che `SwatchesColore` continui a servire ANCHE questo chiamante.
  it('colore CUSTOM: il valore del picker non chiama nessuna API e finisce nel POST alla creazione', async () => {
    fetchMock().mockResolvedValueOnce({ status: 201, json: async () => ({ cassetta: {} }) })
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={() => {}} />)
    // `aria-hidden`/`tabIndex=-1`: è il ponte verso il picker di sistema, nessun ruolo lo trova —
    // e il `Sheet` ds monta il pannello in un portale, quindi si cerca nel documento.
    const picker = document.querySelector('input[type="color"]') as HTMLInputElement
    expect(picker).not.toBeNull()

    fireEvent.change(picker, { target: { value: '#aabbcc' } })
    expect(fetchMock()).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Colore personalizzato' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Crea C22' }))
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(1))
    const [, options] = fetchMock().mock.calls[0]
    expect(JSON.parse(options.body as string)).toEqual({ nome: 'C22', colore: '#aabbcc' })
  })

  it('201 → onCreata + suono/haptic della creazione riuscita', async () => {
    const suona = vi.spyOn(sound, 'suona').mockImplementation(() => {})
    const vibra = vi.spyOn(haptic, 'vibra').mockImplementation(() => {})
    fetchMock().mockResolvedValueOnce({ status: 201, json: async () => ({ cassetta: {} }) })
    const onCreata = vi.fn()
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={onCreata} />)
    fireEvent.click(screen.getByRole('button', { name: 'Crea C22' }))
    await waitFor(() => expect(onCreata).toHaveBeenCalledTimes(1))
    expect(suona).toHaveBeenCalledWith('tap')
    expect(vibra).toHaveBeenCalledWith('light')
  })

  it('409 → errore inline verbatim e NON chiama onCreata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 409, json: async () => ({ errore: 'nome_occupato', nome: 'C22' }) })
    const onCreata = vi.fn()
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={onCreata} />)
    fireEvent.click(screen.getByRole('button', { name: 'Crea C22' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Questo nome è già sulla parete')
    expect(onCreata).not.toHaveBeenCalled()
  })

  it('un esito non-201/409 (422/500) NON cade nel successo: errore, mai onCreata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 500, json: async () => ({ errore: 'creazione_fallita' }) })
    const onCreata = vi.fn()
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={onCreata} />)
    fireEvent.click(screen.getByRole('button', { name: 'Crea C22' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onCreata).not.toHaveBeenCalled()
  })
})
