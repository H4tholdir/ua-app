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
    // Collaudo R1 (P11a) — il custom non è più un bottone: è l'`<input type="color">` reale,
    // sovrapposto allo swatch decorativo (v. SwatchesColore.tsx).
    expect(screen.getByLabelText('Colore personalizzato')).toBeInTheDocument()
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
    // Collaudo R1 (P11a) — l'input color è il controllo REALE (nome accessibile «Colore
    // personalizzato»), non più un ponte nascosto dietro un bottone.
    const picker = screen.getByLabelText('Colore personalizzato') as HTMLInputElement
    expect(picker).not.toBeNull()

    fireEvent.change(picker, { target: { value: '#aabbcc' } })
    expect(fetchMock()).not.toHaveBeenCalled()
    // La scelta si VEDE sullo swatch decorativo che racchiude l'input (✓ + classe is-scelto).
    expect(picker.closest('.ds-swatch-custom')).toHaveClass('is-scelto')

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

  it('422 nome_non_valido (nome > 20 caratteri) → messaggio dedicato, non un «riprova» cieco', async () => {
    fetchMock().mockResolvedValueOnce({ status: 422, json: async () => ({ errore: 'nome_non_valido' }) })
    const onCreata = vi.fn()
    render(<NuovaCassettaSheet aperto onChiudi={() => {}} prossimoNome="C22" onCreata={onCreata} />)
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Un nome davvero troppo lungo' } })
    fireEvent.click(screen.getByRole('button', { name: /crea/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Il nome è troppo lungo (massimo 20 caratteri)')
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
