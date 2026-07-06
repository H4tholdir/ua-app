import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TabDati } from '../../src/components/features/lavori/form/TabDati'

describe('TabDati — selettore ciclo', () => {
  it('onCicloChange fornito → mostra il campo "Ciclo di produzione"', () => {
    render(
      <TabDati
        data={{}}
        onChange={vi.fn()}
        cicloId=""
        onCicloChange={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/Ciclo di produzione/i)).toBeInTheDocument()
  })

  it('onCicloChange assente → il campo "Ciclo di produzione" non è renderizzato', () => {
    render(<TabDati data={{}} onChange={vi.fn()} />)
    expect(screen.queryByLabelText(/Ciclo di produzione/i)).not.toBeInTheDocument()
  })

  it('il campo ciclo non è mai contrassegnato come obbligatorio', () => {
    render(
      <TabDati data={{}} onChange={vi.fn()} cicloId="" onCicloChange={vi.fn()} />
    )
    const field = screen.getByLabelText(/Ciclo di produzione/i)
    expect(field).not.toHaveAttribute('aria-required', 'true')
  })
})

describe('TabDati — associazione label/input (htmlFor/id)', () => {
  it('il campo "Tipo dispositivo" è raggiungibile via getByLabelText', () => {
    render(<TabDati data={{}} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/Tipo dispositivo/i)).toBeInTheDocument()
  })

  it('il campo "Descrizione" è raggiungibile via getByLabelText', () => {
    render(<TabDati data={{}} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/Descrizione/i)).toBeInTheDocument()
  })

  it('il campo "Data consegna" è raggiungibile via getByLabelText', () => {
    render(<TabDati data={{}} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/Data consegna/i)).toBeInTheDocument()
  })
})
