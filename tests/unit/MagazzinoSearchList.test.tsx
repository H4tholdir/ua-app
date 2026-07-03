import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MagazzinoSearchList } from '../../src/components/features/magazzino/MagazzinoSearchList'

const ARTICOLO_BASE = {
  id: 'art-1',
  codice_articolo: 'GES01',
  nome: 'Gesso extra-duro',
  produttore: null,
  categoria: null,
  um_scarico: 'g',
  scorta_attuale: 10,
  scorta_minima: 5,
  dispositivo_medico: false,
}

describe('MagazzinoSearchList', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista vuota mostra EmptyState con CTA (bottone) che apre il bottom sheet', () => {
    render(<MagazzinoSearchList articoli={[]} categorieEsistenti={[]} fornitori={[]} />)

    expect(screen.getByText('Magazzino vuoto')).toBeTruthy()
    const cta = screen.getByRole('button', { name: '+ Aggiungi articolo' })

    fireEvent.click(cta)
    expect(screen.getByRole('dialog', { name: 'Nuovo articolo' })).toBeTruthy()
  })

  it('lista non vuota mostra un bottone persistente "Aggiungi articolo" che apre il bottom sheet', () => {
    render(<MagazzinoSearchList articoli={[ARTICOLO_BASE]} categorieEsistenti={[]} fornitori={[]} />)

    expect(screen.queryByText('Magazzino vuoto')).toBeNull()
    const cta = screen.getByRole('button', { name: 'Aggiungi articolo' })

    fireEvent.click(cta)
    expect(screen.getByRole('dialog', { name: 'Nuovo articolo' })).toBeTruthy()
  })

  it('creare un articolo dal sheet lo aggiunge subito alla lista (nessun reload)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ articolo: { id: 'art-2', codice_articolo: 'CER02', nome: 'Ceramica feldspatica', scorta_attuale: 0, scorta_minima: 0 } }),
    })

    render(<MagazzinoSearchList articoli={[ARTICOLO_BASE]} categorieEsistenti={[]} fornitori={[]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi articolo' }))
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Ceramica feldspatica' } })
    fireEvent.change(screen.getByLabelText('Codice articolo *'), { target: { value: 'CER02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    expect(await screen.findByText('Ceramica feldspatica')).toBeTruthy()
  })
})
