import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ClientiSearchList } from '../../src/components/features/clienti/ClientiSearchList'

const CLIENTE_BASE = {
  id: 'cl-1',
  studio_nome: 'Studio Bianchi',
  nome: 'Mario',
  cognome: 'Rossi',
  telefono: '3331234567',
  citta: 'Napoli',
}

describe('ClientiSearchList', () => {
  it('la lista è avvolta in un container con padding orizzontale 20px (evita card edge-to-edge, pattern lavori/page.tsx)', () => {
    render(<ClientiSearchList clienti={[CLIENTE_BASE]} />)

    const list = screen.getByRole('list')
    const wrapper = list.parentElement
    expect(wrapper?.tagName.toLowerCase()).toBe('section')
    expect(wrapper).toHaveStyle({ padding: '0px 20px' })
  })
})
