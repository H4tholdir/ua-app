import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProduttivitaTecnico } from '../../src/components/features/tecnici/ProduttivitaTecnico'
import type { ProduttivitaResponse } from '../../src/app/api/tecnici/[id]/produttivita/route'

function makeData(overrides: Partial<ProduttivitaResponse> = {}): ProduttivitaResponse {
  return {
    tecnico: { id: 't1', nome: 'Mario', cognome: 'Rossi' },
    mese: '2026-07',
    lavori_completati: 5,
    puntualita_pct: 90,
    compenso_maturato: 1500,
    lavorazioni_dettaglio: [],
    storico_4_mesi: [],
    ...overrides,
  }
}

describe('ProduttivitaTecnico — sezione compenso condizionale a tipo_compenso', () => {
  it("tipo_compenso 'fisso' mostra lo stipendio fisso, senza barra/percentuale target", () => {
    render(
      <ProduttivitaTecnico
        data={makeData()}
        meseCorrente="2026-07"
        compensoBase={3000}
        tipoCompenso="fisso"
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/Stipendio fisso mensile/i)).toBeInTheDocument()
    expect(screen.queryByText(/Target mensile:/)).not.toBeInTheDocument()
  })

  it("tipo_compenso null mostra un indicatore 'non specificato' invece della barra target", () => {
    render(
      <ProduttivitaTecnico
        data={makeData()}
        meseCorrente="2026-07"
        compensoBase={3000}
        tipoCompenso={null}
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/tipo compenso non specificato/i)).toBeInTheDocument()
    expect(screen.queryByText(/Target mensile:/)).not.toBeInTheDocument()
  })

  it("tipo_compenso non passato (undefined) si comporta come 'non specificato'", () => {
    render(
      <ProduttivitaTecnico
        data={makeData()}
        meseCorrente="2026-07"
        compensoBase={3000}
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/tipo compenso non specificato/i)).toBeInTheDocument()
  })

  it("tipo_compenso 'percentuale' mantiene la barra target invariata (comportamento storico)", () => {
    render(
      <ProduttivitaTecnico
        data={makeData({ compenso_maturato: 1500 })}
        meseCorrente="2026-07"
        compensoBase={3000}
        tipoCompenso="percentuale"
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/Target mensile: .*50%/)).toBeInTheDocument()
    expect(screen.queryByText(/Stipendio fisso mensile/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/non specificato/i)).not.toBeInTheDocument()
  })

  it("tipo_compenso 'per_lavorazione' mantiene la barra target invariata (comportamento storico)", () => {
    render(
      <ProduttivitaTecnico
        data={makeData({ compenso_maturato: 750 })}
        meseCorrente="2026-07"
        compensoBase={3000}
        tipoCompenso="per_lavorazione"
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/Target mensile: .*25%/)).toBeInTheDocument()
  })

  it("compensoBase negativo con tipo_compenso 'fisso' è trattato come non impostato", () => {
    render(
      <ProduttivitaTecnico
        data={makeData()}
        meseCorrente="2026-07"
        compensoBase={-100}
        tipoCompenso="fisso"
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/stipendio fisso non impostato/i)).toBeInTheDocument()
    expect(screen.queryByText(/Stipendio fisso mensile/i)).not.toBeInTheDocument()
  })

  it("compensoBase negativo con tipo_compenso 'percentuale' è trattato come non impostato (barra assente)", () => {
    render(
      <ProduttivitaTecnico
        data={makeData()}
        meseCorrente="2026-07"
        compensoBase={-100}
        tipoCompenso="percentuale"
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/Target mensile non impostato/i)).toBeInTheDocument()
  })

  it('compensoBase pari a 0 è trattato come non impostato (invariato dal comportamento storico)', () => {
    render(
      <ProduttivitaTecnico
        data={makeData()}
        meseCorrente="2026-07"
        compensoBase={0}
        tipoCompenso="percentuale"
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/Target mensile non impostato/i)).toBeInTheDocument()
  })

  it("tipo_compenso 'fisso' senza compensoBase impostato mostra 'Stipendio fisso non impostato'", () => {
    render(
      <ProduttivitaTecnico
        data={makeData()}
        meseCorrente="2026-07"
        compensoBase={null}
        tipoCompenso="fisso"
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/stipendio fisso non impostato/i)).toBeInTheDocument()
  })

  it("compensoBase assente e tipo_compenso non fisso mostra 'Target mensile non impostato' (invariato)", () => {
    render(
      <ProduttivitaTecnico
        data={makeData()}
        meseCorrente="2026-07"
        compensoBase={null}
        tipoCompenso="percentuale"
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/Target mensile non impostato/i)).toBeInTheDocument()
  })

  it("tecnico mai configurato (tipo_compenso null E compensoBase null) mostra la nudge 'non specificato', non 'Target mensile non impostato'", () => {
    render(
      <ProduttivitaTecnico
        data={makeData()}
        meseCorrente="2026-07"
        compensoBase={null}
        tipoCompenso={null}
        giorniConLavori={[]}
      />
    )
    expect(screen.getByText(/tipo compenso non specificato/i)).toBeInTheDocument()
    expect(screen.queryByText(/Target mensile non impostato/i)).not.toBeInTheDocument()
  })
})
