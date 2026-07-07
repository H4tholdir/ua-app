import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PsurGruppoSezione } from '../../src/components/features/qualita/PsurGruppoSezione'
import type { Psur } from '../../src/types/domain'

const ANNO_RENDICONTO = 2025

function psurFixture(overrides: Partial<Psur>): Psur {
  return {
    id: 'psur-1',
    laboratorio_id: 'lab-1',
    anno_riferimento: ANNO_RENDICONTO,
    gruppo_classe: 'classe_iib_iii',
    periodo_inizio: '2025-01-01',
    periodo_fine: '2025-12-31',
    totale_dispositivi: 10,
    totale_non_conformita: 0,
    totale_incidenti: 0,
    totale_reclami: 0,
    totale_rifacimenti: 0,
    valutazione_benefici_rischi: null,
    conclusioni: null,
    misure_correttive: null,
    pdf_url: null,
    pdf_sha256: null,
    firmato_at: null,
    prrc_nome_snapshot: null,
    stato: 'bozza',
    created_at: '2025-12-31T00:00:00Z',
    updated_at: '2025-12-31T00:00:00Z',
    ...overrides,
  }
}

describe('PsurGruppoSezione', () => {
  it('classe_i senza storico → etichetta "PMS Report", mai la stringa "PSUR"', () => {
    render(<PsurGruppoSezione gruppoClasse="classe_i" psurDelGruppo={[]} annoRendiconto={ANNO_RENDICONTO} />)
    expect(screen.getAllByText(/PMS Report/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/\bPSUR\b/)).not.toBeInTheDocument()
  })

  it('classe_iia senza storico → alert urgente, etichetta "PSUR"', () => {
    render(<PsurGruppoSezione gruppoClasse="classe_iia" psurDelGruppo={[]} annoRendiconto={ANNO_RENDICONTO} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getAllByText(/PSUR/i).length).toBeGreaterThan(0)
  })

  it('classe_iib_iii con storico recente (periodo_fine quest\'anno) → nessun alert urgente', () => {
    const oggi = new Date().toISOString().slice(0, 10)
    render(
      <PsurGruppoSezione
        gruppoClasse="classe_iib_iii"
        psurDelGruppo={[psurFixture({ periodo_fine: oggi })]}
        annoRendiconto={ANNO_RENDICONTO}
      />
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('bottone Genera include i campi nascosti anno_riferimento e gruppo_classe corretti', () => {
    const { container } = render(
      <PsurGruppoSezione gruppoClasse="classe_i" psurDelGruppo={[]} annoRendiconto={ANNO_RENDICONTO} />
    )
    const annoInput = container.querySelector('input[name="anno_riferimento"]') as HTMLInputElement
    const gruppoInput = container.querySelector('input[name="gruppo_classe"]') as HTMLInputElement
    expect(annoInput.value).toBe(String(ANNO_RENDICONTO))
    expect(gruppoInput.value).toBe('classe_i')
  })

  it('storico renderizza i KPI del record', () => {
    render(
      <PsurGruppoSezione
        gruppoClasse="classe_iib_iii"
        psurDelGruppo={[psurFixture({ totale_incidenti: 3 })]}
        annoRendiconto={ANNO_RENDICONTO}
      />
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
