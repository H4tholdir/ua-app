import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConfermaCassettaSheet } from '@/components/features/pile/ConfermaCassettaSheet'

const lavoro = { id: 'l1', numero: '151', tipoLavoro: 'Protesi totale', dentista: 'Dr. Esposito' }

describe('ConfermaCassettaSheet', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('CTA disabilitata senza scelta; chip la abilita col nome', () => {
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={['C7', 'C15']} onConfermato={() => {}} />)
    expect(screen.getByRole('button', { name: /^Conferma$/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    expect(screen.getByRole('button', { name: 'Conferma in C7' })).toBeEnabled()
  })

  it('conferma con cassetta → PATCH numero_cassetta e onConfermato', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={['C7']} onConfermato={onConfermato} />)
    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferma in C7' }))
    await waitFor(() => expect(onConfermato).toHaveBeenCalledWith('l1'))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/lavori/l1')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ numero_cassetta: 'C7' })
  })

  it('«Conferma senza cassetta» → nessuna PATCH, onConfermato subito', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={[]} onConfermato={onConfermato} />)
    fireEvent.click(screen.getByRole('button', { name: 'Conferma senza cassetta' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onConfermato).toHaveBeenCalledWith('l1')
  })
})
