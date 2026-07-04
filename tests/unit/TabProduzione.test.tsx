import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabProduzione } from '../../src/components/features/lavori/form/TabProduzione'
import type { LavoroFase } from '../../src/types/domain'

const FASE: LavoroFase = {
  id: 'fase-1',
  lavoro_id: 'lavoro-1',
  fase_id: 'fp-1',
  laboratorio_id: 'lab-1',
  esito: null,
  eseguita_at: null,
  note: null,
  materiali_usati: null,
  attrezzatura_usata: null,
  valore_misurato: null,
  non_conforme: false,
  azione_correttiva: null,
  tecnico_id: null,
  fase: {
    codice_fase: 'OL10',
    descrizione: 'Disegno modelli progettazione',
    ordine: 1,
    obbligatoria: true,
    misurazioni_da_rilevare: false,
  },
}

describe('TabProduzione', () => {
  it('click su "Non conf." invia esito E non_conforme=true', () => {
    const onUpdateFase = vi.fn()
    render(<TabProduzione fasi={[FASE]} onUpdateFase={onUpdateFase} hasCiclo={true} />)

    fireEvent.click(screen.getByRole('button', { name: 'Non conf.' }))

    expect(onUpdateFase).toHaveBeenCalledWith('fase-1', expect.objectContaining({
      esito: 'non_conforme',
      non_conforme: true,
    }))
  })

  it('click su "OK" invia esito=ok E non_conforme=false', () => {
    const onUpdateFase = vi.fn()
    render(<TabProduzione fasi={[FASE]} onUpdateFase={onUpdateFase} hasCiclo={true} />)

    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(onUpdateFase).toHaveBeenCalledWith('fase-1', expect.objectContaining({
      esito: 'ok',
      non_conforme: false,
    }))
  })

  it('quando esito è non_conforme, mostra il campo Azione correttiva', () => {
    const faseNC = { ...FASE, esito: 'non_conforme' as const, non_conforme: true }
    render(<TabProduzione fasi={[faseNC]} onUpdateFase={vi.fn()} hasCiclo={true} />)

    expect(screen.getByLabelText(/Azione correttiva/i)).toBeInTheDocument()
  })

  it('scrivendo e uscendo dal campo Azione correttiva, invia azione_correttiva', () => {
    const onUpdateFase = vi.fn()
    const faseNC = { ...FASE, esito: 'non_conforme' as const, non_conforme: true }
    render(<TabProduzione fasi={[faseNC]} onUpdateFase={onUpdateFase} hasCiclo={true} />)

    const textarea = screen.getByLabelText(/Azione correttiva/i)
    fireEvent.change(textarea, { target: { value: 'Sostituito lotto materiale' } })
    fireEvent.blur(textarea)

    expect(onUpdateFase).toHaveBeenCalledWith('fase-1', { azione_correttiva: 'Sostituito lotto materiale' })
  })

  it('nessuna fase + hasCiclo=false → messaggio "assegna un ciclo"', () => {
    render(<TabProduzione fasi={[]} onUpdateFase={vi.fn()} hasCiclo={false} />)
    expect(screen.getByText(/assegna un ciclo nella tab Dati/i)).toBeInTheDocument()
  })

  it('nessuna fase + hasCiclo=true → messaggio "ciclo assegnato ma nessuna fase definita" + link a /cicli-produzione', () => {
    render(<TabProduzione fasi={[]} onUpdateFase={vi.fn()} hasCiclo={true} />)
    expect(screen.getByText(/nessuna fase.*definita/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /definisci le fasi di questo ciclo/i })).toHaveAttribute('href', '/cicli-produzione')
  })
})
