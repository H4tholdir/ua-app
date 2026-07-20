import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'

// A12 — ClienteComboBox non esponeva `aria-invalid`/`aria-describedby` quando
// `hasError` era true: il colore del bordo era l'unica fonte di stato
// (vietato dal DS). `getBrowserClient` è mockato per sicurezza (pattern
// UserProfileSheet.routes.test.tsx) anche se questi test non digitano nulla
// nel campo e quindi non attraversano mai `search()`.
vi.mock('@/lib/supabase/browser-anon', () => ({
  getBrowserClient: () => ({}),
}))

import { ClienteComboBox } from '../../src/components/features/clienti/ClienteComboBox'

afterEach(cleanup)

describe('ClienteComboBox — a11y (A12)', () => {
  it('con hasError + errorId espone aria-invalid e aria-describedby', () => {
    render(
      <ClienteComboBox
        value=""
        onChange={() => {}}
        hasError
        errorId="error-cliente_id"
      />
    )
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'error-cliente_id')
  })

  it('senza hasError non espone né aria-invalid né aria-describedby', () => {
    render(
      <ClienteComboBox
        value=""
        onChange={() => {}}
        errorId="error-cliente_id"
      />
    )
    const input = screen.getByRole('combobox')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })
})
