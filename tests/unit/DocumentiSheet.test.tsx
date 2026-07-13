// tests/unit/DocumentiSheet.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentiSheet } from '../../src/components/features/lavori/scheda-v3/DocumentiSheet'

const lavoro = { id: 'lav', numero_lavoro: '2026-0001', cliente_display: 'Studio X', haFasi: true, haDdc: false }

describe('DocumentiSheet', () => {
  it('mostra scheda di fabbricazione (haFasi) e non DdC (haDdc=false)', () => {
    render(<DocumentiSheet aperto onChiudi={() => {}} lavoro={lavoro} />)
    const sf = screen.getByRole('link', { name: /scheda di fabbricazione/i })
    expect(sf).toHaveAttribute('href', '/api/lavori/lav/scheda-fabbricazione')
    expect(screen.queryByRole('link', { name: /^scarica ddc/i })).toBeNull()
  })
  it('IFU/Etichetta/Ricevuta puntano agli endpoint corretti', () => {
    render(<DocumentiSheet aperto onChiudi={() => {}} lavoro={lavoro} />)
    expect(screen.getByRole('link', { name: /ifu/i })).toHaveAttribute('href', '/api/lavori/lav/ifu')
    expect(screen.getByRole('link', { name: /etichetta/i })).toHaveAttribute('href', '/api/lavori/lav/etichetta')
    expect(screen.getByRole('link', { name: /ricevuta/i })).toHaveAttribute('href', '/api/lavori/lav/ricevuta-consegna')
  })
  it('mostra la voce DdC con URL firmata quando haDdc=true e ddcUrl è presente', () => {
    const lavoroConDdc = { ...lavoro, haDdc: true, ddcUrl: 'https://signed.example/ddc.pdf' }
    render(<DocumentiSheet aperto onChiudi={() => {}} lavoro={lavoroConDdc} />)
    const ddc = screen.getByRole('link', { name: /^scarica ddc/i })
    expect(ddc).toHaveAttribute('href', 'https://signed.example/ddc.pdf')
    expect(ddc).toHaveAttribute('target', '_blank')
  })
  it('non mostra la voce DdC quando haDdc=true ma ddcUrl è assente (gate haDdc && ddcUrl)', () => {
    const lavoroSenzaUrl = { ...lavoro, haDdc: true, ddcUrl: undefined }
    render(<DocumentiSheet aperto onChiudi={() => {}} lavoro={lavoroSenzaUrl} />)
    expect(screen.queryByRole('link', { name: /^scarica ddc/i })).toBeNull()
  })
})
