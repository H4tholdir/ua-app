import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PazientiSearchList } from '../../src/components/features/pazienti/PazientiSearchList'

const PAZIENTE_BASE = {
  id: 'pz-1',
  nome: 'Mario',
  cognome: 'Rossi',
  nome_cognome: 'Mario Rossi',
  codice_paziente: 'PZ001',
  cliente: { id: 'cl-1', nome: 'Studio', cognome: 'Bianchi', studio_nome: 'Studio Bianchi' },
}

describe('PazientiSearchList', () => {
  it('ogni riga paziente è un link navigabile verso /pazienti/[id]', () => {
    render(<PazientiSearchList pazienti={[PAZIENTE_BASE]} />)

    const link = screen.getByRole('link', { name: /Rossi Mario/ })
    expect(link.getAttribute('href')).toBe('/pazienti/pz-1')
  })

  it('la lista usa il layout responsive ua-list-grid (coerente con ClientiSearchList)', () => {
    render(<PazientiSearchList pazienti={[PAZIENTE_BASE]} />)

    const list = screen.getByRole('list')
    expect(list).toHaveClass('ua-list-grid')
  })

  it('la lista è avvolta in un container con padding orizzontale 20px (evita card edge-to-edge, pattern lavori/page.tsx)', () => {
    render(<PazientiSearchList pazienti={[PAZIENTE_BASE]} />)

    const list = screen.getByRole('list')
    const wrapper = list.parentElement
    expect(wrapper?.tagName.toLowerCase()).toBe('section')
    expect(wrapper).toHaveStyle({ padding: '0px 20px' })
  })
})
