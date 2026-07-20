import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardLavoro } from '@/components/ds/CardLavoro'

const base = {
  numero: '144', dentista: 'Dr.ssa Bianchi', paziente: 'PZ-0398',
  tipoLavoro: 'Ponte 3 elementi', tempo: { testo: 'DA IERI', famiglia: 'red' as const },
  onApri: () => {},
}

describe('CardLavoro — targa cassetta (A14)', () => {
  it('mostra la targa quando cassetta è presente', () => {
    render(<CardLavoro {...base} cassetta="C12" />)
    expect(screen.getByRole('img', { name: 'Cassetta C12' })).toBeInTheDocument()
    expect(screen.getByText('C12')).toBeInTheDocument()
  })
  it('non mostra nulla senza cassetta', () => {
    render(<CardLavoro {...base} />)
    expect(screen.queryByRole('img', { name: /Cassetta/ })).not.toBeInTheDocument()
  })
})
