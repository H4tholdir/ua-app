import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CicliProduzioneList } from '../../src/components/features/cicli/CicliProduzioneList'

const CICLI = [
  { id: 'c1', codice: 'CNC.TitCer', nome: 'CNC Corona in titanio-ceramica', tipo_dispositivo: 'Protesi fissa' },
  { id: 'c2', codice: 'Ceramizz', nome: 'Ceramizzazione opaco', tipo_dispositivo: 'Protesi fissa' },
]

describe('CicliProduzioneList', () => {
  it('mostra tutti i cicli inizialmente', () => {
    render(<CicliProduzioneList cicli={CICLI} />)
    expect(screen.getByText('CNC Corona in titanio-ceramica')).toBeInTheDocument()
    expect(screen.getByText('Ceramizzazione opaco')).toBeInTheDocument()
  })

  it('filtra per codice/nome digitando nel campo di ricerca', () => {
    render(<CicliProduzioneList cicli={CICLI} />)
    fireEvent.change(screen.getByPlaceholderText(/Cerca ciclo/i), { target: { value: 'titanio' } })
    expect(screen.getByText('CNC Corona in titanio-ceramica')).toBeInTheDocument()
    expect(screen.queryByText('Ceramizzazione opaco')).not.toBeInTheDocument()
  })

  it('ogni riga è un link verso /cicli-produzione/[id]', () => {
    render(<CicliProduzioneList cicli={CICLI} />)
    expect(screen.getByRole('link', { name: /CNC Corona in titanio-ceramica/i })).toHaveAttribute('href', '/cicli-produzione/c1')
  })
})
