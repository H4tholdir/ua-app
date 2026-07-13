// tests/unit/ModificaRigaSheet.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModificaRigaSheet } from '../../src/components/features/lavori/scheda-v3/ModificaRigaSheet'

describe('ModificaRigaSheet — note', () => {
  it('salva note_interne via PATCH e chiama onSalvato', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const onSalvato = vi.fn()
    render(
      <ModificaRigaSheet
        aperto campo="note" lavoroId="lav" valoreIniziale="vecchia"
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={() => {}}
      />,
    )
    // selector: 'input' — il dialog stesso porta `aria-labelledby` verso il
    // titolo dello Sheet ("Note interne", §5.16), quindi /note/i da solo
    // matcherebbe sia il `<div role="dialog">` sia il campo: disambiguato
    // restringendo al vero elemento di form reso da `CampoTesto`.
    const input = screen.getByLabelText(/note/i, { selector: 'input' })
    fireEvent.change(input, { target: { value: 'nuova nota' } })
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/lavori/lav',
      expect.objectContaining({ method: 'PATCH' }),
    ))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ note_interne: 'nuova nota' })
    await waitFor(() => expect(onSalvato).toHaveBeenCalledWith({ note_interne: 'nuova nota' }))
  })

  it('su errore chiama onErrore, non onSalvato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))
    const onSalvato = vi.fn(); const onErrore = vi.fn()
    render(
      <ModificaRigaSheet aperto campo="note" lavoroId="lav" valoreIniziale=""
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={onErrore} />,
    )
    fireEvent.change(screen.getByLabelText(/note/i, { selector: 'input' }), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(onErrore).toHaveBeenCalled())
    expect(onSalvato).not.toHaveBeenCalled()
  })
})

describe('ModificaRigaSheet — consegna', () => {
  it('salva data_consegna_prevista e ora_consegna via PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const onSalvato = vi.fn()
    render(
      <ModificaRigaSheet
        aperto campo="consegna" lavoroId="lav"
        valoreIniziale={{ data_consegna_prevista: '2026-07-20', ora_consegna: '14:30' }}
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/lavori/lav',
      expect.objectContaining({ method: 'PATCH' }),
    ))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ data_consegna_prevista: '2026-07-20', ora_consegna: '14:30' })
    await waitFor(() => expect(onSalvato).toHaveBeenCalledWith({
      data_consegna_prevista: '2026-07-20', ora_consegna: '14:30',
    }))
  })
})
