import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EmptyState } from '../../src/components/ui/EmptyState'

describe('EmptyState', () => {
  it('con href renderizza un link navigabile', () => {
    render(<EmptyState title="Vuoto" cta={{ label: 'Vai', href: '/altrove' }} />)
    const link = screen.getByRole('link', { name: 'Vai' })
    expect(link.getAttribute('href')).toBe('/altrove')
  })

  it('con solo onClick renderizza un bottone accessibile da tastiera, non un link senza href', () => {
    const onClick = vi.fn()
    render(<EmptyState title="Vuoto" cta={{ label: 'Apri', onClick }} />)
    expect(screen.queryByRole('link')).toBeNull()
    const button = screen.getByRole('button', { name: 'Apri' })
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('senza cta non renderizza alcun trigger', () => {
    render(<EmptyState title="Vuoto" />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
